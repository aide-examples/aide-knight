// Knight's Tour — variable W×H, multiple figures, three heuristics.
//
// Coord convention: col = 0 leftmost file, row = 0 bottom rank (chess style).
// The CSS grid fills top-to-bottom, so the build loop iterates row = H-1
// (top) down to row = 0 (bottom). Field colour follows (row + col) % 2 === 0
// → dark, which makes a1 = (0,0) a dark square on any W×H board.
//
// Padding strategy: the solver's "visited" array has a border of pad cells
// pre-marked as blocked (-1). pad = max axis-distance of any move in the
// active move set, so candidate generation can skip the explicit
// out-of-bounds check — padding cells fail the (visited === 0) test for the
// same reason a tour cell does.
//
// Heuristics: Warnsdorff (fewest onward moves first), Outside-In (largest
// Euclidean distance from board centre first), Brute Force (definition
// order, no scoring). All three respect the active move order for ties
// (stable sort) — the move definition order matters and is exposed via the
// shuffle button.

const boardEl    = document.getElementById('board');
const titleEl    = document.getElementById('title');
const statusEl   = document.getElementById('status');
const status2El  = document.getElementById('status2');
const wInput     = document.getElementById('w-input');
const hInput     = document.getElementById('h-input');
const heuristicSelect = document.getElementById('heuristic-select');
const figureSelect    = document.getElementById('figure-select');
const mixBtn          = document.getElementById('mix-btn');
const lblHeuristic    = document.getElementById('lbl-heuristic');
const lblFigure       = document.getElementById('lbl-figure');

// --- i18n. To add a language: add an entry to STRINGS and switch LANG.
const LANG = 'en';
const STRINGS = {
  en: {
    title:       "Knight's Tour",
    clickPrompt: 'Click any square.',
    solution:    (n) => `Solution found after ${n} steps.`,
    noSolution:  (n) => `No solution found after ${n} steps.`,
    heuristicLabel: 'Heuristic',
    figureLabel:    'Figure',
    mixBtn:         'Shuffle order',
  },
  de: {
    title:       "Knight's Tour",
    clickPrompt: 'Klicke auf ein Feld.',
    solution:    (n) => `Lösung nach ${n} Schritten.`,
    noSolution:  (n) => `Keine Lösung nach ${n} Schritten.`,
    heuristicLabel: 'Heuristik',
    figureLabel:    'Figur',
    mixBtn:         'Reihenfolge mischen',
  },
};
const T = STRINGS[LANG];

document.documentElement.lang = LANG;
document.title       = T.title;
titleEl.textContent  = T.title;
lblHeuristic.textContent = T.heuristicLabel;
lblFigure.textContent    = T.figureLabel;
mixBtn.textContent       = T.mixBtn;

const SVG_NS = 'http://www.w3.org/2000/svg';

// --- Move sets per figure ---
// figureKey is "a,b" with a < b. Generated 8 moves are all sign + swap
// permutations of (a, b). For our figures a < b always, so all 8 are unique.
function generateBaseMoves(figureKey) {
  const [a, b] = figureKey.split(',').map(Number);
  return [[a, b], [b, a], [b, -a], [a, -b], [-a, -b], [-b, -a], [-b, a], [-a, b]];
}

// --- Mutable state ---
let W = 8;
let H = 8;
let heuristic = 'warnsdorff';
let figure = '1,2';
let activeMoves = generateBaseMoves(figure);
let lastStart = null;
let cellByIdx;
let overlay;

// --- localStorage persistence (full state) ---
const STATE_KEY = 'aide-knight-state-v1';

function isValidMoveOrder(saved, base) {
  if (!Array.isArray(saved) || saved.length !== base.length) return false;
  const baseKeys = new Set(base.map((m) => m.join(',')));
  const sawKeys  = new Set();
  for (const m of saved) {
    if (!Array.isArray(m) || m.length !== 2) return false;
    const k = m.join(',');
    if (!baseKeys.has(k) || sawKeys.has(k)) return false;
    sawKeys.add(k);
  }
  return true;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (Number.isInteger(s.W) && s.W >= 1) W = s.W;
    if (Number.isInteger(s.H) && s.H >= 1) H = s.H;
    if (['warnsdorff', 'outsideIn', 'bruteForce'].includes(s.heuristic)) heuristic = s.heuristic;
    if (['1,2', '1,4', '2,3', '3,4'].includes(s.figure)) figure = s.figure;
    const base = generateBaseMoves(figure);
    activeMoves = isValidMoveOrder(s.moveOrder, base) ? s.moveOrder : base;
  } catch { /* ignore — start from defaults */ }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      W, H, heuristic, figure, moveOrder: activeMoves,
    }));
  } catch { /* ignore — non-persistent mode */ }
}

