/** App.tsx */

import React, { useEffect, useState } from "react";
import { ActivityIndicator, DeviceEventEmitter, StatusBar, View } from "react-native";
import { I18nextProvider } from 'react-i18next';
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider } from 'react-native-paper';
import storage from "./src/utils/mmkvStorage";
import AppNavigator from "./src/navigation/AppNavigator";
import UserCreationScreen from "./src/screens/UserCreationScreen";
import pb from "./src/services/PocketbaseClient";
import { GuestUser, PlayersRecord } from "./src/types/GameTypes";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { LanguageProvider } from "./src/context/LanguageContext"; 
import { logMessage } from "./src/utils/Logger";
import i18n from "./src/i18n";
import { GuestUserService } from "./src/services/GuestUserService";
import GameStateService from "./src/services/GameStateService";
import { SafeAreaView } from "react-native-safe-area-context";

const InnerApp = () => {
  const [player, setPlayer] = useState<PlayersRecord | GuestUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceSignUp, setForceSignUp] = useState(false);
  const [isAccountDeletion, setIsAccountDeletion] = useState(false);
  const { theme } = useTheme();

  // Listener for User changes
  useEffect(() => {
    const handleGuestUpgrade = () => {
      setForceSignUp(true);
    };

    const handleAccountDeletion = () => {
      setIsAccountDeletion(true);
    };

    const handleReturnToGuest = () => {
      setForceSignUp(false);

      // Get existing guest user, don't create a new one
      const guestUser = GuestUserService.getGuestUser();
      if (guestUser) {
        setPlayer(guestUser);
      } else {
        // Only create new if none exists
        const newGuestUser = GuestUserService.createGuestUser();
        setPlayer(newGuestUser);
      }
    };

    const subscription1 = DeviceEventEmitter.addListener('GUEST_UPGRADE_REQUESTED', handleGuestUpgrade);
    const subscription2 = DeviceEventEmitter.addListener('ACCOUNT_DELETION_REQUESTED', handleAccountDeletion);
    const subscription3 = DeviceEventEmitter.addListener('RETURN_TO_GUEST_MODE', handleReturnToGuest);
    
    return () => {
      subscription1?.remove();
      subscription2?.remove();
      subscription3?.remove();
    };
  }, []);

  useEffect(() => {
    const checkPlayer = async () => {
      try {
        if (storage.getBoolean('force_signup')) {
          storage.delete('force_signup');
          setForceSignUp(true);
          setLoading(false);
          return;
        }

        // Check for existing authenticated player first
        const playerId = storage.getString("player_id");
        if (playerId) {
          try {
            const record = await pb.collection("players").getOne<PlayersRecord>(playerId);
            setPlayer(record);
            setLoading(false);
            return;
          } catch (error) {
            logMessage('warn', "Stored player not found, clearing:", {error: String(error)});
            storage.delete("player_id");
          }
        }

        // If no authenticated player, check for guest user
        const guestUser = GuestUserService.getGuestUser();
        if (guestUser) {
          setPlayer(guestUser);
          setLoading(false);
          return;
        }

        // If no player at all, create a new guest user automatically
        const newGuestUser = GuestUserService.createGuestUser();
        setPlayer(newGuestUser);
        
      } catch (error) {
        logMessage('error', "Error in checkPlayer:", {error: String(error)});
        // Fallback: create guest user even on error
        const fallbackGuestUser = GuestUserService.createGuestUser();
        setPlayer(fallbackGuestUser);
      } finally {
        setLoading(false);
      }
    };

    checkPlayer();
  }, []);

  const handleUserCreated = (newPlayer: PlayersRecord | GuestUser) => {
    if (forceSignUp) {
      GuestUserService.clearGuestUser();
      GameStateService.clear();
      storage.set('hasActiveGame', false);
      setForceSignUp(false);
    }
    if (isAccountDeletion) {
      setIsAccountDeletion(false);
    }
    setPlayer(newPlayer);
  };

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: "center", 
        alignItems: "center", 
        backgroundColor: theme.colors.background 
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Show UserCreationScreen if no player OR if forced signup
  if (forceSignUp || isAccountDeletion) {
    return (
      <UserCreationScreen 
        onCreated={handleUserCreated}
        isGuestUpgrade={forceSignUp} 
      />
    );
  }

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar barStyle={theme.name.startsWith('light') ? "light-content" : "dark-content"}
                   backgroundColor={theme.colors.background} 
        />
        <NavigationContainer
          theme={{
            ...DefaultTheme,
            colors: {
              ...DefaultTheme.colors,
              background: theme.colors.background,
              card: theme.colors.surface,
              text: theme.colors.text,
              primary: theme.colors.primary,
              border: theme.colors.secondary,
            },
          }}
        >
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaView>
    </PaperProvider>
  );
};

const App = () => {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    // Wait for i18n to be fully initialized
    i18n.on('initialized', () => {
      setI18nReady(true);
    });

    if (i18n.isInitialized) {
      setI18nReady(true);
    }

    return () => {
      i18n.off('initialized');
    };
  }, []);

  if (!i18nReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <LanguageProvider>
            <InnerApp />
          </LanguageProvider>
        </ThemeProvider>
      </I18nextProvider>
    </SafeAreaProvider>
  );
};

export default App;