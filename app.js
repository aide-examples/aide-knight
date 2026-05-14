// Knight's Tour — variable W×H chessboard, iterative DFS + Warnsdorff.
//
// Coord convention: col = 0 leftmost file, row = 0 bottom rank (chess style).
// The CSS grid fills top-to-bottom, so the build loop iterates row = H-1
// (top) down to row = 0 (bottom). Field colour follows (row + col) % 2 === 0
// → dark, which makes a1 = (0,0) a dark square on any W×H board.
//
// Padding strategy: the solver's "visited" array has a border of pad cells
// pre-marked as blocked (-1). pad = max axis-distance of any move in the
// active move set, so candidate generation can skip the explicit
// out-of-bounds check — the padding cells fail the (visited === 0) test for
// the same reason a tour cell does. This is also the foundation for the
// custom-blocked-cells feature in Phase 8.
//
// Step counter: every forward attempt AND every backtrack counts +1
// (per knight.md: "Das Zurücknehmen eines vorherigen Zugs gilt als weiterer Zug").

const boardEl    = document.getElementById('board');
const titleEl    = document.getElementById('title');
const statusEl   = document.getElementById('status');
const status2El  = document.getElementById('status2');
const wInput     = document.getElementById('w-input');
const hInput     = document.getElementById('h-input');

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
document.title       = T.title;
titleEl.textContent  = T.title;

const KNIGHT_MOVES = [
  [ 1,  2], [ 2,  1], [ 2, -1], [ 1, -2],
  [-1, -2], [-2, -1], [-2,  1], [-1,  2],
];

const SVG_NS = 'http://www.w3.org/2000/svg';

// --- Mutable board state, reassigned by buildBoard() ---
let W = 8;
let H = 8;
let cellByIdx;   // logical W*H array of DOM cells
let overlay;     // SVG overlay element

// --- Input wiring ---
function readDimensions() {
  const newW = Math.max(1, parseInt(wInput.value, 10) || W);
  const newH = Math.max(1, parseInt(hInput.value, 10) || H);
  wInput.value = newW;
  hInput.value = newH;
  if (newW === W && newH === H) return false;
  W = newW;
  H = newH;
  return true;
}

function onDimensionChange() {
  if (!readDimensions()) return;
  buildBoard();
  statusEl.textContent  = T.clickPrompt;
  status2El.textContent = '';
}

for (const inp of [wInput, hInput]) {
  inp.addEventListener('change', onDimensionChange);
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); onDimensionChange(); }
  });
}

// --- Build / rebuild board for current W and H ---
function buildBoard() {
  // Cell size: fits viewport, capped at 60px for normal boards, with a
  // small floor so the line stays drawable on extreme sizes (100×200).
  const maxBoardW = Math.max(120, window.innerWidth  - 80);
  const maxBoardH = Math.max(120, window.innerHeight - 200);
  const cellPx = Math.max(2, Math.min(60,
    Math.floor(Math.min(maxBoardW / W, maxBoardH / H))));

  document.documentElement.style.setProperty('--board-cell', cellPx + 'px');
  boardEl.style.gridTemplateColumns = `repeat(${W}, ${cellPx}px)`;
  boardEl.style.gridTemplateRows    = `repeat(${H}, ${cellPx}px)`;
  boardEl.style.width  = (W * cellPx) + 'px';
  boardEl.style.height = (H * cellPx) + 'px';

  boardEl.innerHTML = '';
  cellByIdx = new Array(W * H);

  const frag = document.createDocumentFragment();
  for (let row = H - 1; row >= 0; row--) {
    for (let col = 0; col < W; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((row + col) % 2 === 0 ? 'dark' : 'light');
      cell.dataset.col = col;
      cell.dataset.row = row;
      cell.addEventListener('click', () => onCellClick(col, row));
      frag.appendChild(cell);
      cellByIdx[row * W + col] = cell;
    }
  }
  boardEl.appendChild(frag);

  overlay = document.createElementNS(SVG_NS, 'svg');
  overlay.setAttribute('id', 'overlay');
  overlay.setAttribute('viewBox', `0 0 ${W} ${H}`);
  overlay.setAttribute('preserveAspectRatio', 'none');
  boardEl.appendChild(overlay);
}

// --- Click handler ---
function onCellClick(col, row) {
  statusEl.textContent  = `${col} / ${row}`;
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

// --- Solver: iterative DFS + Warnsdorff, padded visited array ---
function solve(startCol, startRow) {
  // pad = max axis distance of any move, so a candidate that lands in the
  // padding ring fails the visited-check naturally (no bounds branch needed).
  let pad = 0;
  for (const [dc, dr] of KNIGHT_MOVES) {
    const d = Math.max(Math.abs(dc), Math.abs(dr));
    if (d > pad) pad = d;
  }
  const stride = W + 2 * pad;
  const total  = W * H;
  const visited = new Int32Array(stride * (H + 2 * pad));
  for (let r = 0; r < H + 2 * pad; r++) {
    for (let c = 0; c < W + 2 * pad; c++) {
      if (c < pad || c >= W + pad || r < pad || r >= H + pad) {
        visited[r * stride + c] = -1;
      }
    }
  }
  // (col, row) → padded index
  const at = (col, row) => (row + pad) * stride + (col + pad);

  const path = [];
  let steps = 0;

  visited[at(startCol, startRow)] = 1;
  path.push([startCol, startRow]);

  const stack = [{
    candidates: warnsdorffSort(startCol, startRow, visited, at),
    nextIdx: 0,
  }];

  while (stack.length > 0) {
    if (path.length === total) return { path, steps };

    const top = stack[stack.length - 1];
    if (top.nextIdx >= top.candidates.length) {
      const popped = path.pop();
      visited[at(popped[0], popped[1])] = 0;
      stack.pop();
      steps++;
      continue;
    }

    const [nc, nr] = top.candidates[top.nextIdx++];
    steps++;
    visited[at(nc, nr)] = path.length + 1;
    path.push([nc, nr]);
    stack.push({
      candidates: warnsdorffSort(nc, nr, visited, at),
      nextIdx: 0,
    });
  }

  return { path: null, steps };
}

function warnsdorffSort(col, row, visited, at) {
  // Entries: [col, row, onwardCount] — the count slot is sorted on; callers
  // only destructure [col, row] from each entry.
  const scored = [];
  for (const [dc, dr] of KNIGHT_MOVES) {
    const nc = col + dc, nr = row + dr;
    if (visited[at(nc, nr)] !== 0) continue;
    scored.push([nc, nr, countOnward(nc, nr, visited, at)]);
  }
  scored.sort((a, b) => a[2] - b[2]);
  return scored;
}

function countOnward(col, row, visited, at) {
  let count = 0;
  for (const [dc, dr] of KNIGHT_MOVES) {
    if (visited[at(col + dc, row + dr)] === 0) count++;
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
  const frag = document.createDocumentFragment();
  const stash = [];
  for (let i = 0; i < path.length; i++) {
    const [c, r] = path[i];
    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = i + 1;
    stash.push([cellByIdx[r * W + c], num]);
  }
  for (const [cell, num] of stash) cell.appendChild(num);

  // SVG: viewBox is 0..W × 0..H; cell center = col + 0.5 horizontally,
  // (H - 1 - row) + 0.5 vertically (row 0 is the bottom rank but visually
  // the bottom row, so we mirror y).
  const points = path
    .map(([c, r]) => `${c + 0.5},${H - 1 - r + 0.5}`)
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

// --- Initial build ---
buildBoard();
statusEl.textContent = T.clickPrompt;