// --- Resize handling: viewport-driven, preserves rendered tour ---
function applyCellSize() {
  const maxBoardW = Math.max(120, window.innerWidth  - 80);
  const maxBoardH = Math.max(120, window.innerHeight - 240);
  const cellPx = Math.max(2, Math.min(60,
    Math.floor(Math.min(maxBoardW / W, maxBoardH / H))));

  document.documentElement.style.setProperty('--board-cell', cellPx + 'px');
  boardEl.style.gridTemplateColumns = `repeat(${W}, ${cellPx}px)`;
  boardEl.style.gridTemplateRows    = `repeat(${H}, ${cellPx}px)`;
  boardEl.style.width  = (W * cellPx) + 'px';
  boardEl.style.height = (H * cellPx) + 'px';
}

// Trailing-edge debounce so big boards (200×100 = 20 000 cells) don't lag
// during a drag — large grids take measurable time to relayout.
let resizeTimer = null;
window.addEventListener('resize', () => {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { resizeTimer = null; applyCellSize(); }, 80);
});

// --- Build / rebuild board ---
function buildBoard() {
  applyCellSize();
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
  lastStart = null;
  buildBoard();
  statusEl.textContent  = T.clickPrompt;
  status2El.textContent = '';
  saveState();
}

for (const inp of [wInput, hInput]) {
  inp.addEventListener('change', onDimensionChange);
  inp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); inp.blur(); onDimensionChange(); }
  });
}

heuristicSelect.addEventListener('change', () => {
  heuristic = heuristicSelect.value;
  saveState();
  resolveLast();
});

figureSelect.addEventListener('change', () => {
  figure = figureSelect.value;
  activeMoves = generateBaseMoves(figure);  // fresh definition order for the new figure
  updateMixTooltip();
  lastStart = null;
  buildBoard();
  statusEl.textContent  = T.clickPrompt;
  status2El.textContent = '';
  saveState();
});

mixBtn.addEventListener('click', () => {
  activeMoves = shuffle(activeMoves);
  updateMixTooltip();
  saveState();
  resolveLast();
});

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function updateMixTooltip() {
  mixBtn.title = activeMoves.map(([dx, dy]) => `(${dx},${dy})`).join('  ');
}

function resolveLast() {
  if (lastStart) onCellClick(lastStart.col, lastStart.row);
}

// --- Click handler ---
// Status update + tour clear happen synchronously in the click handler, so
// the user sees instant feedback. The solver call would otherwise block the
// main thread before the browser repaints — JS is single-threaded. We yield
// via double-requestAnimationFrame: rAF#1 fires before the next paint, rAF#2
// fires before the paint AFTER that, so by the time rAF#2's callback runs
// the cleared-tour + new coords are guaranteed on screen.
function onCellClick(col, row) {
  lastStart = { col, row };
  statusEl.textContent  = `${col} / ${row}`;
  status2El.textContent = '';
  clearTour();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const result = solve(col, row);
    if (result.path) {
      renderTour(result.path);
      status2El.textContent = T.solution(result.steps);
    } else {
      status2El.textContent = T.noSolution(result.steps);
    }
  }));
}

// --- Solver: iterative DFS, heuristic-aware candidate ordering ---
function solve(startCol, startRow) {
  const moves = activeMoves;
  const heuristicNow = heuristic;

  let pad = 0;
  for (const [dc, dr] of moves) {
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
  const at = (col, row) => (row + pad) * stride + (col + pad);

  // Outside-In: bigger Euclidean distance from board centre wins → smaller
  // "score" wins after the sign flip, so we can use a single ascending sort.
  const cx = (W - 1) / 2, cy = (H - 1) / 2;
  function pickCandidates(col, row) {
    const list = [];
    for (let i = 0; i < moves.length; i++) {
      const dc = moves[i][0], dr = moves[i][1];
      const nc = col + dc, nr = row + dr;
      if (visited[at(nc, nr)] !== 0) continue;
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
      }
    } else { // outsideIn
      for (let k = 0; k < list.length; k++) {
        const dx = list[k][0] - cx, dy = list[k][1] - cy;
        scores[k] = -(dx*dx + dy*dy);
      }
    }
    // Sort indices to keep stability vs the move definition order on ties.
    const idx = list.map((_, i) => i);
    idx.sort((a, b) => scores[a] - scores[b]);
    return idx.map((i) => list[i]);
  }

  const path = [];
  let steps = 0;

  visited[at(startCol, startRow)] = 1;
  path.push([startCol, startRow]);

  const stack = [{ candidates: pickCandidates(startCol, startRow), nextIdx: 0 }];

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
    stack.push({ candidates: pickCandidates(nc, nr), nextIdx: 0 });
  }

  return { path: null, steps };
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
  const stash = [];
  for (let i = 0; i < path.length; i++) {
    const [c, r] = path[i];
    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = i + 1;
    stash.push([cellByIdx[r * W + c], num]);
  }
  for (const [cell, num] of stash) cell.appendChild(num);

  // SVG viewBox is 0..W × 0..H; cell center = col + 0.5 horizontally,
  // (H - 1 - row) + 0.5 vertically (row 0 = bottom rank but visually bottom row).
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

// --- Initial setup ---
loadState();
wInput.value = W;
hInput.value = H;
heuristicSelect.value = heuristic;
figureSelect.value    = figure;
updateMixTooltip();
buildBoard();
statusEl.textContent  = T.clickPrompt;
