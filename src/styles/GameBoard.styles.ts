/** /src/styles/GameScreen.styles.ts */

import { StyleSheet } from "react-native";
import { useTypography } from "./Typography";
import { useTheme } from "../context/ThemeContext";


export const useGameBoardStyles = () => {
  const { theme } = useTheme();
  const typography = useTypography();
  
  return StyleSheet.create({
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: 8,
      justifyContent: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      marginRight: 8
    },
    buttonText: {
      ...typography.button,
      color: theme.colors.text
    },
    endGameButton: {
      backgroundColor: theme.colors.error,
      borderRadius: 8,
      justifyContent: 'center',
      paddingHorizontal: 5,
      paddingVertical: 5,
      marginRight: 8
    },
    endGameButtonText: {
      ...typography.button,
    },
    numPad: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginBottom: 2,
      marginTop: 0,
      width: 200,
      padding: 0,
      paddingBottom: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
    },
    numPadBtn: {
      backgroundColor: theme.colors.primary,
      borderRadius: 5,
      padding: 5,
      margin: 5,
      width: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numPadBtnText: {
      ...typography.bodyBold,
      color: theme.colors.onPrimary,
    },
    deleteBtn: {
      width: 80,
      height: 30,
      marginTop: 1,
      marginHorizontal: 5,
      backgroundColor: theme.colors.tertiary,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
    },
    activeBlock: {
      backgroundColor: theme.colors.selectedCell,
    },
    activeCell: {
      backgroundColor: theme.colors.userFilled,
    },
    sameNumberHighlight: {
      backgroundColor: theme.colors.tertiary,
    },
    rcHighlight: {
      backgroundColor: theme.colors.selectedCell,
    },
    sameNumberText: {
      color: theme.colors.onTertiary,
    },
    checkInput: {
      ...typography.body,
      borderColor: theme.colors.secondary,
      borderWidth: 1,
      borderRadius: 5,
      padding: 8,
      marginRight: 10,
      flex: 1,
      maxWidth: 120,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    checkInputFocus: {
      backgroundColor: theme.colors.selectedCell,
      borderWidth: 2,
      borderColor: theme.colors.primary || 'white',
      elevation: 4, // Android shadow
      shadowColor: '#000', // iOS shadow
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    notesTextArea: {
      ...typography.body,
      borderColor: theme.colors.secondary,
      borderWidth: 1,
      borderRadius: 5,
      padding: 8,
      height: 100,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      maxWidth: '80%',
      minWidth: '80%',
    },
    notesLabel: {
      ...typography.bodyBold,
      marginBottom: 5,
    },
    difficultyText: {
      ...typography.body,
      marginRight: 10,
    },
    checksRemainingContainer: {
      backgroundColor: theme.colors.tertiary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      marginVertical: 1,
      alignSelf: 'center',
      minWidth: 180,
      shadowColor: theme.name === "light" ? "#000" : "#fff",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    checksRemainingText: {
      fontSize: 14,
      fontStyle: "italic",
      textAlign: "center",
      color: theme.colors.onTertiary,
      fontWeight: '500',
    },
  });
};