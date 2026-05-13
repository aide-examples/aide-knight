// Knight's Tour — Phase 1: render 8×8 chessboard, click reports cell coords.
//
// Origin convention: col = 0 is the leftmost file, row = 0 is the bottom rank
// (a1 = (0,0), chess standard). The CSS grid fills row-by-row from the top,
// so the build loop iterates row 7 (top) down to row 0 (bottom) and the
// resulting visual mapping matches the chess convention.
//
// Colour scheme: classic browns from style.css. Field colour follows
// (row + col) % 2 === 0 → dark, which makes a1 a dark square (chess rule).

const BOARD_SIZE = 8;
const boardEl  = document.getElementById('board');
const statusEl = document.getElementById('status');

for (let row = BOARD_SIZE - 1; row >= 0; row--) {
  for (let col = 0; col < BOARD_SIZE; col++) {
    const cell = document.createElement('div');
    cell.className = 'cell ' + ((row + col) % 2 === 0 ? 'dark' : 'light');
    cell.dataset.col = col;
    cell.dataset.row = row;
    cell.addEventListener('click', () => {
      statusEl.textContent = `${col} / ${row}`;
    });
    boardEl.appendChild(cell);
  }
}
