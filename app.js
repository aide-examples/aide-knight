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
const showNumbersBox  = document.getElementById('show-numbers');
const showLinesBox    = document.getElementById('show-lines');
const wantClosedBox   = document.getElementById('want-closed');
const symmetrySelect  = document.getElementById('symmetry-select');
const lblHeuristic    = document.getElementById('lbl-heuristic');
const lblFigure       = document.getElementById('lbl-figure');
const lblNumbers      = document.getElementById('lbl-numbers');
const lblLines        = document.getElementById('lbl-lines');
const lblClosed       = document.getElementById('lbl-closed');
const lblSymmetry     = document.getElementById('lbl-symmetry');

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
    numbersLabel:   'Numbers',
    linesLabel:     'Lines',
    closedLabel:    'Closed',
    symmetryLabel:  'Symmetry',
  },
  de: {
    title:       "Knight's Tour",
    clickPrompt: 'Klicke auf ein Feld.',
    solution:    (n) => `Lösung nach ${n} Schritten.`,
    noSolution:  (n) => `Keine Lösung nach ${n} Schritten.`,
    heuristicLabel: 'Heuristik',
    figureLabel:    'Figur',
    mixBtn:         'Reihenfolge mischen',
    numbersLabel:   'Nummern',
    linesLabel:     'Linien',
    closedLabel:    'Geschlossen',
    symmetryLabel:  'Symmetrie',
  },
};
const T = STRINGS[LANG];

document.documentElement.lang = LANG;
document.title       = T.title;
titleEl.textContent  = T.title;
lblHeuristic.textContent = T.heuristicLabel;
lblFigure.textContent    = T.figureLabel;
mixBtn.textContent       = T.mixBtn;
lblNumbers.textContent   = T.numbersLabel;
lblLines.textContent     = T.linesLabel;
lblClosed.textContent    = T.closedLabel;
lblSymmetry.textContent  = T.symmetryLabel;

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
let showNumbers = true;
let showLines   = true;
let wantClosed  = false;
let symType     = 'none';  // 'none' | 'axisV' | 'point' | 'rot90'
let currentCellPx = 60;
let lastStart = null;
let cellByIdx;
let overlay;

// Below this font size, numbers are unreadable noise — hide them even if
// the "Numbers" checkbox is on. Threshold reapplied on every resize and
// every render.
const NUM_FONT_MIN_PX = 9;

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
    if (typeof s.showNumbers === 'boolean') showNumbers = s.showNumbers;
    if (typeof s.showLines   === 'boolean') showLines   = s.showLines;
    if (typeof s.wantClosed  === 'boolean') wantClosed  = s.wantClosed;
    if (['none','axisV','point','rot90'].includes(s.symType)) symType = s.symType;
  } catch { /* ignore — start from defaults */ }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      W, H, heuristic, figure, moveOrder: activeMoves,
      showNumbers, showLines, wantClosed, symType,
    }));
  } catch { /* ignore — non-persistent mode */ }
}

// --- Symmetry helpers ---
// Constraint on board geometry for each symmetry type. These rules are
// *stricter* than just "no cell on the symmetry centre" — they also include
// a colour-parity condition that ensures the shift-by-quarter tour structure
// the solver searches for is *colour-compatible* with the move set:
//
//  - axisV:  W even (no axis cell) AND W*H ≡ 2 mod 4
//            → so the quarter length q = W*H/2 is odd, which is what
//              makes the colour of path[q-1] differ from the colour of
//              mirror(path[0]) (mirror flips colour for W even), giving a
//              valid knight bridge move. Excludes 4×*, 8×*, 12×*; allows
//              6×3, 6×5, 10×3, 10×5, ...
//  - point:  W even AND H even
//            → both-even guarantees q even AND rotate180 preserves colour,
//              so path[q-1] ≠ bridge in colour, knight move valid. Mixed
//              parity boards (8×3 etc.) empirically yield no tours under
//              the shift-by-half structure.
//  - rot90:  W = H, W even AND N² ≡ 4 mod 8 (equivalently N ≡ 2 mod 4)
//            → ensures q = N²/4 is odd; rotate90 flips colour on N even,
//              so colour-bridge works. Excludes 4×4, 8×8, 12×12; allows
//              6×6, 10×10, 14×14.
//
// Note: this is the algorithm's restriction, not a mathematical
// impossibility. Some boards excluded here DO admit symmetric tours of
// a more general structure not captured by shift-by-quarter — see
// PROTOKOLL Phase 7 for the analysis.
function isSymTypeValid(t, W, H) {
  if (t === 'none')  return true;
  if (t === 'axisV') return W % 2 === 0 && (W * H) % 4 === 2;
  if (t === 'point') return W % 2 === 0 && H % 2 === 0;
  if (t === 'rot90') return W === H && W % 2 === 0 && (W * W) % 8 === 4;
  return false;
}

