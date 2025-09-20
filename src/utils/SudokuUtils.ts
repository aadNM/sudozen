/** /src/utils/SudokuUtils.ts */

import { Difficulty, GRID_SIZE, SUBGRID_SIZE } from "../types/GameTypes";
import { logMessage } from "./Logger";
import storage from "./mmkvStorage";

// Enhanced memoization with LRU-style cleanup
const puzzleCache = new Map<string, number[][]>();
const MAX_CACHE_SIZE = 100;
const OFFSET = 3;

// Pre-generated cell removal patterns for better performance
const REMOVAL_PATTERNS = {
  Easy: [
    [4,5,4,3,4,5,4,3,4], // Pattern for systematic removal
    [3,4,5,4,3,4,5,4,3],
    [5,3,4,5,3,4,5,3,4]
  ],
  Medium: [
    [5,6,5,4,5,6,5,4,5],
    [4,5,6,5,4,5,6,5,4],
    [6,4,5,6,4,5,6,4,5]
  ],
  Hard: [
    [6,7,6,5,6,7,6,5,6],
    [5,6,7,6,5,6,7,6,5],
    [7,5,6,7,5,6,7,5,6]
  ],
  Extreme: [
    [7,8,7,6,7,8,7,6,7],
    [6,7,8,7,6,7,8,7,6],
    [8,6,7,8,6,7,8,6,7]
  ]
};

/**
 * Creates an empty 9x9 board.
 */
export const createEmptyBoard = (): number[][] => {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
};

/**
 * Deep clones a board to prevent mutation.
 */
export const deepCloneBoard = (board: number[][]): number[][] => {
  return board.map(row => [...row]);
};

/**
 * Uses bit masking for faster validation
 */
export const isValidPlacement = (board: number[][], row: number, col: number, num: number): boolean => {
  const bit = 1 << (num - 1);
  
  // Check row and column simultaneously
  let rowMask = 0, colMask = 0;
  for (let i = 0; i < GRID_SIZE; i++) {
    if (board[row][i] !== 0) rowMask |= (1 << (board[row][i] - 1));
    if (board[i][col] !== 0) colMask |= (1 << (board[i][col] - 1));
  }
  
  if ((rowMask & bit) || (colMask & bit)) return false;

  // Check 3x3 box
  const startRow = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE;
  const startCol = Math.floor(col / SUBGRID_SIZE) * SUBGRID_SIZE;
  let boxMask = 0;
  
  for (let i = 0; i < SUBGRID_SIZE; i++) {
    for (let j = 0; j < SUBGRID_SIZE; j++) {
      const val = board[startRow + i][startCol + j];
      if (val !== 0) boxMask |= (1 << (val - 1));
    }
  }
  
  return !(boxMask & bit);
};

/**
 * Solver with better heuristics
 */
export const solveSudoku = (board: number[][]): boolean => {
  // Find cell with minimum possibilities (MRV heuristic)
  let minPossibilities = 10;
  let bestRow = -1, bestCol = -1;
  let possibilities: number[] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (board[row][col] === 0) {
        const cellPossibilities = [];
        for (let num = 1; num <= GRID_SIZE; num++) {
          if (isValidPlacement(board, row, col, num)) {
            cellPossibilities.push(num);
          }
        }
        
        if (cellPossibilities.length === 0) return false; // No solution
        if (cellPossibilities.length < minPossibilities) {
          minPossibilities = cellPossibilities.length;
          bestRow = row;
          bestCol = col;
          possibilities = cellPossibilities;
        }
      }
    }
  }

  if (bestRow === -1) return true; // Solved

  // Try possibilities in order
  for (const num of possibilities) {
    board[bestRow][bestCol] = num;
    if (solveSudoku(board)) return true;
    board[bestRow][bestCol] = 0;
  }

  return false;
};

/**
 * Pre-computed diagonal box filling
 */
