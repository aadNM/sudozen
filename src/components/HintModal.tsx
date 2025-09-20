import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { Strategy } from '../types/GameTypes';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface HintModalProps {
  visible: boolean;
  message: string;
  position: { row: number; col: number };
  value: number;
  strategy?: Strategy;
  onAccept: () => void;
  onClose: () => void;
}

const HintModal: React.FC<HintModalProps> = ({
  visible,
  message,
  position,
  value,
  strategy,
  onAccept,
  onClose,
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const { t } = useTranslation();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>
            {strategy ? `${t('game.hint.title')}: ${strategy.title}` : t('game.hint.title')}
          </Text>

          <Text style={styles.message}>{message}</Text>

          <Text style={styles.cellInfo}>
              {t('game.hint.cellInfo', {
                row: position.row + 1,
                col: position.col + 1,
                value
              })}
          </Text>

          {strategy?.examples?.map((example, index) => (
            <View key={index} style={styles.exampleContainer}>
              <Text style={styles.exampleText}>{t('game.hint.example')}: {example}</Text>
            </View>
          ))}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>{t('common.close')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={onAccept}
            >
              <Text style={styles.acceptButtonText}>{t('game.hint.fillCell')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background + 'CC', // semi-transparent
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      padding: 20,
      width: '85%',
      maxWidth: 400,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 12,
      color: theme.colors.primary,
    },
    message: {
      fontSize: 16,
      marginBottom: 16,
      lineHeight: 22,
      color: theme.colors.text,
    },
    cellInfo: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.secondary,
      marginBottom: 20,
    },
    exampleContainer: {
      backgroundColor: theme.colors.tertiary + '22', // light version
      padding: 10,
      borderRadius: 5,
      marginBottom: 10,
    },
    exampleText: {
      fontStyle: 'italic',
      color: theme.colors.onSurface,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 20,
      gap: 10,
    },
    button: {
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 5,
      minWidth: 100,
      alignItems: 'center',
    },
    closeButton: {
      backgroundColor: theme.colors.secondary,
    },
    acceptButton: {
      backgroundColor: theme.colors.primary,
    },
    buttonText: {
      color: theme.colors.onTertiary,
      fontWeight: '500',
    },
    acceptButtonText: {
      color: theme.colors.onPrimary,
      fontWeight: '500',
    },
  });

export default HintModal;
