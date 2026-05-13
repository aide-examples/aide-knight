/**
 * App — Initialisierung und Event-Wiring.
 *
 * Linksklick = Startfeld wählen und Tour berechnen.
 * Rechtsklick = Feld blockieren/freigeben.
 */
document.addEventListener('DOMContentLoaded', () => {
  const canvasEl     = document.getElementById('board-canvas');
  const widthInput   = document.getElementById('boardWidth');
  const heightInput  = document.getElementById('boardHeight');
  const showNumbers  = document.getElementById('showNumbers');
  const showLines    = document.getElementById('showLines');
  const closedCheck  = document.getElementById('closed');
  const symmetrySel  = document.getElementById('symmetry');
  const heuristicSel = document.getElementById('heuristic');
  const moveSetSel   = document.getElementById('moveSet');

  const ui = new UI(canvasEl);
  let board = null;

  // @section Board initialisieren

  function initBoard() {
    const w = Math.max(3, parseInt(widthInput.value) || 8);
    const h = Math.max(3, parseInt(heightInput.value) || 8);
    board = new Board(w, h, moveSetSel.value);
    ui.layout(w, h);
    ui.drawBoard(board);
    UI.setStatus('Klicke auf ein Feld, um die Tour zu starten. Rechtsklick blockiert Felder.');
    UI.setAttempts('—');
  }

  // @section Linksklick → Tour berechnen

  function onCanvasClick(e) {
    if (!board) return;

    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = ui.cellFromPixel(x, y);
    if (!cell) return;

    if (board.isBlocked(cell.row, cell.col)) {
      UI.setStatus('Dieses Feld ist blockiert.');
      return;
    }

    UI.setStatus('Berechne…');
    UI.setAttempts('—');

    setTimeout(() => {
      const solver = new Solver(board, {
        closed: closedCheck.checked,
        symmetry: symmetrySel.value,
        heuristic: heuristicSel.value
      });

      const result = solver.solve(cell.row, cell.col);

      if (result.message) {
        UI.setStatus(result.message);
        UI.setAttempts(result.attempts);
        return;
      }

      UI.setAttempts(result.attempts);

      if (result.success) {
        ui.render(board, closedCheck.checked);
        UI.setStatus('Lösung gefunden!');
      } else if (result.aborted) {
        UI.setStatus('Suche abgebrochen.');
      } else {
        UI.setStatus('Keine Lösung gefunden.');
      }
    }, 10);
  }

  // @section Rechtsklick → Feld blockieren/freigeben

  function onCanvasRightClick(e) {
    e.preventDefault();
    if (!board) return;

    const rect = canvasEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = ui.cellFromPixel(x, y);
    if (!cell) return;

    board.toggleBlocked(cell.row, cell.col);
    board.reset();
    ui.drawBoard(board);
    UI.setStatus('Spielbare Felder: ' + board.playableCount);
    UI.setAttempts('—');
  }

  // @section Event-Listener

  canvasEl.addEventListener('click', onCanvasClick);
  canvasEl.addEventListener('contextmenu', onCanvasRightClick);
  widthInput.addEventListener('change', initBoard);
  heightInput.addEventListener('change', initBoard);
  moveSetSel.addEventListener('change', initBoard);
  showNumbers.addEventListener('change', () => ui.setShowNumbers(showNumbers.checked));
  showLines.addEventListener('change', () => ui.setShowLines(showLines.checked));

  initBoard();
});
