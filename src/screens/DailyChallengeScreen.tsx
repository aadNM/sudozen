/** /src/screens/DailyChallengeScreen.tsx */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert, Vibration, TouchableOpacity } from 'react-native';
import { useGlobalStyles } from '../styles/Global.styles';
import { StackNavigationProp } from '@react-navigation/stack';
import { Difficulty, RootStackParamList } from '../types/GameTypes';
import { getDailyPuzzle } from '../services/PuzzleService';
import storage from "../utils/mmkvStorage";
import { useTypography } from '../styles/Typography';
import { useTheme } from '../context/ThemeContext';
import { logMessage } from '../utils/Logger';
import { useTranslation } from 'react-i18next';
import AnimatedOverlay from '../components/AnimatedOverlay';
import { useGameScreenStyles } from '../styles/GameScreen.styles';
import { SudokuBanner } from '../hooks/ads/Banner';

type PuzzleData = {
  board: number[][];
  solution: number[][];
  difficulty: Difficulty;
  id?: string;
  hash?: string;
};

const dailyDifficulties: Difficulty[] = ['Medium', 'Hard', 'Extreme'];

type DailyChallengeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Daily Challenge'>;
};

const DailyChallengeScreen: React.FC<DailyChallengeScreenProps> = ({ navigation }) => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const globalStyles = useGlobalStyles();
  const typography = useTypography();
  const gameScStyles = useGameScreenStyles();
  const { t } = useTranslation();

  const styles = StyleSheet.create({
    difficulty: {
      ...typography.title,
      marginBottom: 20,
      color: theme.colors.tertiary,
    },
    description: {
      ...typography.body,
      marginTop: 20,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    loadingText: {
      ...typography.body,
      marginTop: 20,
      color: theme.colors.text,
    },
    errorText: {
      ...typography.error,
      marginBottom: 20,
      color: theme.colors.error,
    },
    challengeButton: {
      backgroundColor: theme.colors.tertiary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 2,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      marginVertical: 8,
    },
    
    challengeButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onTertiary,
      textAlign: 'center',
    },
  });

  const loadPuzzle = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Pick the difficulty from the date so every player gets the same daily puzzle
      const today = new Date().toISOString().split('T')[0];
      const dayNumber = Math.floor(new Date(today).getTime() / 86400000);
      const dailyDifficulty = dailyDifficulties[dayNumber % dailyDifficulties.length];
      const dailyPuzzle = await getDailyPuzzle(storage.getString('player_id'), dailyDifficulty);

      if (!dailyPuzzle) {
        throw new Error('Failed to generate puzzle');
      }

      setPuzzleData({
        board: dailyPuzzle.board,
        solution: dailyPuzzle.solution || [],
        difficulty: dailyPuzzle.difficulty,
        id: dailyPuzzle.id,
        hash: dailyPuzzle.hash
      });
    } catch (err) {
      logMessage('error', 'Error loading daily puzzle:',{ error: String(err)});
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date().toDateString();
    const lastChallengeDate = storage.getString('lastChallengeDate');

    if (lastChallengeDate === today) {
      return Alert.alert(
        t('dailyChallenge.alreadyCompletedTitle'),
        t('dailyChallenge.alreadyCompletedMessage'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );  
    }else {
    loadPuzzle();
    }
  }, []);

  const startDailyChallenge = () => {
    if (!puzzleData) {
      Alert.alert('Error', t('dailyChallenge.noPuzzle'));
      return;
    }

    storage.set('isDailyChallenge', true);
    storage.set('isNewDailyChallenge', true);
    storage.set('dailyChallengeDifficulty', puzzleData.difficulty);
    storage.setJSON('dailyChallengePuzzle', puzzleData);
    Vibration.vibrate(100);

    navigation.navigate('Game', {
      puzzle: puzzleData.board,
      isDailyChallenge: true,
      difficulty: puzzleData.difficulty as Difficulty
    });
  };

  if (isLoading) {
    return (
      <View style={globalStyles.container}>
        <AnimatedOverlay
          visible={true}
          source={require('../assets/animations/loading.json')}
          onFinish={() => {}}
        >
          <View style={gameScStyles.loadingContainer}>
            <Text style={gameScStyles.loadingText}>{t('game.loading')}</Text>
          </View>
        </AnimatedOverlay>
      </View>
    );
  }

  if (error) {
    return (
      <View style={globalStyles.container}>
        <Text style={styles.errorText}>{t('dailyChallenge.error', { error })}</Text>
        <Button
          title={t('dailyChallenge.tryAgain')}
          color={theme.colors.tertiary}
          onPress={() => {
            setError(null);
            setIsLoading(true);
            setPuzzleData(null);
            loadPuzzle();
          }}
        />
      </View>
    );
  }

  if (!puzzleData) {
    return (
      <View style={globalStyles.container}>
        <Text style={styles.errorText}>{t('dailyChallenge.noPuzzle')}</Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <Text style={styles.difficulty}>
        {t('dailyChallenge.difficulty', { difficulty: puzzleData.difficulty })}
      </Text>

      <TouchableOpacity
        style={styles.challengeButton}
        onPress={startDailyChallenge}
      >
        <Text style={styles.challengeButtonText}>{t('dailyChallenge.startChallenge')}</Text>
      </TouchableOpacity>

      <Text style={styles.description}>
        {t('dailyChallenge.description')}
      </Text>

      <SudokuBanner />
    </View>
  );
};

export default DailyChallengeScreen;