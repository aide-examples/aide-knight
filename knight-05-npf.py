#!/usr/bin/env python3
"""
FILE:       knight-05-npf.py
BASED ON:   knight-04-border.py
PROMPT:     see [the separate document](https://./knight-051-npf.md)
INSIGHT #1: The AI is brave enough to defend its architectural decision against
            a mild provocation like this:
            "Obviously you went for dependency injection. Why did you not use inheritance?"
            See its [defending argumentation](https://./knight-052-npf.md)
PROMPT #2:  Now implement your plan and add a command line option to still use pure DFS only.
RESPONSE:   explanation of the implementation together with the
            command line synopsis, plus the code below
INSIGHT #2: It is possible to create a high quality solution for the knight's tour
            by prompting carefully.
            When analysing the runtime statistics for a 6x6 board we see a dramatic
            reduction in trial moves util the first solution is found.
            This leads to a magnificent reduction of execution time although each move 
            now takes six times longer than before.
            This is a clear win for clever heuristics over brute force.

            Next we should make some manual changes to the code to keep in touch with it.
            - we can try out the effect of changed search order in case of multiple squares
              having the same priority according to the degrees of freedom they will provide.
            - We can extract the move history stack to avoid hitting the recursion limit
              with larger boards
            - We can introduce more options which control algorithmic variants
            - we can integrate a library for cmdline arg handling
            - ...

"""
"""
Knight's Tour Solver
Pure DFS or Narrow Path First (Warnsdorff)
Sentinel board, no bounds checks
"""

import time
import sys
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

        # Sentinel board
        self.board_width = width + 4
        self.board_height = height + 4

        self.board: List[List[int]] = [
            [self.BLOCKED] * self.board_width
            for _ in range(self.board_height)
        ]

        for y in range(2, height + 2):
            for x in range(2, width + 2):
                self.board[y][x] = self.EMPTY

        self.start_x = 2
        self.start_y = 2

        self.stats = MoveStatistics()

        # Select move generator ONCE
        self._move_generator: Callable[[int, int], List[Tuple[int, int]]] = (
            self._ordered_moves_warnsdorff
            if narrow_path_first
            else self._ordered_moves_plain
        )

    # ---------- Move generators ----------

    def _ordered_moves_plain(self, x: int, y: int) -> List[Tuple[int, int]]:
        """Pure DFS move order."""
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
        """Narrow Path First (Warnsdorff) ordering."""
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

    # ---------- DFS ----------

    def solve(self) -> bool:
        self.board[self.start_y][self.start_x] = 0
        return self._backtrack(self.start_x, self.start_y, 1)

    def _backtrack(self, x: int, y: int, move_num: int) -> bool:
        if move_num == self.width * self.height:
            return True

        for nx, ny in self._move_generator(x, y):
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
        print("Usage: python3 knight-05-npf.py WIDTH HEIGHT [--npf]")
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
