// AppState — single source of truth for all app settings.
//
// Holds W, H, heuristic, figure, activeMoves (move definition order, possibly
// shuffled), showNumbers, showLines, wantClosed, symType. Persistence is via
// localStorage in B1. URL-hash deep-linking will be added in B2 (Phase 7.5).
//
// Singleton: AppState.getInstance(). State mutations should go through
// the .set / .setMoveOrder methods so save() runs automatically.

class AppState {
  constructor() {
    this.W = 8;
    this.H = 8;
    this.heuristic = 'warnsdorff';
    this.figure = '1,2';
    this.activeMoves = Figures.generateBaseMoves(this.figure);
    this.showNumbers = true;
    this.showLines = true;
    this.wantClosed = false;
    this.symType = 'none';
  }

  static STATE_KEY = 'aide-knight-state-v1';

  static getInstance() {
    if (!AppState._instance) AppState._instance = new AppState();
    return AppState._instance;
  }

  load() {
    try {
      const raw = localStorage.getItem(AppState.STATE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
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

  save() {
    try {
      localStorage.setItem(AppState.STATE_KEY, JSON.stringify({
        W: this.W, H: this.H,
        heuristic: this.heuristic, figure: this.figure,
        moveOrder: this.activeMoves,
        showNumbers: this.showNumbers, showLines: this.showLines,
        wantClosed: this.wantClosed, symType: this.symType,
      }));
    } catch { /* ignore — non-persistent mode */ }
  }

  _isValidMoveOrder(saved, base) {
    if (!Array.isArray(saved) || saved.length !== base.length) return false;
    const baseKeys = new Set(base.map((m) => m.join(',')));
    const sawKeys = new Set();
    for (const m of saved) {
      if (!Array.isArray(m) || m.length !== 2) return false;
      const k = m.join(',');
      if (!baseKeys.has(k) || sawKeys.has(k)) return false;
      sawKeys.add(k);
    }
    return true;
  }
}
