// Renderer — draws the tour on the Board's SVG overlay.
//
// Number divs are appended to cell elements (via Board.getCell); the tour
// line is a single SVG polyline; for closed tours, an additional dashed line
// connects last cell back to first.

class Renderer {
  constructor(board) {
    this.board = board;
  }

  clear() {
    for (const cell of this.board.cellByIdx) {
      if (!cell) continue;
      const num = cell.querySelector('.num');
      if (num) num.remove();
    }
    const overlay = this.board.overlay;
    if (overlay) {
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
    }
  }

  render(path, isClosed) {
    const W = this.board.W, H = this.board.H;

    const stash = [];
    for (let i = 0; i < path.length; i++) {
      const [c, r] = path[i];
      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = i + 1;
      stash.push([this.board.getCell(c, r), num]);
    }
    for (const [cell, num] of stash) {
      if (cell) cell.appendChild(num);
    }

    // SVG viewBox is 0..W × 0..H; cell center = col + 0.5 horizontally,
    // (H - 1 - row) + 0.5 vertically — row 0 is the bottom rank but
    // visually the bottom row, so we mirror y.
    const points = path
      .map(([c, r]) => `${c + 0.5},${H - 1 - r + 0.5}`)
      .join(' ');
    const line = document.createElementNS(Board.SVG_NS, 'polyline');
    line.setAttribute('points', points);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#c0392b');
    line.setAttribute('stroke-width', '0.08');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('stroke-linecap', 'round');
    this.board.overlay.appendChild(line);

    if (isClosed) {
      const last  = path[path.length - 1];
      const first = path[0];
      const close = document.createElementNS(Board.SVG_NS, 'line');
      close.setAttribute('x1', last[0]  + 0.5);
      close.setAttribute('y1', H - 1 - last[1]  + 0.5);
      close.setAttribute('x2', first[0] + 0.5);
      close.setAttribute('y2', H - 1 - first[1] + 0.5);
      close.setAttribute('stroke', '#c0392b');
      close.setAttribute('stroke-width', '0.08');
      close.setAttribute('stroke-linecap', 'round');
      close.setAttribute('stroke-dasharray', '0.18 0.12');
      this.board.overlay.appendChild(close);
    }
  }
}
