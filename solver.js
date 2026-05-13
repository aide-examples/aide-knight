/**
 * Solver — DFS-Backtracking mit wählbarer Heuristik.
 *
 * Heuristiken: 'warnsdorff' (wenigste Ausgänge zuerst),
 *              'outsideIn' (größter Abstand zum Zentrum zuerst),
 *              'bruteForce' (keine Sortierung).
 *
 * Unterstützt offene/geschlossene Touren, Symmetrie (Punkt, Achse),
 * und fragt alle 5 Sekunden per confirm(), ob weitergesucht werden soll.
 */
class Solver {

  constructor(board, options = {}) {
    this.board = board;
    this.closed = !!options.closed;
    this.symmetry = options.symmetry || 'none';
    this.heuristic = options.heuristic || 'warnsdorff';
    this.attempts = 0;

    this._total = board.playableCount;
    this._useSymmetry = this.symmetry !== 'none';
    this._halfSteps = this._useSymmetry
      ? Math.floor(this._total / 2)
      : this._total;
  }

  // @section Public API

  solve(startRow, startCol) {
    this.board.reset();
    this.attempts = 0;

    const err = this._validateConstraints(startRow, startCol);
    if (err) return { success: false, attempts: 0, message: err };

    this._placeStep(startRow, startCol, 1);

    const stack = [{
      row: startRow,
      col: startCol,
      neighbors: this._sortedCandidates(startRow, startCol, 2),
      idx: 0
    }];

    let checkCounter = 0;
    let lastCheckTime = Date.now();
    const target = this._halfSteps;

    while (stack.length > 0) {
      if (++checkCounter >= 5000) {
        checkCounter = 0;
        const now = Date.now();
        if (now - lastCheckTime >= 5000) {
          if (!confirm('Suche läuft seit 5 Sekunden. Weitersuchen?')) {
            return { success: false, attempts: this.attempts, aborted: true };
          }
          lastCheckTime = now;
        }
      }

      if (stack.length === target) {
        if (this._checkEndCondition(stack[stack.length - 1])) {
          if (this._useSymmetry) this._reconstructSecondHalf();
          return { success: true, attempts: this.attempts };
        }
        const frame = stack.pop();
        this._removeStep(frame.row, frame.col);
        continue;
      }

      const nextStep = stack.length + 1;
      const frame = stack[stack.length - 1];

      if (frame.idx < frame.neighbors.length) {
        const next = frame.neighbors[frame.idx++];
        this._placeStep(next.row, next.col, nextStep);
        stack.push({
          row: next.row,
          col: next.col,
          neighbors: this._sortedCandidates(next.row, next.col, nextStep + 1),
          idx: 0
        });
      } else {
        stack.pop();
        this._removeStep(frame.row, frame.col);
      }
    }

    return { success: false, attempts: this.attempts };
  }

  // @section Validierung

  _validateConstraints(startRow, startCol) {
    if (this.board.isBlocked(startRow, startCol)) {
      return 'Startfeld ist blockiert.';
    }

    if (this._useSymmetry) {
      if (this._total % 2 !== 0) {
        return 'Symmetrische Touren benötigen eine gerade Anzahl spielbarer Felder.';
      }
      if (this.symmetry === 'axisH' && this.board.height % 2 !== 0) {
        return 'Horizontale Achsensymmetrie benötigt gerade Höhe.';
      }
      if (this.symmetry === 'axisV' && this.board.width % 2 !== 0) {
        return 'Vertikale Achsensymmetrie benötigt gerade Breite.';
      }

      const m = this._mirror(startRow, startCol);
      if (m.row === startRow && m.col === startCol) {
        return 'Startfeld darf nicht sein eigener Spiegelpunkt sein.';
      }
      if (this.board.isBlocked(m.row, m.col)) {
        return 'Spiegelpunkt des Startfelds ist blockiert.';
      }
      if (this.closed) {
        if (!this.board.isValidMove(startRow, startCol, m.row, m.col)) {
          return 'Geschlossene symmetrische Tour: Spiegelpunkt muss gültiger Zug vom Start sein.';
        }
      }
    }

    return null;
  }

  // @section Spiegelung

  _mirror(row, col) {
    switch (this.symmetry) {
      case 'point': return {
        row: this.board.height - 1 - row,
        col: this.board.width - 1 - col
      };
      case 'axisH': return {
        row: this.board.height - 1 - row,
        col: col
      };
      case 'axisV': return {
        row: row,
        col: this.board.width - 1 - col
      };
      default: return null;
    }
  }

  // @section Place / Remove (mit Spiegel)

  _placeStep(row, col, stepNr) {
    this.board.place(row, col, stepNr);
    this.attempts++;
    if (this._useSymmetry) {
      const m = this._mirror(row, col);
      this.board.cells[this.board._r(m.row)][this.board._c(m.col)] =
        this._total + 1 - stepNr;
    }
  }

  _removeStep(row, col) {
    this.board.remove(row, col);
    this.attempts++;
    if (this._useSymmetry) {
      const m = this._mirror(row, col);
      this.board.cells[this.board._r(m.row)][this.board._c(m.col)] = 0;
    }
  }

  // @section End-Bedingung

  _checkEndCondition(frame) {
    if (this._useSymmetry) {
      const m = this._mirror(frame.row, frame.col);
      return this.board.isValidMove(frame.row, frame.col, m.row, m.col);
    }
    if (this.closed) {
      const start = this.board.moveOrder[0];
      return this.board.isValidMove(frame.row, frame.col, start.row, start.col);
    }
    return true;
  }

  // @section Nachbar-Auswahl mit Heuristik und Pruning

  _sortedCandidates(row, col, nextStep) {
    let neighbors = this.board.getFreeNeighbors(row, col);

    // Pruning für geschlossene Touren (ohne Symmetrie)
    if (this.closed && !this._useSymmetry) {
      const start = this.board.moveOrder[0];

      if (nextStep === this._total) {
        neighbors = neighbors.filter(n =>
          this.board.isValidMove(n.row, n.col, start.row, start.col)
        );
      } else if (nextStep < this._total) {
        neighbors = neighbors.filter(n => {
          const isNbOfStart = this.board.isValidMove(n.row, n.col, start.row, start.col);
          const startDeg = this.board.getDegree(start.row, start.col);
          return (isNbOfStart ? startDeg - 1 : startDeg) > 0;
        });
      }
    }

    // Heuristik anwenden
    switch (this.heuristic) {
      case 'warnsdorff':
        neighbors.sort((a, b) =>
          this.board.getDegree(a.row, a.col) - this.board.getDegree(b.row, b.col)
        );
        break;
      case 'outsideIn':
        neighbors.sort((a, b) =>
          this.board.distanceFromCenter(b.row, b.col) -
          this.board.distanceFromCenter(a.row, a.col)
        );
        break;
      case 'bruteForce':
        break;
    }

    return neighbors;
  }

  // @section Symmetrische Rekonstruktion

  _reconstructSecondHalf() {
    const firstHalf = [...this.board.moveOrder];
    for (let i = firstHalf.length - 1; i >= 0; i--) {
      const m = this._mirror(firstHalf[i].row, firstHalf[i].col);
      this.board.moveOrder.push(m);
    }
  }
}
