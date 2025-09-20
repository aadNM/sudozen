/** /src/context/ThemeContext.tsx */

import React, { createContext, useContext, useState, useEffect } from "react";
import storage from "../utils/mmkvStorage";
import { Theme, themes } from "../styles/Themes";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: themes.light,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeName] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = storage.getString("theme");
    if (stored === "dark" || stored === "light") setThemeName(stored);
  }, []);

  const toggleTheme = () => {
    const newTheme = themeName === "light" ? "dark" : "light";
    setThemeName(newTheme);
    storage.set("theme", newTheme);
  };

  const value = {
    theme: themes[themeName],
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
