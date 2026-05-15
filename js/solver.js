// Solver — iterative DFS with heuristic ordering, closure bias, and
// symmetry-aware orbit propagation.
//
// Two usage patterns:
//   1. Static `Solver.solve(W, H, moves, sc, sr, opts)` — runs to the first
//      solution (or exhaustion) synchronously. For tests and replay scripts.
//   2. Instance `new Solver(...)` + `.search(maxMs)` — chunked execution
//      bounded by wall-clock time. Calling .search() again after a 'found'
//      result silently backtracks one step and continues, yielding the
//      NEXT solution. This is the "re-click = next tour" mechanism.
//
// Search outcomes from .search():
//   { kind: 'found',     path, steps, closed } — tour found this chunk
//   { kind: 'exhausted', steps }               — search space empty
//   { kind: 'timeout',   steps }               — maxMs reached, resumable
//
// `steps` accumulates across all .search() calls on this instance.

class Solver {
  // Static convenience: run a fresh solver to completion. Used by tests.
  static solve(W, H, moves, startCol, startRow, opts = {}) {
    const s = new Solver(W, H, moves, startCol, startRow, opts);
    while (true) {
      const r = s.search(Infinity);
      if (r.kind === 'found')     return { path: r.path, steps: r.steps, closed: r.closed };
      if (r.kind === 'exhausted') return { path: null, steps: r.steps };
    }
  }

  // Allocate a fresh search state for the given board + start cell + options.
  // The actual setup (padded visited array, closure-bias mask, initial stack
  // frame) happens in _init, called at the bottom of the constructor.
  // Options:
  //   heuristic : 'warnsdorff' | 'outsideIn' | 'bruteForce'  (default warnsdorff)
  //   closed    : boolean — require closed tour
  //   sym       : 'none' | 'axisV' | 'point' | 'rot90'      (implies closed)
  //   blocked   : Set<"c,r"> of blocked cells
  constructor(W, H, moves, startCol, startRow, opts = {}) {
    this.W = W; this.H = H;
    this.moves = moves;
    this.startCol = startCol; this.startRow = startRow;
    this.heuristic = opts.heuristic || 'warnsdorff';
    this.closed = !!opts.closed;
    this.sym = opts.sym || 'none';
    this.blocked = (opts.blocked instanceof Set) ? opts.blocked : new Set();
    this.wantsClosure = this.closed || this.sym !== 'none';

    this.steps = 0;
    this.done = false;
    this.foundLast = false;
    this.invalid = false;
    this.path = null;
    this.stack = null;
    this.visited = null;
    this.startNbrs = null;
    this.closureBias = null;

    this._init();
  }

