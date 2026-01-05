#!/usr/bin/env python3
"""
FILE:       knight-09-symmetry.py
BASED ON:   knight-08-graph.py
PROMPT:     Add an option which creates symmetric paths only.
            --symmetry={h,v,p} is horizontal, vertical or point symmetry.
            This is a complex change which we must plan carefully.
            If symmetry is specified then every move will automatically be mirrored.
            This means that we start with two mirrored fields according
            to the type of the symmetry. Each search step extends both paths
            in an analog way. If the full area is covered we check if the last
            move of the FIRST path (i.e. the one starting at the start square)
            can be connected to the mirrored counterpart of the start square.
            If no, we must backtrack. If yes, we have found a symmetric solution. 
            We renumber the FIRST path (which contains even numbers starting at 0)
            in strictly ascending sequence, then switch over to the mirrored
            start field (which has number 1) and replace all the odd numbers of
            the SECOND path by ascending move numbers. The last
            field of the path must be at a place where it can connect to the 
            original start field, proving that we have found a closed tour.

            A more elegant approach would use a mechanism to immediately BLOCK
            the symmetric counterpart of a field after a move was made to that 
            field. If all non blocked fields are covered then the same
            logic as above applies. The only difference is that the path through
            the blocked fields is found via mirroring the corresponding element
            of the first path. During backtracking the blocked fields
            must be unblocked, of course. The advantage of this implementation 
            is that we do not need a second extended stack frame.
            It should also be superior in runtime.
RESULT:     ...

"""
"""
Knight's Tour Solver

Features:
- Iterative DFS with explicit stack (no recursion)
- Sentinel board (no bounds checks)
- Pure DFS, Centrifugal, or Narrow Path First (Warnsdorff)
- Optional random initial move ordering
- Optional debug output
- Detailed move-examination statistics
- HTML/SVG visualization (static or animated)
- experimental code for creating symmetric paths
"""

import argparse
import time
import random
from dataclasses import dataclass
from typing import List, Tuple, Callable, Optional


# ------------------------------------------------------------
# Statistics
# ------------------------------------------------------------

class MoveStatistics:
    def __init__(self):
        self.trials = 0

    def record(self, count: int = 1):
        self.trials += count


# ------------------------------------------------------------
# Situation
# ------------------------------------------------------------

@dataclass
class Situation:
    """
    Describes a situation during the DFS walk.
    """
    x: int
    y: int
    move_num: int
    moves: List[Tuple[int, int]]
    next_index: int = 0



# ------------------------------------------------------------
# Solver
# ------------------------------------------------------------

