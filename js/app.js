// App — orchestration. Instantiates the application's services at the
// entry point ('theX' convention — see T_CONTRACT.md section 1: DI instead
// of Singletons), wires UI events to state mutations and to Board /
// Renderer / Solver actions, runs initial setup.
//
// Search execution (Phase 9):
//   - Solver instance is kept alive across clicks. A click with the SAME
//     start cell + same settings reuses the instance, so .search() resumes
//     from where the last one left off (re-click = next tour; continue
//     after a Stop / budget abort).
//   - SearchDriver runs Solver in time-bounded chunks; the browser stays
//     responsive, the UI shows live progress, the user can press Stop or
//     wait for the configurable time budget.

(function () {
  const theI18n     = new I18n();
  const theState    = new AppState(theI18n);
  theState.load();
  theI18n.setLanguage(theState.lang);

  const theUI       = new UI(theI18n, theState);
  const theBoard    = new Board(theUI.boardEl, theI18n, theState);
  const theRenderer = new Renderer(theBoard);
  const theDriver       = new SearchDriver(theState, theI18n, theUI, theRenderer);
  const theSensitivity  = new SensitivityScan(theState, theI18n, theUI, theRenderer);

  // --- Solver lifecycle ---
  let currentSolver    = null;
  let currentSolverKey = null;

  function solverKey(col, row) {
    return JSON.stringify({
      W: theState.W, H: theState.H, col, row,
      heuristic: theState.heuristic,
      closed: theState.wantClosed,
      sym: theState.symType,
      figure: theState.figure,
      moves: theState.activeMoves,
      blocked: Array.from(theState.blockedCells).sort(),
    });
  }

  // Anything that changes the solver's setup (heuristic, figure, mix, sym,
  // closed, blocks, board geometry) invalidates the kept-alive solver.
  function dropSolver() {
    theDriver.invalidate();
    currentSolver = null;
    currentSolverKey = null;
  }

  function rebuildBoard() {
    theState.lastStart = null;
    dropSolver();
    theSensitivity.cancel();
    theUI.showSensitivityButton(false);
    theBoard.setDimensions(theState.W, theState.H);
    theUI.refreshSymmetryOptions();
    theUI.setStatus(['clickPrompt'], '');
    theState.save();
  }

  function onCellClick(col, row) {
    // Any user click cancels an ongoing sensitivity scan and clears
    // the heatmap so the regular tour can be rendered fresh.
    if (theSensitivity.isActive()) theSensitivity.cancel();
    theRenderer.clearSensitivity();
    theUI.showSensitivityButton(false);

    theState.lastStart = { col, row };
    theState.save();
    theUI.setStatus(`${col} / ${row}`, '');
    theRenderer.clear();

    const key = solverKey(col, row);
    if (key !== currentSolverKey) {
      currentSolver = new Solver(theState.W, theState.H, theState.activeMoves, col, row, {
        heuristic: theState.heuristic,
        closed:    theState.wantClosed,
        sym:       theState.symType,
        blocked:   theState.blockedCells,
      });
      currentSolverKey = key;
    }
    theDriver.start(currentSolver);
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

  theI18n.subscribe(() => {
    theUI.applyI18n();
    theBoard.applyI18n();
  });

  theUI.onLangChange = (code) => {
    theState.lang = code;
    theI18n.setLanguage(code);
    theState.save();
  };

  theUI.onDimensionChange = (W, H) => {
    if (W === theState.W && H === theState.H) return;
    theState.W = W;
    theState.H = H;
    const filtered = new Set();
    for (const k of theState.blockedCells) {
      const [c, r] = k.split(',').map(Number);
      if (c >= 0 && c < W && r >= 0 && r < H) filtered.add(k);
    }
    theState.blockedCells = filtered;
    theState.save();
    rebuildBoard();
  };

  theUI.onTimeBudgetChange = (v) => {
    theState.timeBudget = v;
    theState.save();
    // Don't restart an in-flight search; it'll see the new budget at the
    // next chunk and may abort sooner.
  };

  theUI.onHeuristicChange = (h) => {
    theState.heuristic = h;
    theState.save();
    dropSolver();
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
    dropSolver();
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
    dropSolver();
    resolveLast();
  };

  theUI.onSymTypeChange = (sym) => {
    theState.symType = sym;
    theState.save();
    theUI.syncClosedUiWithSymmetry();
    dropSolver();
    resolveLast();
  };

  theUI.onStopClick = () => {
    if (theSensitivity.isActive()) {
      theSensitivity.cancel();
      theUI.setStatus(undefined, ['stopped', 0]);
    } else {
      theDriver.stop();
    }
  };

  theUI.onSensitivityClick = () => {
    dropSolver();           // sensitivity replaces the current tour view
    theRenderer.clear();
    theSensitivity.run();   // async, fire-and-forget; UI updated as it progresses
  };

  // Right-click / long-press / Shift+Enter toggles cell-blocked status,
  // orbit-extended under an active symmetry.
  function onCellBlock(col, row) {
    const orbit = theState.symType !== 'none'
      ? Sym.orbit(col, row, theState.symType, theState.W, theState.H)
      : [[col, row]];
    const key0 = `${col},${row}`;
    const wasBlocked = theState.blockedCells.has(key0);
    for (const [c, r] of orbit) {
      const key = `${c},${r}`;
      if (wasBlocked) theState.blockedCells.delete(key);
      else            theState.blockedCells.add(key);
    }
    theState.lastStart = null;
    theState.save();
    theBoard.applyBlockClasses();
    theRenderer.clear();
    dropSolver();
    theUI.setStatus(['clickPrompt'], '');
  }

  theBoard.setOnCellClick(onCellClick);
  theBoard.setOnCellBlock(onCellBlock);

  theUI.titleEl.addEventListener('click', () => {
    Object.assign(theState, AppState.DEFAULTS);
    theState.activeMoves = Figures.generateBaseMoves(theState.figure);
    theState.lastStart = null;
    theState.blockedCells = new Set();
    theI18n.setLanguage(theState.lang);
    theUI.applyState();
    rebuildBoard();
  });

  // --- Initial setup ---
  theUI.applyI18n();
  theUI.applyState();
  theUI.bindHandlers();

  const hashStart = theState.lastStart;
  if (hashStart) {
    theBoard.setDimensions(theState.W, theState.H);
    theUI.refreshSymmetryOptions();
    theUI.setStatus(['clickPrompt'], '');
    onCellClick(hashStart.col, hashStart.row);
  } else {
    rebuildBoard();
  }
})();
