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

  constructor(theState, theI18n, theUI, theRenderer) {
    this.theState = theState;
    this.theI18n = theI18n;
    this.theUI = theUI;
    this.theRenderer = theRenderer;
    this.solver = null;
    this.token = 0;
    this.startTime = 0;
  }

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

  invalidate() {
    this.token++;
    this.theUI.showStopButton(false);
  }

  stop() {
    this.invalidate();
    const n = this.solver ? this.solver.steps : 0;
    this.theUI.setStatus(undefined, this.theI18n.t('stopped', n));
  }

  _chunk(myToken) {
    if (myToken !== this.token) return;

    const elapsed = Date.now() - this.startTime;
    const budgetMs = this.theState.timeBudget * 1000;
    if (elapsed >= budgetMs) {
      this.theUI.showStopButton(false);
      this.theUI.setStatus(undefined, this.theI18n.t('aborted', elapsed / 1000, this.solver.steps));
      return;
    }

    const chunkMs = Math.min(SearchDriver.CHUNK_MS, budgetMs - elapsed);
    const r = this.solver.search(chunkMs);

    if (r.kind === 'found') {
      this.theUI.showStopButton(false);
      this.theRenderer.render(r.path, !!r.closed);
      this.theUI.setStatus(undefined, this.theI18n.t('solution', r.steps));
      return;
    }
    if (r.kind === 'exhausted') {
      this.theUI.showStopButton(false);
      this.theUI.setStatus(undefined, this.theI18n.t('noSolution', r.steps));
      return;
    }
    // timeout → keep going with live progress
    this.theUI.setStatus(undefined, this.theI18n.t('searching', r.steps, elapsed / 1000));
    setTimeout(() => this._chunk(myToken), 0);
  }
}
