// App — orchestration. Instantiates singletons, wires UI events to state
// mutations and to Board/Renderer/Solver actions, runs initial setup.
//
// Loaded last in index.html so all module classes are defined when the IIFE
// runs.

(function () {
  const i18n  = I18n.getInstance();
  const state = AppState.getInstance();
  state.load();
  i18n.setLanguage(state.lang);  // sync I18n to whatever load picked

  const ui       = new UI();
  const board    = new Board(ui.boardEl);
  const renderer = new Renderer(board);

  function rebuildBoard() {
    state.lastStart = null;
    board.setDimensions(state.W, state.H);
    ui.refreshSymmetryOptions();
    ui.setStatus(i18n.t('clickPrompt'), '');
    state.save();
  }

  // Click handler — yields via double-rAF so the clicked coords paint to
  // the screen before the solver blocks the main thread (JS is single-
  // threaded; a synchronous solve() after a DOM mutation would otherwise
  // suppress the intermediate paint).
  function onCellClick(col, row) {
    state.lastStart = { col, row };
    state.save();  // keeps the URL hash in sync for replay
    ui.setStatus(`${col} / ${row}`, '');
    renderer.clear();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const result = Solver.solve(state.W, state.H, state.activeMoves, col, row, {
        heuristic: state.heuristic,
        closed:    state.wantClosed,
        sym:       state.symType,
        blocked:   state.blockedCells,
      });
      if (result.path) {
        renderer.render(result.path, !!result.closed);
        ui.setStatus(undefined, i18n.t('solution', result.steps));
      } else {
        ui.setStatus(undefined, i18n.t('noSolution', result.steps));
      }
    }));
  }

  function resolveLast() {
    if (state.lastStart) onCellClick(state.lastStart.col, state.lastStart.row);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- Event wiring ---

  // Re-apply translations whenever the language changes (catches both the
  // dropdown event and any future hash-driven changes).
  i18n.subscribe(() => {
    ui.applyI18n();
    board.applyI18n();
  });

  ui.onLangChange = (code) => {
    state.lang = code;
    i18n.setLanguage(code);  // triggers subscribers (incl. ui.applyI18n)
    state.save();
  };

  ui.onDimensionChange = (W, H) => {
    if (W === state.W && H === state.H) return;
    state.W = W;
    state.H = H;
    // Prune out-of-bounds blocks: cells that no longer fit on the smaller board.
    const filtered = new Set();
    for (const k of state.blockedCells) {
      const [c, r] = k.split(',').map(Number);
      if (c >= 0 && c < W && r >= 0 && r < H) filtered.add(k);
    }
    state.blockedCells = filtered;
    state.save();
    rebuildBoard();
  };

  ui.onHeuristicChange = (h) => {
    state.heuristic = h;
    state.save();
    resolveLast();
  };

  ui.onFigureChange = (f) => {
    state.figure = f;
    state.activeMoves = Figures.generateBaseMoves(f);
    state.save();
    ui.updateMixTooltip();
    rebuildBoard();
  };

  ui.onMixClick = () => {
    state.activeMoves = shuffle(state.activeMoves);
    state.save();
    ui.updateMixTooltip();
    resolveLast();
  };

  ui.onShowNumbersChange = (v) => {
    state.showNumbers = v;
    state.save();
    board.applyVisibility();
  };

  ui.onShowLinesChange = (v) => {
    state.showLines = v;
    state.save();
    board.applyVisibility();
  };

  ui.onWantClosedChange = (v) => {
    state.wantClosed = v;
    state.save();
    resolveLast();
  };

  ui.onSymTypeChange = (sym) => {
    state.symType = sym;
    state.save();
    ui.syncClosedUiWithSymmetry();
    resolveLast();
  };

  // Right-click / long-press / Shift+Enter on a cell toggles its blocked
  // status. Under an active symmetry, the orbit is auto-extended so the
  // block set stays symmetry-compatible — the user sees N cells flip at
  // once (2 for axisV/point, 4 for rot90).
  function onCellBlock(col, row) {
    const orbit = state.symType !== 'none'
      ? Solver.symOrbit(col, row, state.symType, state.W, state.H)
      : [[col, row]];
    const key0 = `${col},${row}`;
    const wasBlocked = state.blockedCells.has(key0);
    for (const [c, r] of orbit) {
      const key = `${c},${r}`;
      if (wasBlocked) state.blockedCells.delete(key);
      else            state.blockedCells.add(key);
    }
    // Toggling invalidates any current tour; clear and let the user re-click.
    state.lastStart = null;
    state.save();
    board.applyBlockClasses();
    renderer.clear();
    ui.setStatus(i18n.t('clickPrompt'), '');
  }

  board.setOnCellClick(onCellClick);
  board.setOnCellBlock(onCellBlock);

  // Click on the page title resets every setting to its default. Useful when
  // the URL hash has accumulated a shuffle / closed / symmetry combination
  // and the user wants a clean slate. Tooltip surfaces the affordance.
  ui.titleEl.addEventListener('click', () => {
    Object.assign(state, AppState.DEFAULTS);
    state.activeMoves = Figures.generateBaseMoves(state.figure);
    state.lastStart = null;
    state.blockedCells = new Set();
    i18n.setLanguage(state.lang);  // triggers i18n subscribers (ui + board)
    ui.applyState();
    rebuildBoard();
  });

  // --- Initial setup ---
  ui.applyI18n();
  ui.applyState();
  ui.bindHandlers();

  // First-time-from-URL: if the loaded state has a lastStart from the hash,
  // build the board for state.W/H but DON'T null lastStart (rebuildBoard
  // would), then auto-trigger the solve. Otherwise just rebuild normally.
  const hashStart = state.lastStart;
  if (hashStart) {
    board.setDimensions(state.W, state.H);
    ui.refreshSymmetryOptions();
    ui.setStatus(i18n.t('clickPrompt'), '');
    onCellClick(hashStart.col, hashStart.row);
  } else {
    rebuildBoard();
  }
})();
