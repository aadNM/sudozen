/** src/services/StatsService.ts */

import { Difficulty, ScoreRecord } from '../types/GameTypes';
import { logMessage } from '../utils/Logger';
import pb from './PocketbaseClient';
import { initDB } from './pbInit';

export interface PlayerStats {
  totalPuzzlesSolved: number;
  solvedByDifficulty: Record<Difficulty, number>;
  highestScore: number;
  averageScoreByDifficulty: Record<Difficulty, number>;
  bestTimeByDifficulty: Record<Difficulty, string>;
  totalPlayTime: string;
  dailyChallengesSolved: number;
  recentGames: ScoreRecord[];
  currentStreak: number;
  longestStreak: number;
}

/**
 * Convert time string (MM:SS) to seconds for comparison
 */
const timeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
};

/**
 * Convert seconds to MM:SS format
 */
const secondsToTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Fetch comprehensive player statistics
 */
export const getPlayerStats = async (playerId: string): Promise<PlayerStats | null> => {
  if (!playerId || playerId === 'guest' || playerId.startsWith('guest-')) {
    logMessage('warn', 'Cannot fetch stats for guest user');
    return null;
  }

  try {
    await initDB();

    // Get player record
    const player = await pb.collection('players').getOne(playerId, {
      fields: 'solved_puzzles,solved_dailies,solved_hashes,highest_score'
    });

    // Get all player scores
    const scores = await pb.collection('scores').getList(1, 500, {
      filter: `player_id="${playerId}"`,
      sort: '-created',
      expand: 'puzzle_id'
    });

    // Initialize stats
    const stats: PlayerStats = {
      totalPuzzlesSolved: player.solved_puzzles?.length || 0,
      solvedByDifficulty: {
        Easy: 0,
        Medium: 0,
        Hard: 0,
        Extreme: 0
      },
      highestScore: player.highest_score || 0,
      averageScoreByDifficulty: {
        Easy: 0,
        Medium: 0,
        Hard: 0,
        Extreme: 0
      },
      bestTimeByDifficulty: {
        Easy: '--:--',
        Medium: '--:--',
        Hard: '--:--',
        Extreme: '--:--'
      },
      totalPlayTime: '00:00',
      dailyChallengesSolved: player.solved_dailies?.length || 0,
      recentGames: [],
      currentStreak: 0,
      longestStreak: 0
    };

    // Process scores
    const scoresByDifficulty: Record<Difficulty, number[]> = {
      Easy: [],
      Medium: [],
      Hard: [],
      Extreme: []
    };

    const timesByDifficulty: Record<Difficulty, number[]> = {
      Easy: [],
      Medium: [],
      Hard: [],
      Extreme: []
    };

    let totalSeconds = 0;

    scores.items.forEach((score: any) => {
      const difficulty = score.difficulty as Difficulty;

      // Count by difficulty
      stats.solvedByDifficulty[difficulty]++;

      // Collect scores for averaging
      scoresByDifficulty[difficulty].push(score.score);

      // Collect times
      const timeInSeconds = timeToSeconds(score.time);
      timesByDifficulty[difficulty].push(timeInSeconds);
      totalSeconds += timeInSeconds;
    });

    // Calculate averages
    Object.keys(scoresByDifficulty).forEach((diff) => {
      const difficulty = diff as Difficulty;
      const scores = scoresByDifficulty[difficulty];
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        stats.averageScoreByDifficulty[difficulty] = Math.round(avg);
      }
    });

    // Find best times
    Object.keys(timesByDifficulty).forEach((diff) => {
      const difficulty = diff as Difficulty;
      const times = timesByDifficulty[difficulty];
      if (times.length > 0) {
        const bestTime = Math.min(...times);
        stats.bestTimeByDifficulty[difficulty] = secondsToTime(bestTime);
      }
    });

    // Calculate total play time
    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    stats.totalPlayTime = hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;

    // Get recent games (last 10)
    stats.recentGames = scores.items.slice(0, 10) as ScoreRecord[];

    // Calculate streaks (based on daily challenges)
    stats.currentStreak = await calculateCurrentStreak(playerId);
    stats.longestStreak = await calculateLongestStreak(playerId);

    return stats;
  } catch (error) {
    logMessage('error', 'Failed to fetch player stats:', { error: String(error) });
    return null;
  }
};

/**
 * Calculate current daily challenge streak
 */
const calculateCurrentStreak = async (playerId: string): Promise<number> => {
  try {
    // Get daily challenge scores sorted by date
    const dailyScores = await pb.collection('scores').getList(1, 100, {
      filter: `player_id="${playerId}" && puzzle_id~"daily"`,
      sort: '-created'
    });

    if (dailyScores.items.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check each day backwards from today
    for (let i = 0; i < dailyScores.items.length; i++) {
      const scoreDate = new Date(dailyScores.items[i].created);
      scoreDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((today.getTime() - scoreDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        streak++;
      } else if (daysDiff > streak) {
        break;
      }
    }

    return streak;
  } catch (error) {
    logMessage('warn', 'Failed to calculate current streak:', { error: String(error) });
    return 0;
  }
};

/**
 * Calculate longest daily challenge streak
 */
const calculateLongestStreak = async (playerId: string): Promise<number> => {
  try {
    const dailyScores = await pb.collection('scores').getList(1, 365, {
      filter: `player_id="${playerId}" && puzzle_id~"daily"`,
      sort: '-created'
    });

    if (dailyScores.items.length === 0) return 0;

    let longestStreak = 0;
    let currentStreak = 1;

    for (let i = 0; i < dailyScores.items.length - 1; i++) {
      const currentDate = new Date(dailyScores.items[i].created);
      const nextDate = new Date(dailyScores.items[i + 1].created);

      currentDate.setHours(0, 0, 0, 0);
      nextDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(longestStreak, currentStreak);
  } catch (error) {
    logMessage('warn', 'Failed to calculate longest streak:', { error: String(error) });
    return 0;
  }
};