class KnightTourSolver:
    BASE_KNIGHT_MOVES: Tuple[Tuple[int, int], ...] = (
        (2, 1), (1, 2), (-1, 2), (-2, 1),
        (-2, -1), (-1, -2), (1, -2), (2, -1)
    )

    # Board cell values
    MIRROR_BLOCKED = -3  # Blocked by symmetric mirror

    BLOCKED = -2
    EMPTY = -1

    def __init__(
        self,
        width: int,
        height: int,
        search_mode: str,
        random_moves: bool,
        debug: bool,
        start_x: int = 0,
        start_y: int = 0,
        closed: bool = False,
        symmetry: Optional[str] = None,
        limit: Optional[int] = None
    ):
        self.width = width
        self.height = height
        self.search_mode = search_mode
        self.debug = debug
        self.closed = closed
        self.symmetry = symmetry
        self.limit = limit

        # --- Sentinel board ---
        bw = width + 4
        bh = height + 4
        self.board = [[self.BLOCKED] * bw for _ in range(bh)]

        for y in range(2, height + 2):
            for x in range(2, width + 2):
                self.board[y][x] = self.EMPTY

        # Start position (add 2 for sentinel offset)
        self.start_x = start_x + 2
        self.start_y = start_y + 2

        # --- Center coordinates for centrifugal mode ---
        self.center_x = (width - 1) / 2 + 2
        self.center_y = (height - 1) / 2 + 2

        # --- Statistics ---
        self.stats = MoveStatistics()

        # --- Knight move order ---
        self.knight_moves = list(self.BASE_KNIGHT_MOVES)
        self.move_order_label = "canonical"

        if random_moves:
            random.shuffle(self.knight_moves)
            self.move_order_label = "random"

        if self.debug:
            print("[DEBUG] Effective KNIGHT_MOVES order:")
            for i, (dx, dy) in enumerate(self.knight_moves):
                print(f"  {i}: ({dx:+d},{dy:+d})")

        # --- Move generator selection ---
        generators = {
            "dfs": self._ordered_moves_plain,
            "centrifugal": self._ordered_moves_centrifugal,
            "warnsdorff": self._ordered_moves_warnsdorff,
        }
        self._move_generator: Callable[[int, int], List[Tuple[int, int]]] = (
            generators[search_mode]
        )

        # --- Symmetry mirror function selection ---
        if symmetry:
            mirror_fns = {
                'h': self._mirror_h,
                'v': self._mirror_v,
                'p': self._mirror_p,
            }
            self._mirror: Callable[[int, int], Tuple[int, int]] = mirror_fns[symmetry]

    # --------------------------------------------------------
    # Move ordering
    # --------------------------------------------------------

    def _ordered_moves_plain(self, x: int, y: int) -> List[Tuple[int, int]]:
        moves = []
        for dx, dy in self.knight_moves:
            nx, ny = x + dx, y + dy
            if self.board[ny][nx] == self.EMPTY:
                moves.append((nx, ny))
        self.stats.record(len(self.knight_moves))
        return moves

    def _distance_from_center(self, x: int, y: int) -> float:
        """Calculate squared distance from board center (higher = farther from center)."""
        return (x - self.center_x) ** 2 + (y - self.center_y) ** 2

    def _ordered_moves_centrifugal(self, x: int, y: int) -> List[Tuple[int, int]]:
        """Order moves by distance from center (farthest first)."""
        candidates = []
        for dx, dy in self.knight_moves:
            nx, ny = x + dx, y + dy
            if self.board[ny][nx] == self.EMPTY:
                dist = self._distance_from_center(nx, ny)
                candidates.append((dist, nx, ny))
        self.stats.record(len(self.knight_moves))

        # Sort by distance descending (farthest from center first)
        candidates.sort(key=lambda t: -t[0])
        return [(nx, ny) for _, nx, ny in candidates]

    def _warnsdorff_degree(self, x: int, y: int) -> int:
        count = 0
        for dx, dy in self.knight_moves:
            if self.board[y + dy][x + dx] == self.EMPTY:
                count += 1
        return count

    def _ordered_moves_warnsdorff(self, x: int, y: int) -> List[Tuple[int, int]]:
        candidates = []
        for dx, dy in self.knight_moves:
            nx, ny = x + dx, y + dy
            if self.board[ny][nx] == self.EMPTY:
                degree = self._warnsdorff_degree(nx, ny)
                candidates.append((degree, nx, ny))
        # Count: 8 for outer loop + 8 per valid candidate for degree calculation
        self.stats.record(len(self.knight_moves) + len(candidates) * len(self.knight_moves))

        candidates.sort(key=lambda t: t[0])
        return [(nx, ny) for _, nx, ny in candidates]

    # --------------------------------------------------------
    # Mirror functions for symmetry
    # --------------------------------------------------------

    def _mirror_h(self, x: int, y: int) -> Tuple[int, int]:
        """Mirror across vertical center axis (horizontal symmetry)."""
        # For sentinel board: user coords are offset by 2
        # width+3 = width-1 + 4 (sentinel offset adjustment)
        return (self.width + 3 - x, y)

    def _mirror_v(self, x: int, y: int) -> Tuple[int, int]:
        """Mirror across horizontal center axis (vertical symmetry)."""
        return (x, self.height + 3 - y)

    def _mirror_p(self, x: int, y: int) -> Tuple[int, int]:
        """180 degree rotation around center (point symmetry)."""
        return (self.width + 3 - x, self.height + 3 - y)

    # --------------------------------------------------------
    # Iterative DFS
    # --------------------------------------------------------

    def _can_connect(self, x1: int, y1: int, x2: int, y2: int) -> bool:
        """Check if (x2, y2) is reachable from (x1, y1) with a knight move."""
        for dx, dy in self.knight_moves:
            if x1 + dx == x2 and y1 + dy == y2:
                return True
        return False

    def solve(self) -> bool:
        total_squares = self.width * self.height

        self.board[self.start_y][self.start_x] = 0
        stack: List[Situation] = []

        initial_moves = self._move_generator(self.start_x, self.start_y)

        if self.debug:
            self._debug_print_board(0, "INIT",
                f"Start=({self.start_x-2},{self.start_y-2})")

        stack.append(Situation(
            x=self.start_x,
            y=self.start_y,
            move_num=0,
            moves=initial_moves
        ))

        while stack:
            current = stack[-1]

            if current.move_num + 1 == total_squares:
                # For closed tour, check if we can return to start
                if self.closed:
                    if self._can_connect(current.x, current.y, self.start_x, self.start_y):
                        return True
                    # Not a valid closed tour, continue searching
                else:
                    return True

            if current.next_index >= len(current.moves):
                if self.debug:
                    self._debug_print_board(current.move_num, "BACKTRACK",
                        f"stack depth={len(stack)}")
                self.board[current.y][current.x] = self.EMPTY
                stack.pop()
                continue

            nx, ny = current.moves[current.next_index]
            current.next_index += 1

            new_move_num = current.move_num + 1
            self.board[ny][nx] = new_move_num
            next_moves = self._move_generator(nx, ny)

            if self.debug:
                self._debug_print_board(new_move_num, "MOVE",
                    f"Placed ({nx-2},{ny-2})")

            stack.append(Situation(
                x=nx,
                y=ny,
                move_num=new_move_num,
                moves=next_moves
            ))

        return False

    # --------------------------------------------------------
    # Symmetric solving
    # --------------------------------------------------------

    def _debug_print_board(self, iteration: int, action: str, details: str = ""):
        """Print board state for debugging."""
        print(f"\n{'-' * 60} iter {iteration}")
        print(f"Action: {action}")
        if details:
            print(details)
        for y in range(2, self.height + 2):
            row = []
            for x in range(2, self.width + 2):
                val = self.board[y][x]
                if val == self.EMPTY:
                    row.append("  .")
                elif val == self.BLOCKED:
                    row.append("  #")
                elif val == self.MIRROR_BLOCKED:
                    row.append("  X")
                else:
                    row.append(f"{val:3d}")
            print(" ".join(row))

    def _solve_symmetric(self) -> bool:
        """
        Solve using symmetric path finding with blocked mirror squares.

        Only tracks path A explicitly. When moving to a square, its mirror
        is immediately blocked. Path B is reconstructed by mirroring path A.
        """
        half_squares = (self.width * self.height) // 2

        # Initialize: mark start, block its mirror
        start_b = self._mirror(self.start_x, self.start_y)
        self.board[self.start_y][self.start_x] = 0
        self.board[start_b[1]][start_b[0]] = self.MIRROR_BLOCKED

        # Get initial moves (only need to check if target is EMPTY)
        initial_moves = self._move_generator(self.start_x, self.start_y)

        if self.debug:
            self._debug_print_board(0, "INIT",
                f"Start=({self.start_x-2},{self.start_y-2}), "
                f"Mirror blocked=({start_b[0]-2},{start_b[1]-2})")

        stack: List[Situation] = []
        stack.append(Situation(
            x=self.start_x,
            y=self.start_y,
            move_num=0,
            moves=initial_moves,
        ))

        while stack:
            # Check limit
            if self.limit and self.stats.trials >= self.limit:
                if self.debug:
                    print(f"[DEBUG] Limit reached: {self.stats.trials} >= {self.limit}")
                return False

            current = stack[-1]

            # Check if path A is complete (half the squares)
            if current.move_num + 1 == half_squares:
                # Check if we can connect to start_b (mirror of start)
                if self._can_connect(current.x, current.y, start_b[0], start_b[1]):
                    self._renumber_symmetric_path()
                    return True
                # Cannot connect - fall through to backtrack

            # Try next move
            if current.next_index < len(current.moves):
                nx, ny = current.moves[current.next_index]
                current.next_index += 1

                # Skip if not empty
                if self.board[ny][nx] != self.EMPTY:
                    continue

                # Mark target and block its mirror
                new_move_num = current.move_num + 1
                mx, my = self._mirror(nx, ny)
                self.board[ny][nx] = new_move_num
                self.board[my][mx] = self.MIRROR_BLOCKED

                next_moves = self._move_generator(nx, ny)

                if self.debug:
                    self._debug_print_board(new_move_num, "MOVE",
                        f"Placed ({nx-2},{ny-2}), blocked mirror ({mx-2},{my-2})")

                stack.append(Situation(
                    x=nx,
                    y=ny,
                    move_num=new_move_num,
                    moves=next_moves,
                ))
                continue

            # No more moves - backtrack
            if self.debug:
                self._debug_print_board(current.move_num, "BACKTRACK",
                    f"stack depth={len(stack)}")

            # Unmark current square and unblock its mirror
            if current.move_num > 0:
                mx, my = self._mirror(current.x, current.y)
                self.board[current.y][current.x] = self.EMPTY
                self.board[my][mx] = self.EMPTY
            stack.pop()

        return False

    def _renumber_symmetric_path(self) -> None:
        """
        Renumber board: path A stays as 0..half-1, path B is half..total-1.
        Path B squares are reconstructed by mirroring path A squares.
        """
        half = (self.width * self.height) // 2

        # Extract path A positions from board
        path_a = [None] * half
        for y in range(2, self.height + 2):
            for x in range(2, self.width + 2):
                val = self.board[y][x]
                if 0 <= val < half:
                    path_a[val] = (x, y)

        # Path A already has correct numbers (0 to half-1)
        # Assign path B numbers (half to total-1) to mirrored positions
        for i, (x, y) in enumerate(path_a):
            mx, my = self._mirror(x, y)
            self.board[my][mx] = half + i

    # --------------------------------------------------------
    # Output
    # --------------------------------------------------------

    def print_board(self):
        for y in range(2, self.height + 2):
            row = self.board[y][2:self.width + 2]
            print(" ".join(f"{c:3d}" for c in row))

    def get_path(self) -> List[Tuple[int, int]]:
        """Extract the solution path as ordered (x, y) coordinates (0-indexed)."""
        total = self.width * self.height
        path = [None] * total
        for y in range(2, self.height + 2):
            for x in range(2, self.width + 2):
                move_num = self.board[y][x]
                if 0 <= move_num < total:
                    path[move_num] = (x - 2, y - 2)
        return path


