/** /src/types/GameTypes.ts */

import { RecordModel } from "pocketbase";

export const GRID_SIZE = 9;
export const SUBGRID_SIZE = 3;
export const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
export const CACHE_KEY = 'strategies_cache';

export type Difficulty = "Easy" | "Medium" | "Hard" | "Extreme";
export type StrategyCategory = "Basic" | "Intermediate" | "Advanced";

export const GUEST_MAX_GAMES = 7;
export const GUEST_USER_KEY = 'guest_user_data';

export const getMaxHints = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case "Easy":
      return 5;
    case "Medium":
      return 4;
    case "Hard":
      return 3;
    case "Extreme":
      return 2;
    default:
      return 0;
  }
};

export const getMaxChecks = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case "Easy":
      return 5;
    case "Medium":
      return 4;
    case "Hard":
      return 3;
    case "Extreme":
      return 2;
    default:
      return 0; 
  }
};

export const MAX_TIME_MINUTES: Record<Difficulty, number> = {
  Easy: 55,    
  Medium: 45,  
  Hard: 40,    
  Extreme: 30
};


export interface PlayersRecord extends RecordModel {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  username: string;
  email: string;
  verified: boolean;
  emailVisibility: boolean;
  country?: string;
  highest_score: number;
  solved_puzzles: string[];
  solved_dailies: string[];
  solved_hashes: string[];
  last_login: string;
  // Hidden fields that will be present but empty
  password?: string;
  passwordConfirm?: string;
  tokenKey?: string;
}

export interface ScoreRecord extends RecordModel{
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  player: string;
  score: number;
  difficulty: Difficulty;
  time: string;
  date: string;
  puzzle_id: string | null;
}

export interface PuzzleRecord {
  id: string;
  collectionId: string;
  collectionName: string;
  created: string;
  updated: string;
  board: number[][];
  difficulty: Difficulty;
  solution: number[][];
  hash: string;
}

export type DailyPuzzleRecord = PuzzleRecord;

export interface LeaderboardResponse {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: ScoreRecord[];
}

export type GameBoardProps = {
  board: number[][];
  initialBoard: number[][];
  difficulty: Difficulty;
  setBoard: React.Dispatch<React.SetStateAction<number[][]>>;
  onComplete: () => void;
  onChangeDifficulty: () => void;
  onGetHint: () => void;
  onEndGame: () => void;
  checksUsed: Record<number, number>;
  setChecksUsed: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  notes: string;
  setNotes: ( notes: string ) => void;
  extraChecks: number;
  showRewardedChecks: () => void;
};

export type RootStackParamList = {
  Home: undefined;
  Game: {
    puzzle?: number[][];
    isDailyChallenge?: boolean;
    difficulty?: Difficulty;
  };
  'Daily Challenge': undefined;
  Tutorial: undefined;
  Leaderboard: undefined;
  Settings: undefined;
  UserCreation: undefined;
  Stats: undefined;
};

export type PuzzleResponse = {
  board: number[][];
  solution: number[][] | null;
  difficulty: Difficulty;
  source: string;
  id?: string;
  hash?: string;
};

export interface GameState {
  board: number[][];
  initialBoard: number[][]; 
  difficulty: Difficulty;
  totalSeconds: number;
  hintsUsed: number;
  currentPuzzleId: string | null;
  checksUsed: Record<number, number>;
  notes: string;
  extraHints?: number;
  extraChecks?: number;
}

export interface SavedGameData extends Partial<GameState> {
  extraHints?: number;
  extraChecks?: number;
  minutes?: number; 
  seconds?: number; 
  timestamp: number;
}


export interface Strategy {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  category: StrategyCategory;
  is_hint: boolean;
  is_tutorial: boolean;
  examples: string[];
}

export interface HintModalState {
  visible: boolean;
  message: string;
  position: { row: number; col: number };
  value: number;
  strategy?: Strategy;
}

export interface GuestUser {
  id: string;
  username: string;
  email: string;
  isGuest: true;
  gamesPlayed: number;
  maxGames: number;
  createdAt: string;
}

export interface GuestPuzzle {
  id: string;
  board: number[][];
  solution: number[][];
  difficulty: Difficulty;
}