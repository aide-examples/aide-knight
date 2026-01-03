#!/usr/bin/env python3
"""
FILE:       knight-02-stats.py
BASED ON:   knight-01-dfs.py
PROMPT:     Add a counter for the total number of trials 
            and calculate the average time used (in msec) for move examination.
EFFECT:     The AI took the easiest way, adding two global variables
INSIGHT:    If we continue this way we will end up in a mess
"""

"""
Knight's Tour Solver WITH DEPTH FIRST SEARCH

Usage: python knight-02-stats.py <width> <height>

Outputs the first found tour, execution time,
total move trials, and average move examination time.

"""

import time
import sys

# Movements for a knight
KNIGHT_MOVES = [(2,1),(1,2),(-1,2),(-2,1),(-2,-1),(-1,-2),(1,-2),(2,-1)]

# --- Global counters ---
move_trials = 0
move_time = 0.0

def is_valid(x, y, board):
    """Return True if (x,y) is on board and not visited."""
    w,h = len(board[0]), len(board)
    return 0 <= x < w and 0 <= y < h and board[y][x] == -1

def backtrack_tour(board, x, y, move_num):
    """Backtracking, recursive approach"""
    global move_trials, move_time

    if move_num == len(board) * len(board[0]):
        return True

    for dx, dy in KNIGHT_MOVES:
        t0 = time.perf_counter()
        move_trials += 1

        nx, ny = x + dx, y + dy
        valid = is_valid(nx, ny, board)

        move_time += time.perf_counter() - t0

        if valid:
            board[ny][nx] = move_num
            if backtrack_tour(board, nx, ny, move_num + 1):
                return True
            board[ny][nx] = -1  # reset

    return False

def solve(width, height):
    global move_trials, move_time

    board = [[-1]*width for _ in range(height)]
    board[0][0] = 0

    start_time = time.perf_counter()
    found = backtrack_tour(board, 0, 0, 1)
    elapsed = time.perf_counter() - start_time

    if found:
        print(f"Solution ({elapsed:.4f}s):")
        for row in board:
            print(" ".join(f"{c:3d}" for c in row))
    else:
        print(f"No solution found ({elapsed:.4f}s).")

    # --- Statistics ---
    avg_move_time_ms = (move_time / move_trials) * 1000 if move_trials else 0

    print("\nStatistics:")
    print(f"  Total move trials       : {move_trials}")
    print(f"  Total move time         : {move_time:.6f}s")
    print(f"  Avg time per trial      : {avg_move_time_ms:.6f} ms")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 knight-02-stats.py WIDTH HEIGHT")
        sys.exit(1)

    w = int(sys.argv[1])
    h = int(sys.argv[2])
    solve(w, h)