  // One-shot setup of every search-state field. After this returns either
  // `invalid` is set (infeasible config → search exhausted immediately) or
  // the visited/path/stack arrays are ready and search() can run.
  //
  // Three things happen here, in order:
  //  1. Allocate the padded `visited` Int32Array. Cells outside [0..W) ×
  //     [0..H) carry the -1 sentinel, as do user-blocked cells. The padding
  //     width is the max axis component of any move, so a candidate read
  //     can never index out of bounds without first being filtered by the
  //     -1 sentinel — no per-move bounds check.
  //  2. Compute the closure-bias mask (only when wantsClosure). The bridge
  //     cell is the symmetry image of the start; its neighbours are the
  //     cells that, if visited too early, leave the search no way to
  //     close. We mark these as `startNbrs` (used at end of quarter-search
  //     to detect closure) and bias their Warnsdorff/Outside-In score by
  //     +CLOSURE_PENALTY so they're picked last. Under non-trivial sym we
  //     extend the bias to ALL orbit-mates of those neighbours — see
  //     PROTOKOLL.md Phase 7 for why orbit-only-bridge bias is not enough.
  //  3. Place the start cell (and its orbit-mates under sym) onto the path
  //     and seed the DFS stack with that cell's candidates.
  _init() {
    const W = this.W, H = this.H, moves = this.moves, sym = this.sym;
    if (!Sym.isValid(sym, W, H)) { this.invalid = true; this.done = true; return; }

    this.pad = Figures.computePad(moves);
    this.stride = W + 2 * this.pad;
    this.orbitSize = Sym.SIZES[sym];
    // Under symmetry we only search one quarter of the tour; the rest is
    // mirrored in by Sym.expand. orbitSize must therefore divide |cells|.
    this.total = W * H - this.blocked.size;
    if (this.total % this.orbitSize !== 0) { this.invalid = true; this.done = true; return; }
    this.quarterLen = this.total / this.orbitSize;

    const stride = this.stride, pad = this.pad;
    const visited = new Int32Array(stride * (H + 2 * pad));
    // Mark the padded frame as permanently visited (-1) so candidate-filter
    // can use a single equality check instead of bounds arithmetic.
    for (let r = 0; r < H + 2 * pad; r++) {
      for (let c = 0; c < W + 2 * pad; c++) {
        if (c < pad || c >= W + pad || r < pad || r >= H + pad) {
          visited[r * stride + c] = -1;
        }
      }
    }
    // User-blocked cells use the same -1 sentinel: indistinguishable from
    // out-of-bounds at the inner loop, which is the whole point.
    for (const key of this.blocked) {
      const [c, r] = key.split(',').map((s) => parseInt(s, 10));
      if (Number.isInteger(c) && Number.isInteger(r) &&
          c >= 0 && c < W && r >= 0 && r < H) {
        visited[(r + pad) * stride + (c + pad)] = -1;
      }
    }
    this.visited = visited;

    this.startNbrs   = new Uint8Array(stride * (H + 2 * pad));
    this.closureBias = new Uint8Array(stride * (H + 2 * pad));
    if (this.wantsClosure) {
      // bridge = the cell on which the next quarter-tour begins. Reaching
      // a startNbr of `bridge` from the current quarter's end is the
      // closure condition that search() checks.
      const bridge = Sym.transform(this.startCol, this.startRow, sym, W, H);
      for (const [dc, dr] of moves) {
        const idx = this.at(bridge[0] + dc, bridge[1] + dr);
        if (visited[idx] === -1) continue;
        this.startNbrs[idx] = 1;
        this.closureBias[idx] = 1;
      }
      // Orbit-extension of the bias: a Phase-7 bug-fix. Without this,
      // visiting orbit-mate cells too early consumes the closure escape
      // implicitly (orbits are placed atomically by search/_backtrackOne).
      if (sym !== 'none') {
        for (let i = 0; i < this.startNbrs.length; i++) {
          if (!this.startNbrs[i]) continue;
          const r = Math.floor(i / stride) - pad;
          const c = (i % stride) - pad;
          const orb = Sym.orbit(c, r, sym, W, H);
          for (let j = 0; j < orb.length; j++) {
            const oidx = this.at(orb[j][0], orb[j][1]);
            if (visited[oidx] === -1) continue;
            this.closureBias[oidx] = 1;
          }
        }
      }
    }

    // Reject if the start cell or any of its orbit-mates is blocked.
    const startOrbit = Sym.orbit(this.startCol, this.startRow, sym, W, H);
    for (let i = 0; i < startOrbit.length; i++) {
      if (visited[this.at(startOrbit[i][0], startOrbit[i][1])] !== 0) {
        this.invalid = true; this.done = true; return;
      }
    }
    for (let i = 0; i < startOrbit.length; i++) {
      visited[this.at(startOrbit[i][0], startOrbit[i][1])] = 1;
    }
    this.path = [[this.startCol, this.startRow]];
    this.stack = [{ candidates: this._pickCandidates(this.startCol, this.startRow), nextIdx: 0 }];
  }

  // Convert a board (col, row) into the flat index inside the padded
  // visited/closureBias/startNbrs arrays. Hot path — kept tiny.
  at(col, row) { return (row + this.pad) * this.stride + (col + this.pad); }

  // Time-check granularity (1000 inner iterations between Date.now polls).
  static CHECK_EVERY = 1000;

  // Resume the DFS for up to maxMs wall-clock milliseconds. Returns one of:
  //   { kind: 'found',     path, steps, closed } — a tour, ready to render
  //   { kind: 'exhausted', steps }               — search space empty
  //   { kind: 'timeout',   steps }               — budget hit, call again to continue
  //
  // After 'found' the search is paused one step *past* the solution, so the
  // next .search() call resumes by backtracking off that solution — which
  // is the "re-click for next tour" mechanism.
  search(maxMs) {
    if (this.invalid || this.done) return { kind: 'exhausted', steps: this.steps };
    if (this.foundLast) {
      this._backtrackOne();
      this.foundLast = false;
    }
    const start = Date.now();
    let checkCounter = 0;

    while (this.stack.length > 0) {
      if (++checkCounter === Solver.CHECK_EVERY) {
        checkCounter = 0;
        if (Date.now() - start >= maxMs) {
          return { kind: 'timeout', steps: this.steps };
        }
      }

      if (this.path.length === this.quarterLen) {
        if (!this.wantsClosure) {
          this.foundLast = true;
          return {
            kind: 'found', steps: this.steps, closed: false,
            path: Sym.expand(this.path, this.sym, this.W, this.H),
          };
        }
        const last = this.path[this.quarterLen - 1];
        if (this.startNbrs[this.at(last[0], last[1])]) {
          this.foundLast = true;
          return {
            kind: 'found', steps: this.steps, closed: true,
            path: Sym.expand(this.path, this.sym, this.W, this.H),
          };
        }
        // Not closed: top frame has empty candidates so next iteration
        // triggers the normal exhausted-frame backtrack.
      }

      const top = this.stack[this.stack.length - 1];
      if (top.nextIdx >= top.candidates.length) {
        this._backtrackOne();
        continue;
      }

      const [nc, nr] = top.candidates[top.nextIdx++];
      this.steps++;
      const orb = Sym.orbit(nc, nr, this.sym, this.W, this.H);
      for (let i = 0; i < orb.length; i++) {
        this.visited[this.at(orb[i][0], orb[i][1])] = 1;
      }
      this.path.push([nc, nr]);
      this.stack.push({ candidates: this._pickCandidates(nc, nr), nextIdx: 0 });
    }

    this.done = true;
    return { kind: 'exhausted', steps: this.steps };
  }

