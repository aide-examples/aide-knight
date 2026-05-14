// App — orchestration. Instantiates the application's services at the
// entry point ('theX' convention — see T_CONTRACT.md section 1: DI instead
// of Singletons), wires UI events to state mutations and to Board /
// Renderer / Solver actions, runs initial setup.
//
// Loaded last in index.html so all module classes are defined when the IIFE
// runs.

(function () {
  // --- Service instantiation (DI entry point) ---
  // Each service is created exactly once here; their references are then
  // passed explicitly to whoever needs them. No `static getInstance()` —
  // dependency graph is visible in this file.
  const theI18n     = new I18n();
  const theState    = new AppState(theI18n);
  theState.load();
  theI18n.setLanguage(theState.lang);   // align i18n with what load picked up

  const theUI       = new UI(theI18n, theState);
  const theBoard    = new Board(theUI.boardEl, theI18n, theState);
  const theRenderer = new Renderer(theBoard);

  function rebuildBoard() {
    theState.lastStart = null;
    theBoard.setDimensions(theState.W, theState.H);
    theUI.refreshSymmetryOptions();
    theUI.setStatus(theI18n.t('clickPrompt'), '');
    theState.save();
  }

  // Click handler — yields via double-rAF so the clicked coords paint to
  // the screen before the solver blocks the main thread (JS is single-
  // threaded; a synchronous solve() after a DOM mutation would otherwise
  // suppress the intermediate paint).
  function onCellClick(col, row) {
    theState.lastStart = { col, row };
    theState.save();  // keeps the URL hash in sync for replay
    theUI.setStatus(`${col} / ${row}`, '');
    theRenderer.clear();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const result = Solver.solve(theState.W, theState.H, theState.activeMoves, col, row, {
        heuristic: theState.heuristic,
        closed:    theState.wantClosed,
        sym:       theState.symType,
        blocked:   theState.blockedCells,
      });
      if (result.path) {
        theRenderer.render(result.path, !!result.closed);
        theUI.setStatus(undefined, theI18n.t('solution', result.steps));
      } else {
        theUI.setStatus(undefined, theI18n.t('noSolution', result.steps));
      }
    }));
  }

  function resolveLast() {
    if (theState.lastStart) onCellClick(theState.lastStart.col, theState.lastStart.row);
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
  theI18n.subscribe(() => {
    theUI.applyI18n();
    theBoard.applyI18n();
  });

  theUI.onLangChange = (code) => {
    theState.lang = code;
    theI18n.setLanguage(code);  // triggers subscribers (incl. ui.applyI18n)
    theState.save();
  };

  theUI.onDimensionChange = (W, H) => {
    if (W === theState.W && H === theState.H) return;
    theState.W = W;
    theState.H = H;
    // Prune out-of-bounds blocks: cells that no longer fit on the smaller board.
    const filtered = new Set();
    for (const k of theState.blockedCells) {
      const [c, r] = k.split(',').map(Number);
      if (c >= 0 && c < W && r >= 0 && r < H) filtered.add(k);
    }
    theState.blockedCells = filtered;
    theState.save();
    rebuildBoard();
  };

  theUI.onHeuristicChange = (h) => {
    theState.heuristic = h;
    theState.save();
    resolveLast();
  };

  theUI.onFigureChange = (f) => {
    theState.figure = f;
    theState.activeMoves = Figures.generateBaseMoves(f);
    theState.save();
    theUI.updateMixTooltip();
    rebuildBoard();
  };

  theUI.onMixClick = () => {
    theState.activeMoves = shuffle(theState.activeMoves);
    theState.save();
    theUI.updateMixTooltip();
    resolveLast();
  };

  theUI.onShowNumbersChange = (v) => {
    theState.showNumbers = v;
    theState.save();
    theBoard.applyVisibility();
  };

  theUI.onShowLinesChange = (v) => {
    theState.showLines = v;
    theState.save();
    theBoard.applyVisibility();
  };

  theUI.onWantClosedChange = (v) => {
    theState.wantClosed = v;
    theState.save();
    resolveLast();
  };

  theUI.onSymTypeChange = (sym) => {
    theState.symType = sym;
    theState.save();
    theUI.syncClosedUiWithSymmetry();
    resolveLast();
  };

  // Right-click / long-press / Shift+Enter on a cell toggles its blocked
  // status. Under an active symmetry, the orbit is auto-extended so the
  // block set stays symmetry-compatible — the user sees N cells flip at
  // once (2 for axisV/point, 4 for rot90).
  function onCellBlock(col, row) {
    const orbit = theState.symType !== 'none'
      ? Solver.symOrbit(col, row, theState.symType, theState.W, theState.H)
      : [[col, row]];
    const key0 = `${col},${row}`;
    const wasBlocked = theState.blockedCells.has(key0);
    for (const [c, r] of orbit) {
      const key = `${c},${r}`;
      if (wasBlocked) theState.blockedCells.delete(key);
      else            theState.blockedCells.add(key);
    }
    // Toggling invalidates any current tour; clear and let the user re-click.
    theState.lastStart = null;
    theState.save();
    theBoard.applyBlockClasses();
    theRenderer.clear();
    theUI.setStatus(theI18n.t('clickPrompt'), '');
  }

  theBoard.setOnCellClick(onCellClick);
  theBoard.setOnCellBlock(onCellBlock);

  // Click on the page title resets every setting to its default. Useful when
  // the URL hash has accumulated a shuffle / closed / symmetry combination
  // and the user wants a clean slate. Tooltip surfaces the affordance.
  theUI.titleEl.addEventListener('click', () => {
    Object.assign(theState, AppState.DEFAULTS);
    theState.activeMoves = Figures.generateBaseMoves(theState.figure);
    theState.lastStart = null;
    theState.blockedCells = new Set();
    theI18n.setLanguage(theState.lang);  // triggers i18n subscribers (ui + board)
    theUI.applyState();
    rebuildBoard();
  });

  // --- Initial setup ---
  theUI.applyI18n();
  theUI.applyState();
  theUI.bindHandlers();

  // First-time-from-URL: if the loaded state has a lastStart from the hash,
  // build the board for state.W/H but DON'T null lastStart (rebuildBoard
  // would), then auto-trigger the solve. Otherwise just rebuild normally.
  const hashStart = theState.lastStart;
  if (hashStart) {
    theBoard.setDimensions(theState.W, theState.H);
    theUI.refreshSymmetryOptions();
    theUI.setStatus(theI18n.t('clickPrompt'), '');
    onCellClick(hashStart.col, hashStart.row);
  } else {
    rebuildBoard();
  }
})();
