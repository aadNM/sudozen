/** /src/styles.Typography.ts */

import { TextStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const useTypography = (): { [key: string]: TextStyle } => {
  const { theme } = useTheme();

  return {
    heading: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    body: {
      fontSize: 16,
      color: theme.colors.text,
    },
    bodyBold: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    small: {
      fontSize: 12,
      color: theme.colors.secondary,
    },
    caption: {
      fontSize: 10,
      color: theme.colors.text,
      textAlign: 'center',
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.onPrimary,
    },
    error: {
      fontSize: 12,
      color: theme.colors.error, 
    },
    timer: {
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginVertical: 1,
      color: theme.colors.text,
    },
  };
};