// Full orbit of a cell (including itself) under the chosen symmetry.
function symOrbit(c, r, t, W, H) {
  if (t === 'axisV') return [[c, r], [W - 1 - c, r]];
  if (t === 'point') return [[c, r], [W - 1 - c, H - 1 - r]];
  if (t === 'rot90') {
    const N = W;
    return [
      [c, r],
      [N - 1 - r, c],
      [N - 1 - c, N - 1 - r],
      [r, N - 1 - c],
    ];
  }
  return [[c, r]];
}

// Immediate next-quarter image of (c, r). The tour's bridge cell (the one
// after the last quarter step) is symTransform(path[0]).
function symTransform(c, r, t, W, H) {
  if (t === 'axisV') return [W - 1 - c, r];
  if (t === 'point') return [W - 1 - c, H - 1 - r];
  if (t === 'rot90') return [W - 1 - r, c];
  return [c, r];
}

const SYM_ORBIT_SIZE = { none: 1, axisV: 2, point: 2, rot90: 4 };

// --- Resize handling: viewport-driven, preserves rendered tour ---
function applyCellSize() {
  const maxBoardW = Math.max(120, window.innerWidth  - 80);
  const maxBoardH = Math.max(120, window.innerHeight - 240);
  const cellPx = Math.max(2, Math.min(60,
    Math.floor(Math.min(maxBoardW / W, maxBoardH / H))));

  currentCellPx = cellPx;
  document.documentElement.style.setProperty('--board-cell', cellPx + 'px');
  boardEl.style.gridTemplateColumns = `repeat(${W}, ${cellPx}px)`;
  boardEl.style.gridTemplateRows    = `repeat(${H}, ${cellPx}px)`;
  boardEl.style.width  = (W * cellPx) + 'px';
  boardEl.style.height = (H * cellPx) + 'px';
  applyVisibility();
}

// Numbers and tour line each have a checkbox; numbers additionally auto-hide
// when the resulting font would be unreadable (< NUM_FONT_MIN_PX). Visibility
// is driven by two CSS custom properties so toggling doesn't touch the DOM.
function applyVisibility() {
  const fontPx = currentCellPx * 0.32;
  const numbersUsable = showNumbers && fontPx >= NUM_FONT_MIN_PX;
  document.documentElement.style.setProperty('--num-display',     numbersUsable ? 'flex'  : 'none');
  document.documentElement.style.setProperty('--overlay-display', showLines     ? 'block' : 'none');
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
  refreshSymmetryOptions();
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

showNumbersBox.addEventListener('change', () => {
  showNumbers = showNumbersBox.checked;
  applyVisibility();
  saveState();
});

showLinesBox.addEventListener('change', () => {
  showLines = showLinesBox.checked;
  applyVisibility();
  saveState();
});

wantClosedBox.addEventListener('change', () => {
  wantClosed = wantClosedBox.checked;
  saveState();
  resolveLast();
});

symmetrySelect.addEventListener('change', () => {
  symType = symmetrySelect.value;
  syncClosedUiWithSymmetry();
  saveState();
  resolveLast();
});

// Toggle individual symmetry-option availability based on current W/H.
// Falls back to 'none' when the current selection becomes invalid.
function refreshSymmetryOptions() {
  for (const opt of symmetrySelect.options) {
    opt.disabled = !isSymTypeValid(opt.value, W, H);
  }
  if (!isSymTypeValid(symType, W, H)) {
    symType = 'none';
    symmetrySelect.value = 'none';
  }
  syncClosedUiWithSymmetry();
}

// Symmetry implies closed: when a symmetry is active, force the Closed
// checkbox to checked+disabled. The user's underlying wantClosed value
// is preserved and restored when symmetry returns to 'none'.
function syncClosedUiWithSymmetry() {
  if (symType !== 'none') {
    wantClosedBox.checked  = true;
    wantClosedBox.disabled = true;
  } else {
    wantClosedBox.disabled = false;
    wantClosedBox.checked  = wantClosed;
  }
}

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
    const result = solve(col, row, wantClosed, symType);
    if (result.path) {
      renderTour(result.path, result.closed);
      status2El.textContent = T.solution(result.steps);
    } else {
      status2El.textContent = T.noSolution(result.steps);
    }
  }));
}

