/**
 * Board — Datenmodell für das Springerproblem.
 *
 * Das Brett wird intern um einen Padding-Rand erweitert (blockierte Felder),
 * sodass bei der Nachbar-Ermittlung keine Bounds-Checks nötig sind.
 * Die Zugart ist konfigurierbar — jede Figur wird durch ein (a,b)-Paar
 * definiert, aus dem alle 8 Richtungsvarianten erzeugt werden.
 *
 * Zellwerte: -1 = blockiert, 0 = frei, >0 = Schrittnummer
 */
class Board {

  /**
   * Erzeugt aus einem (a,b)-Paar alle 8 Offset-Varianten.
   * Z.B. (1,2) → [(-2,-1),(-2,1),(-1,-2),(-1,2),(1,-2),(1,2),(2,-1),(2,1)]
   */
  static makeOffsets(a, b) {
    const set = new Set();
    for (const [dr, dc] of [[a,b],[a,-b],[-a,b],[-a,-b],[b,a],[b,-a],[-b,a],[-b,-a]]) {
      set.add(dr + ',' + dc);
    }
    return [...set].map(s => s.split(',').map(Number));
  }

  static MOVE_SETS = {
    '1,2': Board.makeOffsets(1, 2),
    '1,4': Board.makeOffsets(1, 4),
    '2,3': Board.makeOffsets(2, 3),
    '3,4': Board.makeOffsets(3, 4),
  };

  constructor(width, height, moveSetKey) {
    this.width = width;
    this.height = height;
    this.moveSetKey = moveSetKey || '1,2';
    this.offsets = Board.MOVE_SETS[this.moveSetKey] || Board.MOVE_SETS['1,2'];

    // Padding = maximaler Offset-Betrag
    this.padding = 0;
    for (const [dr, dc] of this.offsets) {
      this.padding = Math.max(this.padding, Math.abs(dr), Math.abs(dc));
    }

    this.moveOrder = [];
    this.playableCount = width * height;
    this._initCells();
  }

  // @section Internes Array

  _initCells() {
    const p = this.padding;
    const innerW = this.width + 2 * p;
    const innerH = this.height + 2 * p;

    this.cells = Array.from({ length: innerH }, (_, r) =>
      Array.from({ length: innerW }, (_, c) => {
        const inBoard = r >= p && r < p + this.height &&
                        c >= p && c < p + this.width;
        return inBoard ? 0 : -1;
      })
    );
  }

  // @section Koordinaten-Mapping (logisch → intern)

  _r(row) { return row + this.padding; }
  _c(col) { return col + this.padding; }

  // @section Zellzugriff (logische Koordinaten)

  getCell(row, col) {
    return this.cells[this._r(row)][this._c(col)];
  }

  isFree(row, col) {
    return this.cells[this._r(row)][this._c(col)] === 0;
  }

  isBlocked(row, col) {
    return this.cells[this._r(row)][this._c(col)] === -1;
  }

  // @section Spielzüge

  place(row, col, stepNr) {
    this.cells[this._r(row)][this._c(col)] = stepNr;
    this.moveOrder.push({ row, col });
  }

  remove(row, col) {
    this.cells[this._r(row)][this._c(col)] = 0;
    this.moveOrder.pop();
  }

  // @section Nachbarn (logische Koordinaten, kein Bounds-Check!)

  getFreeNeighbors(row, col) {
    const result = [];
    const ir = this._r(row);
    const ic = this._c(col);
    for (const [dr, dc] of this.offsets) {
      if (this.cells[ir + dr][ic + dc] === 0) {
        result.push({ row: row + dr, col: col + dc });
      }
    }
    return result;
  }

  getDegree(row, col) {
    let count = 0;
    const ir = this._r(row);
    const ic = this._c(col);
    for (const [dr, dc] of this.offsets) {
      if (this.cells[ir + dr][ic + dc] === 0) count++;
    }
    return count;
  }

  // @section Zentrumsabstand (für Outside-In-Heuristik)

  distanceFromCenter(row, col) {
    const cx = (this.width - 1) / 2;
    const cy = (this.height - 1) / 2;
    const dx = col - cx;
    const dy = row - cy;
    return dx * dx + dy * dy;
  }

  // @section Blockierte Felder

  toggleBlocked(row, col) {
    const ir = this._r(row);
    const ic = this._c(col);
    const val = this.cells[ir][ic];
    if (val === -1) {
      this.cells[ir][ic] = 0;
      this.playableCount++;
    } else if (val === 0) {
      this.cells[ir][ic] = -1;
      this.playableCount--;
    }
  }

  // @section Reset

  reset() {
    const p = this.padding;
    this.moveOrder = [];
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.cells[r + p][c + p] > 0) {
          this.cells[r + p][c + p] = 0;
        }
      }
    }
  }

  // @section Zugvalidierung

  isValidMove(r1, c1, r2, c2) {
    const dr = r2 - r1;
    const dc = c2 - c1;
    return this.offsets.some(([or, oc]) => or === dr && oc === dc);
  }
}
