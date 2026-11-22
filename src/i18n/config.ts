import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationDE from './locales/de.json';
import translationEN from './locales/en.json';
import { DEFAULT_LANGUAGE, isAppLanguage, type AppLanguage } from './languages';

/**
 * German and English ship with the app; Italian, Spanish and French (0.50.0)
 * load on first use — each is ~150 KB and most players never need them.
 */
const LAZY: Record<Exclude<AppLanguage, 'de' | 'en'>, () => Promise<{ default: Record<string, unknown> }>> = {
  it: () => import('./locales/it.json'),
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: translationDE },
      en: { translation: translationEN },
    },
    // A missing key in it/es/fr falls back to English, then German.
    fallbackLng: { it: ['en'], es: ['en'], fr: ['en'], default: ['de'] },
    lng: DEFAULT_LANGUAGE, // overridden by SettingsContext
    interpolation: {
      escapeValue: false // React already does escaping
    },
    react: {
      useSuspense: false
    }
  });

/** Loads the language's strings if needed, then switches to it. */
export const changeAppLanguage = async (lng: string): Promise<void> => {
  const lang: AppLanguage = isAppLanguage(lng) ? lng : DEFAULT_LANGUAGE;
  if (lang in LAZY && !i18n.hasResourceBundle(lang, 'translation')) {
    try {
      const mod = await LAZY[lang as keyof typeof LAZY]();
      i18n.addResourceBundle(lang, 'translation', mod.default, true, true);
    } catch {
      // Offline before the file was cached: stay in the current language.
      return;
    }
  }
  await i18n.changeLanguage(lang);
};

/** `<html lang>` follows the active language — screen readers pick their voice from it. */
const syncDocumentLang = (lng: string) => {
  if (typeof document !== 'undefined') document.documentElement.lang = lng.split('-')[0];
};
syncDocumentLang(i18n.language || DEFAULT_LANGUAGE);
i18n.on('languageChanged', syncDocumentLang);

export default i18n;
