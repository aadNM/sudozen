/** src/screens/StatsScreen.tsx */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useGlobalStyles } from '../styles/Global.styles';
import { useTheme } from '../context/ThemeContext';
import { useTypography } from '../styles/Typography';
import { getPlayerStats, PlayerStats } from '../services/StatsService';
import storage from '../utils/mmkvStorage';
import { logMessage } from '../utils/Logger';
import { Difficulty } from '../types/GameTypes';

const StatsScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const typography = useTypography();

  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const playerId = storage.getString('player_id');

      if (!playerId || playerId === 'guest' || playerId.startsWith('guest-')) {
        setError(t('stats.guestUserMessage'));
        return;
      }

      const playerStats = await getPlayerStats(playerId);

      if (playerStats) {
        setStats(playerStats);
      } else {
        setError(t('stats.errorLoading'));
      }
    } catch (err) {
      logMessage('error', 'Failed to load stats:', { error: String(err) });
      setError(t('stats.errorLoading'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    loadStats(true);
  };

  const getDifficultyColor = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'Easy':
        return '#4CAF50';
      case 'Medium':
        return '#FF9800';
      case 'Hard':
        return '#F44336';
      case 'Extreme':
        return '#9C27B0';
      default:
        return theme.colors.text;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[globalStyles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[typography.body, { color: theme.colors.text, marginTop: 16 }]}>
          {t('stats.loading')}
        </Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[globalStyles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text style={[typography.h2, { color: theme.colors.text, textAlign: 'center', paddingHorizontal: 20 }]}>
          {error}
        </Text>
        <Pressable
          style={{
            marginTop: 24,
            backgroundColor: theme.colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 32,
            borderRadius: 8,
          }}
          onPress={() => loadStats()}
        >
          <Text style={[typography.button, { color: theme.colors.onPrimary }]}>
            {t('common.retry')}
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={[globalStyles.container, styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text style={[typography.body, { color: theme.colors.text }]}>
          {t('stats.noData')}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[globalStyles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Header */}
        {/* <View style={styles.header}>
          <Text style={[typography.h1, { color: theme.colors.text }]}>
            {t('stats.title')}
          </Text>
        </View> */}

        {/* Overview Cards */}
        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[typography.caption, { color: theme.colors.text }]}>
              {t('stats.totalPuzzles')}
            </Text>
            <Text style={[typography.h1, { color: theme.colors.primary }]}>
              {stats.totalPuzzlesSolved}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[typography.caption, { color: theme.colors.text }]}>
              {t('stats.highestScore')}
            </Text>
            <Text style={[typography.h1, { color: theme.colors.primary }]}>
              {stats.highestScore}
            </Text>
          </View>
        </View>

        <View style={styles.cardsRow}>
          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[typography.caption, { color: theme.colors.text }]}>
              {t('stats.totalPlayTime')}
            </Text>
            <Text style={[typography.h2, { color: theme.colors.text }]}>
              {stats.totalPlayTime}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
            <Text style={[typography.caption, { color: theme.colors.text}]}>
              {t('stats.dailyChallenges')}
            </Text>
            <Text style={[typography.h2, { color: theme.colors.text }]}>
              {stats.dailyChallengesSolved}
            </Text>
          </View>
        </View>

        {/* Streaks */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[typography.h3, { color: theme.colors.text, marginBottom: 16 }]}>
            {t('stats.streaks')}
          </Text>
          <View style={styles.streakRow}>
            <View style={styles.streakItem}>
              <Text style={[typography.body, { color: theme.colors.text }]}>
                {t('stats.current')}
              </Text>
              <Text style={[typography.h2, { color: '#4CAF50' }]}>
                {stats.currentStreak} {t('stats.days')}
              </Text>
            </View>
            <View style={styles.streakItem}>
              <Text style={[typography.body, { color: theme.colors.text }]}>
                {t('stats.longest')}
              </Text>
              <Text style={[typography.h2, { color: '#FF9800' }]}>
                {stats.longestStreak} {t('stats.days')}
              </Text>
            </View>
          </View>
        </View>

        {/* By Difficulty */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <Text style={[typography.h3, { color: theme.colors.text, marginBottom: 16 }]}>
            {t('stats.byDifficulty')}
          </Text>

          {(['Easy', 'Medium', 'Hard', 'Extreme'] as Difficulty[]).map((difficulty) => (
            <View key={difficulty} style={styles.difficultyRow}>
              <View style={styles.difficultyHeader}>
                <View
                  style={[
                    styles.difficultyIndicator,
                    { backgroundColor: getDifficultyColor(difficulty) }
                  ]}
                />
                <Text style={[typography.h4, { color: theme.colors.text, flex: 1 }]}>
                  {t(`difficulty.${difficulty.toLowerCase()}`)}
                </Text>
              </View>

              <View style={styles.difficultyStats}>
                <View style={styles.statItem}>
                  <Text style={[typography.caption, { color: theme.colors.text }]}>
                    {t('stats.solved')}
                  </Text>
                  <Text style={[typography.body, { color: theme.colors.text }]}>
                    {stats.solvedByDifficulty[difficulty]}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[typography.caption, { color: theme.colors.text }]}>
                    {t('stats.avgScore')}
                  </Text>
                  <Text style={[typography.body, { color: theme.colors.text }]}>
                    {stats.averageScoreByDifficulty[difficulty] || '--'}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={[typography.caption, { color: theme.colors.text }]}>
                    {t('stats.bestTime')}
                  </Text>
                  <Text style={[typography.body, { color: theme.colors.text }]}>
                    {stats.bestTimeByDifficulty[difficulty]}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Recent Games */}
        {stats.recentGames.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
            <Text style={[typography.h3, { color: theme.colors.text, marginBottom: 16 }]}>
              {t('stats.recentGames')}
            </Text>

            {stats.recentGames.slice(0, 5).map((game, index) => (
              <View key={game.id} style={styles.gameRow}>
                <View
                  style={[
                    styles.gameDot,
                    { backgroundColor: getDifficultyColor(game.difficulty) }
                  ]}
                />
                <View style={styles.gameInfo}>
                  <Text style={[typography.body, { color: theme.colors.text }]}>
                    {t(`difficulty.${game.difficulty.toLowerCase()}`)}
                  </Text>
                  <Text style={[typography.caption, { color: theme.colors.text }]}>
                    {new Date(game.created).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.gameStats}>
                  <Text style={[typography.body, { color: theme.colors.primary }]}>
                    {game.score}
                  </Text>
                  <Text style={[typography.caption, { color: theme.colors.text }]}>
                    {game.time}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 10,
    width: '90%',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
    minWidth: '90%',
  },
  card: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    minHeight: 80,
    minWidth: 80,
  },
  section: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 24,
  },
  streakItem: {
    alignItems: 'center',
    flex: 1,
  },
  difficultyRow: {
    marginBottom: 20,
  },
  difficultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  difficultyIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: 12,
  },
  difficultyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 16,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  gameDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameStats: {
    alignItems: 'flex-end',
  },
});

export default StatsScreen;
