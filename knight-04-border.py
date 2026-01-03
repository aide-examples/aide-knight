#!/usr/bin/env python3
"""
FILE:       knight-04-border.py
BASED ON:   knight-03-oo.py
PROMPT:     There is an ancient trick to improve performance by surrounding the board 
            with two stripes of blocked fields; if you use a suitable initialization 
            for those fields we can get completely rid of the bounds checking function.
RESPONSE:   That is a classic and very elegant optimization (sentinel guard-band technique).
            Now every knight move can be tested with a single array lookup, 
            eliminating bounds checks entirely.
INSIGHT:    The AI has learnt many optimisation techiques and can integrate them into
            our refactored code. We should look at the changes and check if they were
            done according to our exepctations.
"""
"""
Knight's Tour Solver (OOP DFS with Sentinel Board Optimization)
"""

import time
import sys
from typing import List


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


class KnightTourSolver:
    KNIGHT_MOVES = [
        (2, 1), (1, 2), (-1, 2), (-2, 1),
        (-2, -1), (-1, -2), (1, -2), (2, -1)
    ]

    BLOCKED = -2
    EMPTY = -1

    def __init__(self, width: int, height: int):
        self.width = width
        self.height = height

        # Actual board with 2-cell sentinel border
        self.board_width = width + 4
        self.board_height = height + 4

        self.board: List[List[int]] = [
            [self.BLOCKED] * self.board_width
            for _ in range(self.board_height)
        ]

        # Initialize playable area
        for y in range(2, height + 2):
            for x in range(2, width + 2):
                self.board[y][x] = self.EMPTY

        self.stats = MoveStatistics()

        # Starting position in sentinel board
        self.start_x = 2
        self.start_y = 2

    def solve(self) -> bool:
        self.board[self.start_y][self.start_x] = 0
        return self._backtrack(self.start_x, self.start_y, 1)

    def _backtrack(self, x: int, y: int, move_num: int) -> bool:
        if move_num == self.width * self.height:
            return True

        for dx, dy in self.KNIGHT_MOVES:
            start = time.perf_counter()

            nx = x + dx
            ny = y + dy

            valid = (self.board[ny][nx] == self.EMPTY)

            self.stats.record(time.perf_counter() - start)

            if valid:
                self.board[ny][nx] = move_num
                if self._backtrack(nx, ny, move_num + 1):
                    return True
                self.board[ny][nx] = self.EMPTY

        return False

    def print_board(self):
        for y in range(2, self.height + 2):
            row = self.board[y][2:self.width + 2]
            print(" ".join(f"{c:3d}" for c in row))


def main():
    if len(sys.argv) < 3:
        print("Usage: python3 knight-04-border.py WIDTH HEIGHT")
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