# ------------------------------------------------------------
# SVG Visualizer
# ------------------------------------------------------------

class SVGVisualizer:
    """Generates HTML/SVG visualization of the knight's tour."""

    def __init__(
        self,
        width: int,
        height: int,
        path: List[Tuple[int, int]],
        cell_size: int = 50,
        metadata: Optional[dict] = None,
        is_closed: bool = False,
        symmetry: Optional[str] = None
    ):
        self.width = width
        self.height = height
        self.path = path
        self.cell_size = cell_size
        self.metadata = metadata or {}
        self.is_closed = is_closed
        self.symmetry = symmetry

        # Layout dimensions
        self.margin = 30  # space for coordinates
        self.svg_width = self.margin + width * cell_size
        self.svg_height = self.margin + height * cell_size

        # Colors
        self.light_square = "#f0d9b5"
        self.dark_square = "#c59873"
        self.path_color = "#2563eb"
        self.start_color = "#22c55e"
        self.end_color = "#ef4444"
        # Symmetric path colors
        self.path_a_color = "#2563eb"  # Blue
        self.path_b_color = "#dc2626"  # Red
        self.connect_color = "#9333ea"  # Purple

    def _interpolate_color(self, ratio: float) -> str:
        """Interpolate from start_color (green) to end_color (red)."""
        # Simple RGB interpolation
        r = int(0x22 + (0xef - 0x22) * ratio)
        g = int(0xc5 - (0xc5 - 0x44) * ratio)
        b = int(0x5e - (0x5e - 0x44) * ratio)
        return f"#{r:02x}{g:02x}{b:02x}"

    def _cell_center(self, x: int, y: int) -> Tuple[float, float]:
        """Get the center coordinates of a cell in SVG space."""
        cx = self.margin + x * self.cell_size + self.cell_size / 2
        cy = y * self.cell_size + self.cell_size / 2
        return cx, cy

    def _generate_grid(self, with_colors: bool = True) -> str:
        """Generate SVG for the chessboard grid."""
        lines = []
        for y in range(self.height):
            for x in range(self.width):
                px = self.margin + x * self.cell_size
                py = y * self.cell_size
                if with_colors:
                    is_light = (x + y) % 2 == 0
                    color = self.light_square if is_light else self.dark_square
                    lines.append(
                        f'<rect x="{px}" y="{py}" width="{self.cell_size}" '
                        f'height="{self.cell_size}" fill="{color}" />'
                    )
                else:
                    # Plain white squares with grey border
                    lines.append(
                        f'<rect x="{px}" y="{py}" width="{self.cell_size}" '
                        f'height="{self.cell_size}" fill="white" stroke="#ccc" stroke-width="1" />'
                    )
        return "\n    ".join(lines)

    def _generate_coordinates(self) -> str:
        """Generate SVG for coordinate labels."""
        lines = []
        font_size = 12

        # X-axis labels (bottom)
        for x in range(self.width):
            px = self.margin + x * self.cell_size + self.cell_size / 2
            py = self.height * self.cell_size + 20
            lines.append(
                f'<text x="{px}" y="{py}" text-anchor="middle" '
                f'font-size="{font_size}" fill="#333">{x}</text>'
            )

        # Y-axis labels (left)
        for y in range(self.height):
            px = 10
            py = y * self.cell_size + self.cell_size / 2 + 4
            lines.append(
                f'<text x="{px}" y="{py}" text-anchor="middle" '
                f'font-size="{font_size}" fill="#333">{y}</text>'
            )

        return "\n    ".join(lines)

    def _generate_path_static(self) -> str:
        """Generate SVG for the complete path with gradient coloring."""
        lines = []
        total = len(self.path)

        for i in range(total - 1):
            x1, y1 = self._cell_center(*self.path[i])
            x2, y2 = self._cell_center(*self.path[i + 1])
            ratio = i / (total - 1) if total > 1 else 0
            color = self._interpolate_color(ratio)
            lines.append(
                f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                f'stroke="{color}" stroke-width="4" stroke-linecap="round" />'
            )

        # Add closing line for closed tour (from last to first)
        if self.is_closed and total > 0:
            x1, y1 = self._cell_center(*self.path[-1])
            x2, y2 = self._cell_center(*self.path[0])
            lines.append(
                f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                f'stroke="{self.end_color}" stroke-width="4" stroke-linecap="round" '
                f'stroke-dasharray="8,4" />'
            )

        return "\n    ".join(lines)

    def _generate_path_static_symmetric(self) -> str:
        """Generate SVG for symmetric path with two colors showing the half-paths."""
        lines = []
        total = len(self.path)
        half = total // 2

        # First half (path A) - blue gradient
        for i in range(half - 1):
            x1, y1 = self._cell_center(*self.path[i])
            x2, y2 = self._cell_center(*self.path[i + 1])
            lines.append(
                f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                f'stroke="{self.path_a_color}" stroke-width="4" stroke-linecap="round" />'
            )

        # Connection line between the two halves (dashed purple)
        if half > 0 and half < total:
            x1, y1 = self._cell_center(*self.path[half - 1])
            x2, y2 = self._cell_center(*self.path[half])
            lines.append(
                f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                f'stroke="{self.connect_color}" stroke-width="4" stroke-linecap="round" '
                f'stroke-dasharray="8,4" />'
            )

        # Second half (path B reversed) - red gradient
        for i in range(half, total - 1):
            x1, y1 = self._cell_center(*self.path[i])
            x2, y2 = self._cell_center(*self.path[i + 1])
            lines.append(
                f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" '
                f'stroke="{self.path_b_color}" stroke-width="4" stroke-linecap="round" />'
            )

        return "\n    ".join(lines)

    def _generate_move_numbers(self) -> str:
        """Generate SVG for move numbers in each cell."""
        lines = []
        font_size = self.cell_size // 3

        for i, (x, y) in enumerate(self.path):
            cx, cy = self._cell_center(x, y)
            lines.append(
                f'<text x="{cx}" y="{cy + font_size // 3}" text-anchor="middle" '
                f'font-size="{font_size}" font-weight="bold" fill="#1e293b">{i}</text>'
            )

        return "\n    ".join(lines)

    def _generate_markers(self) -> str:
        """Generate start and end position markers."""
        lines = []
        radius = self.cell_size // 6

        # Start marker (green circle)
        sx, sy = self._cell_center(*self.path[0])
        lines.append(
            f'<circle cx="{sx}" cy="{sy}" r="{radius}" fill="{self.start_color}" '
            f'opacity="0.5" />'
        )

        # End marker (red circle)
        ex, ey = self._cell_center(*self.path[-1])
        lines.append(
            f'<circle cx="{ex}" cy="{ey}" r="{radius}" fill="{self.end_color}" '
            f'opacity="0.5" />'
        )

        return "\n    ".join(lines)

    def _generate_svg_static(self) -> str:
        """Generate the complete static SVG."""
        path_svg = (self._generate_path_static_symmetric()
                    if self.symmetry
                    else self._generate_path_static())
        return f'''<svg id="board" width="{self.svg_width}" height="{self.svg_height + 20}"
     xmlns="http://www.w3.org/2000/svg">
    <!-- Grid -->
    {self._generate_grid()}

    <!-- Coordinates -->
    {self._generate_coordinates()}

    <!-- Path -->
    <g id="path-lines">
    {path_svg}
    </g>

    <!-- Markers -->
    {self._generate_markers()}

    <!-- Move numbers -->
    <g id="move-numbers">
    {self._generate_move_numbers()}
    </g>
</svg>'''

    def _generate_svg_animated(self) -> str:
        """Generate SVG structure for animation (path built by JS)."""
        return f'''<svg id="board" width="{self.svg_width}" height="{self.svg_height + 20}"
     xmlns="http://www.w3.org/2000/svg">
    <!-- Grid with colors -->
    <g id="grid-colored">
    {self._generate_grid(with_colors=True)}
    </g>

    <!-- Grid without colors (hidden by default) -->
    <g id="grid-plain" style="display:none;">
    {self._generate_grid(with_colors=False)}
    </g>

    <!-- Coordinates -->
    {self._generate_coordinates()}

    <!-- Path (drawn by JavaScript) -->
    <g id="path-lines"></g>

    <!-- Closing line for closed tour (hidden until complete) -->
    <line id="closing-line" style="display:none;"
          stroke="{self.end_color}" stroke-width="4" stroke-linecap="round"
          stroke-dasharray="8,4" />

    <!-- Knight marker -->
    <circle id="knight" cx="0" cy="0" r="{self.cell_size // 4}" fill="#7c3aed"
            stroke="#4c1d95" stroke-width="2" style="display:none;" />

    <!-- Move numbers (shown progressively) -->
    <g id="move-numbers"></g>
</svg>'''

    def _generate_css(self) -> str:
        """Generate CSS styles."""
        return '''
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 900px;
    margin: 40px auto;
    padding: 20px;
    background: #f8fafc;
}
h1 {
    color: #1e293b;
    margin-bottom: 10px;
}
.metadata {
    color: #64748b;
    margin-bottom: 20px;
}
.metadata span {
    margin-right: 20px;
}
#board {
    display: block;
    margin: 20px 0;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    padding: 10px;
}
.controls {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 20px;
    flex-wrap: wrap;
}
.controls button {
    padding: 8px 16px;
    font-size: 14px;
    border: none;
    border-radius: 6px;
    background: #3b82f6;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
}
.controls button:hover {
    background: #2563eb;
}
.controls button:disabled {
    background: #94a3b8;
    cursor: not-allowed;
}
.controls label {
    color: #475569;
}
.controls input[type="range"] {
    width: 100px;
}
#move-display {
    font-size: 16px;
    color: #1e293b;
    font-weight: 500;
    min-width: 120px;
}
.view-options {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
}
.view-options label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #475569;
    cursor: pointer;
    user-select: none;
}
.view-options input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
}
'''

    def _generate_animation_js(self) -> str:
        """Generate JavaScript for animation controls."""
        # Convert path to JSON for JavaScript
        path_json = str(self.path).replace("(", "[").replace(")", "]")
        is_closed_js = "true" if self.is_closed else "false"

        return f'''
const path = {path_json};
const cellSize = {self.cell_size};
const margin = {self.margin};
const total = path.length;
const isClosed = {is_closed_js};

let currentMove = 0;
let isPlaying = false;
let animationTimer = null;
let showNumbers = true;
let showColors = true;

function getCellCenter(x, y) {{
    return [
        margin + x * cellSize + cellSize / 2,
        y * cellSize + cellSize / 2
    ];
}}

function interpolateColor(ratio) {{
    const r = Math.floor(0x22 + (0xef - 0x22) * ratio);
    const g = Math.floor(0xc5 - (0xc5 - 0x44) * ratio);
    const b = Math.floor(0x5e - (0x5e - 0x44) * ratio);
    return `#${{r.toString(16).padStart(2,'0')}}${{g.toString(16).padStart(2,'0')}}${{b.toString(16).padStart(2,'0')}}`;
}}

function updateDisplay() {{
    document.getElementById('move-display').textContent = `Move: ${{currentMove}} / ${{total - 1}}`;
    document.getElementById('stepBack').disabled = currentMove === 0;
    document.getElementById('stepForward').disabled = currentMove >= total - 1;
}}

function updateClosingLine() {{
    const closingLine = document.getElementById('closing-line');
    if (!isClosed || currentMove < total - 1) {{
        closingLine.style.display = 'none';
        return;
    }}
    // Show closing line when tour is complete
    const [x1, y1] = getCellCenter(path[total-1][0], path[total-1][1]);
    const [x2, y2] = getCellCenter(path[0][0], path[0][1]);
    closingLine.setAttribute('x1', x1);
    closingLine.setAttribute('y1', y1);
    closingLine.setAttribute('x2', x2);
    closingLine.setAttribute('y2', y2);
    closingLine.style.display = 'block';
}}

function drawUpToMove(moveNum) {{
    const pathGroup = document.getElementById('path-lines');
    const numbersGroup = document.getElementById('move-numbers');
    const knight = document.getElementById('knight');

    // Clear existing
    pathGroup.innerHTML = '';
    numbersGroup.innerHTML = '';

    // Draw path lines up to current move
    for (let i = 0; i < moveNum; i++) {{
        const [x1, y1] = getCellCenter(path[i][0], path[i][1]);
        const [x2, y2] = getCellCenter(path[i+1][0], path[i+1][1]);
        const ratio = i / (total - 1);
        const color = interpolateColor(ratio);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-linecap', 'round');
        pathGroup.appendChild(line);
    }}

    // Draw move numbers up to current (if enabled)
    if (showNumbers) {{
        const fontSize = cellSize / 3;
        for (let i = 0; i <= moveNum; i++) {{
            const [cx, cy] = getCellCenter(path[i][0], path[i][1]);
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', cx);
            text.setAttribute('y', cy + fontSize / 3);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', fontSize);
            text.setAttribute('font-weight', 'bold');
            text.setAttribute('fill', '#1e293b');
            text.textContent = i;
            numbersGroup.appendChild(text);
        }}
    }}

    // Position knight
    const [kx, ky] = getCellCenter(path[moveNum][0], path[moveNum][1]);
    knight.setAttribute('cx', kx);
    knight.setAttribute('cy', ky);
    knight.style.display = 'block';

    // Update closing line
    updateClosingLine();
}}

function toggleNumbers() {{
    showNumbers = document.getElementById('showNumbers').checked;
    drawUpToMove(currentMove);
}}

function toggleColors() {{
    showColors = document.getElementById('showColors').checked;
    document.getElementById('grid-colored').style.display = showColors ? 'block' : 'none';
    document.getElementById('grid-plain').style.display = showColors ? 'none' : 'block';
}}

function stepForward() {{
    if (currentMove < total - 1) {{
        currentMove++;
        drawUpToMove(currentMove);
        updateDisplay();
    }}
    if (currentMove >= total - 1) {{
        pause();
    }}
}}

function stepBack() {{
    if (currentMove > 0) {{
        currentMove--;
        drawUpToMove(currentMove);
        updateDisplay();
    }}
}}

function reset() {{
    pause();
    currentMove = 0;
    // Restore all view options
    showNumbers = true;
    showColors = true;
    document.getElementById('showNumbers').checked = true;
    document.getElementById('showColors').checked = true;
    document.getElementById('grid-colored').style.display = 'block';
    document.getElementById('grid-plain').style.display = 'none';
    document.getElementById('knight').style.display = 'block';
    drawUpToMove(currentMove);
    updateDisplay();
}}

function showFullTour() {{
    pause();
    currentMove = total - 1;
    // Hide colors, numbers, and knight for clean view
    showNumbers = false;
    showColors = false;
    document.getElementById('showNumbers').checked = false;
    document.getElementById('showColors').checked = false;
    document.getElementById('grid-colored').style.display = 'none';
    document.getElementById('grid-plain').style.display = 'block';
    document.getElementById('knight').style.display = 'none';
    drawUpToMove(currentMove);
    updateDisplay();
}}

function getSpeed() {{
    return 1000 - document.getElementById('speed').value * 9;
}}

function play() {{
    if (currentMove >= total - 1) {{
        currentMove = 0;
    }}
    isPlaying = true;
    document.getElementById('playPause').textContent = 'Pause';
    tick();
}}

function pause() {{
    isPlaying = false;
    document.getElementById('playPause').textContent = 'Play';
    if (animationTimer) {{
        clearTimeout(animationTimer);
        animationTimer = null;
    }}
}}

function togglePlayPause() {{
    if (isPlaying) {{
        pause();
    }} else {{
        play();
    }}
}}

function tick() {{
    if (!isPlaying) return;
    stepForward();
    if (currentMove < total - 1) {{
        animationTimer = setTimeout(tick, getSpeed());
    }}
}}

// Initialize
drawUpToMove(0);
updateDisplay();
'''

    def generate_html(self, animate: bool = False) -> str:
        """Generate complete HTML document."""
        meta_parts = []
        if "board_size" in self.metadata:
            meta_parts.append(f'<span>Board: {self.metadata["board_size"]}</span>')
        if "symmetry" in self.metadata:
            meta_parts.append(f'<span>Type: {self.metadata["symmetry"]}</span>')
        if "search_mode" in self.metadata:
            meta_parts.append(f'<span>Mode: {self.metadata["search_mode"]}</span>')
        if "move_order" in self.metadata:
            meta_parts.append(f'<span>Move order: {self.metadata["move_order"]}</span>')
        if "examinations" in self.metadata:
            meta_parts.append(f'<span>Examinations: {self.metadata["examinations"]:,}</span>')
        if "time" in self.metadata:
            meta_parts.append(f'<span>Time: {self.metadata["time"]:.4f}s</span>')

        metadata_html = "\n        ".join(meta_parts)

        if animate:
            svg = self._generate_svg_animated()
            controls = '''
    <div class="controls">
        <button id="reset" onclick="reset()">Reset</button>
        <button id="stepBack" onclick="stepBack()">◀ Step</button>
        <button id="playPause" onclick="togglePlayPause()">Play</button>
        <button id="stepForward" onclick="stepForward()">Step ▶</button>
        <button id="fullTour" onclick="showFullTour()">Full Tour</button>
        <label>Speed: <input type="range" id="speed" min="1" max="100" value="50"></label>
        <span id="move-display">Move: 0 / 0</span>
        <div class="view-options">
            <label><input type="checkbox" id="showColors" checked onchange="toggleColors()"> Square colors</label>
            <label><input type="checkbox" id="showNumbers" checked onchange="toggleNumbers()"> Move numbers</label>
        </div>
    </div>'''
            script = f'<script>\n{self._generate_animation_js()}\n</script>'
        else:
            svg = self._generate_svg_static()
            controls = ''
            script = ''

        return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knight's Tour - {self.width}x{self.height}</title>
    <style>{self._generate_css()}</style>
