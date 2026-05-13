/**
 * UI — Canvas-basiertes Rendering für das Springerproblem.
 *
 * Zeichnet Schachbrett (Pastelltöne), blockierte Felder (grau),
 * Pfadlinien, Schrittnummern, Startfeld-Markierung und
 * Closing-Linie bei geschlossenen Touren.
 */
class UI {

  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.cellSize = 0;
    this.boardWidth = 0;
    this.boardHeight = 0;
    this.showNumbers = true;
    this.showLines = true;
    this.board = null;
    this.isClosed = false;
  }

  // @section Layout

  layout(boardWidth, boardHeight) {
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
    this.board = null;
    this.isClosed = false;

    const maxW = Math.min(900, window.innerWidth - 48);
    const maxH = Math.min(700, window.innerHeight - 180);

    this.cellSize = Math.max(2, Math.min(
      Math.floor(maxW / boardWidth),
      Math.floor(maxH / boardHeight)
    ));

    this.canvas.width = this.cellSize * boardWidth;
    this.canvas.height = this.cellSize * boardHeight;
    this.canvas.style.width = this.canvas.width + 'px';
    this.canvas.style.height = this.canvas.height + 'px';
  }

  // @section Koordinaten-Mapping

  cellFromPixel(x, y) {
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    if (row >= 0 && row < this.boardHeight && col >= 0 && col < this.boardWidth) {
      return { row, col };
    }
    return null;
  }

  // @section Rendering

  render(board, isClosed) {
    this.board = board;
    this.isClosed = isClosed;
    this._draw();
  }

  drawBoard(board) {
    this.board = board;
    this.isClosed = false;
    this._drawCheckerboard();
  }

  refresh() {
    this._draw();
  }

  setShowNumbers(show) {
    this.showNumbers = show;
    this._draw();
  }

  setShowLines(show) {
    this.showLines = show;
    this._draw();
  }

  // @section Zeichenroutinen

  _draw() {
    this._drawCheckerboard();
    if (!this.board || this.board.moveOrder.length === 0) return;
    this._drawStartField();
    if (this.showLines) this._drawPath();
    if (this.showNumbers) this._drawNumbers();
  }

  _drawCheckerboard() {
    const ctx = this.ctx;
    const s = this.cellSize;

    for (let row = 0; row < this.boardHeight; row++) {
      for (let col = 0; col < this.boardWidth; col++) {
        if (this.board && this.board.isBlocked(row, col)) {
          ctx.fillStyle = '#888';
        } else {
          ctx.fillStyle = (row + col) % 2 === 0 ? '#E8D5B7' : '#B7D5E8';
        }
        ctx.fillRect(col * s, row * s, s, s);
      }
    }
  }

  _drawStartField() {
    const start = this.board.moveOrder[0];
    const ctx = this.ctx;
    const s = this.cellSize;
    const lw = Math.max(2, s * 0.15);

    ctx.strokeStyle = '#27ae60';
    ctx.lineWidth = lw;
    ctx.strokeRect(
      start.col * s + lw / 2,
      start.row * s + lw / 2,
      s - lw,
      s - lw
    );
  }

  _drawPath() {
    const order = this.board.moveOrder;
    if (order.length < 2) return;

    const ctx = this.ctx;
    const s = this.cellSize;
    const half = s / 2;

    ctx.beginPath();
    ctx.moveTo(order[0].col * s + half, order[0].row * s + half);
    for (let i = 1; i < order.length; i++) {
      ctx.lineTo(order[i].col * s + half, order[i].row * s + half);
    }

    if (this.isClosed && order.length > 2) {
      ctx.lineTo(order[0].col * s + half, order[0].row * s + half);
    }

    ctx.strokeStyle = 'rgba(231, 76, 60, 0.7)';
    ctx.lineWidth = Math.max(1, s * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  _drawNumbers() {
    if (this.cellSize < 14) return;

    const ctx = this.ctx;
    const s = this.cellSize;
    const fontSize = Math.max(8, Math.floor(s * 0.38));
    const half = s / 2;

    ctx.font = `600 ${fontSize}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#444';

    for (let row = 0; row < this.boardHeight; row++) {
      for (let col = 0; col < this.boardWidth; col++) {
        const step = this.board.getCell(row, col);
        if (step > 0) {
          ctx.fillText(step, col * s + half, row * s + half);
        }
      }
    }
  }

  // @section Status-Anzeige

  static setStatus(text) {
    document.getElementById('status').textContent = text;
  }

  static setAttempts(n) {
    document.getElementById('attempts').textContent =
      typeof n === 'number' ? n.toLocaleString('de-DE') : n;
  }
}
