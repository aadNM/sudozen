/** /src/services/StrategyService.ts */

import { CACHE_KEY, Difficulty, Strategy, CACHE_TTL, StrategyCategory } from '../types/GameTypes';
import storage from '../utils/mmkvStorage';

import enStrategies from '../assets/strategies/strategies.en.json';
import esStrategies from '../assets/strategies/strategies.es.json';
import frStrategies from '../assets/strategies/strategies.fr.json';
import nlStrategies from '../assets/strategies/strategies.nl.json';
import haStrategies from '../assets/strategies/strategies.ha.json';
import swStrategies from '../assets/strategies/strategies.sw.json';
import zhStrategies from '../assets/strategies/strategies.zh.json';
import { getLocales } from 'expo-localization';
import i18n from '../i18n';

// Mapping for localized difficulty values to standard values
const difficultyMapping: { [key: string]: { [lang: string]: string } } = {
  Easy: { en: 'Easy', es: 'Fácil', fr: 'Facile', nl: 'Makkelijk', ha: 'Mai Sauƙi', sw: 'Rahisi', zh: '简单' },
  Medium: { en: 'Medium', es: 'Medio', fr: 'Moyen', nl: 'Gemiddeld', ha: 'Matsakaici', sw: 'Wastani', zh: '中等' },
  Hard: { en: 'Hard', es: 'Difícil', fr: 'Difficile', nl: 'Moeilijk', ha: 'Matsananci', sw: 'Ngumu', zh: '困难' },
  Extreme: { en: 'Extreme', es: 'Extremo', fr: 'Extrême', nl: 'Extreem', ha: 'Mafi Tsanani', sw: 'Ngumu Sana', zh: '极端' }
};

// Mapping for localized category values to standard values
const categoryMapping: { [key: string]: { [lang: string]: string } } = {
  Basic: { en: 'Basic', es: 'Básico', fr: 'Basique', nl: 'Basis', ha: 'Asali', sw: 'Msingi', zh: '基础' },
  Intermediate: { en: 'Intermediate', es: 'Intermedio', fr: 'Intermédiaire', nl: 'Gemiddeld', ha: 'Tsaka-tsaki', sw: 'Wastani', zh: '中级' },
  Advanced: { en: 'Advanced', es: 'Avanzado', fr: 'Avancé', nl: 'Geavanceerd', ha: 'Ci gaba', sw: 'Juu', zh: '高级' },
};

// Helper function to normalize difficulty from localized to standard
const normalizeDifficulty = (localizedDifficulty: string): Difficulty => {
  for (const [standard, localized] of Object.entries(difficultyMapping)) {
    if (Object.values(localized).includes(localizedDifficulty)) {
      return standard as Difficulty;
    }
  }
  return localizedDifficulty as Difficulty; // fallback
};

// Helper function to normalize category from localized to standard
const normalizeCategory = (localizedCategory: string): StrategyCategory => {
  for (const [standard, localized] of Object.entries(categoryMapping)) {
    if (Object.values(localized).includes(localizedCategory)) {
      return standard as StrategyCategory;
    }
  }
  return localizedCategory as StrategyCategory; // fallback
};

// Type guard to ensure strategy data matches our type
const isStrategy = (obj: any): obj is Strategy => {
  return obj && 
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.difficulty === 'string' &&
    typeof obj.category === 'string' &&
    typeof obj.is_hint === 'boolean' &&
    typeof obj.is_tutorial === 'boolean' &&
    Array.isArray(obj.examples);
};

// Get the appropriate strategy file based on current language
const getStrategyFile = () => {
  const language = i18n.language || getLocales()[0].languageCode;
  
  switch (language) {
    case 'es':
      return esStrategies;
    case 'fr':
      return frStrategies;
    case 'nl':
      return nlStrategies;
    case 'ha':
      return haStrategies;
    case 'sw':
      return swStrategies;
    case 'zh':
      return zhStrategies;
    default:
      return enStrategies;
  }
};

export const getStrategies = async (options?: {
  difficulty?: Difficulty;
  purpose?: 'hint' | 'tutorial';
}): Promise<Strategy[]> => {
  // Try cache first
  const cached = storage.getString(CACHE_KEY);
  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return filterStrategies(data, options);
    }
  }

  const strategies = getStrategyFile().strategies;
  return filterStrategies(strategies, options);
};

