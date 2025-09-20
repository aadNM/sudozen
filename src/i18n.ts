/** src/i18n.ts */


import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import nl from './locales/nl.json';
import ha from './locales/ha.json';
import sw from './locales/sw.json';
import zh from './locales/zh.json';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  nl: { translation: nl },
  ha: { translation: ha },
  sw: { translation: sw },
  zh: { translation: zh },
};

// Get device language
const deviceLanguage = getLocales()[0]?.languageCode || 'en';

const supportedLanguages = ['en', 'fr', 'es', 'nl', 'ha', 'sw', 'zh'];

const fallbackLanguage = supportedLanguages.includes(deviceLanguage) 
  ? deviceLanguage 
  : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: fallbackLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v4',
  });

export default i18n;