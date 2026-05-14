// Solver — iterative DFS with heuristic ordering, closure bias, and
// symmetry-aware orbit propagation.
//
// Two usage patterns:
//   1. Static `Solver.solve(W, H, moves, sc, sr, opts)` — runs a fresh
//      search to the first solution (or exhaustion). Used by tests and
//      one-shot callers.
//   2. Instance `new Solver(...)` + `.search()` — keeps the iterative DFS
//      state alive across calls. Calling `.search()` again after a
//      previous solution does a single backtrack and continues, yielding
//      the NEXT solution. This is the "re-click = next tour" mechanism.
//
// `steps` accumulates across `.search()` calls — re-clicks keep counting.

class Solver {
  static SYM_ORBIT_SIZE = { none: 1, axisV: 2, point: 2, rot90: 4 };

  // Validity of a symmetry on a given board geometry. See PROTOKOLL.md
  // Phase 7 for the colour-parity derivation.
  static isSymTypeValid(t, W, H) {
    if (t === 'none')  return true;
    if (t === 'axisV') return W % 2 === 0 && (W * H) % 4 === 2;
    if (t === 'point') return W % 2 === 0 && H % 2 === 0;
    if (t === 'rot90') return W === H && W % 2 === 0 && (W * W) % 8 === 4;
    return false;
  }

  static symOrbit(c, r, t, W, H) {
    if (t === 'axisV') return [[c, r], [W - 1 - c, r]];
    if (t === 'point') return [[c, r], [W - 1 - c, H - 1 - r]];
    if (t === 'rot90') {
      const N = W;
      return [[c, r], [N - 1 - r, c], [N - 1 - c, N - 1 - r], [r, N - 1 - c]];
    }
    return [[c, r]];
  }

  static symTransform(c, r, t, W, H) {
    if (t === 'axisV') return [W - 1 - c, r];
    if (t === 'point') return [W - 1 - c, H - 1 - r];
    if (t === 'rot90') return [W - 1 - r, c];
    return [c, r];
  }

  static expandTour(quarter, sym, W, H) {
    if (sym === 'none') return quarter.slice();
    const full = quarter.slice();
    if (sym === 'axisV') {
      for (const [c, r] of quarter) full.push([W - 1 - c, r]);
    } else if (sym === 'point') {
      for (const [c, r] of quarter) full.push([W - 1 - c, H - 1 - r]);
    } else if (sym === 'rot90') {
      const N = W;
      for (const [c, r] of quarter) full.push([N - 1 - r, c]);
      for (const [c, r] of quarter) full.push([N - 1 - c, N - 1 - r]);
      for (const [c, r] of quarter) full.push([r, N - 1 - c]);
    }
    return full;
  }

  // Static convenience: build a fresh solver and run it to the first result.
  static solve(W, H, moves, startCol, startRow, opts = {}) {
    return new Solver(W, H, moves, startCol, startRow, opts).search();
  }

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
    this.done = false;       // true once the search space is exhausted
    this.foundLast = false;  // true while `path` is a complete tour just returned
    this.invalid = false;    // sym not supported / blocked count incompat
    this.path = null;
    this.stack = null;
    this.visited = null;
    this.startNbrs = null;
    this.closureBias = null;