const fillBox = (board: number[][], rowStart: number, colStart: number, rng: () => number) => {
  const numbers = Array.from({ length: 9 }, (_, i) => i + 1);
  
  // Fisher-Yates shuffle
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  let index = 0;
  for (let i = 0; i < SUBGRID_SIZE; i++) {
    for (let j = 0; j < SUBGRID_SIZE; j++) {
      board[rowStart + i][colStart + j] = numbers[index++];
    }
  }
};

/**
 * Better seeded RNG
 */
const createSeededRNG = (seed: string): () => number => {
  let a = 1;
  for (let i = 0; i < seed.length; i++) {
    a = (a * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  
  return () => {
    a = (a * 16807) % 2147483647;
    return (a - 1) / 2147483646;
  };
};

/**
 * Full board generation
 */
const generateSeededBoard = (seed: string): number[][] => {
  const board = createEmptyBoard();
  const rng = createSeededRNG(seed);

  // Fill diagonal boxes first (they don't affect each other)
  fillBox(board, 0, 0, rng);
  fillBox(board, 3, 3, rng);
  fillBox(board, 6, 6, rng);

  if (!solveSudoku(board)) {
    throw new Error("Failed to generate a solvable Sudoku board");
  }

  return board;
};

/**
 * Puzzle generation with pattern-based removal
 */
export const generateSudoku = (difficulty: Difficulty, seed: string): number[][] => {
  const cacheKey = `${difficulty}-${seed}`;
  if (puzzleCache.has(cacheKey)) {
    return puzzleCache.get(cacheKey)!;
  }

  // Clean cache if too large (remove oldest entries)
  while (puzzleCache.size >= MAX_CACHE_SIZE) {
    const firstKey = puzzleCache.keys().next().value;
    if (firstKey !== undefined) {
      puzzleCache.delete(firstKey);
    } else {
      break; // Safety exit if something goes wrong
    }
  }

  const fullBoard = generateSeededBoard(seed);
  const puzzle = deepCloneBoard(fullBoard);
  const rng = createSeededRNG(seed + '_removal');

  // Use pattern-based removal instead of random validation
  const patterns = REMOVAL_PATTERNS[difficulty];
  const pattern = patterns[Math.floor(rng() * patterns.length)];
  
  const cellsToRemove: Array<[number, number]> = [];
  
  // Generate removal list based on pattern
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (rng() < pattern[row] / 10) { // Pattern determines probability
        cellsToRemove.push([row, col]);
      }
    }
  }

  // Shuffle removal order
  for (let i = cellsToRemove.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cellsToRemove[i], cellsToRemove[j]] = [cellsToRemove[j], cellsToRemove[i]];
  }

  // Remove cells while maintaining uniqueness (but limit validation checks)
  const maxRemovals = {
    Easy: 40,
    Medium: 50, 
    Hard: 55,
    Extreme: 60
  }[difficulty];

  let removed = 0;
  const maxValidationChecks = Math.min(cellsToRemove.length, maxRemovals + 10);
  
  for (let i = 0; i < maxValidationChecks && removed < maxRemovals; i++) {
    const [row, col] = cellsToRemove[i];
    if (puzzle[row][col] !== 0) {
      const temp = puzzle[row][col];
      puzzle[row][col] = 0;
      
      // For extreme difficulty, skip expensive validation for performance
      if (difficulty === 'Extreme' || hasUniqueSolutionFast(puzzle)) {
        removed++;
      } else {
        puzzle[row][col] = temp;
      }
    }
  }

  puzzleCache.set(cacheKey, puzzle);
  return puzzle;
};

/**
 * Uniqueness check with early termination
 */
const hasUniqueSolutionFast = (board: number[][]): boolean => {
  const solutions = countSolutions(board, 2, 100); // Much shorter timeout
  return solutions === 1;
};

/**
 * Solution counting with better pruning
 */
