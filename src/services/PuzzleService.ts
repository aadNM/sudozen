/** src/services/PuzzleService.ts */

import { ScoreRecord, PuzzleRecord, DailyPuzzleRecord, LeaderboardResponse, Difficulty, PuzzleResponse } from '../types/GameTypes';
import { logMessage } from '../utils/Logger';
import { deepCloneBoard, generateSudokuAsync, generateSudoku, solveSudoku } from '../utils/SudokuUtils';
import { initDB } from './pbInit';
import pb, { initAuth } from './PocketbaseClient';
import storage from '../utils/mmkvStorage';
import { GuestPuzzleService } from './GuestPuzzleService';
import { GuestUserService } from './GuestUserService';

// Local cache for immediate puzzle delivery
const localPuzzleCache = new Map<string, PuzzleResponse>();
const CACHE_SIZE_LIMIT = 20;

// Pre-generation queue for better UX
const puzzleQueue = new Map<Difficulty, PuzzleResponse[]>();
const QUEUE_SIZE = 3; // Keep 3 puzzles ready per difficulty

/**
 * Main puzzle retrieval with better caching and async generation
 */
export const getPuzzle = async (difficulty: Difficulty, userId?: string): Promise<PuzzleResponse> => {
  if (userId === 'guest' || userId?.startsWith('guest-')) {
    if (!GuestUserService.canPlayMore())
      throw new Error('Guest user has reached maximum games limit');

    const guestPuzzle = GuestPuzzleService.getGuestPuzzle(difficulty);
    if (guestPuzzle) {
      storage.setJSON('current_solution', guestPuzzle.solution);
      return guestPuzzle;
    }
    logMessage('warn', 'No guest puzzle available, falling back to generation');
  }
  
  try {
    // Quick return from local cache if available
    const cacheKey = `${difficulty}-${userId || 'guest'}`;
    if (localPuzzleCache.has(cacheKey)) {
      const cached = localPuzzleCache.get(cacheKey)!;
      localPuzzleCache.delete(cacheKey); // Remove after use
      return cached;
    }

    // Try to get from pre-generated queue first
    const queuedPuzzle = getFromQueue(difficulty);
    if (queuedPuzzle) {
      // Backfill the queue asynchronously
      backfillQueue(difficulty, userId).catch(() => {}); // Silent fail
      return queuedPuzzle;
    }

    await Promise.all([initDB(), initAuth()]);

    // Get player's solved puzzles if logged in (with timeout)
    let solvedPuzzleIds: string[] = [];
    let solvedPuzzleHashes: string[] = [];
    let solvedPuzzleDailies: string[] = [];

    if (userId && userId !== 'guest') {
      try {
        const playerPromise = pb.collection('players').getOne(userId, {
          fields: 'solved_hashes,solved_puzzles,solved_dailies'
        });
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Player fetch timeout')), 2000)
        );
        
        const player = await Promise.race([playerPromise, timeoutPromise]) as any;
        solvedPuzzleIds = player.solved_puzzles || [];
        solvedPuzzleHashes = player.solved_hashes || [];
        solvedPuzzleDailies = player.solved_dailies || [];
      } catch (e) {
        logMessage('warn', 'Failed to fetch player data, continuing with generation', { error: String(e) });
      }
    }

    // For new users or when DB fails, skip expensive DB queries
    if (solvedPuzzleIds.length === 0 && solvedPuzzleHashes.length === 0) {
      return await generateAndStorePuzzleOptimized(difficulty, userId);
    }

    // Try database with automatic fallback
    const dbPuzzle = await tryGetFromDatabase(difficulty, solvedPuzzleIds, solvedPuzzleHashes, solvedPuzzleDailies)
      .catch(() => null);

    return dbPuzzle || await generateAndStorePuzzleOptimized(difficulty, userId);
  } catch (error) {
    logMessage('error', 'Final fallback to local generation', { error: String(error) });
    return {
      board: await generateSudokuAsync(difficulty, 'fallback-' + Date.now()),
      solution: null,
      difficulty,
      source: 'fallback'
    };
  }
};

/**
 * Database retrieval with better error handling and timeouts
 */
