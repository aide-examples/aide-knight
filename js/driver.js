// Driver pair — coordinates async, time-bounded search work over the
// Solver, keeping the main thread responsive:
//   - SearchDriver:    one Solver, chunked execution, live progress
//   - SensitivityScan: many Solvers (one per non-blocked cell), per-cell
//                      budget = theState.timeBudget, heatmap rendered
//
// Both use the same token-based cancellation pattern; both are owned by
// app.js and instantiated once at startup.

// SearchDriver — runs a Solver instance in time-bounded chunks so the
// browser main thread stays responsive.
//
// Lifecycle:
//   driver.start(solver)  — kick off a search; updates UI on progress
//   driver.invalidate()   — silently cancel the current chunk loop
//   driver.stop()         — cancel + write a 'stopped after N steps' status
//
// Cancellation uses a monotonic token: every (re)start or invalidate
// increments it; any in-flight chunk that sees a stale token exits without
// touching UI or renderer state. The driver pulls the time budget freshly
// each chunk from theState, so changing the budget mid-run is honoured.
//
// The driver does not own the Solver lifecycle; app.js decides whether to
// reuse an existing solver instance (for re-click-continue) or create a
// fresh one (for a settings change).

class SearchDriver {
  static CHUNK_MS = 50;  // chunk size; small enough to keep ~20fps repaints

  // Capture the DI references. No solver is held yet — that arrives via
  // .start() each search; the driver itself outlives individual searches.
  constructor(theState, theI18n, theUI, theRenderer) {
    this.theState = theState;
    this.theI18n = theI18n;
    this.theUI = theUI;
    this.theRenderer = theRenderer;
    this.solver = null;
    this.token = 0;
    this.startTime = 0;
  }

  // Begin (or resume) a search against the given Solver instance. Issues a
  // fresh cancellation token, shows the Stop button, and schedules the first
  // chunk after one repaint frame so any pre-search status text becomes
  // visible before the main thread enters the chunk loop.
  start(solver) {
    this.solver = solver;
    this.token++;
    const myToken = this.token;
    this.startTime = Date.now();
    this.theUI.showStopButton(true);
    // rAF + setTimeout: first frame paints any pre-search status (e.g. the
    // clicked coordinate); then the chunked loop starts on the next macrotask.
    requestAnimationFrame(() => setTimeout(() => this._chunk(myToken), 0));
  }

  // Silently cancel: any in-flight chunk sees a stale token and exits
  // without touching UI/renderer. Used when settings change makes the
  // current search irrelevant.
  invalidate() {
    this.token++;
    this.theUI.showStopButton(false);
  }

  // User-initiated stop: cancel like invalidate(), then publish a 'stopped
  // after N steps' status so the user sees the search did end.
  stop() {
    this.invalidate();
    const n = this.solver ? this.solver.steps : 0;
    this.theUI.setStatus(undefined, ['stopped', n]);
  }

  // One chunk of search work. Bails on stale token, checks the elapsed
  // time-budget, runs the solver for up to CHUNK_MS milliseconds, then
  // either reports a final outcome (found / exhausted / aborted) or
  // schedules the next chunk via setTimeout(0) — cooperative yield.
  _chunk(myToken) {
    if (myToken !== this.token) return;

    const elapsed = Date.now() - this.startTime;
    const budgetMs = this.theState.timeBudget * 1000;
    if (elapsed >= budgetMs) {
      this.theUI.showStopButton(false);
      this.theUI.setStatus(undefined, ['aborted', elapsed / 1000, this.solver.steps]);
      return;
    }

    const chunkMs = Math.min(SearchDriver.CHUNK_MS, budgetMs - elapsed);
    const r = this.solver.search(chunkMs);

    if (r.kind === 'found') {
      this.theUI.showStopButton(false);
      this.theRenderer.render(r.path, !!r.closed);
      this.theUI.setStatus(undefined, ['solution', r.steps]);
      this.theUI.showSensitivityButton(true);
      return;
    }
    if (r.kind === 'exhausted') {
      this.theUI.showStopButton(false);
      this.theUI.setStatus(undefined, ['noSolution', r.steps]);
      return;
    }
    // timeout → keep going with live progress
    this.theUI.setStatus(undefined, ['searching', r.steps, elapsed / 1000]);
    setTimeout(() => this._chunk(myToken), 0);
  }
}

