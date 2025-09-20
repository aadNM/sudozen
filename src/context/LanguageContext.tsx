/** src/context/LanguageContext.tsx */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getLocales } from 'expo-localization';
import storage from '../utils/mmkvStorage';
import i18n from '../i18n';
import { logMessage } from '../utils/Logger';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => void;
  supportedLanguages: Array<{
    code: string;
    name: string;
    nativeName: string;
  }>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
];

const STORAGE_KEY = 'selected_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');

  useEffect(() => {
    // Load saved language preference or use device language
    const initializeLanguage = async () => {
      try {
        const savedLanguage = storage.getString(STORAGE_KEY);
        
        if (savedLanguage && SUPPORTED_LANGUAGES.some(lang => lang.code === savedLanguage)) {
          // Use saved language preference
          await i18n.changeLanguage(savedLanguage);
          setCurrentLanguage(savedLanguage);
        } else {
          // Use device language if supported, otherwise fallback to English
          const deviceLanguage = getLocales()[0]?.languageCode || 'en';
          const supportedDeviceLanguage = SUPPORTED_LANGUAGES.find(lang => lang.code === deviceLanguage);
          const languageToUse = supportedDeviceLanguage ? deviceLanguage : 'en';
          
          await i18n.changeLanguage(languageToUse);
          setCurrentLanguage(languageToUse);
          storage.set(STORAGE_KEY, languageToUse);
        }
      } catch (error) {
        logMessage('warn', 'initializing language:', { error });
        // Fallback to English on error
        await i18n.changeLanguage('en');
        setCurrentLanguage('en');
        storage.set(STORAGE_KEY, 'en');
      }
    };

    initializeLanguage();

    // Listen for language changes from i18n
    const handleLanguageChange = (lng: string) => {
      setCurrentLanguage(lng);
    };

    i18n.on('languageChanged', handleLanguageChange);

    // Cleanup listener on unmount
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, []);

  const changeLanguage = async (language: string) => {
    if (SUPPORTED_LANGUAGES.some(lang => lang.code === language)) {
      try {
        await i18n.changeLanguage(language);
        setCurrentLanguage(language);
        storage.set(STORAGE_KEY, language);
      } catch (error) {
        logMessage('warn', 'Error changing language:', { error });
      }
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        changeLanguage,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};