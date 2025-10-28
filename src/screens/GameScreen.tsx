/** src/screens/GameScreen.tsx */

import { CommonActions, useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, AppState, AppStateStatus, BackHandler, Modal, Text, TouchableOpacity, Vibration, View } from "react-native";
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AnimatedOverlay from "../components/AnimatedOverlay";
import GameBoard from "../components/GameBoard";
import HintModal from "../components/HintModal";
import { useEndGameInterstitial } from "../hooks/ads/Interstitial";
import { useRewardedAd } from "../hooks/ads/RewardedAd";
import GameStateService from "../services/GameStateService";
import { clearPuzzleCaches, getPuzzle, saveScore, updatePlayerSolvedPuzzles } from "../services/PuzzleService";
import { getRelevantHint } from "../services/StrategyService";
import { useGameScreenStyles } from "../styles/GameScreen.styles";
import { useGlobalStyles } from "../styles/Global.styles";
import { Difficulty, GameState, getMaxChecks, getMaxHints, GRID_SIZE, HintModalState, MAX_TIME_MINUTES, SavedGameData } from "../types/GameTypes";
import { logMessage } from "../utils/Logger";
import storage from "../utils/mmkvStorage";
import { generateSudoku } from "../utils/SudokuUtils";



const difficulties: Difficulty[] = ["Easy", "Medium", "Hard", "Extreme"];

