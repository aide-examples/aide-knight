// aide-knight tests — pure-function browser test runner.
//
// Defines a tiny test framework (test(), assert(), assertEq()) and a tour
// validator, then runs the test cases against Figures and Solver.

const _tests = [];
function test(name, fn) { _tests.push({ name, fn }); }

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEq(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${msg ? msg + ': ' : ''}expected ${e}, got ${a}`);
}

// Validates that a tour path is a sequence of valid moves over distinct
// cells within bounds, covering exactly W*H - |blocked| cells, and never
// stepping on a blocked cell.
function validateTour(path, W, H, moves, blocked) {
  assert(path, 'no path');
  const blockedSet = blocked instanceof Set ? blocked : new Set();
  const expectedLen = W * H - blockedSet.size;
  assertEq(path.length, expectedLen, 'path length');
  const seen = new Set();
  for (const [c, r] of path) {
    const k = `${c},${r}`;
    assert(!seen.has(k), `duplicate cell ${k}`);
    seen.add(k);
    assert(c >= 0 && c < W && r >= 0 && r < H, `cell ${k} out of bounds`);
    assert(!blockedSet.has(k), `blocked cell ${k} appears in tour`);
  }
  const moveSet = new Set(moves.map((m) => m.join(',')));
  for (let i = 1; i < path.length; i++) {
    const dc = path[i][0] - path[i - 1][0];
    const dr = path[i][1] - path[i - 1][1];
    assert(moveSet.has(`${dc},${dr}`), `step ${i}: invalid move (${dc},${dr})`);
  }
}

// Validates closure: the last cell can connect to the first via a single move.
function validateClosure(path, moves) {
  const dc = path[0][0] - path[path.length - 1][0];
  const dr = path[0][1] - path[path.length - 1][1];
  const moveSet = new Set(moves.map((m) => m.join(',')));
  assert(moveSet.has(`${dc},${dr}`), `closure: invalid bridge (${dc},${dr})`);
}

// --- Figures ---

test('Figures.generateBaseMoves(1,2) = 8 distinct knight moves', () => {
  const m = Figures.generateBaseMoves('1,2');
  assertEq(m.length, 8);
  const set = new Set(m.map((p) => p.join(',')));
  assertEq(set.size, 8);
});

test('Figures.generateBaseMoves(3,4) = 8 distinct (3,4)/(4,3) moves', () => {
  const m = Figures.generateBaseMoves('3,4');
  const set = new Set(m.map((p) => p.join(',')));
  assertEq(set.size, 8);
  // every move is a sign-permutation of (3,4) or (4,3)
  for (const [a, b] of m) {
    const ok = (Math.abs(a) === 3 && Math.abs(b) === 4) ||
               (Math.abs(a) === 4 && Math.abs(b) === 3);
    assert(ok, `unexpected move (${a},${b})`);
  }
});

test('Figures.computePad picks max axis distance', () => {
  assertEq(Figures.computePad(Figures.generateBaseMoves('1,2')), 2);
  assertEq(Figures.computePad(Figures.generateBaseMoves('3,4')), 4);
});

// --- Solver static helpers ---

test('Solver.isSymTypeValid truth table', () => {
  assert(Solver.isSymTypeValid('none', 8, 8));
  assert(!Solver.isSymTypeValid('axisV', 8, 8), '8x8 axisV must be invalid (W*H mod 4 = 0)');
  assert(Solver.isSymTypeValid('axisV', 6, 5),  '6x5 axisV must be valid');
  assert(Solver.isSymTypeValid('point', 8, 8),  '8x8 point must be valid');
  assert(!Solver.isSymTypeValid('point', 6, 5), '6x5 point must be invalid (H odd)');
  assert(Solver.isSymTypeValid('rot90', 6, 6),  '6x6 rot90 must be valid');
  assert(!Solver.isSymTypeValid('rot90', 8, 8), '8x8 rot90 must be invalid (N mod 4 = 0)');
  assert(!Solver.isSymTypeValid('rot90', 6, 5), 'rot90 must require square board');
});

test('Solver.symOrbit rot90 on 8x8 yields 4 distinct cells', () => {
  const orb = Solver.symOrbit(0, 0, 'rot90', 8, 8);
  assertEq(orb.length, 4);
  assertEq(new Set(orb.map((p) => p.join(','))).size, 4);
});

test('Solver.symTransform rot90 applied 4 times = identity', () => {
  let p = [2, 3];
  for (let i = 0; i < 4; i++) {
    p = Solver.symTransform(p[0], p[1], 'rot90', 8, 8);
  }
  assertEq(p, [2, 3]);
});

// --- Solver.solve correctness ---

test('Solver: 8x8 knight (0,0) Warnsdorff finds valid tour in 63 steps', () => {
  const moves = Figures.generateBaseMoves('1,2');
  const r = Solver.solve(8, 8, moves, 0, 0, { heuristic: 'warnsdorff' });
  validateTour(r.path, 8, 8, moves);
  assertEq(r.steps, 63);
});

test('Solver: 8x8 knight (3,3) closed Warnsdorff finds closed tour', () => {
  const moves = Figures.generateBaseMoves('1,2');
  const r = Solver.solve(8, 8, moves, 3, 3, { heuristic: 'warnsdorff', closed: true });
  validateTour(r.path, 8, 8, moves);
  assert(r.closed, 'closed flag must be true');
  validateClosure(r.path, moves);
});

test('Solver: 6x6 knight (0,0) rot90 Warnsdorff finds symmetric tour', () => {
  const moves = Figures.generateBaseMoves('1,2');
  const r = Solver.solve(6, 6, moves, 0, 0, { heuristic: 'warnsdorff', sym: 'rot90' });
  validateTour(r.path, 6, 6, moves);
  assert(r.closed, 'symmetric tour must be closed');
  validateClosure(r.path, moves);
  // Check rotational symmetry: path[k+9] = rot90(path[k])
  const q = 9;  // 36/4
  for (let k = 0; k < q; k++) {
    const expected = Solver.symTransform(r.path[k][0], r.path[k][1], 'rot90', 6, 6);
    assertEq(r.path[k + q], expected, `rot90 invariance at k=${k}`);
  }
});

test('Solver: 5x5 knight from light square has no tour (path = null)', () => {
  // (0, 1) on 5x5 is a light square (color (0+1) % 2 = 1).
  // 5x5 has 13 dark + 12 light cells; from light, parity argument forbids tour.
  const moves = Figures.generateBaseMoves('1,2');
  const r = Solver.solve(5, 5, moves, 0, 1, { heuristic: 'warnsdorff' });
  assertEq(r.path, null);
});

test('Solver: blocked cell makes the start invalid', () => {
  const moves = Figures.generateBaseMoves('1,2');
  const r = Solver.solve(8, 8, moves, 0, 0, {
    heuristic: 'warnsdorff',
    blocked: new Set(['0,0']),
  });
  assertEq(r.path, null);
});

test('Solver: 8x8 Outside-In Point with 8 symmetric blocks finds 56-cell tour', () => {
  // User-confirmed pattern (Phase 8 screenshot, May 14): four point-symmetric
  // pairs of blocks form a 'mask'. Pure Warnsdorff on a single central
  // block stalls badly, but Outside-In with point symmetry and this curated
  // block set finds the 56-cell closed tour in a few thousand steps.
  const moves = Figures.generateBaseMoves('1,2');
  const blocked = new Set(['6,6','1,1','1,6','6,1','3,4','4,3','4,4','3,3']);
  const r = Solver.solve(8, 8, moves, 7, 7, {
    heuristic: 'outsideIn',
    sym: 'point',
    blocked,
  });
  validateTour(r.path, 8, 8, moves, blocked);
  assert(r.closed, 'point-symmetric tour must be closed');
  validateClosure(r.path, moves);
});

test('Solver: blocked count not divisible by orbit size returns null', () => {
  // sym=axisV on 6x5 (orbit size 2), blocking a single asymmetric cell.
  // 6*5 - 1 = 29 is not divisible by 2 → solver bails immediately.
  const moves = Figures.generateBaseMoves('1,2');
  const r = Solver.solve(6, 5, moves, 0, 0, {
    heuristic: 'warnsdorff',
    sym: 'axisV',
    blocked: new Set(['2,2']),  // (5-1-2,2)=(3,2) not blocked, so set is asymmetric
  });
  assertEq(r.path, null);
});

test('Solver: 10x10 knight (0,0) Warnsdorff finds tour, Outside-In also', () => {
  const moves = Figures.generateBaseMoves('1,2');
  const r1 = Solver.solve(10, 10, moves, 0, 0, { heuristic: 'warnsdorff' });
  validateTour(r1.path, 10, 10, moves);
  const r2 = Solver.solve(10, 10, moves, 0, 0, { heuristic: 'outsideIn' });
  validateTour(r2.path, 10, 10, moves);
});

// --- Runner ---

function runTests() {
  const out = document.getElementById('out');
  const summary = document.getElementById('summary');
  let pass = 0, fail = 0;
  for (const t of _tests) {
    const row = document.createElement('div');
    try {
      t.fn();
      row.className = 'pass';
      row.textContent = `✓ ${t.name}`;
      pass++;
    } catch (e) {
      row.className = 'fail';
      row.textContent = `✗ ${t.name}: ${e.message}`;
      fail++;
    }
    out.appendChild(row);
  }
  summary.textContent = `${pass} passed, ${fail} failed`;
  summary.className = fail ? 'fail' : 'pass';
}

window.addEventListener('DOMContentLoaded', runTests);
