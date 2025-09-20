/** /src/scripts/seedPuzzle.ts */

import { ensureAdminAuth } from '../services/pbInit';
import { generateSudoku, solveSudoku } from '../utils/SudokuUtils';
import { Difficulty } from '../types/GameTypes';
import pb from '../services/PocketbaseClient';
import { logMessage } from '../utils/Logger';

export const seedPuzzles = async (countPerDifficulty = 5) => {
  try {
    await ensureAdminAuth();
    
    const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Extreme'];
    
    for (const difficulty of difficulties) {
      for (let i = 0; i < countPerDifficulty; i++) {
        const seed = `seed-${difficulty}-${Date.now()}-${i}`;
        const puzzle = generateSudoku(difficulty, seed);
        const solution = JSON.parse(JSON.stringify(puzzle)); // Deep copy
        solveSudoku(solution); // Modifies in-place
        
        await pb.collection('puzzles').create({
          board: puzzle,
          solution,
          difficulty,
          hash: seed // Store for uniqueness
        });
      }
    }
  } catch (error) {
    logMessage('error', '❌ Seeding failed:', { error: String(error)});
  }
};

// To run manually when needed
// seedPuzzles().then(() => process.exit(0));