const GameScreen = () => {
  const navigation = useNavigation();
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [board, setBoard] = useState<number[][]>([]);
  const [initialBoard, setInitialBoard] = useState<number[][]>([]);
  const [running, setRunning] = useState(true);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPuzzleId, setCurrentPuzzleId] = useState<string | null>(null);
  const [currentPuzzleHash, setCurrentPuzzleHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  // Score Details
  const [completionScore, setCompletionScore] = useState(0);
  const [completionTime, setCompletionTime] = useState('');
  const [streaks, setStreaks] = useState(0);
  const [streakBonus, setStreakBonus] = useState(0);
  const [timeBonus, setTimeBonus] = useState(0);
  const [zeroHelpBonus, setZeroHelpBonus] = useState(0);
  const [challengeBonus, setChallengeBonus] = useState(0);

  // Ads & Rewards
  const [extraHints, setExtraHints] = useState(0);
  const [extraChecks, setExtraChecks] = useState(0);

  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [isAppActive, setIsAppActive] = useState(true);
  const [checksUsed, setChecksUsed] = useState<Record<number, number>>(
    Array.from({length: 9}, (_, i) => i)
      .reduce((acc, index) => ({ ...acc, [index]: 0 }), {} as Record<number, number>)
  );
  const [notes, setNotes] = useState("");
  const [hintModal, setHintModal] = useState<HintModalState>({
    visible: false,
    message: '',
    position: { row: 0, col: 0 },
    value: 0
  });
  const gameScStyles = useGameScreenStyles();
  const globalStyles = useGlobalStyles();

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isGameEnding = useRef(false);
  const { t } = useTranslation();

  const translatedDifficulties = [
    { key: "Easy", label: t('settings.difficulties.easy') },
    { key: "Medium", label: t('settings.difficulties.medium') },
    { key: "Hard", label: t('settings.difficulties.hard') },
    { key: "Extreme", label: t('settings.difficulties.extreme') }
  ];

  const { showInterstitial } = useEndGameInterstitial();

  const { showRewarded: showRewardedHints, isLoaded: hintsAdLoaded, isLoading: hintsAdLoading } = useRewardedAd(1, (reward) => {
    setExtraHints(prev => prev + 2);
    Vibration.vibrate(100);
    Alert.alert(
      t('game.hint.rewardReceived'),
      t('game.hint.extraHintsReceived'),
      [{ text: t('common.ok') }]
    );
  });

  const { showRewarded: showRewardedChecks, isLoaded: checksAdLoaded, isLoading: checksAdLoading } = useRewardedAd(2, (reward) => {
    setExtraChecks(prev => prev + 1);
    Vibration.vibrate(100);
    Alert.alert(
      t('game.check.rewardReceived'),
      t('game.check.extraChecksReceived'),
      [{ text: t('common.ok') }]
    );
  });

  const ScoreItem = ({ label, value, detail } :
    { label: string; value: number | string; detail?: string }
  ) => (
    <View style={gameScStyles.scoreItem}>
      <View style={gameScStyles.scoreItemLeft}>
        <Text style={gameScStyles.scoreLabel}>{label}</Text>
        {detail && <Text style={gameScStyles.scoreDetail}>{detail}</Text>}
      </View>
      <Text style={gameScStyles.scoreValue}>+{value}</Text>
    </View>
  );

  const gameState: GameState = React.useMemo(() => ({
    board,
    initialBoard,
    difficulty: difficulty!,
    totalSeconds,
    hintsUsed,
    currentPuzzleId,
    checksUsed,
    notes,
    extraHints,
    extraChecks
  }), [board, initialBoard, difficulty, totalSeconds, hintsUsed, currentPuzzleId, checksUsed, notes, extraHints, extraChecks]);

  const selectDifficulty = () => {
    setModalVisible(true);
  };

  const changeDifficulty = async (level: Difficulty) => {
    await storage.set("sudokuDifficulty", level);
    setDifficulty(level);
    if (level === 'Hard' || level === 'Extreme') {
      storage.set('rowColHighlight', false);
    }
    resetGame(level);
    Vibration.vibrate(80);
    setModalVisible(false);
  };

  const resetGame = async (newDifficulty: Difficulty) => {
    isGameEnding.current = false;
    setIsLoading(true);

    try {
      setIsTimeExpired(false);
      setNotes("");
      const userId = await storage.getString('player_id') || 'guest';
      const { board, id, hash, solution } = await getPuzzle(newDifficulty, userId);
      
      if (!board || board.length !== GRID_SIZE) {
        throw new Error('Invalid puzzle generated');
      }
      
      setBoard(board);
      setInitialBoard(board.map(row => [...row]));
      setCurrentPuzzleId(id || null);
      setCurrentPuzzleHash(hash || null);
      setTotalSeconds(0);
      setHintsUsed(0);
      storage.setJSON('current_solution', solution);
      storage.set('hasActiveGame', true);
      setExtraChecks(0);
      setExtraHints(0);
      setRunning(true);
      setIsAppActive(true);
    } catch (error) {
      logMessage('error', 'Puzzle loading failed:', { error: String(error)});
      Alert.alert('Error', 'Failed to load puzzle. Please try again.');
      // Emergency fallback
      const fallbackBoard = generateSudoku(newDifficulty, 'fallback');
      setBoard(fallbackBoard);
      setInitialBoard(fallbackBoard.map(row => [...row]));
    } finally {
      setIsLoading(false);
    }
  };

  // Timer 
  useEffect(() => {
    if (!running || !difficulty || !isAppActive) return; 

    const maxSeconds = MAX_TIME_MINUTES[difficulty] * 60;
    const interval = setInterval(() => {
      setTotalSeconds((prev) => {
        const newTotal = prev + 1;

        if (newTotal >= maxSeconds) {
          clearInterval(interval);
          handleTimeExpired();
          return prev;
        }

        return newTotal;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running, difficulty, isAppActive]); 

  const stopTimer = () => setRunning(false);

  const handleTimeExpired = () => {
    setIsTimeExpired(true);
    stopTimer();
    Alert.alert(
      t('game.timeExpired'),
      t('game.timeExpiredMessage', { 
        minutes: MAX_TIME_MINUTES[difficulty!], 
        difficulty 
      }),
      [{
        text: t('common.ok'),
        onPress: () => endGame()
      }]
    );
  }

//HINTS
  const getHint = async () => {
    if (!difficulty) return;
    
    const totalHints = getMaxHints(difficulty) + extraHints;
    if (hintsUsed >= totalHints) {
      Vibration.vibrate(200); 
      showHintLimitReached();
      return;
    }

    try {
      const hint = await getRelevantHint(board, difficulty);
      
      if (hint.position && hint.value) {
        setHintModal({
          visible: true,
          message: hint.strategy.description,
          position: hint.position,
          value: hint.value,
          strategy: hint.strategy
        });
        setHintsUsed(hintsUsed + 1);
      } else {
        Alert.alert(
          `Hint: ${hint.strategy.title}`, 
          hint.strategy.description,
          [{ text: "OK", onPress: () => {
            setHintsUsed(prev => prev + 1);
          }}]
        );
      }
    } catch (error) {
      logMessage('error', 'Hint error:', { error: String(error)});
      Vibration.vibrate(200);
      Alert.alert(t('game.hint.title'), t('game.hint.defaultHint'));
    }
  };

  const handleAcceptHint = () => {
    if (!hintModal.visible) return;

    Vibration.vibrate(80);
    // Fill the cell with the hinted value
    const newBoard = [...board];
    newBoard[hintModal.position.row][hintModal.position.col] = hintModal.value;
    setBoard(newBoard);
    
    // Track usage and close modal
    setHintsUsed(hintsUsed + 1);
    setHintModal({ ...hintModal, visible: false });
  };

  const showHintLimitReached = () => {
    Vibration.vibrate(200);
     const totalHints = getMaxHints(difficulty!) + extraHints;

    Alert.alert(
      t('game.hint.noMoreHints'),
      t('game.hint.noMoreHintsMessage', { 
        maxHints: totalHints, 
        difficulty 
      }),
      [
        {
          text: t('game.hint.watchAd'),
          onPress: () => {
            showRewardedHints();
          }
        },
        {
          text: t('common.ok')
        }
      ]
    );
  };

  const calculateScore = (): number => {
    const BASE_SCORE = {
      Easy: 1000,
      Medium: 2500,
      Hard: 5000,
      Extreme: 10000
    }[difficulty || "Medium"];

    const totalSeconds = minutes * 60 + seconds;
    
    // Time penalty (capped at 50% of base score)
    const maxTimePenalty = BASE_SCORE * 0.5;
    const timePenalty = Math.min(
      maxTimePenalty,
      totalSeconds * {
        Easy: 1,    
        Medium: 1.5,  
        Hard: 2.4,    
        Extreme: 2.7
      }[difficulty || "Medium"]
    );

    const maxHints = getMaxHints(difficulty as Difficulty);
    const hintPenalty = BASE_SCORE * 0.2 * Math.pow(hintsUsed / maxHints, 2);

    const totalChecks = Object.values(checksUsed).reduce((a, b) => a + b, 0);
    const maxChecks = getMaxChecks(difficulty as Difficulty) * 9; // Max per number
    const checkPenalty = BASE_SCORE * 0.15 * (totalChecks / maxChecks);

    let rawScore = BASE_SCORE - timePenalty - hintPenalty - checkPenalty;

    // Apply bonuses
    // Perfect game bonus (no hints/checks)
    if (hintsUsed === 0 && totalChecks === 0) {
      setZeroHelpBonus(BASE_SCORE * 0.10);
      rawScore += BASE_SCORE * 0.10;
    }

    // Time bonus for fast completion
    const parTime = {
      Easy: 5 * 60,   
      Medium: 10 * 60,  
      Hard: 20 * 60,    
      Extreme: 20 * 60 
    }[difficulty || "Medium"];
    
    if (totalSeconds <= parTime * 1.1) {
      const timeBonus = (1 - totalSeconds/parTime) * BASE_SCORE * 0.1;
      setTimeBonus(timeBonus);
      rawScore += timeBonus;
    }

    // Ensure minimum score
    return Math.max(100, Math.floor(rawScore));
  };

  const scoreBonus = (score: number) => {
    const today = new Date().toDateString();
    const lastPlayed = new Date(storage.getString('last_played_date') || '').toDateString();

    let streakDays = storage.getNumber('current_streak') || 1;

    if (streakDays > 7) {
      streakDays = 1;
      storage.set('current_streak', streakDays);
    } 
    setStreaks(streakDays);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const wasYesterday = lastPlayed === yesterday.toDateString();

    if (lastPlayed === today) {
    } else if (wasYesterday) {
      streakDays++;
    } else {
      streakDays = 1;
    }

    let currentScore = score;

    // Apply streak bonus (max 15%)
    if (streakDays > 1) {
      const streakBonus = Math.min(0.15, streakDays * (difficulty === "Extreme" ? 0.06 : 0.05));
      currentScore = Math.floor(currentScore * (1 + streakBonus));
      setStreakBonus(currentScore - score);
    }

    // Save updated streak and date
    storage.set('current_streak', streakDays);
    storage.set('last_played_date', today);

    const finalScore = storage.getBoolean('isDailyChallenge')
      ? Math.floor(currentScore * 1.5)
      : currentScore;

    storage.getBoolean('isDailyChallenge')? 
      setChallengeBonus((currentScore * 1.5) - currentScore)
      : setChallengeBonus(0);

    return finalScore;
  };

  
  const handleGameComplete = async () => {
    isGameEnding.current = true;
    setIsTimeExpired(false);
    stopTimer();
    const score = scoreBonus(calculateScore());
    const playerId = storage.getString('player_id');
    const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const isDailyChallenge = storage.getBoolean('isDailyChallenge');

    Vibration.vibrate([500, 200, 500]);
    setTimeout(() => {
      showInterstitial();
    }, 1000);
    
    try {
      
      try { 
        // Save score with puzzle reference
        await saveScore({
          player_id: playerId || "anonymous",
          score,
          difficulty: difficulty || 'Medium',
          time: timeStr,
          puzzle_id: currentPuzzleId
        });
      } catch (error) {
        logMessage('error', "Failed to update score: ", { error: String(error)});
      }

      // Update player's solved puzzles if logged in and puzzle has ID
      if (playerId && playerId !== 'guest' && currentPuzzleId) {
        try {
          await updatePlayerSolvedPuzzles(
            playerId,
            currentPuzzleId,
            currentPuzzleHash || undefined,
            isDailyChallenge
          );

        } catch (updateError) {
          logMessage('error', "Failed to update solved puzzles:", { error: String(updateError)});
        }
      }

      if (isDailyChallenge) {
        storage.set('lastChallengeDate', new Date().toDateString());
      }

      setCompletionScore(score);
      setCompletionTime(timeStr);
      setShowCelebration(true);
      
    } catch (error) {
      logMessage('error', "Failed to save completion:", { error: String(error)});
      setCompletionScore(score);
      setCompletionTime(timeStr);
      setShowCelebration(true);
    }
  };

  // Load saved game state on mount
  useEffect(() => {
    const loadGameState = async () => {
      isGameEnding.current = false;
      setIsLoading(true);
      
      try {
        const savedState = GameStateService.load();
        const isNewDailyChallenge = storage.getBoolean('isNewDailyChallenge');

        if (isNewDailyChallenge) {
          storage.delete('isNewDailyChallenge');
        }
            
        if (savedState && storage.getBoolean('hasActiveGame') && !isNewDailyChallenge) {
          await resumedGame(savedState);
        } else {
          await freshStart();
        }
      } catch (error) {
        logMessage('error', "Game initialization failed:", { error: String(error)});
        // Fallback to default medium difficulty
        await resetGame('Medium');
      } finally {
        setIsLoading(false); 
      }
    };
    
    loadGameState();
  }, []);

  const getRestoredTotalSeconds = (savedState: SavedGameData): number => {
    const base =
      savedState.totalSeconds !== undefined
        ? savedState.totalSeconds
        : (savedState.minutes || 0) * 60 + (savedState.seconds || 0);

    return base;
  };

  const resumedGame = async (savedState: SavedGameData) => {
    isGameEnding.current = false;
    storage.set('hasActiveGame', true);
    if (!savedState.board) {
      throw new Error("No board in saved state");
    }
    setBoard(savedState.board);

    setInitialBoard(
      savedState.initialBoard ?? savedState.board.map(row => [...row])
    );

    if (!savedState.difficulty) {
      throw new Error("No difficulty in saved state");
    }
    setDifficulty(savedState.difficulty as Difficulty);

    setHintsUsed(savedState.hintsUsed ?? 0);
    setCurrentPuzzleId(savedState.currentPuzzleId ?? null);

    setChecksUsed(
      savedState.checksUsed ?? 
      Array.from({ length: 9 }, (_, i) => i).reduce(
        (acc, index) => ({ ...acc, [index]: 0 }),
        {} as Record<number, number>
      )
    );

    setNotes(savedState.notes ?? "");
    setExtraHints(savedState.extraHints ?? 0);
    setExtraChecks(savedState.extraChecks ?? 0);
    setRunning(true);
    setIsAppActive(true);

    setTotalSeconds(getRestoredTotalSeconds(savedState));
  };

  const freshStart = async () => {
    isGameEnding.current = false;
    storage.set('hasActiveGame', true);
    setIsTimeExpired(false);
    
    const dailyChallengeDifficulty = storage.getString('dailyChallengeDifficulty');
    const isDailyChallenge = storage.getBoolean('isDailyChallenge');
      
    if (isDailyChallenge && dailyChallengeDifficulty) {
      setDifficulty(dailyChallengeDifficulty as Difficulty);
      resetGame(dailyChallengeDifficulty as Difficulty);
      return;
    }

    const savedDifficulty = await storage.getString("sudokuDifficulty");
    if (savedDifficulty && difficulties.includes(savedDifficulty as Difficulty)) {
      setDifficulty(savedDifficulty as Difficulty);
      resetGame(savedDifficulty as Difficulty);
    } else {
      selectDifficulty();
    }
  };

  //end game handler
  const handleEndGame = () => {
    setIsTimeExpired(false);
    Vibration.vibrate(80);
    Alert.alert(
      t('game.endGame'),
      t('game.endGameConfirm'),
      [
        { text: t('common.cancel'), 
          style: "cancel" },
        { 
          text: t('common.confirm'), 
          onPress: () => {
            // setBoard(empty);
            isGameEnding.current = true;
            stopTimer();
            setRunning(false);
            storage.delete('hasActiveGame');
            storage.delete('savedGameState');
            GameStateService.clear();
            clearPuzzleCaches();
            setIsAppActive(false);

            navigation.goBack();
          }
        }
      ]
    );
  };

  const endGame = () => {
    isGameEnding.current = true;
    stopTimer();
    setRunning(false);

    // setBoard(empty);
    storage.delete('hasActiveGame');
    storage.delete('savedGameState');
    GameStateService.clear();
    clearPuzzleCaches();
    setIsAppActive(false);

    navigation.goBack();    
  }

  // App State Management Effect
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        setIsAppActive(true);
      } else if (nextAppState.match(/inactive|background/)) {
        setIsAppActive(false);
        
        // Save game state when app goes to background
        if (difficulty && board.length > 0) {
          GameStateService.save({
            ...gameState,
            timestamp: Date.now()
          });
        }
      }
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, [appState, gameState, difficulty, board]);

  // Navigation Focus Management
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      setIsAppActive(true);
      logMessage('info', 'Screen focused - timer can resume');
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsAppActive(false);
      logMessage('info', 'Screen blurred - timer paused');
      
      // Save state when navigating away
      if (difficulty && board.length > 0) {
        GameStateService.save({
          ...gameState,
          timestamp: Date.now()
        });
      }
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation, gameState, difficulty, board]);
  
  // Back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        GameStateService.save({
          ...gameState,
          timestamp: Date.now()
        });
        navigation.dispatch(CommonActions.goBack());
        return true;
      }
    );
    return () => backHandler.remove();
  }, [gameState]);

  // hook for debounced saving
  useEffect(() => {
    if (!difficulty || board.length === 0 || !isAppActive || !running || isGameEnding.current) {
      return;
    }

    const saveTimer = setTimeout(() => {
      if (!isGameEnding.current && isAppActive && difficulty && board.length > 0) {
        GameStateService.save({
          ...gameState,
          timestamp: Date.now()
        });
      }
    }, 500);
  

    return () => clearTimeout(saveTimer);
  }, [board, difficulty, totalSeconds, hintsUsed, currentPuzzleId, checksUsed, isAppActive, running]);

  

  return (
      <KeyboardAwareScrollView
        contentContainerStyle={globalStyles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={100} // Extra space above keyboard
        extraHeight={50}
      >
        <View style={globalStyles.container}>
          {isLoading ? (
            <AnimatedOverlay
              visible={true}
              source={require('../assets/animations/loading.json')}
              onFinish={() => {}}
            >
              <View style={gameScStyles.loadingContainer}>
                <Text style={gameScStyles.loadingText}>{t('game.loading')}</Text>
              </View>
            </AnimatedOverlay>
          ) : (
            <>
              {difficulty && board.length > 0 ? (
                <>
                <Text style={[
                  gameScStyles.timer,
                  difficulty && !isTimeExpired && minutes >= MAX_TIME_MINUTES[difficulty] - 1 && gameScStyles.timerWarning
                ]}>
                  {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                </Text>
               
                <GameBoard 
                  board={board}
                  initialBoard={initialBoard} 
                  difficulty={difficulty} 
                  setBoard={setBoard} 
                  onComplete={handleGameComplete}
                  onChangeDifficulty={selectDifficulty}
                  onGetHint={getHint}
                  onEndGame={handleEndGame}
                  checksUsed={checksUsed}
                  setChecksUsed={setChecksUsed}
                  notes={notes}
                  setNotes={setNotes}
                  extraChecks={extraChecks}
                  showRewardedChecks={showRewardedChecks}
                />
                </>
              ) : (
                <AnimatedOverlay
                  visible={true}
                  source={require('../assets/animations/loading.json')}
                  onFinish={() => {}}
                >
                  <View style={gameScStyles.loadingContainer}>
                    <Text style={gameScStyles.loadingText}>{t('game.loading')}</Text>
                  </View>
                </AnimatedOverlay>
              )}
            </>
          )}

          {/* Modal for difficulty selection */}
          <Modal
            transparent={true}
            animationType="fade"
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={globalStyles.modalOverlay}>
              <View style={globalStyles.modalContent}>
                <Text style={globalStyles.modalTitle}>{t('settings.selectDifficulty')}</Text>
                {translatedDifficulties.map((level) => (
                  <TouchableOpacity
                    key={level.key}
                    style={globalStyles.modalButton}
                    onPress={() => changeDifficulty(level.key as Difficulty)}
                  >
                    <Text style={globalStyles.buttonText}>{level.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={globalStyles.modalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={globalStyles.buttonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <>
          {/* Modal for Hints */}
          <HintModal
              visible={hintModal.visible}
              message={hintModal.message}
              position={hintModal.position}
              value={hintModal.value}
              onAccept={handleAcceptHint}
              onClose={() => setHintModal({ ...hintModal, visible: false })}
            />
          </>

          {/* Celebration Animation */}
          <AnimatedOverlay
            visible= {showCelebration}
            source={require('../assets/animations/fireworks.json')}
            onFinish={() => {}}
          >
            <View style={gameScStyles.celebMessageBox}>
              <Text style={gameScStyles.celebTitle}>{t('game.completion.title')}</Text>
              
              {/* Score Breakdown */}
              <View style={gameScStyles.scoreBreakdown}>
                <ScoreItem
                  label={t('game.completion.challengeBonusLabel')}
                  value={challengeBonus.toFixed(2)}
                />
                <ScoreItem
                  label={t('game.completion.streaksBonusLabel')}
                  value={streakBonus.toFixed(2)}
                  detail={`${t('game.completion.streaks')} ${streaks} `}
                />
                <ScoreItem
                  label={t('game.completion.timeBonusLabel')}
                  value={timeBonus.toFixed(2)}
                />
                <ScoreItem
                  label={t('game.completion.zeroHelpBonusLabel')}
                  value={zeroHelpBonus.toFixed(2)}
                />
              </View>

              {/* Divider */}
              <View style={gameScStyles.celebDivider} />

              {/* Total Score & Time */}
              <View style={gameScStyles.celebTotals}>
                <Text style={gameScStyles.celebTextTotal}>
                  {t('game.completion.score', { score: completionScore})}
                </Text>
                <Text style={gameScStyles.celebTime}>
                  {t('game.completion.time', { time: completionTime })}
                </Text>
              </View>

              <TouchableOpacity
                style={gameScStyles.celebCloseButton}
                onPress={() => {
                  setShowCelebration(false);
                  isGameEnding.current = true;
                  endGame();
                }}
              >
                <Text style={gameScStyles.celebCloseButtonText}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </AnimatedOverlay>
        </View>
      </KeyboardAwareScrollView>  
  );
};

export default GameScreen;