// --- Solver: iterative DFS, heuristic-aware candidate ordering ---
//
// Closed-tour bias (Schwenk technique): mark the bridge cell's neighbours
// as "save for last" by adding a large penalty to their heuristic score.
// Warnsdorff/Outside-In will only pick them when forced — so the very last
// move tends to land on one of them, giving a closed tour. Brute Force
// has no scoring → no bias → relies purely on backtracking against the
// closure check.
//
// Symmetry constraint (axisV / point / rot90): the tour is forced to be
// invariant under the chosen geometric transformation. The DFS searches
// only the "quarter" path of length total / orbitSize; each placement
// implicitly fills the orbit (2 cells for axis/point, 4 for rot90). The
// bridge cell is then symTransform(start) rather than start itself —
// because that is where quarter k=1 begins in the full tour.
function solve(startCol, startRow, closed, sym) {
  sym = sym || 'none';
  const moves = activeMoves;
  const heuristicNow = heuristic;
  const wantsClosure = !!closed || sym !== 'none';

  if (!isSymTypeValid(sym, W, H)) {
    return { path: null, steps: 0 };
  }

  let pad = 0;
  for (const [dc, dr] of moves) {
    const d = Math.max(Math.abs(dc), Math.abs(dr));
    if (d > pad) pad = d;
  }
  const stride = W + 2 * pad;
  const total  = W * H;
  const orbitSize = SYM_ORBIT_SIZE[sym];
  const quarterLen = total / orbitSize;
  const visited = new Int32Array(stride * (H + 2 * pad));
  for (let r = 0; r < H + 2 * pad; r++) {
    for (let c = 0; c < W + 2 * pad; c++) {
      if (c < pad || c >= W + pad || r < pad || r >= H + pad) {
        visited[r * stride + c] = -1;
      }
    }
  }
  const at = (col, row) => (row + pad) * stride + (col + pad);

  // Bridge target: the cell whose knight-neighbours the tour must end on.
  // For sym==='none' + closed=true: bridge is the start itself.
  // For sym!=='none':              bridge is the next-quarter image of start.
  const bridge = wantsClosure ? symTransform(startCol, startRow, sym, W, H) : null;
  // startNbrs is the precise closure-target set for the bridge check at the
  // end of the quarter. closureBias is a wider set used only for the
  // heuristic penalty: in symmetric mode, placing ANY cell whose orbit
  // contains a startNbr cell consumes that closure target via the orbit, so
  // we have to penalise the candidate too — otherwise the bias is leaky.
  const startNbrs   = new Uint8Array(stride * (H + 2 * pad));
  const closureBias = new Uint8Array(stride * (H + 2 * pad));
  if (wantsClosure) {
    for (const [dc, dr] of moves) {
      const idx = at(bridge[0] + dc, bridge[1] + dr);
      if (visited[idx] === -1) continue;
      startNbrs[idx]   = 1;
      closureBias[idx] = 1;
    }
    if (sym !== 'none') {
      for (let i = 0; i < startNbrs.length; i++) {
        if (!startNbrs[i]) continue;
        const r = Math.floor(i / stride) - pad;
        const c = (i % stride) - pad;
        const orb = symOrbit(c, r, sym, W, H);
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
      // For symmetric mode, also check the candidate's orbit — placing
      // (nc, nr) implies placing its orbit mates simultaneously, so if any
      // of them is already taken (e.g. by an earlier orbit), the candidate
      // is dead.
      if (sym !== 'none') {
        const orb = symOrbit(nc, nr, sym, W, H);
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
        scores[k] = -(dx*dx + dy*dy);
        if (wantsClosure && closureBias[at(c, r)]) scores[k] += CLOSURE_PENALTY;
      }
    }
    const idx = list.map((_, i) => i);
    idx.sort((a, b) => scores[a] - scores[b]);
    return idx.map((i) => list[i]);
  }

  // Place start + orbit
  const startOrbit = symOrbit(startCol, startRow, sym, W, H);
  for (let i = 0; i < startOrbit.length; i++) {
    if (visited[at(startOrbit[i][0], startOrbit[i][1])] !== 0) {
      return { path: null, steps: 0 };  // start orbit self-collides (shouldn't with valid sym)
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
        return { path: expandTour(path, sym, W, H), steps, closed: false };
      }
      const last = path[quarterLen - 1];
      if (startNbrs[at(last[0], last[1])]) {
        return { path: expandTour(path, sym, W, H), steps, closed: true };
      }
      // Fall through to backtrack
    }

    const top = stack[stack.length - 1];
    if (top.nextIdx >= top.candidates.length) {
      const popped = path.pop();
      const orb = symOrbit(popped[0], popped[1], sym, W, H);
      for (let i = 0; i < orb.length; i++) {
        visited[at(orb[i][0], orb[i][1])] = 0;
      }
      stack.pop();
      steps++;
      continue;
    }

    const [nc, nr] = top.candidates[top.nextIdx++];
    steps++;
    const orb = symOrbit(nc, nr, sym, W, H);
    for (let i = 0; i < orb.length; i++) {
      visited[at(orb[i][0], orb[i][1])] = 1;
    }
    path.push([nc, nr]);
    stack.push({ candidates: pickCandidates(nc, nr), nextIdx: 0 });
  }

  return { path: null, steps };
}

