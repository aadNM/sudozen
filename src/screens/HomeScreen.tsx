/** /src/screens/HomeScreen.tsx */

import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ImageBackground, Linking, Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { Button } from "react-native-paper";
import { useTheme } from "../context/ThemeContext";
import { SudokuBanner } from "../hooks/ads/Banner";
import GameStateService from "../services/GameStateService";
import { GuestUserService } from "../services/GuestUserService";
import { useGlobalStyles } from "../styles/Global.styles";
import { useTypography } from "../styles/Typography";
import { RootStackParamList } from "../types/GameTypes";
import { triggerGuestUpgrade } from "../utils/GuestUpgradeUtils";
import storage from "../utils/mmkvStorage";

const LEARN = "https://conquerdaily.com/mastering-sudoku-complete-tutorial-sudozen/";


const HomeScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hasResumableGame, setHasResumableGame] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [gamesRemaining, setGamesRemaining] = useState(0);
  const { theme } = useTheme();
  const typography = useTypography();
  const globalStyles = useGlobalStyles();
  const { t } = useTranslation();

  const backgroundImage = theme.name === "dark"
    ? require("../assets/backgrounds/dark-bg-2.png")
    : require("../assets/backgrounds/light-bg-2.png");

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const hasResumable = GameStateService.isResumable();
      setHasResumableGame(hasResumable);
      
      // Check if user is in guest mode
      const guestUser = GuestUserService.getGuestUser();
      if (guestUser) {
        setIsGuestMode(true);
        setGamesRemaining(GuestUserService.getGamesRemaining());
      } else {
        setIsGuestMode(false);
      }
    });

    // Initial check
    setHasResumableGame(GameStateService.isResumable());
    const guestUser = GuestUserService.getGuestUser();
    if (guestUser) {
      setIsGuestMode(true);
      setGamesRemaining(GuestUserService.getGamesRemaining());
    }

    return unsubscribe;
  }, [navigation]);

  const resetDailyChallenge = () => {
    storage.set('isDailyChallenge', false);
  };

  const handleSignUp = () => {
    Alert.alert(
      t('home.unlockFullExperience'),
      t('home.guestUpgradePrompt'),
      [
        { 
          text: t('common.cancel'), 
          style: 'cancel' 
        },
        { 
          text: t('home.signUpNow'), 
          onPress: () => {
            // Optional: Show confirmation for losing current game
            if (storage.getBoolean('hasActiveGame')) {
              Alert.alert(
                t('home.gameProgressWarning'),
                t('home.gameProgressMessage'),
                [
                  { text: t('common.cancel'), style: 'cancel' },
                  { 
                    text: t('common.continue'), 
                    onPress: triggerGuestUpgrade,
                    style: 'destructive'
                  }
                ]
              );
            } else {
              triggerGuestUpgrade();
            }
          }
        }
      ]
    );
  };

  const startNewGame = () => {
    Vibration.vibrate(100);

    // Check if guest mode and has games remaining
    if (isGuestMode && !GuestUserService.canPlayMore()) {
      Alert.alert(
        t('home.guestLimitReached'),
        t('home.guestLimitMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('home.signUpNow'), onPress: () => handleSignUp() }
        ]
      );
      return;
    }

    resetDailyChallenge();
    GameStateService.clear();
    storage.set('hasActiveGame', false);

    // Increment guest games played
    if (isGuestMode) {
      GuestUserService.incrementGamesPlayed();
      setGamesRemaining(GuestUserService.getGamesRemaining());
    }

    navigation.navigate("Game", {});
  };

  const renderGuestUpgradeBanner = () => {
    if (!isGuestMode) return null;
    
    return (
      <View style={styles.guestBanner}>
        <Text style={styles.guestBannerTitle}>
          {t('home.guestMode')} • {gamesRemaining} {t('home.gamesLeft')}
        </Text>
        <Pressable
          style={styles.upgradeButton}
          onPress={handleSignUp}
        >
          <Text style={styles.upgradeButtonText}>
            {t('home.unlockFullExperience')}
          </Text>
        </Pressable>
      </View>
    );
  };

  const resumeGame = () => {
    Vibration.vibrate(100);
    
    if (!GameStateService.isResumable()) {
      setHasResumableGame(false);
      return;
    }

    navigation.navigate("Game", {});
    storage.set('hasActiveGame', true);
    GameStateService.load();
  };

  const styles = StyleSheet.create({
    container: {
      ...globalStyles.container,
      padding: 20,
    },
    title: {
      ...typography.title,
      marginBottom: 40,
      textAlign: 'center',
    },
    button: {
      width: '70%',
      maxWidth: "90%",
      marginVertical: 10,
      borderTopLeftRadius: 8,
      borderBottomRightRadius: 8,
    },
    resumeButton: {
      backgroundColor: theme.colors.tertiary,
    },
    newGameButton: {
      backgroundColor: theme.colors.primary,
    },
    dailyChallengeButton: {
      backgroundColor: theme.colors.secondary,
    },
    secondaryButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    learn: {
      alignItems: 'center',
      marginTop: 50,
      marginBottom: 15,
    },
    learnLabelContainer: {
      marginTop: 50,
    },
    learnLabel: {
      color: theme.colors.tertiary,
      textAlign: 'center',
      fontSize: 14,
      textDecorationLine: 'underline',
      fontStyle: 'italic',
    },
    guestBanner: {
      backgroundColor: theme.colors.tertiary,
      padding: 16,
      borderRadius: 8,
      marginBottom: 20,
      alignItems: 'center',
    },
    guestBannerTitle: {
      color: theme.colors.onTertiary,
      fontSize: 14,
      fontWeight: 'bold',
      marginBottom: 8,
    },
    upgradeButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: 20,
    },
    upgradeButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 12,
      fontWeight: 'bold',
    },
    disabledButton: {
      opacity: 0.5,
    },
  });

  return (
    <View style={styles.container}>
      <ImageBackground
        source={backgroundImage}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      {renderGuestUpgradeBanner()}
      
      {hasResumableGame && (
        <Button
          mode="contained"
          onPress={resumeGame}
          style={[styles.button, styles.resumeButton]}
          labelStyle={{ color: theme.colors.onTertiary }}
        >
          {t('home.resumeGame')}
        </Button>
      )}

      <Button
        mode="contained"
        onPress={startNewGame}
        style={[styles.button, styles.newGameButton]}
        labelStyle={{ color: theme.colors.onPrimary }}
        disabled={isGuestMode && !GuestUserService.canPlayMore()}
      >
        {t('home.startNewGame')}
      </Button>

      {/* Disable Daily Challenge for guests */}
      {!isGuestMode && (
        <Button
          mode="contained"
          onPress={() => navigation.navigate("Daily Challenge")}
          style={[styles.button, styles.dailyChallengeButton]}
          labelStyle={{ color: theme.colors.onPrimary }}
        >
          {t('home.dailyChallenge')}
        </Button>
      )}

      <Button
        mode="outlined"
        onPress={() => navigation.navigate("Tutorial")}
        style={[styles.button, styles.secondaryButton]}
        labelStyle={{ color: theme.colors.primary }}
      >
        {t('home.howToPlay')}
      </Button>

      {/* Disable Leaderboard for guests */}
      {!isGuestMode && (
        <Button
          mode="outlined"
          onPress={() => navigation.navigate("Leaderboard")}
          style={[styles.button, styles.secondaryButton]}
          labelStyle={{ color: theme.colors.primary }}
        >
          {t('home.leaderboard')}
        </Button>
      )}

      <Button
        mode="outlined"
        onPress={() => navigation.navigate("Settings")}
        style={[styles.button, styles.secondaryButton]}
        labelStyle={{ color: theme.colors.primary }}
      >
        {t('home.settings')}
      </Button>

      <Pressable
        onPress={() => Linking.openURL(LEARN)}
        accessibilityLabel={t('home.learn')}
        style={({ pressed }) => [
          styles.learn,
          { opacity: pressed ? 0.6 : 1 }
        ]}
      >
        <View style={styles.learnLabelContainer}>
          <Text style={styles.learnLabel}>{t('home.learn')}</Text>
        </View>
      </Pressable>
      
      <SudokuBanner />
      <SudokuBanner />
    </View>
  );
};

export default HomeScreen;