const tryGetFromDatabase = async (
  difficulty: Difficulty,
  excludeIds: string[] = [],
  excludeHashes: string[] = [],
  excludeDailies: string[] = []
): Promise<PuzzleResponse> => {
  if (!(await initDB())) {
    throw new Error('DB not initialized');
  }
  
  await initAuth();
  
  try {
    // Build filter to exclude solved puzzles
    let filter = `difficulty="${difficulty}"`;
    
    if (excludeIds.length > 0) {
      filter += ` && id!="${excludeIds.slice(0, 50).join('" && id!="')}"`;  // Limit filter size
    }

    if (excludeDailies.length > 0) {
      filter += ` && id!="${excludeDailies.slice(0, 50).join('" && id!="')}"`;
    }
    
    if (excludeHashes.length > 0) {
      filter += ` && hash!="${excludeHashes.slice(0, 50).join('" && hash!="')}"`;
    }

    // Add timeout to database query
    const queryPromise = pb.collection('puzzles').getFirstListItem(filter, {
      requestKey: `puzzle-${difficulty}-${Date.now()}` // Unique key to prevent caching issues
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database query timeout')), 3000)
    );

    const puzzle = await Promise.race([queryPromise, timeoutPromise]) as any;

    storage.setJSON('current_solution', puzzle.solution);

    return {
      board: puzzle.board,
      solution: puzzle.solution || null,
      difficulty,
      source: 'database',
      id: puzzle.id,
      hash: puzzle.hash
    };
  } catch (error) {
    logMessage('warn', 'Database fetch failed - falling back to generation', { error: String(error) });
    throw error; 
  }
};

/**
 * Async puzzle generation with better performance
 */
const generateAndStorePuzzleOptimized = async (
  difficulty: Difficulty, 
  userId?: string,
  isDailyPuzzle?: boolean
): Promise<PuzzleResponse> => {
const seed = `${userId || 'guest'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // Use async generation to prevent UI blocking
  const board = await generateSudokuAsync(difficulty, seed);
  const solution = deepCloneBoard(board);
  const collection = isDailyPuzzle ? 'daily_puzzles' : 'puzzles';
  solveSudoku(solution);

  const result: PuzzleResponse = { 
    board, 
    solution, 
    difficulty, 
    source: 'generated',
    hash: seed
  };

  try {
    const savedPuzzle = await savePuzzleToDatabase(board, solution, difficulty, seed, collection);
    if (savedPuzzle && savedPuzzle.id) {
      result.id = savedPuzzle.id;
      result.hash = savedPuzzle.hash || seed;
      logMessage('info', `Generated puzzle saved with ID: ${savedPuzzle.id}`);
    } else {
      // If no ID returned, create a fallback ID
      result.id = `generated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      logMessage('warn', 'No ID returned from database save, using fallback ID');
    }
  } catch (error) {
    logMessage('warn', `Background save to ${collection} failed:`, { error: String(error) });
    // Even if save fails, provide a fallback ID so game can continue
    result.id = `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // Cache for potential reuse
  const cacheKey = `generated-${difficulty}-${Date.now()}`;
  if (localPuzzleCache.size < CACHE_SIZE_LIMIT) {
    localPuzzleCache.set(cacheKey, result);
  }
  
  if (result.solution && Array.isArray(result.solution)) {
    storage.setJSON('current_solution', result.solution);
  } else {
    logMessage('warn', 'Invalid solution data, skipping storage', { solution: result.solution });
  }
  return result;
};

/**
 * Background puzzle saving
 */
const savePuzzleToDatabase = async (
  board: number[][],
  solution: number[][],
  difficulty: Difficulty,
  seed: string,
  collection: string
): Promise<any> => {
  if (!(await initDB())) {
    throw new Error('Database not available');
  }

  try {
    if (!pb.authStore.token) {
      await initAuth();
    }

    if (!board || !solution || !difficulty || !seed) {
      throw new Error('Missing required puzzle data');
    }

    // Ensure arrays are valid
    if (!Array.isArray(board) || board.length !== 9 || !board.every(row => Array.isArray(row) && row.length === 9)) {
      throw new Error('Invalid board structure');
    }

    if (!Array.isArray(solution) || solution.length !== 9 || !solution.every(row => Array.isArray(row) && row.length === 9)) {
      throw new Error('Invalid solution structure');
    }

    return await pb.collection(collection).create({
      board,
      solution,
      difficulty,
      hash: seed
    });
  } catch (error) {
    logMessage('warn', `Failed to save puzzle to ${collection}`, { error: String(error) });
    throw error;
  }
};

/**
 * Queue management for instant puzzle delivery
 */
const getFromQueue = (difficulty: Difficulty): PuzzleResponse | null => {
  const queue = puzzleQueue.get(difficulty) || [];
  if (queue.length > 0) {
    return queue.shift()!;
  }
  return null;
};

const backfillQueue = async (difficulty: Difficulty, userId?: string): Promise<void> => {
  const queue = puzzleQueue.get(difficulty) || [];
  
  while (queue.length < QUEUE_SIZE) {
    try {
      const puzzle = await generateAndStorePuzzleOptimized(difficulty, userId);
      queue.push(puzzle);
    } catch (error) {
      logMessage('warn', 'Failed to backfill puzzle queue', { error: String(error) });
      break;
    }
  }
  
  puzzleQueue.set(difficulty, queue);
};

/**
 * Initialize puzzle queues (call this on app start)
 */
export const initializePuzzleQueues = async (): Promise<void> => {
  const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Extreme'];
  
  // Generate initial puzzles for each difficulty
  const promises = difficulties.map(async (difficulty) => {
    const queue: PuzzleResponse[] = [];
    
    // Generate just one puzzle initially, queue the rest for background
    try {
      const puzzle = await generateAndStorePuzzleOptimized(difficulty);
      queue.push(puzzle);
      puzzleQueue.set(difficulty, queue);
      
      // Queue the rest for background generation
      setTimeout(() => backfillQueue(difficulty), 100);
    } catch (error) {
      logMessage('warn', `Failed to initialize queue for ${difficulty}`, { error: String(error) });
    }
  });

  await Promise.allSettled(promises);
  logMessage('info', 'Puzzle queues initialized');
};


const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

const MAX_DELAY = 10000; // 10 seconds max delay

const getDelayWithJitter = (delay: number) => {
  const jitter = delay * 0.3 * Math.random();
  return Math.min(MAX_DELAY, delay + jitter * (Math.random() > 0.5 ? 1 : -1));
};

function isNonRetryableError(error: unknown): boolean {
  const status = (error as any)?.response?.status;
  return status >= 400 && status < 500 && status !== 429;
}

export const saveScore = async (
  scoreData: {
    player_id: string;
    score: number;
    difficulty: Difficulty;
    time: string;
    puzzle_id?: string | null;
  },
  retries = 3,
  delay = 1000
): Promise<ScoreRecord> => {
  if (!scoreData.player_id || !scoreData.score || !scoreData.difficulty || !scoreData.time) {
    throw new Error('Missing required score data');
  }

  // Skip saving scores for fallback puzzles that don't exist in DB
  if (scoreData.puzzle_id && (scoreData.puzzle_id.startsWith('fallback-') || scoreData.puzzle_id.startsWith('generated-'))) {
    logMessage('info', 'Skipping score save for fallback/generated puzzle', { puzzleId: scoreData.puzzle_id });
    throw new Error('Cannot save score for fallback puzzle');
  }

  try {
    const savePromise = pb.collection('scores').create(scoreData);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Score save timeout after 5s')), 5000)
    );

    const record = await Promise.race([savePromise, timeoutPromise]);
    
    // Log success after retries if it wasn't first attempt
    if (retries < 3) {
      logMessage('debug', 'Score saved successfully after retry');
    }
    
    return record as ScoreRecord;
  } catch (error: unknown) {
    // Handle timeout specifically
    if (error instanceof Error && error.message.includes('timeout')) {
      logMessage('warn', 'Score save timeout occurred');
    }

    if (retries > 0 && !isNonRetryableError(error)) {
      const attempt = 4 - retries;
      const nextDelay = getDelayWithJitter(delay * 2);

      logMessage('warn', `Retrying score save (attempt ${attempt}/3)...`, {
        error: String(error),
        nextDelay: `${nextDelay}ms`,
      });

      await sleep(nextDelay);
      return saveScore(scoreData, retries - 1, nextDelay);
    }

    if (isNonRetryableError(error)) {
      logMessage('warn', 'Non-retryable error encountered', {
        status: (error as any)?.response?.status,
        error: String(error),
      });
    }

    // Final error logging
    const err = error as any;
    if (err.response) {
      logMessage('error', 'Failed to save score (response):', err.response);
    }
    logMessage('error', 'Failed to save score (error):', { error: String(err) });
    logMessage('error', 'Unsaved Score Data:', scoreData);
    
    throw error;
  }
};

export const getLeaderboard = async (
  limit = 50,
  page = 1,
  sortBy = '-score,-updated',
  filter = ''
): Promise<LeaderboardResponse> => {
  
  await initDB();

  try {
    // Add timeout to leaderboard fetch
    const fetchPromise = pb.collection('scores').getList(page, limit, {
      sort: sortBy,
      filter,
      expand: 'player_id',
      requestKey: `leaderboard-${page}-${filter}-${Date.now()}`
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Leaderboard fetch timeout')), 5000)
    );

    const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
    
    return {
      page: result.page,
      perPage: result.perPage,
      totalItems: result.totalItems,
      totalPages: result.totalPages,
      items: result.items as ScoreRecord[],
    };
  } catch (error) {
    logMessage('error', "Error fetching leaderboard:", { error: String(error)});
    throw new Error(`Failed to load leaderboard: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const getDailyPuzzle = async (userId?: string, difficulty: Difficulty = 'Medium'): Promise<DailyPuzzleRecord | PuzzleResponse> => {
  const today = new Date().toISOString().split('T')[0];

  await Promise.all([initDB(), initAuth()]);
  
  try {
    // Get player's played daily puzzles with timeout
    let playedPuzzles: string[] = [];
    if (userId && userId !== 'guest') {
      try {
        const playerPromise = pb.collection('players').getOne(userId, {
          fields: 'solved_hashes'
        });
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Player fetch timeout')), 2000)
        );
        
        const player = await Promise.race([playerPromise, timeoutPromise]) as any;
        playedPuzzles = player.solved_hashes || [];
      } catch (e) {
        logMessage('warn', 'Failed to fetch player daily puzzle data', { error: String(e) });
      }
    }

    // Find today's puzzle that player hasn't played with timeout
    const filter = `created="${today}"${playedPuzzles.length ? ` && id!="${playedPuzzles.slice(0, 20).join('" && id!="')}"` : ''}`;
    
    const queryPromise = pb.collection('daily_puzzles').getFirstListItem(filter, {
      requestKey: `daily-${today}-${userId}-${Date.now()}`
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Daily puzzle fetch timeout')), 3000)
    );

    const record = await Promise.race([queryPromise, timeoutPromise]) as any;
    return record as DailyPuzzleRecord;
  } catch (error) {
    // Fallback to generating a puzzle
    logMessage('info', 'Generating fallback daily puzzle', { error: String(error) });
    return await generateAndStorePuzzleOptimized(difficulty, userId, true);
  }
};

/**
 * Batch puzzle generation for better performance
 */
export const generatePuzzleBatch = async (
  difficulty: Difficulty, 
  count: number = 5,
  userId?: string
): Promise<PuzzleResponse[]> => {
  const puzzles: PuzzleResponse[] = [];
  const batchPromises: Promise<PuzzleResponse>[] = [];

  // Generate multiple puzzles concurrently
  for (let i = 0; i < count; i++) {
    const seed = `${userId || 'batch'}-${Date.now()}-${i}`;
    batchPromises.push(generateAndStorePuzzleOptimized(difficulty, userId));
  }

  // Wait for all generations to complete
  const results = await Promise.allSettled(batchPromises);
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      puzzles.push(result.value);
    } else {
      logMessage('warn', `Batch generation failed for puzzle ${index}`, { 
        error: String(result.reason) 
      });
    }
  });

  return puzzles;
};

