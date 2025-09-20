/** /src/services/GameStateService.ts */ 

import storage from "../utils/mmkvStorage";
import { CACHE_TTL, GameState, SavedGameData } from "../types/GameTypes";
import { logMessage } from "../utils/Logger";

const GAME_STATE_KEY = "savedGameState";
const HAS_ACTIVE_GAME_KEY = "hasActiveGame";

const GameStateService = {
  save: (gameState: GameState & { timestamp: number }) => {
    if (!gameState 
      || storage.getBoolean(HAS_ACTIVE_GAME_KEY) === false 
      || storage.getBoolean(HAS_ACTIVE_GAME_KEY) === undefined) return;
    
    const dataToSave: SavedGameData = {
      ...gameState,
      timestamp: gameState.timestamp || Date.now(),
    };
    
    try {
      storage.set(GAME_STATE_KEY, JSON.stringify(dataToSave));
      storage.set(HAS_ACTIVE_GAME_KEY, true);
    } catch (error) {
      logMessage('error', "Failed to save game state:", { error: String(error)});
    }
  },

  load: (): SavedGameData | null => {
    try {
      const raw = storage.getString(GAME_STATE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      // 🛠 Migrate old format to new format
      const totalSeconds = parsed.totalSeconds !== undefined
        ? parsed.totalSeconds
        : ((parsed.minutes || 0) * 60 + (parsed.seconds || 0));

      const migratedData: SavedGameData = {
        ...parsed,
        totalSeconds,
        minutes: undefined,
        seconds: undefined,
      };

      return migratedData;
    } catch (error) {
      logMessage('error',"Failed to load game state:", { error: String(error)});
      return null;
    }
  },

  clear: () => {
    try {
      storage.delete(GAME_STATE_KEY);
      storage.delete(HAS_ACTIVE_GAME_KEY);
      storage.delete("current_solution");
    } catch (error) {
      logMessage('error', "Failed to clear game state:", { error: String(error)});
      
      try {
        storage.delete(HAS_ACTIVE_GAME_KEY);
        storage.delete(GAME_STATE_KEY);
      } catch (fallbackError) {
        logMessage('error', "Fallback clear also failed:", { error: String(fallbackError)});
      }
    }
  },

  isResumable(): boolean {
    const hasActiveFlag = storage.getBoolean(HAS_ACTIVE_GAME_KEY);
    const raw = storage.getString(GAME_STATE_KEY);

    if (!hasActiveFlag) return false;

    try {
      // If either flag is false/missing or no saved data, not resumable
      if (!hasActiveFlag || !raw) {
        storage.delete(HAS_ACTIVE_GAME_KEY);
        return false;
      }

      // Try to parse the saved data
      let data: SavedGameData;
      try {
        data = JSON.parse(raw) as SavedGameData;
      } catch (parseError) {
        logMessage('error', "Failed to parse saved game data:", { error: String(parseError)});
        storage.delete(HAS_ACTIVE_GAME_KEY);
        storage.delete(GAME_STATE_KEY);
        return false;
      }

      // Check if the saved game is still fresh (within TTL)
      const now = Date.now();
      const savedTime = data.timestamp || 0;
      const isFresh = (now - savedTime) < CACHE_TTL;
      
      if (!isFresh) {
        this.clear();
        return false;
      }

      // Validate that we have essential game data
      const hasValidBoard = data.board && Array.isArray(data.board) && data.board.length === 9;
      const hasValidDifficulty = data.difficulty && typeof data.difficulty === 'string';
      
      if (!hasValidBoard || !hasValidDifficulty) {
        logMessage('error', "Invalid saved game data, clearing state");
        this.clear();
        return false;
      }

      // All checks passed
      storage.set(HAS_ACTIVE_GAME_KEY, true);
      return true;
      
    } catch (error) {
      logMessage('error', "Error checking if game is resumable:", { error: String(error)});
      
      // If there's any error, assume not resumable and clear state
      try {
        storage.set(HAS_ACTIVE_GAME_KEY, false);
      } catch (clearError) {
        logMessage('error', "Failed to clear hasActiveGame flag:", { error: String(clearError)});
      }
      
      return false;
    }
  }
};

export default GameStateService;