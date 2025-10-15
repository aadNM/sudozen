/** src/screens/UserCreationScreen.tsx */

import { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  ToastAndroid,
  Modal,
  DeviceEventEmitter,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTranslation } from 'react-i18next';
import pb from '../services/PocketbaseClient';
import storage from '../utils/mmkvStorage';
import { PlayersRecord, RootStackParamList } from '../types/GameTypes';
import { passGen, userPassGen } from '../utils/SudokuUtils';
import * as Localization from 'expo-localization';
import { useTheme } from '../context/ThemeContext';
import { useTypography } from '../styles/Typography';
import { logMessage } from '../utils/Logger';
import { preGeneratePuzzles, initializePuzzleQueues, generatePuzzleBatch } from '../services/PuzzleService';
import { GuestUserService } from '../services/GuestUserService';
import { SudokuBanner } from '../hooks/ads/Banner';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

type Props = {
  onCreated: (player: PlayersRecord) => void;
  isGuestUpgrade?: boolean; // Optional prop to indicate guest upgrade
};

interface FormData {
  email: string;
  username: string;
  password: string;
}

interface FormErrors {
  email: string;
  username: string;
  password: string;
}

const USERNAME_MIN_LENGTH = 4;
const USERNAME_MAX_LENGTH = 20;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
const getPlayerCountry = async (): Promise<string> => {
  // Primary: device locale
  try {
    const locales = Localization.getLocales();
    if (locales?.[0]?.regionCode) {
      return locales[0].regionCode;
    }
  } catch {}

  // Secondary: IP geolocation with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch('https://ipapi.co/country_code/', { signal: controller.signal });
    clearTimeout(timeoutId);

    const country = await response.text();
    if (country && country.length === 2) {
      return country.trim();
    }
  } catch {}

  // Fallback
  return 'US';
};


const normalizeEmail = (email: string) => email.trim().toLowerCase();

