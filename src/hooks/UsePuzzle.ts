/** /src/hooks/UsePuzzle.ts */

import { useState, useEffect } from 'react';
import { getPuzzle } from '../services/PuzzleService';
import { Difficulty } from '../types/GameTypes';
import storage from '../utils/mmkvStorage';

type PuzzleData = {
  board: number[][];
  solution: number[][] | null;
  difficulty: Difficulty;
  source: string;
};

export const usePuzzle = (difficulty: Difficulty) => {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadPuzzle = async () => {
      try {
        setLoading(true);
        const userId = await storage.getString('player_id') || 'guest';
        const data = await getPuzzle(difficulty, userId);
        setPuzzle(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    loadPuzzle();
  }, [difficulty]);

  return { puzzle, loading, error };
};