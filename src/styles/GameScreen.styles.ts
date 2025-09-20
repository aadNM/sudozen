/** /src/styles/GameScreen.styles.ts */

import { StyleSheet } from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useTypography } from "./Typography";

export const useGameScreenStyles = () => {
  const { theme } = useTheme();
  const typography = useTypography();

  return StyleSheet.create({
    container: { 
      marginTop: 20, 
      alignItems: "center",
      backgroundColor: theme.colors.background,
    },
    row: { flexDirection: "row" },
    cell: { 
      width: 40, 
      height: 40, 
      borderWidth: 1, 
      justifyContent: 'center',
      alignItems: 'center',
      borderColor: theme.colors.secondary,
    },
    activeCell: {
      backgroundColor: theme.colors.userFilled,
    },
    cellNumber: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    notesText: {
      fontSize: 10,
      color: theme.colors.secondary,
      textAlign: 'center'
    },
    bottomBorder: {
      borderBottomWidth: 3,
      borderBottomColor: theme.colors.text,
    },
    rightBorder: {
      borderRightWidth: 3,
      borderRightColor: theme.colors.text,
    },
    numberText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    activeBlock: {
      backgroundColor: theme.colors.tertiary,
    },
    sameNumberHighlight: {
      backgroundColor: theme.colors.secondary,
    },
    sameNumberText: {
      fontWeight: '900',
      color: theme.colors.primary,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10
    },
    checkInput: {
      borderWidth: 1,
      width: 80,
      marginHorizontal: 10,
      padding: 5,
      textAlign: "center",
      borderColor: theme.colors.secondary,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
    },
    topControls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between', 
      flexWrap: 'wrap', 
      gap: 8, 
      marginBottom: 5,
      marginTop: 0,
      paddingHorizontal: 8,
    },
    checkContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
      flexShrink: 1,
      flexGrow: 1,
    },
    notesContainer: {
      marginVertical: 12,
      paddingBottom: 15,
    }, 
    bottomControls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 5,
    },
    difficultyText: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: 'bold',
    },
    timer: {
      ...typography.timer,
    },
    boardContainer: {
      alignItems: "center",
      justifyContent: "center",
      marginVertical: 12,
    },
    notesInput: {
      borderWidth: 1,
      borderColor: theme.colors.secondary,
      borderRadius: 8,
      padding: 10,
      marginTop: 20,
      width: "90%",
      alignSelf: "center",
      textAlignVertical: "top",
      minHeight: 100,
      backgroundColor: theme.colors.surface,
      color: theme.colors.text,
    },
    cellInput: {
      fontSize: 20,
      textAlign: 'center',
      color: theme.colors.text,
      padding: 0,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    loadingText: {
      fontSize: 18,
      color: theme.colors.text,
    },
    timerWarning: {
      color: theme.colors.error,
      fontWeight: 'bold'
    },

    //Celebration
    celebMessageBox: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.secondary,
      shadowColor: theme.colors.primary,
    },
    celebTitle: {
      fontSize: 30,
      fontWeight: 'bold',
      marginBottom: 10,
      color:  theme.colors.primary,
    },
    celebText: {
      fontSize: 18,
      marginVertical: 5,
      color: theme.colors.onSurface,
    },
    celebTextTotal: {
      fontSize: 24,
      marginVertical: 10,
      color: theme.colors.tertiary,
    },
    celebCloseButton: {
      marginTop: 15,
      padding: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: 5,
    },
    celebCloseButtonText: {
      color: theme.colors.onPrimary,
      fontWeight: 'bold',
    }

  });
};
