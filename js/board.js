// Board — chessboard DOM management.
//
// Builds the W×H grid of cells with a click handler, manages the SVG overlay
// element used by Renderer, and recomputes cell size on viewport changes.
// Reads visibility flags from AppState to push --num-display / --overlay-
// display CSS variables. Keyboard navigation on cells is added in B4 (a11y).

class Board {
  constructor(boardEl) {
    this.boardEl = boardEl;
    this.boardEl.setAttribute('role', 'grid');
    this.W = 0;
    this.H = 0;
    this.cellByIdx = [];
    this.overlay = null;
    this.currentCellPx = 60;
    this.onCellClick = null;
    this._setupResizeListener();
    this._setupKeyboardNav();
  }

  static SVG_NS = 'http://www.w3.org/2000/svg';
  static NUM_FONT_MIN_PX = 9;

  setOnCellClick(handler) { this.onCellClick = handler; }
  setOnCellBlock(handler) { this.onCellBlock = handler; }

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

  // Re-applies translated aria-labels on the board and all cells.
  // Called from app.js when the language changes.
  applyI18n() {
    const i18n = I18n.getInstance();
    this.boardEl.setAttribute('aria-label', i18n.t('boardLabel'));
    for (const cell of this.cellByIdx) {
      if (!cell) continue;
      const col = parseInt(cell.dataset.col, 10);
      const row = parseInt(cell.dataset.row, 10);
      cell.setAttribute('aria-label', i18n.t('cellLabel', col, row));
    }
  }

  _build() {
    this._applyCellSize();
    this.boardEl.innerHTML = '';
    this.boardEl.setAttribute('aria-rowcount', this.H);
    this.boardEl.setAttribute('aria-colcount', this.W);
    this.boardEl.setAttribute('aria-label', I18n.getInstance().t('boardLabel'));
    this.cellByIdx = new Array(this.W * this.H);

    // Roving tabindex: exactly one cell is focusable (tabindex=0); arrows
    // move focus among cells and adjust the tabindex accordingly. Initial
    // tab target: state.lastStart if set, else top-left (col 0, row H-1).
    const state = AppState.getInstance();
    const focusCell = (state.lastStart &&
                      state.lastStart.col >= 0 && state.lastStart.col < this.W &&
                      state.lastStart.row >= 0 && state.lastStart.row < this.H)
      ? state.lastStart
      : { col: 0, row: this.H - 1 };

    const i18n = I18n.getInstance();
    const frag = document.createDocumentFragment();
    for (let row = this.H - 1; row >= 0; row--) {
      for (let col = 0; col < this.W; col++) {
        const cell = document.createElement('div');
        cell.className = 'cell ' + ((row + col) % 2 === 0 ? 'dark' : 'light');
        cell.dataset.col = col;
        cell.dataset.row = row;
        cell.setAttribute('role', 'gridcell');
        // aria-rowindex/colindex are 1-based; top row is row 1 visually
        cell.setAttribute('aria-rowindex', this.H - row);
        cell.setAttribute('aria-colindex', col + 1);
        cell.setAttribute('aria-label', i18n.t('cellLabel', col, row));
        cell.tabIndex = (col === focusCell.col && row === focusCell.row) ? 0 : -1;
        this._wireCellEvents(cell, col, row);
        frag.appendChild(cell);
        this.cellByIdx[row * this.W + col] = cell;
      }
    }
    this.boardEl.appendChild(frag);
    this.applyBlockClasses();

    this.overlay = document.createElementNS(Board.SVG_NS, 'svg');
    this.overlay.setAttribute('id', 'overlay');
    this.overlay.setAttribute('viewBox', `0 0 ${this.W} ${this.H}`);
    this.overlay.setAttribute('preserveAspectRatio', 'none');
    this.overlay.setAttribute('aria-hidden', 'true');  // decorative; tour is announced via status
    this.boardEl.appendChild(this.overlay);
  }

  _setupKeyboardNav() {
    this.boardEl.addEventListener('keydown', (e) => {
      const focused = document.activeElement;
      if (!focused || !focused.classList || !focused.classList.contains('cell')) return;
      let col = parseInt(focused.dataset.col, 10);
      let row = parseInt(focused.dataset.row, 10);
      let handled = true;
      switch (e.key) {
        case 'ArrowLeft':  col = Math.max(0, col - 1); break;
        case 'ArrowRight': col = Math.min(this.W - 1, col + 1); break;
        case 'ArrowUp':    row = Math.min(this.H - 1, row + 1); break;  // visually up = higher rank
        case 'ArrowDown':  row = Math.max(0, row - 1); break;
        case 'Home':       col = 0; break;
        case 'End':        col = this.W - 1; break;
        case 'PageUp':     row = this.H - 1; break;
        case 'PageDown':   row = 0; break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (e.shiftKey) {
            if (this.onCellBlock) this.onCellBlock(col, row);
          } else {
            if (this.onCellClick) this.onCellClick(col, row);
          }
          return;
        default:
          handled = false;
      }
      if (!handled) return;
      e.preventDefault();
      this._focusCell(col, row);
    });
  }

  _focusCell(col, row) {
    const old = this.boardEl.querySelector('.cell[tabindex="0"]');
    if (old) old.tabIndex = -1;
    const newCell = this.getCell(col, row);
    if (newCell) {
      newCell.tabIndex = 0;
      newCell.focus();
    }
  }

  // Three input paths to a cell:
  //   - left click       => onCellClick (start a solve)
  //   - right click      => onCellBlock (toggle blocked)  + suppress context menu
  //   - touch long-press => onCellBlock  (touch substitute for right click)
  // The click event always fires after pointerup; if the long-press timer
  // already fired, the click is suppressed to avoid double-triggering.
  _wireCellEvents(cell, col, row) {
    let pressTimer = null;
    let longPressFired = false;
    const LONG_PRESS_MS = 500;

    cell.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;  // only the primary pointer
      longPressFired = false;
      pressTimer = setTimeout(() => {
        pressTimer = null;
        longPressFired = true;
        if (this.onCellBlock) this.onCellBlock(col, row);
      }, LONG_PRESS_MS);
    });
    const cancel = () => {
      if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    };
    cell.addEventListener('pointerup', cancel);
    cell.addEventListener('pointercancel', cancel);
    cell.addEventListener('pointerleave', cancel);

    cell.addEventListener('click', (e) => {
      if (longPressFired) {
        e.preventDefault();
        e.stopPropagation();
        longPressFired = false;
        return;
      }
      if (this.onCellClick) this.onCellClick(col, row);
    });

    cell.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (this.onCellBlock) this.onCellBlock(col, row);
    });
  }

  // Reflect AppState.blockedCells onto the .blocked CSS class. Idempotent;
  // safe to call after any block-set mutation or board rebuild.
  applyBlockClasses() {
    const blocked = AppState.getInstance().blockedCells;
    for (const cell of this.cellByIdx) {
      if (!cell) continue;
      const key = `${cell.dataset.col},${cell.dataset.row}`;
      cell.classList.toggle('blocked', blocked.has(key));
    }
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
