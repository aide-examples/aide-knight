// Sym — static helpers for tour symmetry constraints (axisV / point / rot90).
//
// Used by Solver (orbit-aware placement and bridge logic) and by app.js
// (orbit-extended block toggling). All methods are pure utilities — no
// instance state.
//
// Validity rules go beyond "no axis cell" — they include a colour-parity
// condition that ensures the shift-by-quarter tour structure the Solver
// searches is move-set-compatible. See PROTOKOLL.md Phase 7 for the
// derivation.

class Sym {
  static SIZES = { none: 1, axisV: 2, point: 2, rot90: 4 };

  static isValid(t, W, H) {
    if (t === 'none')  return true;
    if (t === 'axisV') return W % 2 === 0 && (W * H) % 4 === 2;
    if (t === 'point') return W % 2 === 0 && H % 2 === 0;
    if (t === 'rot90') return W === H && W % 2 === 0 && (W * W) % 8 === 4;
    return false;
  }

  // Full orbit of a cell (including itself) under the given symmetry.
  static orbit(c, r, t, W, H) {
    if (t === 'axisV') return [[c, r], [W - 1 - c, r]];
    if (t === 'point') return [[c, r], [W - 1 - c, H - 1 - r]];
    if (t === 'rot90') {
      const N = W;
      return [[c, r], [N - 1 - r, c], [N - 1 - c, N - 1 - r], [r, N - 1 - c]];
    }
    return [[c, r]];
  }

  // Image of (c, r) under one application of the symmetry. The bridge cell
  // of a symmetric tour — where the next quarter begins — is this.
  static transform(c, r, t, W, H) {
    if (t === 'axisV') return [W - 1 - c, r];
    if (t === 'point') return [W - 1 - c, H - 1 - r];
    if (t === 'rot90') return [W - 1 - r, c];
    return [c, r];
  }

  // Expand a quarter path into the full closed tour by appending the orbit
  // images in successive-quarter order.
  static expand(quarter, t, W, H) {
    if (t === 'none') return quarter.slice();
    const full = quarter.slice();
    if (t === 'axisV') {
      for (const [c, r] of quarter) full.push([W - 1 - c, r]);
    } else if (t === 'point') {
      for (const [c, r] of quarter) full.push([W - 1 - c, H - 1 - r]);
    } else if (t === 'rot90') {
      const N = W;
      for (const [c, r] of quarter) full.push([N - 1 - r, c]);
      for (const [c, r] of quarter) full.push([N - 1 - c, N - 1 - r]);
      for (const [c, r] of quarter) full.push([r, N - 1 - c]);
    }
    return full;
  }
}