// Expand a quarter path into the full tour by appending the orbit images.
// Order: quarter, then transform(quarter), then transform²(quarter), ...
// The full tour is closed: full[total-1] connects back to full[0] via the
// move-set's symmetry (knight moves are invariant under 90°/180°/mirror).
function expandTour(quarter, sym, W, H) {
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

// --- Render ---
function clearTour() {
  for (const cell of cellByIdx) {
    const num = cell.querySelector('.num');
    if (num) num.remove();
  }
  while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
}

function renderTour(path, isClosed) {
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

  if (isClosed) {
    // Dashed closing arc from last tour cell back to the start. Same colour
    // and stroke as the polyline so it reads as part of the same tour; the
    // dash signals "this edge wasn't taken by a single move, it just closes
    // the cycle".
    const last  = path[path.length - 1];
    const first = path[0];
    const close = document.createElementNS(SVG_NS, 'line');
    close.setAttribute('x1', last[0]  + 0.5);
    close.setAttribute('y1', H - 1 - last[1]  + 0.5);
    close.setAttribute('x2', first[0] + 0.5);
    close.setAttribute('y2', H - 1 - first[1] + 0.5);
    close.setAttribute('stroke', '#c0392b');
    close.setAttribute('stroke-width', '0.08');
    close.setAttribute('stroke-linecap', 'round');
    close.setAttribute('stroke-dasharray', '0.18 0.12');
    overlay.appendChild(close);
  }
}

// --- Initial setup ---
loadState();
wInput.value = W;
hInput.value = H;
heuristicSelect.value = heuristic;
figureSelect.value    = figure;
showNumbersBox.checked = showNumbers;
showLinesBox.checked   = showLines;
wantClosedBox.checked  = wantClosed;
symmetrySelect.value   = symType;
updateMixTooltip();
buildBoard();
refreshSymmetryOptions();
statusEl.textContent  = T.clickPrompt;
