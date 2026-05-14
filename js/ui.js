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
  constructor() {
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
    this.lblHeuristic    = document.getElementById('lbl-heuristic');
    this.lblFigure       = document.getElementById('lbl-figure');
    this.lblNumbers      = document.getElementById('lbl-numbers');
    this.lblLines        = document.getElementById('lbl-lines');
    this.lblClosed       = document.getElementById('lbl-closed');
    this.lblSymmetry     = document.getElementById('lbl-symmetry');

    this.onDimensionChange = null;
    this.onHeuristicChange = null;
    this.onFigureChange    = null;
    this.onMixClick        = null;
    this.onShowNumbersChange = null;
    this.onShowLinesChange   = null;
    this.onWantClosedChange  = null;
    this.onSymTypeChange     = null;
  }

  applyI18n() {
    const t = I18n.getInstance();
    this.titleEl.textContent      = t.t('title');
    this.lblHeuristic.textContent = t.t('heuristicLabel');
    this.lblFigure.textContent    = t.t('figureLabel');
    this.mixBtn.textContent       = t.t('mixBtn');
    this.lblNumbers.textContent   = t.t('numbersLabel');
    this.lblLines.textContent     = t.t('linesLabel');
    this.lblClosed.textContent    = t.t('closedLabel');
    this.lblSymmetry.textContent  = t.t('symmetryLabel');
  }

  applyState() {
    const s = AppState.getInstance();
    this.wInput.value          = s.W;
    this.hInput.value          = s.H;
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
    const s = AppState.getInstance();
    this.mixBtn.title = s.activeMoves.map(([dx, dy]) => `(${dx},${dy})`).join('  ');
  }

  // Disable symmetry options that aren't valid for the current W/H. If the
  // current selection becomes invalid, fall back to 'none'.
  refreshSymmetryOptions() {
    const s = AppState.getInstance();
    for (const opt of this.symmetrySelect.options) {
      opt.disabled = !Solver.isSymTypeValid(opt.value, s.W, s.H);
    }
    if (!Solver.isSymTypeValid(s.symType, s.W, s.H)) {
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
    const s = AppState.getInstance();
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
}
