// AppState — single source of truth for all app settings.
//
// Persistence layers:
//   - localStorage (durable across sessions): everything except lastStart
//   - URL hash (deep-linkable, replay-friendly): everything *including*
//     lastStart, so a URL fully reproduces an interaction
//
// Hash format:
//   #W=8&H=8&fig=1,2&heur=warnsdorff&sym=none&closed=0&numbers=1&lines=1
//   &mix=1,2;2,1;2,-1;1,-2;-1,-2;-2,-1;-2,1;-1,2&start=3,3
//
// load() reads localStorage first, then URL hash overrides; save() updates
// both. lastStart in localStorage would auto-fire a solve after restart,
// which is undesired — but in the URL it is the whole point.
//
// Singleton: AppState.getInstance().

class AppState {
  constructor() {
    this.lang = 'en';       // i18n language code; visible switcher arrives in B3
    this.W = 8;
    this.H = 8;
    this.heuristic = 'warnsdorff';
    this.figure = '1,2';
    this.activeMoves = Figures.generateBaseMoves(this.figure);
    this.showNumbers = true;
    this.showLines = true;
    this.wantClosed = false;
    this.symType = 'none';
    this.lastStart = null;  // { col, row } when a tour was started; URL-only
  }

  static STATE_KEY = 'aide-knight-state-v1';

  // Reference values used by _saveToHash to decide what's worth putting
  // in the URL. Only deviations from these defaults end up in the fragment,
  // so an untouched session keeps the URL clean.
  static DEFAULTS = {
    lang: 'en',
    W: 8, H: 8,
    heuristic: 'warnsdorff',
    figure: '1,2',
    showNumbers: true,
    showLines: true,
    wantClosed: false,
    symType: 'none',
  };

  static getInstance() {
    if (!AppState._instance) AppState._instance = new AppState();
    return AppState._instance;
  }

  load() {
    this._loadFromStorage();
    this._loadFromHash();
  }