  // Pop the topmost cell off the search path AND its entire orbit (under
  // symmetry, cells are placed and removed as atomic units). Restore those
  // squares to unvisited and drop the stack frame they spawned.
  _backtrackOne() {
    if (this.path.length === 0) return;
    const popped = this.path.pop();
    const orb = Sym.orbit(popped[0], popped[1], this.sym, this.W, this.H);
    for (let i = 0; i < orb.length; i++) {
      this.visited[this.at(orb[i][0], orb[i][1])] = 0;
    }
    this.stack.pop();
    this.steps++;
  }

  // Compute the ordered list of next-step candidates from (col, row),
  // applying the heuristic and the symmetry filter. Returned moves are in
  // the order the DFS will try them; the first one is the best per
  // heuristic.
  //
  // Symmetry filter: a candidate is rejected if ANY of its orbit-mates is
  // already visited — otherwise we would visit a cell pair (or quartet)
  // where part is consumed and the rest is forced into a collision later.
  //
  // Heuristic scoring (lower = tried first):
  //   warnsdorff  → number of free continuations from the candidate.
  //   outsideIn   → negative squared distance to board centre (so edges
  //                 are tried first; classic spiral-inward heuristic).
  //   bruteForce  → no ordering at all; returns the raw filtered list.
  // Both scored heuristics add +CLOSURE_PENALTY to closure-bias cells, so
  // those land at the tail of the candidate list and are kept available
  // for the final move.
  _pickCandidates(col, row) {
    const W = this.W, H = this.H, moves = this.moves, sym = this.sym;
    const visited = this.visited;
    const list = [];
    for (let i = 0; i < moves.length; i++) {
      const dc = moves[i][0], dr = moves[i][1];
      const nc = col + dc, nr = row + dr;
      if (visited[this.at(nc, nr)] !== 0) continue;
      if (sym !== 'none') {
        const orb = Sym.orbit(nc, nr, sym, W, H);
        let collision = false;
        for (let j = 1; j < orb.length; j++) {
          if (visited[this.at(orb[j][0], orb[j][1])] !== 0) { collision = true; break; }
        }
        if (collision) continue;
      }
      list.push([nc, nr]);
    }
    if (this.heuristic === 'bruteForce' || list.length <= 1) return list;

    const CLOSURE_PENALTY = 1000;
    const cx = (W - 1) / 2, cy = (H - 1) / 2;
    const scores = new Array(list.length);
    if (this.heuristic === 'warnsdorff') {
      for (let k = 0; k < list.length; k++) {
        const c = list[k][0], r = list[k][1];
        let cnt = 0;
        for (let i = 0; i < moves.length; i++) {
          if (visited[this.at(c + moves[i][0], r + moves[i][1])] === 0) cnt++;
        }
        scores[k] = cnt;
        if (this.wantsClosure && this.closureBias[this.at(c, r)]) scores[k] += CLOSURE_PENALTY;
      }
    } else { // outsideIn
      for (let k = 0; k < list.length; k++) {
        const c = list[k][0], r = list[k][1];
        const dx = c - cx, dy = r - cy;
        scores[k] = -(dx * dx + dy * dy);
        if (this.wantsClosure && this.closureBias[this.at(c, r)]) scores[k] += CLOSURE_PENALTY;
      }
    }
    const idx = list.map((_, i) => i);
    idx.sort((a, b) => scores[a] - scores[b]);
    return idx.map((i) => list[i]);
  }
}