</head>
<body>
    <h1>Knight's Tour Solution</h1>
    <div class="metadata">
        {metadata_html}
    </div>
    {svg}
    {controls}
    {script}
</body>
</html>'''


# ------------------------------------------------------------
# Main
# ------------------------------------------------------------

SEARCH_MODES = {
    "dfs": "Pure DFS",
    "centrifugal": "Centrifugal (prefer edges)",
    "warnsdorff": "Warnsdorff (narrow path first)",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Knight's Tour Solver - Find a path visiting every square exactly once.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""\
Examples:
  %(prog)s 6 6                       Solve 6x6 board with pure DFS
  %(prog)s 8 8 --warnsdorff          Solve 8x8 with Warnsdorff heuristic
  %(prog)s 8 8 --centrifugal         Solve 8x8 preferring edge squares
  %(prog)s 8 8 --random              Randomize initial move order
  %(prog)s 10 10 --warnsdorff -d     Solve with debug output
  %(prog)s 8 8 -v                    Generate static HTML visualization
  %(prog)s 8 8 -v --animate          Generate animated visualization
  %(prog)s 8 8 -v -o tour.html       Save visualization to custom file
  %(prog)s 8 8 --start 3,4           Start from position (3,4)
  %(prog)s 8 8 --closed --warnsdorff Find closed (circular) tour
  %(prog)s 5 5 --closed              Error: closed tour impossible (odd x odd)
  %(prog)s 6 6 --symmetry=p          Find point-symmetric tour (180deg rotation)
  %(prog)s 8 8 --symmetry=h          Find horizontally symmetric tour
"""
    )
    parser.add_argument(
        "width",
        type=int,
        metavar="WIDTH",
        help="Board width (number of columns)"
    )
    parser.add_argument(
        "height",
        type=int,
        metavar="HEIGHT",
        help="Board height (number of rows)"
    )

    mode_group = parser.add_mutually_exclusive_group()
    mode_group.add_argument(
        "--warnsdorff", "--npf",
        action="store_const",
        const="warnsdorff",
        dest="search_mode",
        help="Use Warnsdorff's rule (prefer squares with fewer onward moves)"
    )
    mode_group.add_argument(
        "--centrifugal",
        action="store_const",
        const="centrifugal",
        dest="search_mode",
        help="Prefer moves toward the edge of the board"
    )

    parser.add_argument(
        "--random", "--random-moves",
        action="store_true",
        dest="random_moves",
        help="Randomize the base move order at startup"
    )
    parser.add_argument(
        "-d", "--debug",
        action="store_true",
        help="Enable debug output"
    )

    # Visualization options
    parser.add_argument(
        "-v", "--visualize",
        action="store_true",
        help="Generate HTML/SVG visualization of the solution"
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        default="knight-tour.html",
        metavar="FILE",
        help="Output file for visualization (default: knight-tour.html)"
    )
    parser.add_argument(
        "--animate",
        action="store_true",
        help="Include animation controls in the visualization"
    )

    # Start position and closed tour
    parser.add_argument(
        "--start",
        type=str,
        metavar="X,Y",
        help="Start position as x,y coordinates (0-indexed, default: 0,0)"
    )
    parser.add_argument(
        "--closed",
        action="store_true",
        help="Require a closed (circular) tour that returns to start"
    )

    # Symmetry option
    parser.add_argument(
        "--symmetry",
        type=str,
        choices=['h', 'v', 'p'],
        metavar="{h,v,p}",
        help="Create symmetric tour: h=horizontal, v=vertical, p=point (180deg rotation)"
    )

    # Limit option for testing
    parser.add_argument(
        "--limit",
        type=int,
        metavar="N",
        help="Stop searching after N move examinations (for testing/debugging)"
    )

    args = parser.parse_args()
    if args.search_mode is None:
        args.search_mode = "dfs"

    # Parse start position
    if args.start:
        try:
            parts = args.start.split(",")
            if len(parts) != 2:
                raise ValueError()
            args.start_x = int(parts[0])
            args.start_y = int(parts[1])
        except ValueError:
            parser.error(f"Invalid start position '{args.start}'. Use format: x,y (e.g., 3,4)")
    else:
        args.start_x = 0
        args.start_y = 0

    return args


def main():
    args = parse_args()

    # Validate start position
    if args.start_x < 0 or args.start_x >= args.width:
        print(f"Error: Start x={args.start_x} is out of range [0, {args.width - 1}]")
        return
    if args.start_y < 0 or args.start_y >= args.height:
        print(f"Error: Start y={args.start_y} is out of range [0, {args.height - 1}]")
        return

    # Check if closed tour is possible
    if args.closed and args.width % 2 == 1 and args.height % 2 == 1:
        print(f"Error: A closed knight's tour is impossible on a {args.width}x{args.height} board.")
        print("Reason: Both dimensions are odd, so there are unequal numbers of")
        print("        light and dark squares. A closed tour requires equal counts")
        print("        because the knight alternates between square colors.")
        return

    # Validate symmetry requirements
    symmetry = getattr(args, 'symmetry', None)
    if symmetry:
        if symmetry == 'p':
            if args.width % 2 != 0 or args.height % 2 != 0:
                print(f"Error: Point symmetry requires even dimensions.")
                print(f"       Got {args.width}x{args.height}.")
                return
        elif symmetry == 'h':
            if args.width % 2 != 0:
                print(f"Error: Horizontal symmetry requires even width.")
                print(f"       Got width={args.width}.")
                return
        elif symmetry == 'v':
            if args.height % 2 != 0:
                print(f"Error: Vertical symmetry requires even height.")
                print(f"       Got height={args.height}.")
                return

        # Check start position is not on symmetry axis
        if symmetry == 'h' and args.start_x == (args.width - 1) / 2:
            print(f"Error: Start position is on the symmetry axis.")
            return
        if symmetry == 'v' and args.start_y == (args.height - 1) / 2:
            print(f"Error: Start position is on the symmetry axis.")
            return
        # For point symmetry, check start is not at center
        if symmetry == 'p':
            cx, cy = (args.width - 1) / 2, (args.height - 1) / 2
            if args.start_x == cx and args.start_y == cy:
                print(f"Error: Start position is at the center (no valid mirror).")
                return

    solver = KnightTourSolver(
        args.width,
        args.height,
        search_mode=args.search_mode,
        random_moves=args.random_moves,
        debug=args.debug,
        start_x=args.start_x,
        start_y=args.start_y,
        closed=args.closed,
        symmetry=symmetry,
        limit=getattr(args, 'limit', None)
    )

    print(f"Board size  : {args.width}x{args.height}")
    print(f"Start pos   : ({args.start_x},{args.start_y})")
    tour_type = "Closed (circular)" if args.closed else "Open"
    if symmetry:
        sym_names = {'h': 'Horizontal', 'v': 'Vertical', 'p': 'Point (180°)'}
        tour_type = f"Symmetric ({sym_names[symmetry]})"
    print(f"Tour type   : {tour_type}")
    print(f"Search mode : {SEARCH_MODES[args.search_mode]}")
    print(f"Move order  : {solver.move_order_label}")

    start = time.perf_counter()
    if symmetry:
        found = solver._solve_symmetric()
    else:
        found = solver.solve()
    elapsed = time.perf_counter() - start

    if found:
        print(f"\nSolution found in {elapsed:.4f}s:")
        solver.print_board()

        # Generate visualization if requested
        if args.visualize:
            path = solver.get_path()
            metadata = {
                "board_size": f"{args.width}x{args.height}",
                "search_mode": SEARCH_MODES[args.search_mode],
                "move_order": solver.move_order_label,
                "examinations": solver.stats.trials,
                "time": elapsed,
            }
            if symmetry:
                metadata["symmetry"] = tour_type
            # Symmetric tours are always closed
            tour_is_closed = args.closed or (symmetry is not None)
            visualizer = SVGVisualizer(
                args.width, args.height, path, metadata=metadata,
                is_closed=tour_is_closed,
                symmetry=symmetry
            )
            html = visualizer.generate_html(animate=args.animate)

            with open(args.output, "w", encoding="utf-8") as f:
                f.write(html)

            print(f"\nVisualization saved to: {args.output}")
    else:
        print(f"\nNo solution found ({elapsed:.4f}s).")

    print("\nStatistics:")
    print(f"  Total move examinations : {solver.stats.trials:,}")
    print(f"  Avg time per examination: {elapsed / solver.stats.trials * 1_000_000:.3f} µs" if solver.stats.trials else "")


if __name__ == "__main__":
    main()