/**
 * Background puzzle pre-generation for smooth UX
 */
export const preGeneratePuzzles = async (userId?: string): Promise<void> => {
  const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Extreme'];
  
  // Stagger generation to avoid overwhelming the system
  for (const difficulty of difficulties) {
    try {
      // Generate fewer puzzles for harder difficulties to save time
      const count = difficulty === 'Extreme' ? 2 : difficulty === 'Hard' ? 3 : 5;
      
      setTimeout(async () => {
        try {
          await backfillQueue(difficulty, userId);
          logMessage('info', `Pre-generated puzzles for ${difficulty}`);
        } catch (error) {
          logMessage('warn', `Pre-generation failed for ${difficulty}`, { error: String(error) });
        }
      }, difficulties.indexOf(difficulty) * 1000); // Stagger by 1 second
      
    } catch (error) {
      logMessage('warn', `Failed to schedule pre-generation for ${difficulty}`, { error: String(error) });
    }
  }
};

/**
 * Clear caches 
 */
export const clearPuzzleCaches = (): void => {
  localPuzzleCache.clear();
  puzzleQueue.clear();
  logMessage('info', 'Puzzle caches cleared');
};

/**
 * Get cache statistics for debugging
 */
export const getCacheStats = () => {
  const queueStats = Array.from(puzzleQueue.entries()).map(([difficulty, queue]) => ({
    difficulty,
    count: queue.length
  }));

  return {
    localCacheSize: localPuzzleCache.size,
    queueStats,
    totalQueuedPuzzles: Array.from(puzzleQueue.values()).reduce((sum, queue) => sum + queue.length, 0)
  };
};


