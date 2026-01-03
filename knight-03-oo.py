#!/usr/bin/env python3
"""
FILE:       knight-03-oo.py
BASED ON:   knight-01-dfs.py and knight-02-stats.py
PROMPT:     I am not happy with what you did. 
            Let us refactor my original program to true object oriented programming 
            and then add the new way to calculate statistics.
RESPONSE:   Fair enough — let’s do this properly and cleanly, 
            not by sprinkling globals into a procedural script.
            Below is a true object-oriented refactor of your Knight’s Tour solver,
            followed by a well-defined statistics mechanism.
            No globals, no side effects, and responsibilities are clearly separated.
INSIGHT:    The AI can do better if told to do so.
            It is crucial to improve structure before adding features.
"""
"""
Knight's Tour Solver (Object-Oriented DFS)

Usage: python knight-03-oo-stats.py <width> <height>

Outputs the first found tour, execution time,
and detailed move examination statistics.
"""

import time
import sys
from typing import List


class MoveStatistics:
    """Collects statistics about move examination."""

    def __init__(self):
        self.trials = 0
        self.total_time = 0.0

    def record(self, elapsed: float):
        self.trials += 1
        self.total_time += elapsed

    @property
    def average_time_ms(self) -> float:
        if self.trials == 0:
            return 0.0
        return (self.total_time / self.trials) * 1000.0


class KnightTourSolver:
    """Solves the Knight's Tour problem using DFS backtracking."""

    KNIGHT_MOVES = [
        (2, 1), (1, 2), (-1, 2), (-2, 1),
        (-2, -1), (-1, -2), (1, -2), (2, -1)
    ]

    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height
        self.board: List[List[int]] = [[-1] * width for _ in range(height)]
        self.stats = MoveStatistics()

    def is_valid(self, x: int, y: int) -> bool:
        """Check whether a move is inside the board and unvisited."""
        return (
            0 <= x < self.width and
            0 <= y < self.height and
            self.board[y][x] == -1
        )

    def solve(self) -> bool:
        """Solve the knight's tour starting from (0,0)."""
        self.board[0][0] = 0
        return self._backtrack(0, 0, 1)

    def _backtrack(self, x: int, y: int, move_num: int) -> bool:
        if move_num == self.width * self.height:
            return True

        for dx, dy in self.KNIGHT_MOVES:
            start = time.perf_counter()

            nx, ny = x + dx, y + dy
            valid = self.is_valid(nx, ny)

            self.stats.record(time.perf_counter() - start)

            if valid:
                self.board[ny][nx] = move_num
                if self._backtrack(nx, ny, move_num + 1):
                    return True
                self.board[ny][nx] = -1

        return False

    def print_board(self):
        for row in self.board:
            print(" ".join(f"{c:3d}" for c in row))


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 knight-03-oo.py WIDTH HEIGHT")
        sys.exit(1)

    width = int(sys.argv[1])
    height = int(sys.argv[2])

    solver = KnightTourSolver(width, height)

    start_time = time.perf_counter()
    found = solver.solve()
    elapsed = time.perf_counter() - start_time

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
