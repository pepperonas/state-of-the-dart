import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationDE from './locales/de.json';
import translationEN from './locales/en.json';

const resources = {
  de: {
    translation: translationDE
  },
  en: {
    translation: translationEN
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'de',
    lng: 'de', // Default language (will be overridden by SettingsContext)
    interpolation: {
      escapeValue: false // React already does escaping
    },
    // Don't use language detector - we control it via Settings
    react: {
      useSuspense: false
    }
  });

export default i18n;