  save() {
    this._saveToStorage();
    this._saveToHash();
  }

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem(AppState.STATE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (I18n.getInstance().availableLanguages().includes(s.lang)) this.lang = s.lang;
      if (Number.isInteger(s.W) && s.W >= 1) this.W = s.W;
      if (Number.isInteger(s.H) && s.H >= 1) this.H = s.H;
      if (['warnsdorff', 'outsideIn', 'bruteForce'].includes(s.heuristic)) {
        this.heuristic = s.heuristic;
      }
      if (['1,2', '1,4', '2,3', '3,4'].includes(s.figure)) this.figure = s.figure;
      const base = Figures.generateBaseMoves(this.figure);
      this.activeMoves = this._isValidMoveOrder(s.moveOrder, base) ? s.moveOrder : base;
      if (typeof s.showNumbers === 'boolean') this.showNumbers = s.showNumbers;
      if (typeof s.showLines   === 'boolean') this.showLines   = s.showLines;
      if (typeof s.wantClosed  === 'boolean') this.wantClosed  = s.wantClosed;
      if (['none', 'axisV', 'point', 'rot90'].includes(s.symType)) this.symType = s.symType;
    } catch { /* ignore — start from defaults */ }
  }

  _saveToStorage() {
    try {
      // Note: lastStart is intentionally NOT persisted to localStorage —
      // we don't want an auto-solve to fire when the user reloads without
      // an explicit URL.
      localStorage.setItem(AppState.STATE_KEY, JSON.stringify({
        lang: this.lang,
        W: this.W, H: this.H,
        heuristic: this.heuristic, figure: this.figure,
        moveOrder: this.activeMoves,
        showNumbers: this.showNumbers, showLines: this.showLines,
        wantClosed: this.wantClosed, symType: this.symType,
      }));
    } catch { /* ignore — non-persistent mode */ }
  }

  _loadFromHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const p = new URLSearchParams(hash);

    const lang = p.get('lang');
    if (lang && I18n.getInstance().availableLanguages().includes(lang)) this.lang = lang;

    const wv = parseInt(p.get('W'), 10);
    if (Number.isInteger(wv) && wv >= 1) this.W = wv;
    const hv = parseInt(p.get('H'), 10);
    if (Number.isInteger(hv) && hv >= 1) this.H = hv;

    const heur = p.get('heur');
    if (['warnsdorff', 'outsideIn', 'bruteForce'].includes(heur)) this.heuristic = heur;

    const fig = p.get('fig');
    // Only reset activeMoves when the figure actually changes — otherwise
    // a same-figure URL would wipe a shuffled order that localStorage held.
    if (['1,2', '1,4', '2,3', '3,4'].includes(fig) && fig !== this.figure) {
      this.figure = fig;
      this.activeMoves = Figures.generateBaseMoves(fig);
    }

    const sym = p.get('sym');
    if (['none', 'axisV', 'point', 'rot90'].includes(sym)) this.symType = sym;

    if (p.get('closed') === '0' || p.get('closed') === '1') {
      this.wantClosed = p.get('closed') === '1';
    }
    if (p.get('numbers') === '0' || p.get('numbers') === '1') {
      this.showNumbers = p.get('numbers') === '1';
    }
    if (p.get('lines') === '0' || p.get('lines') === '1') {
      this.showLines = p.get('lines') === '1';
    }

    const mix = p.get('mix');
    if (mix) {
      try {
        const moves = mix.split(';').map((s) => s.split(',').map(Number));
        const base = Figures.generateBaseMoves(this.figure);
        if (this._isValidMoveOrder(moves, base)) this.activeMoves = moves;
      } catch { /* ignore */ }
    }

    const start = p.get('start');
    if (start) {
      const [c, r] = start.split(',').map((s) => parseInt(s, 10));
      if (Number.isInteger(c) && Number.isInteger(r) &&
          c >= 0 && c < this.W && r >= 0 && r < this.H) {
        this.lastStart = { col: c, row: r };
      }
    }
  }

  _saveToHash() {
    // Only write deviations from defaults — at the default state the URL
    // stays clean. mix only if the move order is shuffled vs the figure's
    // base; start only if the user has actually clicked a cell.
    const d = AppState.DEFAULTS;
    const params = new URLSearchParams();
    if (this.lang        !== d.lang)        params.set('lang', this.lang);
    if (this.W           !== d.W)           params.set('W', this.W);
    if (this.H           !== d.H)           params.set('H', this.H);
    if (this.figure      !== d.figure)      params.set('fig', this.figure);
    if (this.heuristic   !== d.heuristic)   params.set('heur', this.heuristic);
    if (this.symType     !== d.symType)     params.set('sym', this.symType);
    if (this.wantClosed  !== d.wantClosed)  params.set('closed',  this.wantClosed  ? '1' : '0');
    if (this.showNumbers !== d.showNumbers) params.set('numbers', this.showNumbers ? '1' : '0');
    if (this.showLines   !== d.showLines)   params.set('lines',   this.showLines   ? '1' : '0');
    const base = Figures.generateBaseMoves(this.figure);
    if (JSON.stringify(this.activeMoves) !== JSON.stringify(base)) {
      params.set('mix', this.activeMoves.map((m) => m.join(',')).join(';'));
    }
    if (this.lastStart) {
      params.set('start', `${this.lastStart.col},${this.lastStart.row}`);
    }

    const serialized = params.toString()
      .replace(/%2C/gi, ',')
      .replace(/%3B/gi, ';');
    const desiredHash = serialized ? '#' + serialized : '';
    const currentHash = window.location.hash;
    if (currentHash === desiredHash) return;
    if (desiredHash) {
      history.replaceState(null, '', desiredHash);
    } else {
      // Strip the fragment entirely so the URL shows just the page.
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }

  _isValidMoveOrder(saved, base) {
    if (!Array.isArray(saved) || saved.length !== base.length) return false;
    const baseKeys = new Set(base.map((m) => m.join(',')));
    const sawKeys = new Set();
    for (const m of saved) {
      if (!Array.isArray(m) || m.length !== 2) return false;
      if (!Number.isInteger(m[0]) || !Number.isInteger(m[1])) return false;
      const k = m.join(',');
      if (!baseKeys.has(k) || sawKeys.has(k)) return false;
      sawKeys.add(k);
    }
    return true;
  }
}
