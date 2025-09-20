/** /src/styles.Global.styles.ts */

import { StyleSheet } from "react-native";
import { useTheme } from '../context/ThemeContext';
import { useTypography } from './Typography';

export const useGlobalStyles = () => {
  const { theme } = useTheme();
  const typography = useTypography();

  return StyleSheet.create({
    container: { 
      flex: 1, 
      alignItems: "center", 
      justifyContent: "center",
      backgroundColor: theme.colors.background,
    },
    title: {
      ...typography.title,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      width: 300,
      padding: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
    },
    modalTitle: {
      ...typography.title,
      marginBottom: 20,
      textAlign: "center",
    },
    modalButton: {
      padding: 10,
      marginBottom: 10,
      backgroundColor: theme.colors.primary,
      borderRadius: 5,
      alignItems: "center",
    },
    buttonContainer: {
      marginTop: 20,
      flexDirection: "row",
      justifyContent: "space-between",
      width: "80%",
    },
    buttonText: {
      ...typography.button,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
  });
};