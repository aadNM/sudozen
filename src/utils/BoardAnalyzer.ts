/** src/utils/BoardAnalyzer.ts */ 

import { GRID_SIZE, SUBGRID_SIZE } from '../types/GameTypes';

export const analyzeBoard = (board: number[][]): {
  nakedPairs: number,
  hiddenSingles: number,
  emptyCells: number,
  candidateLines: number
} => {
  const result = {
    nakedPairs: 0,
    hiddenSingles: 0,
    emptyCells: 0,
    candidateLines: 0
  };

  // Count empty cells
  result.emptyCells = board.flat().filter(c => c === 0).length;

  // Check all rows, columns and boxes
  for (let i = 0; i < GRID_SIZE; i++) {
    // Check rows
    const row = board[i];
    result.nakedPairs += countNakedPairs(row);
    result.hiddenSingles += countHiddenSingles(row);
    result.candidateLines += countCandidateLines(board, 'row', i);

    // Check columns
    const col = board.map(r => r[i]);
    result.nakedPairs += countNakedPairs(col);
    result.hiddenSingles += countHiddenSingles(col);
    result.candidateLines += countCandidateLines(board, 'col', i);

    // Check boxes
    const box = getBoxCells(board, Math.floor(i / 3) * 3, (i % 3) * 3);
    result.nakedPairs += countNakedPairs(box);
    result.hiddenSingles += countHiddenSingles(box);
  }

  return result;
};

const getBoxCells = (board: number[][], startRow: number, startCol: number): number[] => {
  const cells = [];
  for (let i = 0; i < SUBGRID_SIZE; i++) {
    for (let j = 0; j < SUBGRID_SIZE; j++) {
      cells.push(board[startRow + i][startCol + j]);
    }
  }
  return cells;
};

const countNakedPairs = (cells: number[]): number => {
  const emptyCells = cells.filter(c => c === 0).length;
  if (emptyCells < 2) return 0;

  // This is simplified - actual implementation would track candidates
  // For now, we'll just count potential pairs
  return emptyCells >= 2 ? 1 : 0;
};

const countHiddenSingles = (cells: number[]): number => {
  const numbers = new Set(cells.filter(c => c !== 0));
  if (numbers.size === GRID_SIZE - 1) {
    // Only one number missing
    return 1;
  }
  return 0;
};

const countCandidateLines = (board: number[][], type: 'row' | 'col', index: number): number => {
  let count = 0;
  for (let num = 1; num <= GRID_SIZE; num++) {
    let positions = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      const [row, col] = type === 'row' ? [index, i] : [i, index];
      if (board[row][col] === 0) {
        // Check if number could go here
        if (isValidPlacement(board, row, col, num)) {
          positions.push(i);
        }
      }
    }
    
    // If all possible positions are in the same box
    if (positions.length > 0) {
      const firstBox = Math.floor(positions[0] / 3);
      if (positions.every(p => Math.floor(p / 3) === firstBox)) {
        count++;
      }
    }
  }
  return count;
};

// Helper function from SudokuUtils
const isValidPlacement = (board: number[][], row: number, col: number, num: number): boolean => {
  // Check row and column
  for (let i = 0; i < GRID_SIZE; i++) {
    if (board[row][i] === num || board[i][col] === num) return false;
  }

  // Check box
  const startRow = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE;
  const startCol = Math.floor(col / SUBGRID_SIZE) * SUBGRID_SIZE;
  for (let i = 0; i < SUBGRID_SIZE; i++) {
    for (let j = 0; j < SUBGRID_SIZE; j++) {
      if (board[startRow + i][startCol + j] === num) return false;
    }
  }

  return true;
};