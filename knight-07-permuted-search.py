#!/usr/bin/env python3
"""
FILE:       knight-07-permuted-search.py
BASED ON:   knight-06-own-stack.py
PROMPT:     This was a short conversation with a different AI.
            We did some reengineering, improved the time measuring,
            added a new heuristic ("centrifugal") and brought in
            professional commandline arg treatment
RESULT:     The effect of permuting search sequence leads to a large variation
            of efficiency (number of trials needed to find a solution)
            when using pure DFS. It has no noticeable effect with the Warnsdorff rule.
            AI can explain this effect very well. It is not a bug in the program.
            The new centrifugal rule performs quite well and is faster than Warnsdorff.
            
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
"""

import argparse
import time
import random
from dataclasses import dataclass
from typing import List, Tuple, Callable


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

    BLOCKED = -2
    EMPTY = -1

    def __init__(
        self,
        width: int,
        height: int,
        search_mode: str,
        random_moves: bool,
        debug: bool
    ):
        self.width = width
        self.height = height
        self.search_mode = search_mode
        self.debug = debug

        # --- Sentinel board ---
        bw = width + 4
        bh = height + 4
        self.board = [[self.BLOCKED] * bw for _ in range(bh)]

        for y in range(2, height + 2):
            for x in range(2, width + 2):
                self.board[y][x] = self.EMPTY

        self.start_x = 2
        self.start_y = 2

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
        # Board coordinates are offset by 2 due to sentinel, so adjust
        cx = (self.width - 1) / 2 + 2
        cy = (self.height - 1) / 2 + 2
        return (x - cx) ** 2 + (y - cy) ** 2

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
    # Iterative DFS
    # --------------------------------------------------------

    def solve(self) -> bool:
        total_squares = self.width * self.height

        self.board[self.start_y][self.start_x] = 0
        stack: List[Situation] = []

        initial_moves = self._move_generator(self.start_x, self.start_y)

        if self.debug:
            print("[DEBUG] Initial generated moves from start square:")
            for i, (x, y) in enumerate(initial_moves):
                print(f"  {i}: ({x},{y})")

        stack.append(Situation(
            x=self.start_x,
            y=self.start_y,
            move_num=0,
            moves=initial_moves
        ))

        while stack:
            current = stack[-1]

            if current.move_num + 1 == total_squares:
                return True

            if current.next_index >= len(current.moves):
                self.board[current.y][current.x] = self.EMPTY
                stack.pop()
                continue

            nx, ny = current.moves[current.next_index]
            current.next_index += 1

            self.board[ny][nx] = current.move_num + 1
            next_moves = self._move_generator(nx, ny)

            stack.append(Situation(
                x=nx,
                y=ny,
                move_num=current.move_num + 1,
                moves=next_moves
            ))

        return False

    # --------------------------------------------------------
    # Output
    # --------------------------------------------------------

    def print_board(self):
        for y in range(2, self.height + 2):
            row = self.board[y][2:self.width + 2]
            print(" ".join(f"{c:3d}" for c in row))


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
  %(prog)s 6 6                  Solve 6x6 board with pure DFS
  %(prog)s 8 8 --warnsdorff     Solve 8x8 board with Warnsdorff heuristic
  %(prog)s 8 8 --centrifugal    Solve 8x8 preferring edge squares
  %(prog)s 8 8 --random         Randomize initial move order
  %(prog)s 10 10 --warnsdorff -d   Solve with debug output
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

    args = parser.parse_args()
    if args.search_mode is None:
        args.search_mode = "dfs"
    return args


def main():
    args = parse_args()

    solver = KnightTourSolver(
        args.width,
        args.height,
        search_mode=args.search_mode,
        random_moves=args.random_moves,
        debug=args.debug
    )

    print(f"Board size  : {args.width}x{args.height}")
    print(f"Search mode : {SEARCH_MODES[args.search_mode]}")
    print(f"Move order  : {solver.move_order_label}")

    start = time.perf_counter()
    found = solver.solve()
    elapsed = time.perf_counter() - start

    if found:
        print(f"\nSolution found in {elapsed:.4f}s:")
        solver.print_board()
    else:
        print(f"\nNo solution found ({elapsed:.4f}s).")

    print("\nStatistics:")
    print(f"  Total move examinations : {solver.stats.trials:,}")
    print(f"  Avg time per examination: {elapsed / solver.stats.trials * 1_000_000:.3f} µs" if solver.stats.trials else "")


if __name__ == "__main__":
    main()
