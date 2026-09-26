import { describe, it, expect } from 'vitest';
import i18n from '../../i18n/config';

/**
 * `<html lang>` was hard-coded to "en" while the app speaks German by default,
 * so screen readers read German text with English pronunciation. It now follows
 * the active language.
 */
describe('document language', () => {
  it('follows the i18n language', async () => {
    await i18n.changeLanguage('de');
    expect(document.documentElement.lang).toBe('de');
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
    await i18n.changeLanguage('de');
    expect(document.documentElement.lang).toBe('de');
  });
});