export default function UserCreationScreen({ onCreated, isGuestUpgrade = false }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const typography = useTypography();
  const [form, setForm] = useState<FormData>({
    email: '',
    username: '',
    password: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({
    email: '',
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isPreparingPuzzles, setIsPreparingPuzzles] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetFeedback, setResetFeedback] = useState('');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 24,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
    },
    title: {
      ...typography.title,
      marginBottom: 32,
      textAlign: 'center',
    },
    inputGroup: {
      marginBottom: 16,
    },
    input: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.secondary,
      color: theme.colors.text,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    error: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: 4,
    },
    button: {
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 24,
    },
    buttonText: {
      color: theme.colors.onPrimary,
      fontWeight: 'bold',
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.secondary,
    },
    dividerText: {
      marginHorizontal: 16,
      color: theme.colors.secondary,
    },
    passwordActions: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 8,
    },
    generateButton: {
      flex: 1,
      backgroundColor: theme.colors.secondary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    generateButtonText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
    },
    copyButton: {
      backgroundColor: theme.colors.secondary,
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    loadingText: {
      color: theme.colors.onPrimary,
      fontSize: 14,
    },
    preparingText: {
      textAlign: 'center',
      color: theme.colors.onSurface,
      fontSize: 12,
      marginTop: 8,
    },
    guestButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.secondary,
      borderStyle: 'dashed' as 'dashed',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginTop: 16,
    },
    guestButtonContent: {
      alignItems: 'center',
    },
    guestButtonTitle: {
      color: theme.colors.secondary,
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    guestButtonSubtitle: {
      color: theme.colors.secondary,
      fontSize: 12,
      textAlign: 'center',
      opacity: 0.8,
    },
    backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      zIndex: 1,
    },
    backButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
    },
    subtitle: {
      ...typography.body,
      textAlign: 'center',
      marginBottom: 20,
      color: theme.colors.secondary,
    },
    benefitsContainer: {
      backgroundColor: theme.colors.surface,
      padding: 16,
      borderRadius: 8,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    benefitsTitle: {
      ...typography.subtitle,
      color: theme.colors.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    benefitItem: {
      color: theme.colors.text,
      fontSize: 14,
      marginBottom: 4,
      paddingLeft: 8,
    },
  });

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {
      email: '',
      username: '',
      password: '',
    };
    let isValid = true;

    const normalizedEmail = normalizeEmail(form.email);
    const trimmedUsername = form.username.trim();

    // Email validation
    if (!normalizedEmail) {
      newErrors.email = t('userCreation.emailRequired');
      isValid = false;
    } else if (!EMAIL_REGEX.test(normalizedEmail)) {
      newErrors.email = t('userCreation.invalidEmail');
      isValid = false;
    }

    // Username validation
    if (!trimmedUsername) {
      newErrors.username = t('userCreation.usernameRequired');
      isValid = false;
    } else if (trimmedUsername.length < USERNAME_MIN_LENGTH) {
      newErrors.username = t('userCreation.usernameTooShort', { min: USERNAME_MIN_LENGTH });
      isValid = false;
    } else if (trimmedUsername.length > USERNAME_MAX_LENGTH) {
      newErrors.username = t('userCreation.usernameTooLong', { max: USERNAME_MAX_LENGTH });
      isValid = false;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(trimmedUsername)) {
      newErrors.username = t('userCreation.usernameInvalidChars');
      isValid = false;
    } 
    
    // Password validation (independent of username validation)
    if (!form.password.trim()) {
      newErrors.password = t('userCreation.passwordRequired');
      isValid = false;
    } else if (form.password.length < 8) {
      newErrors.password = t('userCreation.passwordTooShort');
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  }, [form.email, form.username, form.password, t]);

  /**
   * Show temporary welcome back message
   */
  const showWelcomeMessage = (username: string) => {
    const message = t('userCreation.welcomeBack', { username });
    
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // For iOS, use Alert with auto-dismiss
      Alert.alert('', message, [{ text: t('common.ok') }]);
    }
  };

  /**
   * Faster user existence check with better error handling
   */
  async function checkUserExists(email: string, username: string): Promise<{
    exists: boolean;
    existingPlayer?: PlayersRecord;
    emailTaken: boolean;
    usernameTaken: boolean;
    error?: Error;
  }> {
    try {
      const [emailCheck, usernameCheck] = await Promise.allSettled([
        Promise.race([
          pb.collection('players').getFirstListItem<PlayersRecord>(`email = "${email}"`),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Email check timeout')), 3000))
        ]),
        Promise.race([
          pb.collection('players').getFirstListItem<PlayersRecord>(`username = "${username}"`),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Username check timeout')), 3000))
        ])
      ]);

      const emailPlayer = emailCheck.status === 'fulfilled' ? emailCheck.value as PlayersRecord : null;
      const usernamePlayer = usernameCheck.status === 'fulfilled' ? usernameCheck.value as PlayersRecord : null;

      // If same player has both email and username
      if (emailPlayer?.id === usernamePlayer?.id && emailPlayer) {
        return {
          exists: true,
          existingPlayer: emailPlayer,
          emailTaken: true,
          usernameTaken: true
        };
      }

      return {
        exists: false,
        emailTaken: !!emailPlayer,
        usernameTaken: !!usernamePlayer,
        existingPlayer: emailPlayer || usernamePlayer || undefined
      };

    } catch (error) {
      logMessage('warn', 'User existence check failed, allowing registration attempt', {
        email: email,
        username: username,
        error: String(error)
      });

      return {
        exists: false,
        emailTaken: false,
        usernameTaken: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  /**
   * Account creation with puzzle pre-generation
   */
  const handleCreateAccount = async () => {
    if (!validateForm()) return;

    const email = normalizeEmail(form.email);
    const username = form.username.trim();
    const password = form.password;

    setIsLoading(true);

    try {
      try {
        await pb.health.check();
        const auth = await pb.collection('players').authWithPassword<PlayersRecord>(email, password);
            
        storage.set('player_id', auth.record.id);
        showWelcomeMessage(auth.record.username);
        
        // Start puzzle pre-generation for returning user
        setIsPreparingPuzzles(true);
        Promise.all([
          initializePuzzleQueues(),
          generatePuzzleBatch('Easy', 3, auth.record.id),
          generatePuzzleBatch('Medium', 2, auth.record.id)
        ]).then(() => {
          logMessage('info', 'Batch puzzle generation completed for new user');
        }).finally(() => {
          setIsPreparingPuzzles(false);
        });
        
        onCreated(auth.record);
        return;
        
      } catch (authError: any) {
        // Expected if user doesn't exist, continue with registration
      }

      // Check for existing accounts with timeout
      const { existingPlayer, emailTaken, usernameTaken, error } = 
        await checkUserExists(email, username);

      if (error) {
        logMessage('warn', 'Existence check had issues, proceeding with creation attempt', { error });
      }

      // Handle existing accounts
      if (emailTaken) {
        Alert.alert(t('userCreation.emailAlreadyUsed'), t('userCreation.emailAlreadyUsedMessage'));
        return;
      }

      if (usernameTaken && !emailTaken) {
        Alert.alert(t('userCreation.usernameTaken'), t('userCreation.usernameTakenMessage'));
        return;
      }

      // Create new account
      const authData = await pb.collection('players').create({
        username: form.username,
        email: form.email,
        password,
        passwordConfirm: password,
        verified: false,
        country: getPlayerCountry(),
        solved_hashes: [],
        solved_puzzles: [],
        solved_dailies: [],
      });

      // Get full player record with proper typing
      const player = await pb.collection('players').getOne<PlayersRecord>(authData.id);
      
      await pb.collection('players').authWithPassword(normalizeEmail(form.email), password);
      storage.set('player_id', player.id);
      
      // Send verification email (don't wait for it)
      pb.collection('players').requestVerification(email).catch(() => {
        logMessage('warn', 'Email verification request failed');
      });

      // Start puzzle pre-generation immediately after account creation
      setIsPreparingPuzzles(true);
      
      // Initialize puzzle queues and start pre-generation
      Promise.all([
        initializePuzzleQueues(),
        preGeneratePuzzles(player.id)
      ]).then(() => {
        logMessage('info', 'Puzzle pre-generation completed for new user');
      }).catch((error) => {
        logMessage('warn', 'Puzzle pre-generation failed', { error: String(error) });
      }).finally(() => {
        setIsPreparingPuzzles(false);
      });
      
      // Pass properly typed player record
      onCreated(player);

    } catch (error: any) {
      logMessage('error', 'Registration error details:', { 
        error: String(error),
        message: error?.message,
        status: error?.status,
        statusText: error?.statusText,
        url: error?.url,
        isAbort: error?.isAbort,
        response: error?.response?.data,
        stack: error?.stack
      });
      
      handleRegistrationError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = useCallback(() => {
    const newPassword = userPassGen(); 
    setGeneratedPassword(newPassword);
    updateFormField('password', newPassword);
  }, []);

  const copyPassword = useCallback(() => {
    if (form.password) {
      Clipboard.setString(form.password);
      const message = t('userCreation.passwordCopied');
      if (Platform.OS === 'android') {
        ToastAndroid.show(message, ToastAndroid.SHORT);
      } else {
        Alert.alert('', message, [{ text: t('common.ok') }]);
      }
    }
  }, [form.password, t]);

  const handleRegistrationError = (error: any) => {
    let message = t('userCreation.emailAlreadyUsedMessage');
    
    if (error.response?.data?.message) {
      if (error.response.data.message.includes('email')) {
        message = t('userCreation.emailAlreadyUsedMessage');
      } else if (error.response.data.message.includes('username')) {
        message = t('userCreation.usernameTakenMessage');
      }
    }
    
    Alert.alert(message);
  };

  const updateFormField = useCallback((field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const renderButtonContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.onPrimary} />
          <Text style={styles.loadingText}>
            {isPreparingPuzzles ? t('userCreation.preparingPuzzles') : t('userCreation.creating')}
          </Text>
        </View>
      );
    }
    
    return <Text style={styles.buttonText}>{t('userCreation.continue')}</Text>;
  };

  const getTitle = () => {
    return isGuestUpgrade ? t('userCreation.upgradeTitle') : t('userCreation.title');
  };

  const getSubtitle = () => {
    return isGuestUpgrade ? t('userCreation.upgradeSubtitle') : undefined;
  };

  // Add a back button for guest upgrade flow (optional)
  const renderBackButton = () => {
    if (!isGuestUpgrade) return null;
    
    return (
      <Pressable
        style={styles.backButton}
        onPress={() => {
          // Return to guest mode
          storage.delete('force_signup');
          DeviceEventEmitter.emit('RETURN_TO_GUEST_MODE');
        }}
      >
        <Text style={styles.backButtonText}>{t('common.backToGuest')}</Text>
      </Pressable>
    );
  };

  const renderGuestOption = () => (
    <>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t('common.or')}</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.guestButton,
          { opacity: pressed || isLoading ? 0.7 : 1 }
        ]}
        onPress={handleGuestPlay}
        disabled={isLoading}
      >
        <View style={styles.guestButtonContent}>
          <Text style={styles.guestButtonTitle}>{t('userCreation.playAsGuest')}</Text>
          <Text style={styles.guestButtonSubtitle}>{t('userCreation.guestLimitations')}</Text>
        </View>
      </Pressable>
    </>
  );

  const handleGuestPlay = () => {
    const guestUser = GuestUserService.createGuestUser();
    onCreated(guestUser as any); // Type assertion needed for compatibility
  };

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      enableOnAndroid={true}
      enableAutomaticScroll={true}
      extraScrollHeight={Platform.OS === 'ios' ? 20 : 100}
      extraHeight={Platform.OS === 'android' ? 100 : 0}
      keyboardOpeningTime={0}
    >

      {renderBackButton()}
      <Text style={styles.title}>{getTitle()}</Text>

      {getSubtitle() && <Text style={styles.subtitle}>{getSubtitle()}</Text>}

      {/* Show upgrade benefits for guest users */}
      {isGuestUpgrade && (
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>{t('userCreation.unlockFeatures')}</Text>
          <Text style={styles.benefitItem}>• {t('userCreation.unlimitedGames')}</Text>
          <Text style={styles.benefitItem}>• {t('userCreation.dailyChallenges')}</Text>
          <Text style={styles.benefitItem}>• {t('userCreation.leaderboardAccess')}</Text>
          <Text style={styles.benefitItem}>• {t('userCreation.progressSaving')}</Text>
        </View>
      )}

      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, errors.username && styles.inputError]}
          placeholder={t('userCreation.username')}
          placeholderTextColor={theme.colors.secondary}
          value={form.username}
          onChangeText={(text) => setForm({...form, username: text})}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        {errors.username ? <Text style={styles.error}>{errors.username}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder={t('userCreation.email')}
          placeholderTextColor={theme.colors.secondary}
          value={form.email}
          onChangeText={(text) => setForm({...form, email: text})}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
      </View>

      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder={t('userCreation.password')}
          placeholderTextColor={theme.colors.secondary}
          value={form.password}
          onChangeText={(text) => updateFormField('password', text)}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

        <View style={styles.passwordActions}>
          <Pressable
            style={styles.generateButton}
            onPress={generatePassword}
            disabled={isLoading}
          >
            <Text style={styles.generateButtonText}>{t('userCreation.generatePassword')}</Text>
          </Pressable>
          
          {form.password ? (
            <Pressable
              style={styles.copyButton}
              onPress={copyPassword}
              disabled={isLoading}
            >
              <Text style={styles.generateButtonText}>{t('userCreation.copyPassword')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          { opacity: pressed || isLoading ? 0.7 : 1 }
        ]}
        onPress={handleCreateAccount}
        disabled={isLoading}
      >
        {renderButtonContent()}
      </Pressable>

      {isPreparingPuzzles && (
        <Text style={styles.preparingText}>
          {t('userCreation.preparingPuzzlesHint')}
        </Text>
      )}

      <Text style={styles.preparingText} onPress={() => setShowResetModal(true)}>
        {'\n'}
        {t('userCreation.passwordReset.promptLink')}
      </Text>

      {!isGuestUpgrade && renderGuestOption()}

      {/* Password Reset Modal */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResetModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: '#00000088',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 10,
            padding: 20,
          }}>
            <Text style={[typography.title, { marginBottom: 10 }]}>{t('userCreation.passwordReset.title')}</Text>

            <TextInput
              placeholder={t('userCreation.passwordReset.placeholder')}
              placeholderTextColor={theme.colors.secondary}
              value={resetEmail}
              onChangeText={setResetEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[
                styles.input,
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail) && resetEmail ? styles.inputError : null,
              ]}
            />

            {resetFeedback !== '' && (
              <Text style={{
                marginTop: 8,
                color: resetFeedback.includes('sent') ? 'green' : theme.colors.error,
              }}>
                {resetFeedback}
              </Text>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Pressable
                style={[styles.generateButton, { flex: 1, marginRight: 8 }]}
                onPress={async () => {
                  setResetFeedback('');
                  const trimmed = resetEmail.trim().toLowerCase();
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                    setResetFeedback(t('userCreation.passwordReset.invalidEmail'));
                    return;
                  }

                  try {
                    await pb.collection('players').requestPasswordReset(trimmed);
                    setResetFeedback(t('userCreation.passwordReset.success'));
                  } catch (err: any) {
                    logMessage('warn', 'Password reset error:', err);
                    setResetFeedback(err?.message || t('userCreation.passwordReset.error'));
                  }
                }}
              >
                <Text style={styles.generateButtonText}>{t('userCreation.passwordReset.send')}</Text>
              </Pressable>

              <Pressable
                style={[styles.copyButton, { paddingHorizontal: 16 }]}
                onPress={() => {
                  setShowResetModal(false);
                  setResetFeedback('');
                  setResetEmail('');
                }}
              >
                <Text style={styles.generateButtonText}>{t('common.cancel')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <SudokuBanner />

    </KeyboardAwareScrollView>
  );
}