export const countSolutions = (
  board: number[][],
  limit = 2,
  timeout = 100 // Reduced timeout for mobile
): number => {
  const start = Date.now();
  let count = 0;
  const workingBoard = deepCloneBoard(board);

  const solve = (): boolean => {
    if (Date.now() - start > timeout) return true; // Timeout

    // Find empty cell with fewest possibilities
    let minPossibilities = 10;
    let bestRow = -1, bestCol = -1;
    const cellPossibilities = new Map<string, number[]>();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (workingBoard[row][col] === 0) {
          const possibilities = [];
          for (let num = 1; num <= GRID_SIZE; num++) {
            if (isValidPlacement(workingBoard, row, col, num)) {
              possibilities.push(num);
            }
          }
          
          if (possibilities.length === 0) return false; // No solution
          
          cellPossibilities.set(`${row},${col}`, possibilities);
          if (possibilities.length < minPossibilities) {
            minPossibilities = possibilities.length;
            bestRow = row;
            bestCol = col;
          }
        }
      }
    }

    if (bestRow === -1) {
      count++;
      return count >= limit; // Found enough solutions
    }

    const possibilities = cellPossibilities.get(`${bestRow},${bestCol}`) || [];
    for (const num of possibilities) {
      workingBoard[bestRow][bestCol] = num;
      if (solve()) return true;
      workingBoard[bestRow][bestCol] = 0;
    }

    return false;
  };

  solve();
  return count;
};

/**
 * ASYNC wrapper for non-blocking puzzle generation
 */
export const generateSudokuAsync = async (
  difficulty: Difficulty, 
  seed: string
): Promise<number[][]> => {
  return new Promise((resolve) => {
    // Use setTimeout to make it non-blocking
    setTimeout(() => {
      try {
        const puzzle = generateSudoku(difficulty, seed);
        resolve(puzzle);
      } catch (error) {
        // Fallback to simpler generation if needed
        logMessage('warn', 'Complex generation failed, using simplified approach', { error });
        resolve(generateSimplifiedSudoku(difficulty, seed));
      }
    }, 0);
  });
};

/**
 * Simplified generation for fallback scenarios
 */
const generateSimplifiedSudoku = (difficulty: Difficulty, seed: string): number[][] => {
  const fullBoard = generateSeededBoard(seed);
  const puzzle = deepCloneBoard(fullBoard);
  const rng = createSeededRNG(seed);

  // Simple random removal without validation for fallback
  const targetRemoval = {
    Easy: 35,
    Medium: 45,
    Hard: 50,
    Extreme: 55
  }[difficulty];

  let removed = 0;
  const maxAttempts = targetRemoval * 2;
  let attempts = 0;

  while (removed < targetRemoval && attempts < maxAttempts) {
    const row = Math.floor(rng() * GRID_SIZE);
    const col = Math.floor(rng() * GRID_SIZE);
    
    if (puzzle[row][col] !== 0) {
      puzzle[row][col] = 0;
      removed++;
    }
    attempts++;
  }

  return puzzle;
};

/**
 * Validates a specific 3x3 block using Sudoku rules instead of stored solution
 * @param board - Current game board (9x9 array)  
 * @param blockNumber - Block number (0-8)
 * @returns boolean - true if block follows Sudoku rules
 */
export const isBlockValid = (
  board: number[][], 
  blockNumber: number
): boolean => {
  // Validate input
  if (blockNumber < 0 || blockNumber > 8) {
    throw new Error(`Invalid block number: ${blockNumber}. Must be between 0 and 8.`);
  }

  if (!board || board.length !== 9 || !board.every(row => row.length === 9)) {
    throw new Error('Invalid board: must be a 9x9 array');
  }

  const rowOffset = Math.floor(blockNumber / 3) * 3;
  const colOffset = (blockNumber % 3) * 3;

  // Check each cell in the 3x3 block
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const row = rowOffset + i;
      const col = colOffset + j;
      const currentValue = board[row][col];

      // Only validate filled cells
      if (currentValue !== 0) {
         // Temporarily remove to test validity
        board[row][col] = 0;
        const isValid = isValidPlacement(board, row, col, currentValue);
        board[row][col] = currentValue; // Restore

        if (!isValid) return false;
      }
    }
  }

  return true;
};

