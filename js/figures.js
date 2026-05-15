// Figures — knight-style move-set generators.
//
// All figures in scope are (a, b) with a < b, so the 8 sign + swap
// permutations of (a, b) are all distinct. Padding (the visited-array
// border) is the max axis-distance of any move in the active set.

const Figures = {
  // Parse a figureKey like "1,2" into the 8 (dx, dy) jumps it generates:
  // all sign permutations of (a, b) and (b, a). Returned as a fresh array
  // each call so the caller can shuffle it without affecting other callers.
  generateBaseMoves(figureKey) {
    const [a, b] = figureKey.split(',').map(Number);
    return [[a, b], [b, a], [b, -a], [a, -b], [-a, -b], [-b, -a], [-b, a], [-a, b]];
  },

  // Padding width required around the W×H grid so a move from any inner cell
  // never indexes out of bounds. Equal to the maximum axis component of any
  // move in the set (e.g. 2 for knights, 4 for (3,4)-giraffes).
  computePad(moves) {
    let pad = 0;
    for (const [dc, dr] of moves) {
      const d = Math.max(Math.abs(dc), Math.abs(dr));
      if (d > pad) pad = d;
    }
    return pad;
  },
};
