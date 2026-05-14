// Board — chessboard DOM management.
//
// Builds the W×H grid of cells with a click handler, manages the SVG overlay
// element used by Renderer, and recomputes cell size on viewport changes.
// Reads visibility flags from AppState to push --num-display / --overlay-
// display CSS variables. Keyboard navigation on cells is added in B4 (a11y).

class Board {
  constructor(boardEl) {
    this.boardEl = boardEl;
    this.W = 0;
    this.H = 0;
    this.cellByIdx = [];
    this.overlay = null;
    this.currentCellPx = 60;
    this.onCellClick = null;
    this._setupResizeListener();
  }

  static SVG_NS = 'http://www.w3.org/2000/svg';
  static NUM_FONT_MIN_PX = 9;

  setOnCellClick(handler) { this.onCellClick = handler; }

  setDimensions(W, H) {
    this.W = W;
    this.H = H;
    this._build();
  }

  getCell(col, row) {
    return this.cellByIdx[row * this.W + col];
  }

  applyVisibility() {
    const state = AppState.getInstance();
    const fontPx = this.currentCellPx * 0.32;
    const numbersUsable = state.showNumbers && fontPx >= Board.NUM_FONT_MIN_PX;
    document.documentElement.style.setProperty('--num-display', numbersUsable ? 'flex' : 'none');
    document.documentElement.style.setProperty('--overlay-display', state.showLines ? 'block' : 'none');
  }

  _build() {
    this._applyCellSize();
    this.boardEl.innerHTML = '';
    this.cellByIdx = new Array(this.W * this.H);

    const frag = document.createDocumentFragment();
    for (let row = this.H - 1; row >= 0; row--) {
      for (let col = 0; col < this.W; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell ' + ((row + col) % 2 === 0 ? 'dark' : 'light');
        cell.dataset.col = col;
        cell.dataset.row = row;
        cell.addEventListener('click', () => {
          if (this.onCellClick) this.onCellClick(col, row);
        });
        frag.appendChild(cell);
        this.cellByIdx[row * this.W + col] = cell;
      }
    }
    this.boardEl.appendChild(frag);

    this.overlay = document.createElementNS(Board.SVG_NS, 'svg');
    this.overlay.setAttribute('id', 'overlay');
    this.overlay.setAttribute('viewBox', `0 0 ${this.W} ${this.H}`);
    this.overlay.setAttribute('preserveAspectRatio', 'none');
    this.boardEl.appendChild(this.overlay);
  }

  _applyCellSize() {
    const maxBoardW = Math.max(120, window.innerWidth  - 80);
    const maxBoardH = Math.max(120, window.innerHeight - 240);
    const cellPx = Math.max(2, Math.min(60,
      Math.floor(Math.min(maxBoardW / this.W, maxBoardH / this.H))));

    this.currentCellPx = cellPx;
    document.documentElement.style.setProperty('--board-cell', cellPx + 'px');
    this.boardEl.style.gridTemplateColumns = `repeat(${this.W}, ${cellPx}px)`;
    this.boardEl.style.gridTemplateRows    = `repeat(${this.H}, ${cellPx}px)`;
    this.boardEl.style.width  = (this.W * cellPx) + 'px';
    this.boardEl.style.height = (this.H * cellPx) + 'px';

    this.applyVisibility();
  }

  _setupResizeListener() {
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        if (this.W && this.H) this._applyCellSize();
      }, 80);
    });
  }
}
