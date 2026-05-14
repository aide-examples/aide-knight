// Solver — pure iterative DFS with heuristic ordering, closure bias,
// and symmetry-aware orbit propagation.
//
// All methods are static — Solver.solve(W, H, moves, sc, sr, opts) is the
// entry point. No DOM, no global state. The result is { path, steps, closed }
// where path is the full tour (orbit-expanded if a symmetry is active),
// steps counts forward attempts AND backtracks, and closed is whether the
// closure check at the end succeeded.

class Solver {
  static SYM_ORBIT_SIZE = { none: 1, axisV: 2, point: 2, rot90: 4 };

  // Validity of a symmetry on a given board geometry. Stricter than just
  // "no axis cell" — also includes the colour-parity condition that ensures
  // the shift-by-quarter structure is compatible with the move set. See
  // PROTOKOLL.md Phase 7 for the derivation.
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
    if (sym === 'none') return quarter;
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

  static solve(W, H, moves, startCol, startRow, opts = {}) {
    const heuristicNow = opts.heuristic || 'warnsdorff';
    const closed = !!opts.closed;
    const sym = opts.sym || 'none';
    const blocked = (opts.blocked instanceof Set) ? opts.blocked : new Set();
    const wantsClosure = closed || sym !== 'none';

    if (!Solver.isSymTypeValid(sym, W, H)) {
      return { path: null, steps: 0 };
    }

    const pad = Figures.computePad(moves);
    const stride = W + 2 * pad;
    const orbitSize = Solver.SYM_ORBIT_SIZE[sym];
    // Tour visits every non-blocked cell once. quarterLen is the count of
    // explicit-search cells; under symmetry, each placement fills orbitSize
    // cells implicitly, so total must be divisible by orbitSize.
    const total = W * H - blocked.size;
    if (total % orbitSize !== 0) {
      return { path: null, steps: 0 };
    }
    const quarterLen = total / orbitSize;

    const visited = new Int32Array(stride * (H + 2 * pad));
    for (let r = 0; r < H + 2 * pad; r++) {
      for (let c = 0; c < W + 2 * pad; c++) {
        if (c < pad || c >= W + pad || r < pad || r >= H + pad) {
          visited[r * stride + c] = -1;
        }
      }
    }
    // Pre-mark user-blocked cells as -1 — pickCandidates filters them out
    // for free since they fail the visited === 0 test, same as padding cells.
    for (const key of blocked) {
      const [c, r] = key.split(',').map((s) => parseInt(s, 10));
      if (Number.isInteger(c) && Number.isInteger(r) &&
          c >= 0 && c < W && r >= 0 && r < H) {
        visited[(r + pad) * stride + (c + pad)] = -1;
      }
    }
    const at = (col, row) => (row + pad) * stride + (col + pad);

    const bridge = wantsClosure ? Solver.symTransform(startCol, startRow, sym, W, H) : null;
    const startNbrs   = new Uint8Array(stride * (H + 2 * pad));
    const closureBias = new Uint8Array(stride * (H + 2 * pad));
    if (wantsClosure) {
      for (const [dc, dr] of moves) {
        const idx = at(bridge[0] + dc, bridge[1] + dr);
        if (visited[idx] === -1) continue;
        startNbrs[idx] = 1;
        closureBias[idx] = 1;
      }
      if (sym !== 'none') {
        for (let i = 0; i < startNbrs.length; i++) {
          if (!startNbrs[i]) continue;
          const r = Math.floor(i / stride) - pad;
          const c = (i % stride) - pad;
          const orb = Solver.symOrbit(c, r, sym, W, H);
          for (let j = 0; j < orb.length; j++) {
            const oidx = at(orb[j][0], orb[j][1]);
            if (visited[oidx] === -1) continue;
            closureBias[oidx] = 1;
          }
        }
      }
    }
    const CLOSURE_PENALTY = 1000;

    const cx = (W - 1) / 2, cy = (H - 1) / 2;
    function pickCandidates(col, row) {
      const list = [];
      for (let i = 0; i < moves.length; i++) {
        const dc = moves[i][0], dr = moves[i][1];
        const nc = col + dc, nr = row + dr;
        if (visited[at(nc, nr)] !== 0) continue;
        if (sym !== 'none') {
          const orb = Solver.symOrbit(nc, nr, sym, W, H);
          let collision = false;
          for (let j = 1; j < orb.length; j++) {
            if (visited[at(orb[j][0], orb[j][1])] !== 0) { collision = true; break; }
          }
          if (collision) continue;
        }
        list.push([nc, nr]);
      }
      if (heuristicNow === 'bruteForce' || list.length <= 1) return list;

      const scores = new Array(list.length);
      if (heuristicNow === 'warnsdorff') {
        for (let k = 0; k < list.length; k++) {
          const c = list[k][0], r = list[k][1];
          let cnt = 0;
          for (let i = 0; i < moves.length; i++) {
            if (visited[at(c + moves[i][0], r + moves[i][1])] === 0) cnt++;
          }
          scores[k] = cnt;
          if (wantsClosure && closureBias[at(c, r)]) scores[k] += CLOSURE_PENALTY;
        }
      } else { // outsideIn
        for (let k = 0; k < list.length; k++) {
          const c = list[k][0], r = list[k][1];
          const dx = c - cx, dy = r - cy;
          scores[k] = -(dx * dx + dy * dy);
          if (wantsClosure && closureBias[at(c, r)]) scores[k] += CLOSURE_PENALTY;
        }
      }
      const idx = list.map((_, i) => i);
      idx.sort((a, b) => scores[a] - scores[b]);
      return idx.map((i) => list[i]);
    }

    // Place start + orbit
    const startOrbit = Solver.symOrbit(startCol, startRow, sym, W, H);
    for (let i = 0; i < startOrbit.length; i++) {
      if (visited[at(startOrbit[i][0], startOrbit[i][1])] !== 0) {
        return { path: null, steps: 0 };
      }
    }
    for (let i = 0; i < startOrbit.length; i++) {
      visited[at(startOrbit[i][0], startOrbit[i][1])] = 1;
    }

    const path = [[startCol, startRow]];
    let steps = 0;
    const stack = [{ candidates: pickCandidates(startCol, startRow), nextIdx: 0 }];

    while (stack.length > 0) {
      if (path.length === quarterLen) {
        if (!wantsClosure) {
          return { path: Solver.expandTour(path, sym, W, H), steps, closed: false };
        }
        const last = path[quarterLen - 1];
        if (startNbrs[at(last[0], last[1])]) {
          return { path: Solver.expandTour(path, sym, W, H), steps, closed: true };
        }
      }

      const top = stack[stack.length - 1];
      if (top.nextIdx >= top.candidates.length) {
        const popped = path.pop();
        const orb = Solver.symOrbit(popped[0], popped[1], sym, W, H);
        for (let i = 0; i < orb.length; i++) {
          visited[at(orb[i][0], orb[i][1])] = 0;
        }
        stack.pop();
        steps++;
        continue;
      }

      const [nc, nr] = top.candidates[top.nextIdx++];
      steps++;
      const orb = Solver.symOrbit(nc, nr, sym, W, H);
      for (let i = 0; i < orb.length; i++) {
        visited[at(orb[i][0], orb[i][1])] = 1;
      }
      path.push([nc, nr]);
      stack.push({ candidates: pickCandidates(nc, nr), nextIdx: 0 });
    }

    return { path: null, steps };
  }
}
