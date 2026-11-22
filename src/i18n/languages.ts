/** The app's languages (0.50.0). Labels are each language's own name. */
export const APP_LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
] as const;

export type AppLanguage = typeof APP_LANGUAGES[number]['code'];

export const DEFAULT_LANGUAGE: AppLanguage = 'de';

export const isAppLanguage = (v: unknown): v is AppLanguage =>
  typeof v === 'string' && APP_LANGUAGES.some(l => l.code === v);

/**
 * Language for someone without saved settings: the browser's first supported
 * language, else English for any other language, German when nothing is known.
 */
export const languageFromBrowser = (preferred: readonly string[] | undefined): AppLanguage => {
  if (!preferred || preferred.length === 0) return DEFAULT_LANGUAGE;
  for (const p of preferred) {
    const base = p.toLowerCase().split('-')[0];
    if (isAppLanguage(base)) return base;
  }
  return 'en';
};
