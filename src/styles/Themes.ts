/** /src/styles/Themes.ts */

export type Theme = {
  name: string;
  colors: {
    background: string;
    surface: string;
    primary: string;
    onPrimary: string;      
    onSurface: string;      
    secondary: string;
    tertiary: string;
    onTertiary: string;
    text: string;
    selectedCell: string;
    preFilled: string;
    userFilled: string;
    error: string;
  };
};

export const LightTheme: Theme = {
  name: "light",
  colors: {
    background: "#F8F9FA",
    surface: "#FFFFFF",
    primary: "#4A6FA5",
    onPrimary: "#FFFFFF",          
    onSurface: "#343A40",          
    secondary: "#6C757D",
    tertiary: "#FFD580",
    onTertiary: "#000000",
    text: "#343A40",
    selectedCell: "#BBE1FA",
    preFilled: "#495057",
    userFilled: "#f0863aff",
    error: "#DC143C",
  },
};

export const DarkTheme: Theme = {
  name: "dark",
  colors: {
    background: "#121212",
    surface: "#1E1E1E",
    primary: "#6A4C93",
    onPrimary: "#FFFFFF",         
    onSurface: "#E9ECEF",         
    secondary: "#6A8EAE",
    tertiary: "#FFB347",
    onTertiary: "#121212",
    text: "#E9ECEF",
    selectedCell: "#0077B6",
    preFilled: "#ADB5BD",
    userFilled: "#F8C537",
    error: "#DC143C",
  },
};

export const themes = {
  light: LightTheme,
  dark: DarkTheme,
};
