// Figures — knight-style move-set generators.
//
// All figures in scope are (a, b) with a < b, so the 8 sign + swap
// permutations of (a, b) are all distinct. Padding (the visited-array
// border) is the max axis-distance of any move in the active set.

const Figures = {
  generateBaseMoves(figureKey) {
    const [a, b] = figureKey.split(',').map(Number);
    return [[a, b], [b, a], [b, -a], [a, -b], [-a, -b], [-b, -a], [-b, a], [-a, b]];
  },

  computePad(moves) {
    let pad = 0;
    for (const [dc, dr] of moves) {
      const d = Math.max(Math.abs(dc), Math.abs(dr));
      if (d > pad) pad = d;
    }
    return pad;
  },
};
