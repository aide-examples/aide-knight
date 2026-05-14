// Knight's Tour — 8×8 chessboard, iterative DFS + Warnsdorff solver.
//
// Coord convention: col = 0 is the leftmost file, row = 0 is the bottom rank
// (a1 = (0,0), chess standard). The CSS grid fills top-to-bottom, so the build
// loop iterates row 7 (top) down to row 0 (bottom) — visual layout matches
// the chess convention. Field colour follows (row + col) % 2 === 0 → dark.
//
// Step counter: every forward attempt AND every backtrack counts +1
// (per knight.md "Das Zurücknehmen eines vorherigen Zugs gilt als weiterer Zug").

const BOARD_SIZE = 8;
const boardEl    = document.getElementById('board');
const titleEl    = document.getElementById('title');
const statusEl   = document.getElementById('status');
const status2El  = document.getElementById('status2');

// --- i18n. To add a language: add an entry to STRINGS and switch LANG.
const LANG = 'en';
const STRINGS = {
  en: {
    title:       "Knight's Tour",
    clickPrompt: 'Click any square.',
    solution:    (n) => `Solution found after ${n} steps.`,
    noSolution:  (n) => `No solution found after ${n} steps.`,
  },
  de: {
    title:       "Knight's Tour",
    clickPrompt: 'Klicke auf ein Feld.',
    solution:    (n) => `Lösung nach ${n} Schritten.`,
    noSolution:  (n) => `Keine Lösung nach ${n} Schritten.`,
  },
};
const T = STRINGS[LANG];

document.documentElement.lang = LANG;
document.title    = T.title;
titleEl.textContent  = T.title;
statusEl.textContent = T.clickPrompt;

const KNIGHT_MOVES = [
  [ 1,  2], [ 2,  1], [ 2, -1], [ 1, -2],
  [-1, -2], [-2, -1], [-2,  1], [-1,  2],
];

const SVG_NS = 'http://www.w3.org/2000/svg';

// --- Build cells ---
const cellByIdx = new Array(BOARD_SIZE * BOARD_SIZE);

for (let row = BOARD_SIZE - 1; row >= 0; row--) {
  for (let col = 0; col < BOARD_SIZE; col++) {
    const cell = document.createElement('div');
    cell.className = 'cell ' + ((row + col) % 2 === 0 ? 'dark' : 'light');
    cell.dataset.col = col;
    cell.dataset.row = row;
    cell.addEventListener('click', () => onCellClick(col, row));
    boardEl.appendChild(cell);
    cellByIdx[row * BOARD_SIZE + col] = cell;
  }
}

// SVG overlay: one unit per cell, viewBox auto-scales to board size.
const overlay = document.createElementNS(SVG_NS, 'svg');
overlay.setAttribute('id', 'overlay');
overlay.setAttribute('viewBox', `0 0 ${BOARD_SIZE} ${BOARD_SIZE}`);
overlay.setAttribute('preserveAspectRatio', 'none');
boardEl.appendChild(overlay);

// --- Click handler ---
function onCellClick(col, row) {
  statusEl.textContent = `${col} / ${row}`;
  status2El.textContent = '';
  clearTour();
  const result = solve(col, row);
  if (result.path) {
    renderTour(result.path);
    status2El.textContent = T.solution(result.steps);
  } else {
    status2El.textContent = T.noSolution(result.steps);
  }
}

// --- Solver: iterative DFS + Warnsdorff ---
// Iterative (not recursive) from the start so later phases (variable W×H,
// up to 100×200) won't blow the JS call stack.
function solve(startCol, startRow) {
  const total = BOARD_SIZE * BOARD_SIZE;
  const visited = new Int32Array(total);
  const path = [];
  let steps = 0;

  visited[startRow * BOARD_SIZE + startCol] = 1;
  path.push([startCol, startRow]);

  const stack = [{
    candidates: warnsdorffSort(startCol, startRow, visited),
    nextIdx: 0,
  }];

  while (stack.length > 0) {
    if (path.length === total) return { path, steps };

    const top = stack[stack.length - 1];
    if (top.nextIdx >= top.candidates.length) {
      const popped = path.pop();
      visited[popped[1] * BOARD_SIZE + popped[0]] = 0;
      stack.pop();
      steps++;
      continue;
    }

    const [nc, nr] = top.candidates[top.nextIdx++];
    steps++;
    visited[nr * BOARD_SIZE + nc] = path.length + 1;
    path.push([nc, nr]);
    stack.push({
      candidates: warnsdorffSort(nc, nr, visited),
      nextIdx: 0,
    });
  }

  return { path: null, steps };
}

function warnsdorffSort(col, row, visited) {
  const scored = [];
  for (const [dc, dr] of KNIGHT_MOVES) {
    const nc = col + dc, nr = row + dr;
    if (nc < 0 || nc >= BOARD_SIZE || nr < 0 || nr >= BOARD_SIZE) continue;
    if (visited[nr * BOARD_SIZE + nc] !== 0) continue;
    scored.push([nc, nr, countOnward(nc, nr, visited)]);
  }
  scored.sort((a, b) => a[2] - b[2]);
  return scored.map(([c, r]) => [c, r]);
}

function countOnward(col, row, visited) {
  let count = 0;
  for (const [dc, dr] of KNIGHT_MOVES) {
    const nc = col + dc, nr = row + dr;
    if (nc < 0 || nc >= BOARD_SIZE || nr < 0 || nr >= BOARD_SIZE) continue;
    if (visited[nr * BOARD_SIZE + nc] !== 0) continue;
    count++;
  }
  return count;
}

// --- Render ---
function clearTour() {
  for (const cell of cellByIdx) {
    const num = cell.querySelector('.num');
    if (num) num.remove();
  }
  while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
}

function renderTour(path) {
  for (let i = 0; i < path.length; i++) {
    const [c, r] = path[i];
    const cell = cellByIdx[r * BOARD_SIZE + c];
    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = i + 1;
    cell.appendChild(num);
  }
  // SVG coords: cell center = col + 0.5 horizontally, (BOARD_SIZE-1-row) + 0.5 vertically
  // (row 0 is the bottom rank but visually the bottom row, so we mirror y).
  const points = path
    .map(([c, r]) => `${c + 0.5},${BOARD_SIZE - 1 - r + 0.5}`)
    .join(' ');
  const line = document.createElementNS(SVG_NS, 'polyline');
  line.setAttribute('points', points);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#c0392b');
  line.setAttribute('stroke-width', '0.08');
  line.setAttribute('stroke-linejoin', 'round');
  line.setAttribute('stroke-linecap', 'round');
  overlay.appendChild(line);
}