/**
 * Complete validation for finished blocks
 * Checks that block is completely filled AND follows all Sudoku rules
 */
export const isBlockValidFinal = (board: number[][], block: number): boolean => {
  const numbers = new Set<number>();
  const startRow = Math.floor(block / 3) * 3;
  const startCol = (block % 3) * 3;

  for (let row = startRow; row < startRow + 3; row++) {
    for (let col = startCol; col < startCol + 3; col++) {
      const val = board[row][col];
      
      if (val === 0 || val < 1 || val > 9) return false;
      if (numbers.has(val)) return false;
      numbers.add(val);
      
      // Check Sudoku rules
      board[row][col] = 0;
      const isValid = isValidPlacement(board, row, col, val);
      board[row][col] = val;
      
      if (!isValid) return false;
    }
  }
  return true;
};


/**
 * Validate against stored solution (if available)
 */
export const validateAgainstSolution = (
  currentBoard: number[][], 
  solution: number[][] | null
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

    if (!solution) {
      return {
        isValid: false,
        errors: ['No solution available for validation']
      };
    }
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const currentVal = currentBoard[row][col];
      const solutionVal = solution[row][col];
      
      // If cell is filled, check if it matches solution
      if (currentVal !== 0 && currentVal !== solutionVal) {
        errors.push(`Cell (${row + 1}, ${col + 1}): expected ${solutionVal}, got ${currentVal}`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate board using Sudoku rules
 */
export const validateWithSudokuRules = (
  currentBoard: number[][], 
  solution: number[][] | null
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const value = currentBoard[row][col];
      
      if (value !== 0) {
        currentBoard[row][col] = 0;
        const isValid = isValidPlacement(currentBoard, row, col, value);
        currentBoard[row][col] = value;
        
        if (!isValid) {
          errors.push(`Cell (${row + 1}, ${col + 1}): violates Sudoku rules`);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};


/**
 * Check if the puzzle is completely solved
 */
export const isPuzzleSolved = (board: number[][], storedSolution: number[][] | null): boolean => {
  // Always use rule-based validation as primary
  const ruleValidation = validateWithSudokuRules(board,storedSolution);
  if (ruleValidation.isValid) {
    return true;
  }

  // Optional: Fallback to solution check only if rule validation fails
  if (storedSolution) {
    const solutionCheck = validateAgainstSolution(board, storedSolution);
    if (solutionCheck.isValid && !ruleValidation.isValid) {
      // This would indicate a bug in validateBoardRules
      logMessage('warn', 'Rule validation failed but solution check passed - possible bug');
    }
    
    return solutionCheck.isValid;
  }

  return false;
  
};

export const passGen = () => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEF!@#GHIJK#$&*LMNOPQRSTUVWXYZ0123456789';
  const segment = (length: number) =>
    Array.from({ length }, () => charset[Math.floor(Math.random() * charset.length)]).join('');
  return `${segment(8)}-${segment(4)}-${segment(4)}-${segment(4)}-${segment(12)}`;
};

export const userPassGen = () => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  return Array.from({ length: 3 }, () => 
    charset[Math.floor(Math.random() * charset.length)] +
    charset[Math.floor(Math.random() * charset.length)] +
    charset[Math.floor(Math.random() * charset.length)] +
    '-'
  ).join('').slice(0, -1); 
};

export interface DebouncedFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): void;
  cancel(): void;
}

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): DebouncedFunction<T> => {
  let timeout: ReturnType<typeof setTimeout>;

  const debounced = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };

  debounced.cancel = () => clearTimeout(timeout);

  return debounced;
};