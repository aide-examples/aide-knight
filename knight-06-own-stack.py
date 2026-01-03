#!/usr/bin/env python3
"""
FILE:       knight-06-own-stack.py
BASED ON:   knight-05-npf.py
PROMPT:     We run into stack overflow at large boards due to recursion.
            We need an explicit stack management. Each element on the stack
            represents a temporary Search Situation.
RESPONSE:   A Situation is a Stack Frame element which describes
            local possibilities that may be revisited or abandoned.
            It corresponds to one depth level of the tree walk.
"""
"""
Knight's Tour Solver
Iterative DFS with explicit stack of Situations
Supports Pure DFS and Narrow Path First (Warnsdorff)
"""

import time
import sys
from dataclasses import dataclass
from typing import List, Tuple, Callable


class MoveStatistics:
    def __init__(self):
        self.trials = 0
        self.total_time = 0.0

    def record(self, elapsed: float):
        self.trials += 1
        self.total_time += elapsed

    @property
    def average_time_ms(self) -> float:
        return (self.total_time / self.trials) * 1000 if self.trials else 0.0


@dataclass
class Situation:
    """Describes a situation during the DFS walk."""
    x: int
    y: int
    move_num: int
    moves: List[Tuple[int, int]]
    next_index: int = 0


class KnightTourSolver:
    KNIGHT_MOVES: Tuple[Tuple[int, int], ...] = (
        (2, 1), (1, 2), (-1, 2), (-2, 1),
        (-2, -1), (-1, -2), (1, -2), (2, -1)
    )

    BLOCKED = -2
    EMPTY = -1

    def __init__(self, width: int, height: int, narrow_path_first: bool):
        self.width = width
        self.height = height

        # Sentinel board (2-cell border)
        bw = width + 4
        bh = height + 4
        self.board = [[self.BLOCKED] * bw for _ in range(bh)]

        for y in range(2, height + 2):
            for x in range(2, width + 2):
                self.board[y][x] = self.EMPTY

        self.start_x = 2
        self.start_y = 2

        self.stats = MoveStatistics()

        # Choose move ordering strategy once
        self._move_generator: Callable[[int, int], List[Tuple[int, int]]] = (
            self._ordered_moves_warnsdorff
            if narrow_path_first
            else self._ordered_moves_plain
        )

    # ---------- Move ordering ----------

    def _ordered_moves_plain(self, x: int, y: int) -> List[Tuple[int, int]]:
        moves = []
        for dx, dy in self.KNIGHT_MOVES:
            t0 = time.perf_counter()
            nx, ny = x + dx, y + dy
            if self.board[ny][nx] == self.EMPTY:
                moves.append((nx, ny))
            self.stats.record(time.perf_counter() - t0)
        return moves

    def _warnsdorff_degree(self, x: int, y: int) -> int:
        count = 0
        for dx, dy in self.KNIGHT_MOVES:
            if self.board[y + dy][x + dx] == self.EMPTY:
                count += 1
        return count

    def _ordered_moves_warnsdorff(self, x: int, y: int) -> List[Tuple[int, int]]:
        candidates = []
        for dx, dy in self.KNIGHT_MOVES:
            t0 = time.perf_counter()
            nx, ny = x + dx, y + dy
            if self.board[ny][nx] == self.EMPTY:
                deg = self._warnsdorff_degree(nx, ny)
                candidates.append((deg, nx, ny))
            self.stats.record(time.perf_counter() - t0)

        candidates.sort(key=lambda t: t[0])  # stable
        return [(nx, ny) for _, nx, ny in candidates]

    # ---------- Iterative DFS ----------

    def solve(self) -> bool:
        total_squares = self.width * self.height

        # Initialize
        self.board[self.start_y][self.start_x] = 0
        stack: List[Situation] = []

        initial_moves = self._move_generator(self.start_x, self.start_y)
        stack.append(Situation(
            x=self.start_x,
            y=self.start_y,
            move_num=0,
            moves=initial_moves
        ))

        while stack:
            current = stack[-1]

            # Solution found
            if current.move_num + 1 == total_squares:
                return True

            # Exhausted all continuations → backtrack
            if current.next_index >= len(current.moves):
                self.board[current.y][current.x] = self.EMPTY
                stack.pop()
                continue

            # Try next continuation
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

    def print_board(self):
        for y in range(2, self.height + 2):
            row = self.board[y][2:self.width + 2]
            print(" ".join(f"{c:4d}" for c in row))


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 knight-dfs.py WIDTH HEIGHT [--npf]")
        sys.exit(1)

    width = int(sys.argv[1])
    height = int(sys.argv[2])
    narrow_path_first = "--npf" in sys.argv[3:]

    solver = KnightTourSolver(width, height, narrow_path_first)

    start = time.perf_counter()
    found = solver.solve()
    elapsed = time.perf_counter() - start

    mode = "Narrow Path First" if narrow_path_first else "Pure DFS"
    print(f"Mode: {mode}")

    if found:
        print(f"Solution ({elapsed:.4f}s):")
        solver.print_board()
    else:
        print(f"No solution found ({elapsed:.4f}s).")

    print("\nStatistics:")
    print(f"  Total move examinations : {solver.stats.trials}")
    print(f"  Total move time         : {solver.stats.total_time:.6f}s")
    print(f"  Avg time per examination: {solver.stats.average_time_ms:.6f} ms")


if __name__ == "__main__":
    main()
