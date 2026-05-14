// Renderer — paints tour + sensitivity heatmap onto the Board's cells/SVG.
//
// Tour rendering: number divs appended to cell elements (via Board.getCell),
// a single SVG polyline as the tour line, and (for closed tours) an extra
// dashed line connecting last cell back to first.
//
// Sensitivity heatmap: per-cell background-color from a log-scale green→red
// ramp, plus a compact step-count label (12k, 1.2M, '—' for "no solution
// in budget"). Lives on the cells themselves so it survives renderer.clear
// of the tour overlay.

class Renderer {
  constructor(board) {
    this.board = board;
  }

  clear() {
    for (const cell of this.board.cellByIdx) {
      if (!cell) continue;
      const num = cell.querySelector('.num');
      if (num) num.remove();
    }
    const overlay = this.board.overlay;
    if (overlay) {
      while (overlay.firstChild) overlay.removeChild(overlay.firstChild);
    }
  }

  render(path, isClosed) {
    const W = this.board.W, H = this.board.H;

    const stash = [];
    for (let i = 0; i < path.length; i++) {
      const [c, r] = path[i];
      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = i + 1;
      stash.push([this.board.getCell(c, r), num]);
    }
    for (const [cell, num] of stash) {
      if (cell) cell.appendChild(num);
    }

    // SVG viewBox is 0..W × 0..H; cell center = col + 0.5 horizontally,
    // (H - 1 - row) + 0.5 vertically — row 0 is the bottom rank but
    // visually the bottom row, so we mirror y.
    const points = path
      .map(([c, r]) => `${c + 0.5},${H - 1 - r + 0.5}`)
      .join(' ');
    const line = document.createElementNS(Board.SVG_NS, 'polyline');
    line.setAttribute('points', points);
    line.setAttribute('fill', 'none');
    line.setAttribute('stroke', '#c0392b');
    line.setAttribute('stroke-width', '0.08');
    line.setAttribute('stroke-linejoin', 'round');
    line.setAttribute('stroke-linecap', 'round');
    this.board.overlay.appendChild(line);

    if (isClosed) {
      const last  = path[path.length - 1];
      const first = path[0];
      const close = document.createElementNS(Board.SVG_NS, 'line');
      close.setAttribute('x1', last[0]  + 0.5);
      close.setAttribute('y1', H - 1 - last[1]  + 0.5);
      close.setAttribute('x2', first[0] + 0.5);
      close.setAttribute('y2', H - 1 - first[1] + 0.5);
      close.setAttribute('stroke', '#c0392b');
      close.setAttribute('stroke-width', '0.08');
      close.setAttribute('stroke-linecap', 'round');
      close.setAttribute('stroke-dasharray', '0.18 0.12');
      this.board.overlay.appendChild(close);
    }
  }

  // Strip any sensitivity heatmap from cells: clear background-color
  // overrides and remove the .num.sens count divs.
  clearSensitivity() {
    for (const cell of this.board.cellByIdx) {
      if (!cell) continue;
      cell.style.backgroundColor = '';
      const sens = cell.querySelector('.num.sens');
      if (sens) sens.remove();
    }
  }

  // Set a single cell's heatmap visual. value=null marks "no solution in
  // budget" (grey '—'); otherwise bg colour comes from the log-scale ramp
  // and a compact label like '12k' or '1.2M' is appended.
  setSensitivityCell(col, row, value, minLog, maxLog) {
    const cell = this.board.getCell(col, row);
    if (!cell) return;
    cell.style.backgroundColor = Renderer._heatColor(value, minLog, maxLog);
    let label = cell.querySelector('.num.sens');
    if (!label) {
      label = document.createElement('div');
      label.className = 'num sens';
      cell.appendChild(label);
    }
    label.textContent = Renderer._compactStepCount(value);
  }

  // Repaint every recorded cell's heatmap colour with refreshed min/max
  // log bounds — used after each new result so the ramp stays normalised.
  recolorSensitivity(results, minLog, maxLog) {
    for (const [key, value] of results) {
      const [c, r] = key.split(',').map(Number);
      const cell = this.board.getCell(c, r);
      if (cell) cell.style.backgroundColor = Renderer._heatColor(value, minLog, maxLog);
    }
  }

  static _heatColor(value, minLog, maxLog) {
    if (value == null) return 'rgba(120, 120, 120, 0.75)';
    if (!isFinite(minLog) || maxLog === minLog) return 'hsl(120, 65%, 60%)';
    const t = (Math.log(value + 1) - minLog) / (maxLog - minLog);
    const tt = Math.max(0, Math.min(1, t));
    const hue = 120 * (1 - tt);  // 120=green → 0=red
    return `hsl(${hue}, 65%, 60%)`;
  }

  static _compactStepCount(n) {
    if (n == null) return '—';
    if (n < 1000) return String(n);
    if (n < 1e6)  return Math.round(n / 1000) + 'k';
    return (n / 1e6).toFixed(1) + 'M';
  }
}
