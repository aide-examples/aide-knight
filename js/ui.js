// UI — DOM control wiring.
//
// Looks up all the input/select/checkbox/button/label elements once at
// construction, then exposes:
//  - applyI18n()  : push current i18n strings to all labels and button texts
//  - applyState() : reflect AppState into form controls
//  - bindHandlers() with on* callback slots that App fills in
//  - small helpers: setStatus, updateMixTooltip, refreshSymmetryOptions,
//    syncClosedUiWithSymmetry

class UI {
  constructor(theI18n, theState) {
    this.theI18n = theI18n;
    this.theState = theState;
    this.boardEl         = document.getElementById('board');
    this.titleEl         = document.getElementById('title');
    this.statusEl        = document.getElementById('status');
    this.status2El       = document.getElementById('status2');
    this.wInput          = document.getElementById('w-input');
    this.hInput          = document.getElementById('h-input');
    this.heuristicSelect = document.getElementById('heuristic-select');
    this.figureSelect    = document.getElementById('figure-select');
    this.mixBtn          = document.getElementById('mix-btn');
    this.showNumbersBox  = document.getElementById('show-numbers');
    this.showLinesBox    = document.getElementById('show-lines');
    this.wantClosedBox   = document.getElementById('want-closed');
    this.symmetrySelect  = document.getElementById('symmetry-select');
    this.langSelect      = document.getElementById('lang-select');
    this.timeBudgetInput = document.getElementById('time-budget-input');
    this.stopBtn         = document.getElementById('stop-btn');

    this.onDimensionChange  = null;
    this.onLangChange       = null;
    this.onTimeBudgetChange = null;
    this.onHeuristicChange  = null;
    this.onFigureChange     = null;
    this.onMixClick         = null;
    this.onShowNumbersChange = null;
    this.onShowLinesChange   = null;
    this.onWantClosedChange  = null;
    this.onSymTypeChange     = null;
    this.onStopClick         = null;
  }

  // Push current i18n strings to all elements with a data-i18n attribute,
  // plus the document title. The title bar is not a data-i18n element so
  // we set it explicitly.
  applyI18n() {
    const t = this.theI18n;
    document.title = t.t('title');
    for (const el of document.querySelectorAll('[data-i18n]')) {
      el.textContent = t.t(el.dataset.i18n);
    }
    // titleEl is the visible <h1>, also driven by data-i18n once we add it,
    // but for now set explicitly since it has no data-i18n attribute yet.
    this.titleEl.textContent = t.t('title');
    this.titleEl.title       = t.t('resetTooltip');
  }

  applyState() {
    const s = this.theState;
    this.langSelect.value      = s.lang;
    this.wInput.value          = s.W;
    this.hInput.value          = s.H;
    this.timeBudgetInput.value = s.timeBudget;
    this.heuristicSelect.value = s.heuristic;
    this.figureSelect.value    = s.figure;
    this.showNumbersBox.checked = s.showNumbers;
    this.showLinesBox.checked   = s.showLines;
    this.wantClosedBox.checked  = s.wantClosed;
    this.symmetrySelect.value   = s.symType;
    this.updateMixTooltip();
    this.refreshSymmetryOptions();
  }

  bindHandlers() {
    const readDims = () => {
      const newW = Math.max(1, parseInt(this.wInput.value, 10) || 8);
      const newH = Math.max(1, parseInt(this.hInput.value, 10) || 8);
      this.wInput.value = newW;
      this.hInput.value = newH;
      return { W: newW, H: newH };
    };

    for (const inp of [this.wInput, this.hInput]) {
      inp.addEventListener('change', () => {
        const { W, H } = readDims();
        if (this.onDimensionChange) this.onDimensionChange(W, H);
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        inp.blur();
        const { W, H } = readDims();
        if (this.onDimensionChange) this.onDimensionChange(W, H);
      });
    }

    this.langSelect.addEventListener('change', () => {
      if (this.onLangChange) this.onLangChange(this.langSelect.value);
    });

    const readBudget = () => {
      const v = Math.max(1, parseInt(this.timeBudgetInput.value, 10) || 10);
      this.timeBudgetInput.value = v;
      return v;
    };
    this.timeBudgetInput.addEventListener('change', () => {
      const v = readBudget();
      if (this.onTimeBudgetChange) this.onTimeBudgetChange(v);
    });
    this.timeBudgetInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      this.timeBudgetInput.blur();
      if (this.onTimeBudgetChange) this.onTimeBudgetChange(readBudget());
    });

    this.stopBtn.addEventListener('click', () => {
      if (this.onStopClick) this.onStopClick();
    });
    this.heuristicSelect.addEventListener('change', () => {
      if (this.onHeuristicChange) this.onHeuristicChange(this.heuristicSelect.value);
    });
    this.figureSelect.addEventListener('change', () => {
      if (this.onFigureChange) this.onFigureChange(this.figureSelect.value);
    });
    this.mixBtn.addEventListener('click', () => {
      if (this.onMixClick) this.onMixClick();
    });
    this.showNumbersBox.addEventListener('change', () => {
      if (this.onShowNumbersChange) this.onShowNumbersChange(this.showNumbersBox.checked);
    });
    this.showLinesBox.addEventListener('change', () => {
      if (this.onShowLinesChange) this.onShowLinesChange(this.showLinesBox.checked);
    });
    this.wantClosedBox.addEventListener('change', () => {
      if (this.onWantClosedChange) this.onWantClosedChange(this.wantClosedBox.checked);
    });
    this.symmetrySelect.addEventListener('change', () => {
      if (this.onSymTypeChange) this.onSymTypeChange(this.symmetrySelect.value);
    });
  }

  updateMixTooltip() {
    const s = this.theState;
    this.mixBtn.title = s.activeMoves.map(([dx, dy]) => `(${dx},${dy})`).join('  ');
  }

  // Disable symmetry options that aren't valid for the current W/H. If the
  // current selection becomes invalid, fall back to 'none'.
  refreshSymmetryOptions() {
    const s = this.theState;
    for (const opt of this.symmetrySelect.options) {
      opt.disabled = !Sym.isValid(opt.value, s.W, s.H);
    }
    if (!Sym.isValid(s.symType, s.W, s.H)) {
      s.symType = 'none';
      this.symmetrySelect.value = 'none';
      s.save();
    }
    this.syncClosedUiWithSymmetry();
  }

  // Symmetry implies closed: when a symmetry is active, force the Closed
  // checkbox to checked + disabled. The underlying state.wantClosed value
  // is preserved and restored when symmetry returns to 'none'.
  syncClosedUiWithSymmetry() {
    const s = this.theState;
    if (s.symType !== 'none') {
      this.wantClosedBox.checked  = true;
      this.wantClosedBox.disabled = true;
    } else {
      this.wantClosedBox.disabled = false;
      this.wantClosedBox.checked  = s.wantClosed;
    }
  }

  setStatus(line1, line2) {
    if (line1 !== undefined) this.statusEl.textContent  = line1;
    if (line2 !== undefined) this.status2El.textContent = line2;
  }

  showStopButton(visible) {
    this.stopBtn.hidden = !visible;
  }
}
