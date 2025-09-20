/** /src/navigation/AppNavigator.tsx */


import React from "react";
import { createStackNavigator, StackNavigationProp } from "@react-navigation/stack";
import HomeScreen from "../screens/HomeScreen";
import GameScreen from "../screens/GameScreen";
import TutorialScreen from "../screens/TutorialScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import SettingsScreen from "../screens/SettingsScreen";
import DailyChallengeScreen from "../screens/DailyChallengeScreen";
import { RootStackParamList } from "../types/GameTypes";
import { useTheme } from "../context/ThemeContext";
import { useTranslation } from "react-i18next";

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.onPrimary,
        headerTitleStyle: {
          fontWeight: "bold",
          fontSize: 20,
        },
        headerTitleAlign: "center",
        cardStyle: {
          backgroundColor: theme.colors.background,
        },
        headerBackTitle: " ",
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "SudoZen" }}
      />
      <Stack.Screen
        name="Game"
        component={GameScreen}
        options={({ route }) => ({
          title: route.params?.isDailyChallenge
            ? t('dailyChallenge.title')
            : `${route.params?.difficulty || t('game.defaultTitle')}`,
          headerBackTitle: t('common.back'),
        })}
      />
      <Stack.Screen
        name="Daily Challenge"
        component={DailyChallengeScreen}
        options={{
          title: t('dailyChallenge.title'),
          headerBackTitle: t('common.back'),
        }}
      />
      <Stack.Screen
        name="Tutorial"
        component={TutorialScreen}
        options={{
          title: t('tutorial.title'),
          headerBackTitle: t('common.back'),
        }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: t('leaderboard.title'),
          headerBackTitle: t('common.back'),
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: t('settings.title'),
          headerBackTitle: t('common.back'),
        }}
      />
    </Stack.Navigator>
  );
};

export type AppNavigationProp = StackNavigationProp<RootStackParamList>;
export default AppNavigator;