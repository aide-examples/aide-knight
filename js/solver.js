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

  _init() {
    const W = this.W, H = this.H, moves = this.moves, sym = this.sym;
    if (!Sym.isValid(sym, W, H)) { this.invalid = true; this.done = true; return; }

    this.pad = Figures.computePad(moves);
    this.stride = W + 2 * this.pad;
    this.orbitSize = Sym.SIZES[sym];
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
      const bridge = Sym.transform(this.startCol, this.startRow, sym, W, H);
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
          const orb = Sym.orbit(c, r, sym, W, H);
          for (let j = 0; j < orb.length; j++) {
            const oidx = this.at(orb[j][0], orb[j][1]);
            if (visited[oidx] === -1) continue;
            this.closureBias[oidx] = 1;
          }
        }
      }
    }

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

  at(col, row) { return (row + this.pad) * this.stride + (col + this.pad); }

  // Time-check granularity (1000 inner iterations between Date.now polls).
  static CHECK_EVERY = 1000;

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
