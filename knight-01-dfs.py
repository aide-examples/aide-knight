#!/usr/bin/env python3
"""
FILE:       knight-01-dfs.py
BASED ON:   --
PROMPT:     Give me a DFS solver for the knight's tour problem
RESPONSE:   here it is ...
INSIGHT:    Depending on the AI used and the exact wording we will 
            probably see a minimal program like the one below.
"""
"""
Knight's Tour Solver WITH DEPTH FIRST SEARCH

Usage: python knight-01-dfs.py <width> <height>

Outputs the first found tour and execution time to console.
"""

import time
import sys

# Movements for a knight
KNIGHT_MOVES = [(2,1),(1,2),(-1,2),(-2,1),(-2,-1),(-1,-2),(1,-2),(2,-1)]

def is_valid(x, y, board):
    """Return True if (x,y) is on board and not visited."""
    w,h = len(board[0]), len(board)
    return 0 <= x < w and 0 <= y < h and board[y][x] == -1

def backtrack_tour(board, x, y, move_num):
    """Backtracking, recursive approach"""
    if move_num == len(board) * len(board[0]):
        return True
    for dx,dy in KNIGHT_MOVES:
        nx, ny = x+dx, y+dy
        if is_valid(nx, ny, board):
            board[ny][nx] = move_num
            if backtrack_tour(board, nx, ny, move_num+1):
                return True
            board[ny][nx] = -1  # else reset field to untouched
    return False

def solve(width, height):
    board = [[-1]*width for _ in range(height)]
    # start at (0,0)
    board[0][0] = 0
    start_time = time.perf_counter()
    found = False
    found = backtrack_tour(board, 0, 0, 1)
    elapsed = time.perf_counter() - start_time

    if found:
        print(f"Solution ({elapsed:.4f}s):")
        for row in board:
            print(" ".join(f"{c:3d}" for c in row))
    else:
        print(f"No solution found ({elapsed:.4f}s).")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 knight-01-dfs.py WIDTH HEIGHT")
        sys.exit(1)
    w = int(sys.argv[1])
    h = int(sys.argv[2])
    solve(w, h)
