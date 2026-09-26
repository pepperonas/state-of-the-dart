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

/** `<html lang>` follows the active language — screen readers pick their voice from it. */
const syncDocumentLang = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng.split('-')[0];
};
syncDocumentLang(i18n.language || 'de');
i18n.on('languageChanged', syncDocumentLang);

export default i18n;