/**
 * Update player solved puzzles with proper error handling and validation
 */
export const updatePlayerSolvedPuzzles = async (
  playerId: string,
  puzzleId: string,
  puzzleHash?: string,
  isDailyChallenge: boolean = false
): Promise<void> => {
  if (!playerId || playerId === 'guest' || !puzzleId) {
    logMessage('warn', 'Cannot update solved puzzles: missing required data', {
      playerId: playerId || 'missing',
      puzzleId: puzzleId || 'missing',
      isDailyChallenge
    });
    return;
  }

  if (puzzleId.startsWith('fallback-') || puzzleId.startsWith('generated-')) {
    logMessage('info', 'Skipping solved puzzle update for fallback/generated puzzle', {
      playerId,
      puzzleId,
      isDailyChallenge
    });
    return;
  }

  try {
    await initDB();
    await initAuth();

    // Get current player data
    const player = await pb.collection('players').getOne(playerId, {
      fields: 'solved_puzzles,solved_hashes,solved_dailies'
    });

    // Prepare update data
    const updateData: any = {};
    
    // Update the appropriate solved array
    if (isDailyChallenge) {
      const existingDailies = player.solved_dailies || [];
      if (!existingDailies.includes(puzzleId)) {
        updateData.solved_dailies = [...existingDailies, puzzleId];
      }
    } else {
      const existingPuzzles = player.solved_puzzles || [];
      if (!existingPuzzles.includes(puzzleId)) {
        updateData.solved_puzzles = [...existingPuzzles, puzzleId];
      }
    }

    // Update hashes if provided
    if (puzzleHash) {
      const existingHashes = player.solved_hashes || [];
      if (!existingHashes.includes(puzzleHash)) {
        updateData.solved_hashes = [...existingHashes, puzzleHash];
      }
    }

    // Only update if there are changes
    if (Object.keys(updateData).length > 0) {
      await pb.collection('players').update(playerId, updateData);
      logMessage('info', 'Player solved puzzles updated successfully', {
        playerId,
        puzzleId,
        isDailyChallenge,
        updatedFields: Object.keys(updateData)
      });
    } else {
      logMessage('info', 'No updates needed - puzzle already in solved list');
    }

  } catch (error) {
    logMessage('error', 'Failed to update player solved puzzles:', {
      error: String(error),
      playerId,
      puzzleId,
      isDailyChallenge
    });
    throw error;
  }
};