const filterStrategies = (strategies: any[], options?: {
  difficulty?: Difficulty;
  purpose?: 'hint' | 'tutorial';
}): Strategy[] => {
  return strategies
    .filter(s => isStrategy(s))
    .map(s => ({
      ...s,
      difficulty: normalizeDifficulty(s.difficulty),
      category: normalizeCategory(s.category)
    }))
    .filter(s => {
      const matchesDifficulty = !options?.difficulty || s.difficulty === options.difficulty;
      const matchesPurpose = !options?.purpose || 
        (options.purpose === 'hint' ? s.is_hint : s.is_tutorial);
      return matchesDifficulty && matchesPurpose;
    });
};

// Helper function to check if a number can be placed in a cell
const isValidPlacement = (board: number[][], row: number, col: number, num: number): boolean => {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (board[row][x] === num) return false;
  }

  // Check column
  for (let y = 0; y < 9; y++) {
    if (board[y][col] === num) return false;
  }

  // Check 3x3 box
  const boxStartRow = Math.floor(row / 3) * 3;
  const boxStartCol = Math.floor(col / 3) * 3;
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (board[boxStartRow + y][boxStartCol + x] === num) return false;
    }
  }

  return true;
};

// Get possible numbers for a cell
const getCandidates = (board: number[][], row: number, col: number): number[] => {
  if (board[row][col] !== 0) return [];
  
  const candidates = [];
  for (let num = 1; num <= 9; num++) {
    if (isValidPlacement(board, row, col, num)) {
      candidates.push(num);
    }
  }
  return candidates;
};

// Find cells with only one possible number (naked singles)
const findSingleCandidate = (board: number[][]): { position: { row: number; col: number }, value: number } | null => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (board[row][col] === 0) {
        const candidates = getCandidates(board, row, col);
        if (candidates.length === 1) {
          return { position: { row, col }, value: candidates[0] };
        }
      }
    }
  }
  return null;
};

// Find hidden singles (more advanced technique)
const findAdvancedHint = async (board: number[][], difficulty: Difficulty) => {
  // Check for hidden singles in rows, columns, and boxes
  for (let num = 1; num <= 9; num++) {
    // Check rows
    for (let row = 0; row < 9; row++) {
      const possibleCols = [];
      for (let col = 0; col < 9; col++) {
        if (board[row][col] === 0 && isValidPlacement(board, row, col, num)) {
          possibleCols.push(col);
        }
      }
      if (possibleCols.length === 1) {
        const strategy = await getStrategyForHint('Hidden Single', difficulty);
        return {
          strategy,
          position: { row, col: possibleCols[0] },
          value: num
        };
      }
    }

    // Check columns
    for (let col = 0; col < 9; col++) {
      const possibleRows = [];
      for (let row = 0; row < 9; row++) {
        if (board[row][col] === 0 && isValidPlacement(board, row, col, num)) {
          possibleRows.push(row);
        }
      }
      if (possibleRows.length === 1) {
        const strategy = await getStrategyForHint('Hidden Single', difficulty);
        return {
          strategy,
          position: { row: possibleRows[0], col },
          value: num
        };
      }
    }

    // Check 3x3 boxes
    for (let boxRow = 0; boxRow < 9; boxRow += 3) {
      for (let boxCol = 0; boxCol < 9; boxCol += 3) {
        const possiblePositions = [];
        for (let row = boxRow; row < boxRow + 3; row++) {
          for (let col = boxCol; col < boxCol + 3; col++) {
            if (board[row][col] === 0 && isValidPlacement(board, row, col, num)) {
              possiblePositions.push({ row, col });
            }
          }
        }
        if (possiblePositions.length === 1) {
          const strategy = await getStrategyForHint('Hidden Single', difficulty);
          return {
            strategy,
            position: possiblePositions[0],
            value: num
          };
        }
      }
    }
  }
  return null;
};

export const getRelevantHint = async (
  board: number[][],
  difficulty: Difficulty
): Promise<{
  strategy: Strategy;
  position?: { row: number; col: number };
  value?: number;
}> => {
  // 1. First try to find a cell with only one possible number
  const singleCandidate = findSingleCandidate(board);
  if (singleCandidate) {
    const strategy = await getStrategyForHint('Single Candidate', difficulty);
    return { strategy, ...singleCandidate };
  }

  // 2. Then try advanced techniques
  const advancedHint = await findAdvancedHint(board, difficulty);
  if (advancedHint) return advancedHint;

  // 3. Fallback to general strategy hint
  const strategies = await getStrategies({ purpose: 'hint', difficulty });
  return { strategy: strategies[0] };
};

const getStrategyForHint = async (titleContains: string, difficulty: Difficulty) => {
  const strategies = await getStrategies({ purpose: 'hint', difficulty });
  return strategies.find(s => s.title.includes(titleContains)) || strategies[0];
};