/** /src/screens/SettingsScreen.tsx */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Switch,
  Linking,
  ScrollView,
  Pressable,
  Alert,
  DeviceEventEmitter,
  Vibration
} from "react-native";
import { useTranslation } from 'react-i18next';
import { useGlobalStyles } from "../styles/Global.styles";
import storage from "../utils/mmkvStorage";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useTypography } from "../styles/Typography";
import AnimatedOverlay from "../components/AnimatedOverlay";
import pb from "../services/PocketbaseClient";
import GameStateService from "../services/GameStateService";
import { GUEST_USER_KEY, GuestUser, PlayersRecord } from "../types/GameTypes";
import { GuestUserService } from "../services/GuestUserService";
import { logMessage } from "../utils/Logger";
import { SudokuBanner } from "../hooks/ads/Banner";

const PRIVACY_POLICY_URL = "https://conquerdaily.com/sudozen-privacy-policy/";

const SettingsScreen = () => {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
  const globalStyles = useGlobalStyles();
  const typography = useTypography();
  const isDark = theme.name === "dark";
  const [isDeleting, setIsDeleting] = useState(false);
  const [rowColHighlight, setRowColHighlight] = useState(
    storage.getBoolean('rowColHighlight') ?? true
  );

  // Translated difficulty levels
  const difficulties = [
    { key: "Easy", label: t('settings.difficulties.easy') },
    { key: "Medium", label: t('settings.difficulties.medium') },
    { key: "Hard", label: t('settings.difficulties.hard') },
    { key: "Extreme", label: t('settings.difficulties.extreme') }
  ];

  useEffect(() => {
    const loadDifficulty = async () => {
      const savedDifficulty = storage.getString("sudokuDifficulty") || 'Medium';
      if (savedDifficulty) setDifficulty(savedDifficulty);
    };
    loadDifficulty();
  }, []);

  const toggleRowColHighlight = () => {
    if (difficulty === "Hard" || difficulty === "Extreme") {
      storage.set('rowColHighlight', false);
    } else {
      const newValue = !rowColHighlight;
      setRowColHighlight(newValue);
      storage.set('rowColHighlight', newValue);
    }
  };


  const changeDifficulty = (level: string) => {
    storage.set("sudokuDifficulty", level);
    setDifficulty(level);
    setModalVisible(false);
  };

  const changeLanguageHandler = (languageCode: string) => {
    changeLanguage(languageCode);
    setLanguageModalVisible(false);
  };

  const getCurrentLanguageName = () => {
    const currentLang = supportedLanguages.find(lang => lang.code === currentLanguage);
    return currentLang?.nativeName || 'English';
  };

  const getDifficultyLabel = (difficultyKey: string) => {
    const difficultyObj = difficulties.find(d => d.key === difficultyKey);
    return difficultyObj?.label || difficultyKey;
  };

  /* Account deletion logic */
  const deleteAccount = async () => {
    Vibration.vibrate(50);
    const playerId = storage.getString("player_id");

    if (!playerId || playerId?.startsWith("guest-")) {
      Alert.alert(t("userDeletion.errorTitle"), t("userDeletion.errorNoUser"));
      return;
    }
    if (GuestUserService.getGuestUser()) return;


  Alert.alert(
      t("userDeletion.confirmTitle"),
      t("userDeletion.confirmMessage"),
    [
      { text: t("userDeletion.cancel"), style: "cancel" },
      {
        text: t("userDeletion.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            setIsDeleting(true);

            const scores = await pb.collection("scores").getFullList({
              filter: `player_id="${playerId}"`,
            });
            for (const score of scores) {
              await pb.collection("scores").delete(score.id);
            }
            await pb.collection("players").delete(playerId);

            pb.authStore.clear();
            storage.clearAll();
            GameStateService.clear();

            Alert.alert(
              t("userDeletion.successTitle"),
              t("userDeletion.successMessage"),
              [
                {
                  text: "OK",
                  onPress: () => {
                    storage.set('force_signup', false);
                    DeviceEventEmitter.emit('ACCOUNT_DELETION_REQUESTED');
                  },
                },
              ]
            );
         
            
          } catch (err) {
            logMessage('error', "Account deletion failed:", {error: String(err)});
            Alert.alert(t("userDeletion.errorTitle"), t("userDeletion.errorMessage"));
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]
  );
};


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      marginTop: '15%',
    },
    sectionContainer: {
      marginBottom: 24,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: 16,
      elevation: 2,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      paddingVertical: 16,
    },
    sectionTitle: {
      ...typography.title,
      fontSize: 20,
      marginBottom: 12,
      color: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.secondary,
    },
    lastSettingRow: {
      borderBottomWidth: 0,
    },
    settingLabelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingLabel: {
      ...typography.body,
      fontSize: 18,
      marginLeft: 8,
    },
    settingValue: {
      color: theme.colors.primary,
      fontWeight: 'bold',
      marginRight: 8,
    },
    modalButton: {
      padding: 16,
      borderRadius: 8,
      marginVertical: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    modalButtonText: {
      color: theme.colors.onPrimary,
      fontWeight: 'bold',
      fontSize: 16,
    },
    cancelButton: {
      backgroundColor: theme.colors.secondary,
      marginTop: 16,
    },
    icon: {
      marginRight: 8,
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Game Settings Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionTitle}>
          <Text style={typography.title}>{t('settings.gameSettings')}</Text>
        </View>

        {/* Difficulty */}
        <View style={[styles.settingRow, styles.lastSettingRow]}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>{t('settings.difficulty')}</Text>
          </View>
          <Pressable
            accessibilityLabel={t('settings.changeDifficulty')}
            onPress={() => setModalVisible(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.settingValue}>{getDifficultyLabel(difficulty || 'Medium')}</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionTitle}>
          <Text style={typography.title}>{t('settings.appearance')}</Text>
        </View>

        {/* Language */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>{t('settings.language')}</Text>
          </View>
          <Pressable
            accessibilityLabel={t('settings.changeLanguage')}
            onPress={() => setLanguageModalVisible(true)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.settingValue}>{getCurrentLanguageName()}</Text>
            </View>
          </Pressable>
        </View>

        {/* Dark Mode */}
        <View style={[styles.settingRow, styles.lastSettingRow]}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>{t('settings.darkMode')}</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            accessibilityLabel={t('settings.toggleDarkMode')}
            trackColor={{ false: theme.colors.secondary, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </View>

        {/* Row & Column Highlight */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>{t('settings.rchighlight')}</Text>
          </View>
          <Switch
            value={rowColHighlight}
            onValueChange={toggleRowColHighlight}
            accessibilityLabel={t('settings.rchighlightdesc')}
            trackColor={{ false: theme.colors.secondary, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
            disabled={difficulty === "Hard" || difficulty === "Extreme"}
          />
        </View>

      </View>

      {/* Legal Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionTitle}>
          <Text style={typography.title}>{t('settings.legal')}</Text>
        </View>

        {/* Privacy Policy */}
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
          accessibilityLabel={t('settings.viewPrivacyPolicy')}
          style={({ pressed }) => [
            styles.settingRow,
            styles.lastSettingRow,
            { opacity: pressed ? 0.6 : 1 }
          ]}
        >
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>{t('settings.privacyPolicy')}</Text>
          </View>
        </Pressable>

        {/* Delete Account */}
        <Pressable
          onPress={deleteAccount}
          accessibilityLabel={t('settings.requestDataRemoval')}
          disabled={storage.getJSON(GUEST_USER_KEY) === undefined}
          style={({ pressed }) => [
            styles.settingRow,
            styles.lastSettingRow,
            { opacity: pressed ? 0.6 : 1 }
          ]}
        >
          <View style={styles.settingLabelContainer}>
            <Text style={styles.settingLabel}>{t('settings.requestDataRemoval')}</Text>
          </View>
        </Pressable>
      </View>

      {/* Difficulty Selection Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContent, {
            backgroundColor: theme.colors.surface,
            padding: 24,
            borderRadius: 16,
          }]}>
            <Text style={[typography.title, {
              color: theme.colors.text,
              marginBottom: 24,
              textAlign: 'center'
            }]}>
              {t('settings.selectDifficulty')}
            </Text>

            {difficulties.map((level) => {
              const selected = level.key === difficulty;
              return (
                <Pressable
                  key={level.key}
                  onPress={() => changeDifficulty(level.key)}
                  accessibilityLabel={t('settings.selectDifficultyLevel', { level: level.label })}
                  style={({ pressed }) => [
                    styles.modalButton,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.secondary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.modalButtonText, { marginRight: selected ? 8 : 0 }]}>
                      {level.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setModalVisible(false)}
              accessibilityLabel={t('common.cancel')}
            >
              <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        transparent={true}
        animationType="fade"
        visible={languageModalVisible}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContent, {
            backgroundColor: theme.colors.surface,
            padding: 24,
            borderRadius: 16,
          }]}>
            <Text style={[typography.title, {
              color: theme.colors.text,
              marginBottom: 24,
              textAlign: 'center'
            }]}>
              {t('settings.selectLanguage')}
            </Text>

            {supportedLanguages.map((language) => {
              const selected = language.code === currentLanguage;
              return (
                <Pressable
                  key={language.code}
                  onPress={() => changeLanguageHandler(language.code)}
                  accessibilityLabel={t('settings.selectLanguageOption', { language: language.nativeName })}
                  style={({ pressed }) => [
                    styles.modalButton,
                    {
                      backgroundColor: selected ? theme.colors.primary : theme.colors.secondary,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.modalButtonText, { marginRight: selected ? 8 : 0 }]}>
                      {language.nativeName}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setLanguageModalVisible(false)}
              accessibilityLabel={t('common.cancel')}
            >
              <Text style={styles.modalButtonText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Loading overlay when deleting */}
      {isDeleting && (
        <AnimatedOverlay
          visible={true}
          source={require("../assets/animations/loading.json")}
          onFinish={() => {}}
        >
        </AnimatedOverlay>
      )}
      <SudokuBanner />
    </ScrollView>
  );
};

export default SettingsScreen;