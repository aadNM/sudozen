/** src/services/GuestPuzzleService.ts */

import { Difficulty, GuestPuzzle, PuzzleResponse } from '../types/GameTypes';
import { logMessage } from '../utils/Logger';
import GUEST_PUZZLES from '../assets/data/GuestPuzzles.json';
import { solveSudoku, deepCloneBoard, generateSudoku } from '../utils/SudokuUtils';

export class GuestPuzzleService {
  private static usedPuzzleIds: Set<string> = new Set();

  static getGuestPuzzle(difficulty: Difficulty): PuzzleResponse | null {
    try {
      const puzzles = GUEST_PUZZLES as Record<Difficulty, GuestPuzzle[]>;
      
      if (!puzzles || !puzzles[difficulty] || puzzles[difficulty].length === 0) {
        logMessage('warn', `No guest puzzles available for difficulty: ${difficulty}`);
        return this.generateFallbackPuzzle(difficulty);
      }

      // Find an unused puzzle
      const availablePuzzles = puzzles[difficulty].filter(p => !this.usedPuzzleIds.has(p.id));
      
      if (availablePuzzles.length === 0) {
        // If all puzzles used, reset and start over
        this.usedPuzzleIds.clear();
        logMessage('info', 'All guest puzzles used, resetting pool');
      }

      const puzzlePool = availablePuzzles.length > 0 ? availablePuzzles : puzzles[difficulty];
      const randomIndex = Math.floor(Math.random() * puzzlePool.length);
      const selectedPuzzle = puzzlePool[randomIndex];

      // Validate the puzzle has a valid solution
      if (!this.isValidPuzzle(selectedPuzzle)) {
        logMessage('warn', `Invalid guest puzzle detected: ${selectedPuzzle.id}, generating fallback`);
        return this.generateFallbackPuzzle(difficulty);
      }

      this.usedPuzzleIds.add(selectedPuzzle.id);

      return {
        board: selectedPuzzle.board,
        solution: selectedPuzzle.solution,
        difficulty: selectedPuzzle.difficulty as Difficulty,
        source: 'guest-local',
        id: selectedPuzzle.id
      };
    } catch (error) {
      logMessage('error', 'Error getting guest puzzle', { error: String(error) });
      return this.generateFallbackPuzzle(difficulty);
    }
  }

  private static isValidPuzzle(puzzle: GuestPuzzle): boolean {
    // Basic validation - check if board and solution exist and have correct dimensions
    if (!puzzle.board || !puzzle.solution) return false;
    if (puzzle.board.length !== 9 || puzzle.solution.length !== 9) return false;
    
    for (let i = 0; i < 9; i++) {
      if (puzzle.board[i].length !== 9 || puzzle.solution[i].length !== 9) return false;
    }
    
    return true;
  }

  private static generateFallbackPuzzle(difficulty: Difficulty): PuzzleResponse {
    logMessage('info', 'Generating fallback puzzle for guest');
    const seed = `guest-fallback-${Date.now()}`;
    const board = generateSudoku(difficulty, seed);
    const solution = deepCloneBoard(board);
    solveSudoku(solution);
    
    return {
      board,
      solution,
      difficulty,
      source: 'guest-fallback',
      id: `guest-fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    };
  }

  static resetUsedPuzzles(): void {
    this.usedPuzzleIds.clear();
  }

  static getUsedPuzzleCount(): number {
    return this.usedPuzzleIds.size;
  }
}