    this._init();
  }

  _init() {
    const W = this.W, H = this.H, moves = this.moves, sym = this.sym;

    if (!Solver.isSymTypeValid(sym, W, H)) { this.invalid = true; this.done = true; return; }

    this.pad = Figures.computePad(moves);
    this.stride = W + 2 * this.pad;
    this.orbitSize = Solver.SYM_ORBIT_SIZE[sym];
    this.total = W * H - this.blocked.size;
    if (this.total % this.orbitSize !== 0) { this.invalid = true; this.done = true; return; }
    this.quarterLen = this.total / this.orbitSize;

    const stride = this.stride, pad = this.pad;
    const visited = new Int32Array(stride * (H + 2 * pad));
    for (let r = 0; r < H + 2 * pad; r++) {
      for (let c = 0; c < W + 2 * pad; c++) {
        if (c < pad || c >= W + pad || r < pad || r >= H + pad) {
          visited[r * stride + c] = -1;
        }
      }
    }
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
      const bridge = Solver.symTransform(this.startCol, this.startRow, sym, W, H);
      for (const [dc, dr] of moves) {
        const idx = this.at(bridge[0] + dc, bridge[1] + dr);
        if (visited[idx] === -1) continue;
        this.startNbrs[idx] = 1;
        this.closureBias[idx] = 1;
      }
      if (sym !== 'none') {
        for (let i = 0; i < this.startNbrs.length; i++) {
          if (!this.startNbrs[i]) continue;
          const r = Math.floor(i / stride) - pad;
          const c = (i % stride) - pad;
          const orb = Solver.symOrbit(c, r, sym, W, H);
          for (let j = 0; j < orb.length; j++) {
            const oidx = this.at(orb[j][0], orb[j][1]);
            if (visited[oidx] === -1) continue;
            this.closureBias[oidx] = 1;
          }
        }
      }
    }

    // Place start + orbit
    const startOrbit = Solver.symOrbit(this.startCol, this.startRow, sym, W, H);
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

  at(col, row) { return (row + this.pad) * this.stride + (col + this.pad); }

  // Find next solution. If a previous call returned a tour, backtracks one
  // cell first so the next iteration explores a different branch. Returns
  // { path, steps, closed } on success, { path: null, steps } on exhaustion.
  // `steps` is cumulative across all .search() calls on this instance.
  search() {
    if (this.invalid || this.done) return { path: null, steps: this.steps };
    if (this.foundLast) {
      this._backtrackOne();
      this.foundLast = false;
    }
    while (this.stack.length > 0) {
      if (this.path.length === this.quarterLen) {
        if (!this.wantsClosure) {
          this.foundLast = true;
          return {
            path: Solver.expandTour(this.path, this.sym, this.W, this.H),
            steps: this.steps, closed: false,
          };
        }
        const last = this.path[this.quarterLen - 1];
        if (this.startNbrs[this.at(last[0], last[1])]) {
          this.foundLast = true;
          return {
            path: Solver.expandTour(this.path, this.sym, this.W, this.H),
            steps: this.steps, closed: true,
          };
        }
        // Not closed: top frame has empty candidates (path covers all reachable
        // cells), so the next iteration will trigger the exhausted backtrack.
      }

      const top = this.stack[this.stack.length - 1];
      if (top.nextIdx >= top.candidates.length) {
        this._backtrackOne();
        continue;
      }

      const [nc, nr] = top.candidates[top.nextIdx++];
      this.steps++;
      const orb = Solver.symOrbit(nc, nr, this.sym, this.W, this.H);
      for (let i = 0; i < orb.length; i++) {
        this.visited[this.at(orb[i][0], orb[i][1])] = 1;
      }
      this.path.push([nc, nr]);
      this.stack.push({ candidates: this._pickCandidates(nc, nr), nextIdx: 0 });
    }

    this.done = true;
    return { path: null, steps: this.steps };
  }

  _backtrackOne() {
    if (this.path.length === 0) return;
    const popped = this.path.pop();
    const orb = Solver.symOrbit(popped[0], popped[1], this.sym, this.W, this.H);
    for (let i = 0; i < orb.length; i++) {
      this.visited[this.at(orb[i][0], orb[i][1])] = 0;
    }
    this.stack.pop();
    this.steps++;
  }

  _pickCandidates(col, row) {
    const W = this.W, H = this.H, moves = this.moves, sym = this.sym;
    const visited = this.visited;
    const list = [];
    for (let i = 0; i < moves.length; i++) {
      const dc = moves[i][0], dr = moves[i][1];
      const nc = col + dc, nr = row + dr;
      if (visited[this.at(nc, nr)] !== 0) continue;
      if (sym !== 'none') {
        const orb = Solver.symOrbit(nc, nr, sym, W, H);
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
