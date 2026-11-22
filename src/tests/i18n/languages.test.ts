import { describe, it, expect } from 'vitest';
import { languageFromBrowser, isAppLanguage, APP_LANGUAGES } from '../../i18n/languages';

describe('app languages (0.50.0)', () => {
  it('offers German, English, Italian, Spanish and French', () => {
    expect(APP_LANGUAGES.map(l => l.code)).toEqual(['de', 'en', 'it', 'es', 'fr']);
  });
  it('picks the first supported browser language', () => {
    expect(languageFromBrowser(['it-IT', 'en'])).toBe('it');
    expect(languageFromBrowser(['pl-PL', 'fr-CA'])).toBe('fr');
    expect(languageFromBrowser(['es-419'])).toBe('es');
  });
  it('English for an unsupported browser language, German when nothing is known', () => {
    expect(languageFromBrowser(['pl-PL'])).toBe('en');
    expect(languageFromBrowser([])).toBe('de');
    expect(languageFromBrowser(undefined)).toBe('de');
  });
  it('validates stored values', () => {
    expect(isAppLanguage('fr')).toBe(true);
    expect(isAppLanguage('nl')).toBe(false);
    expect(isAppLanguage(null)).toBe(false);
  });
});
