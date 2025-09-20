/** src/screens/LeaderboardScreen.tsx */

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { useGlobalStyles } from "../styles/Global.styles";
import { CACHE_TTL, Difficulty } from "../types/GameTypes";
import { getLeaderboard } from "../services/PuzzleService";
import { useTheme } from "../context/ThemeContext";
import { useTypography } from "../styles/Typography";
import { logMessage } from "../utils/Logger";
import { useTranslation } from "react-i18next";
import { t } from "i18next";
import AnimatedOverlay from "../components/AnimatedOverlay";
import { useGameScreenStyles } from "../styles/GameScreen.styles";
import { SudokuBanner } from "../hooks/ads/Banner";

type ScoreEntry = {
  id: string;
  player: string;
  score: number;
  difficulty: Difficulty;
  time: string;
  date: string;
  country: string;
  localDate?: string;
};

type TimeRange = "daily" | "weekly" | "monthly" | "all-time";

const difficulties: Difficulty[] = ["Easy", "Medium", "Hard", "Extreme"];
const timeRanges: TimeRange[] = ["daily", "weekly", "monthly", "all-time"];

const getRangeLabel = (range: TimeRange): string => {
  return t(`leaderboard.timeRanges.${range.replace('-', '')}`);
};

const LeaderboardScreen = () => {
  const { theme } = useTheme();
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>("Easy");
  const [selectedRange, setSelectedRange] = useState<TimeRange>("daily");
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const globalStyles = useGlobalStyles();
  const typography = useTypography();
  const { t } = useTranslation();
  const gameScStyles = useGameScreenStyles();

  const translatedDifficulties = [
    { key: "Easy", label: t('settings.difficulties.easy') },
    { key: "Medium", label: t('settings.difficulties.medium') },
    { key: "Hard", label: t('settings.difficulties.hard') },
    { key: "Extreme", label: t('settings.difficulties.extreme') }
  ];

  const getDifficultyLabel = (difficultyKey: string) => {
    const difficultyObj = translatedDifficulties.find(d => d.key === difficultyKey);
    return difficultyObj?.label || difficultyKey;
  };
  
  const styles = {
    difficultyTab: (isActive: boolean): ViewStyle => ({
      marginHorizontal: 5,
      padding: 8,
      backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
      borderRadius: 5,
    }),
    timeRangeTab: (isActive: boolean): ViewStyle => ({
      marginHorizontal: 5,
      padding: 6,
      backgroundColor: isActive ? theme.colors.tertiary : theme.colors.surface,
      borderRadius: 5,
    }),
    tabText: (isActive: boolean): TextStyle => ({
      color: isActive ? theme.colors.onPrimary : theme.colors.text,
    }),
    scoreItem: StyleSheet.create({
      container: {
        padding: 10,
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.secondary,
      } as ViewStyle,
    }),
    scoreText: StyleSheet.create({
      text: {
        color: theme.colors.text,
      } as TextStyle,
    }),
    emptyText: StyleSheet.create({
      text: {
        ...typography.body,
        textAlign: 'center' as const,
        marginTop: 20,
      } as TextStyle,
    }),
    headerText: {
      ...typography.title,
      textAlign: 'center',
      marginVertical: 10,
      color: theme.colors.text,
    } as TextStyle,
  };

  useEffect(() => {
    fetchScores();
  }, [selectedDifficulty, selectedRange]);

  // Timezone-aware date filtering
  const getDateRangeFilter = (range: TimeRange): string => {
    const now = new Date();

    const localMidnightStart = new Date(now);
    localMidnightStart.setHours(0, 0, 0, 0);

    switch (range) {
      case "daily":
        const yesterdayMidnight = new Date(localMidnightStart);
        yesterdayMidnight.setDate(yesterdayMidnight.getDate() - 1);

        const tomorrowMidnight = new Date(localMidnightStart);
        tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);

        const start = yesterdayMidnight.toISOString();
        const end = tomorrowMidnight.toISOString();

        return `created >= '${start}' && created < '${end}'`;
        
      case "weekly": {
        const weeklyStart = new Date(localMidnightStart);
        weeklyStart.setDate(localMidnightStart.getDate() - 6);
        return `created >= '${weeklyStart.toISOString()}'`;
      }

      case "monthly": {
        const monthlyStart = new Date(localMidnightStart);
        monthlyStart.setDate(1);
        return `created >= '${monthlyStart.toISOString()}'`;
      }

      default:
        return '';
    }
  };

  const fetchScores = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateRangeFilter(selectedRange);
      const filter = [
        `difficulty = '${selectedDifficulty}'`,
        dateFilter
      ].filter(Boolean).join(' && ');

      const allScores = await getLeaderboard(50, 1, '-score,-updated', filter);
      
      const timezoneOffset = new Date().getTimezoneOffset() * 60000;
      const mappedScores: ScoreEntry[] = allScores.items.map((entry) => ({
        id: entry.id,
        player: entry.expand?.player_id?.username ?? 'Anonymous',
        country: entry.expand?.player_id?.country ?? '',
        score: entry.score,
        difficulty: entry.difficulty,
        time: entry.time,
        date: entry.date,
        localDate: new Date(new Date(entry.date).getTime() - timezoneOffset).toLocaleString(),
      }));

      setScores(mappedScores.slice(0, 20));
    } catch (error) {
      logMessage('error', "Failed to load leaderboard", { error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const getFlagEmoji = (countryCode: string): string => {
    if (!countryCode) return '';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  const renderScore = ({ item, index }: { item: ScoreEntry; index: number }) => (
    <View style={styles.scoreItem.container}>
      <Text style={styles.scoreText.text}>
        {index + 1}. {getFlagEmoji(item.country)} {item.player} - {item.score} pts
      </Text>
      <Text style={styles.scoreText.text}>  {item.time}</Text>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      {/* Difficulty Tabs */}
      <View style={{ flexDirection: 'row' as const, marginVertical: 10 }}>
        {difficulties.map((diff) => (
          <TouchableOpacity
            key={diff}
            onPress={() => setSelectedDifficulty(diff)}
            style={styles.difficultyTab(selectedDifficulty === diff)}
          >
            <Text style={styles.tabText(selectedDifficulty === diff)}>{getDifficultyLabel(diff)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Time Range Filters */}
      <View style={{ flexDirection: 'row' as const, marginBottom: 10 }}>
        {timeRanges.map((range) => (
          <TouchableOpacity
            key={range}
            onPress={() => setSelectedRange(range)}
            style={styles.timeRangeTab(selectedRange === range)}
          >
            <Text style={styles.tabText(selectedRange === range)}>
              {getRangeLabel(range)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scores */}
      <AnimatedOverlay
        visible={loading}
        source={require('../assets/animations/loading.json')}
        onFinish={() => {}}
      >
        <View style={gameScStyles.loadingContainer}>
          <Text style={gameScStyles.loadingText}>{t('game.loading')}</Text>
        </View>
      </AnimatedOverlay>

      {!loading && (
        scores.length === 0 ? (
          <Text style={styles.emptyText.text}>
            {t('leaderboard.noScores', {
              difficulty: selectedDifficulty.toLowerCase(),
              timeRange: getRangeLabel(selectedRange).toLowerCase()
            })}
          </Text>
        ) : (
          <FlatList
            data={scores}
            keyExtractor={(item) => item.id}
            renderItem={renderScore}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )
      )}

      <SudokuBanner />
    </View>
  );
};

export default LeaderboardScreen;