// SensitivityScan — runs a fresh Solver for every non-blocked cell with
// theState.timeBudget per cell, writes the step count (or null on budget-
// exhaustion) into the cell as a heatmap+number. Async with cooperative
// yields between chunks AND between cells so the Stop button + UI stay
// responsive throughout.

class SensitivityScan {
  // Capture DI references; no work happens until .run() is called.
  constructor(theState, theI18n, theUI, theRenderer) {
    this.theState = theState;
    this.theI18n = theI18n;
    this.theUI = theUI;
    this.theRenderer = theRenderer;
    this._token = 0;
    this._active = false;
  }

  // True while a scan is in progress. App.js checks this on every cell
  // click so a click cancels an in-progress scan instead of fighting it.
  isActive() { return this._active; }

  // Stop the scan: bump the token (so any pending awaits exit on next yield)
  // and restore the normal Stop/Sensitivity button visibility.
  cancel() {
    this._token++;
    this._active = false;
    this.theUI.showStopButton(false);
    this.theUI.showSensitivityButton(true);
  }

  // Sweep every non-blocked start cell. For each, run a budget-bounded
  // search and record either the step count of the first solution or null
  // for "no solution within budget". The heatmap is rendered incrementally
  // — every new sample triggers a recolor pass so the min/max log bounds
  // stay normalized as samples arrive.
  async run() {
    if (this._active) return;
    this._token++;
    const myToken = this._token;
    this._active = true;
    this.theRenderer.clearSensitivity();
    this.theUI.showStopButton(true);
    this.theUI.showSensitivityButton(false);

    const cells = [];
    for (let row = 0; row < this.theState.H; row++) {
      for (let col = 0; col < this.theState.W; col++) {
        if (!this.theState.blockedCells.has(`${col},${row}`)) cells.push([col, row]);
      }
    }

    const results = new Map();
    const budgetMs = this.theState.timeBudget * 1000;

    for (let i = 0; i < cells.length; i++) {
      if (myToken !== this._token) return;
      const [col, row] = cells[i];
      this.theUI.setStatus(undefined, ['sensitivityRunning', i + 1, cells.length]);

      const value = await this._scanOneCell(col, row, myToken, budgetMs);
      if (myToken !== this._token) return;

      results.set(`${col},${row}`, value);
      let minLog = Infinity, maxLog = -Infinity;
      for (const v of results.values()) {
        if (v == null) continue;
        const lv = Math.log(v + 1);
        if (lv < minLog) minLog = lv;
        if (lv > maxLog) maxLog = lv;
      }
      this.theRenderer.recolorSensitivity(results, minLog, maxLog);
      this.theRenderer.setSensitivityCell(col, row, value, minLog, maxLog);
      await new Promise((r) => setTimeout(r, 0));
    }

    this._active = false;
    this.theUI.showStopButton(false);
    this.theUI.showSensitivityButton(true);
    this.theUI.setStatus(undefined, ['sensitivityDone', cells.length]);
  }

  // Run one budget-bounded search from (col, row). Yields to the event
  // loop between chunks so the Stop button and UI remain responsive.
  // Returns the step count on success, or null on timeout / exhaustion /
  // cancellation.
  async _scanOneCell(col, row, myToken, budgetMs) {
    const s = this.theState;
    const solver = new Solver(s.W, s.H, s.activeMoves, col, row, {
      heuristic: s.heuristic, closed: s.wantClosed,
      sym: s.symType, blocked: s.blockedCells,
    });
    const start = Date.now();
    while (true) {
      if (myToken !== this._token) return null;
      const remaining = budgetMs - (Date.now() - start);
      if (remaining <= 0) return null;
      const r = solver.search(Math.min(50, remaining));
      if (r.kind === 'found') return r.steps;
      if (r.kind === 'exhausted') return null;
      await new Promise((res) => setTimeout(res, 0));
    }
  }
}
