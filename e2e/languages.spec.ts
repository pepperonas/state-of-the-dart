import { test, expect } from '@playwright/test';
import { login } from './helpers/login';

/**
 * Italian, Spanish and French (0.50.0) and the public changelog. The
 * language is chosen in the settings, its strings load on demand, and the
 * choice is saved with the account. The test user is set back to German at
 * the end — the other specs read German labels.
 */
const CODE: Record<string, string> = { Deutsch: 'de', Italiano: 'it', 'Español': 'es', 'Français': 'fr' };
/** Picks a language and waits until it is saved and shown. */
const pickLanguage = async (page: import('@playwright/test').Page, current: string | RegExp, next: string) => {
  await page.getByRole('combobox', { name: current }).click();
  const saved = page.waitForResponse(r => r.url().includes('/api/settings') && r.request().method() === 'PUT');
  await page.getByRole('option', { name: next }).click();
  expect((await saved).ok()).toBe(true);
  await expect(page.locator('html')).toHaveAttribute('lang', CODE[next]);
};

test('the app switches to Italian, Spanish and French and remembers it', async ({ page }) => {
  await login(page);
  const lazy: string[] = [];
  page.on('request', r => { if (/\/assets\/(it|es|fr)-[\w-]+\.js$/.test(r.url())) lazy.push(r.url()); });

  try {
    await page.goto('/settings');
    await pickLanguage(page, 'Language / Sprache', 'Italiano');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');
    await expect(page.getByTestId('nav-account').locator('visible=true')).toContainText('Account');

    // Saved with the account: still Italian after a reload.
    await page.goto('/me');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Account');
    await expect(page.locator('html')).toHaveAttribute('lang', 'it');

    await page.goto('/settings');
    await pickLanguage(page, 'Lingua / Language', 'Español');
    await page.goto('/me');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cuenta');

    await page.goto('/settings');
    await pickLanguage(page, 'Idioma / Language', 'Français');
    await page.goto('/me');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Compte');

    // The three files came in on demand, not with the app.
    expect(lazy.length).toBeGreaterThanOrEqual(3);

    // The changelog is English whatever the app speaks; reachable from the account page.
    await page.getByRole('button', { name: /Changelog/ }).click();
    await expect(page).toHaveURL(/\/changelog$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Changelog');
    await expect(page.getByTestId('changelog')).toHaveAttribute('lang', 'en');
    await expect(page.getByTestId('changelog-release').first()).toContainText('Italian, Spanish and French');
  } finally {
    await page.goto('/settings');
    await pickLanguage(page, /Language/, 'Deutsch');
    await page.goto('/me');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Konto');
  }
});

test('signed out: the footer version opens the changelog', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('footer-changelog').first().click();
  await expect(page).toHaveURL(/\/changelog$/);
  await expect(page.getByTestId('changelog-release').first()).toBeVisible();
});

test('signed out: the app starts in the browser language', async ({ browser }) => {
  const ctx = await browser.newContext({ locale: 'it-IT' });
  const page = await ctx.newPage();
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('lang', 'it');
  await ctx.close();
});
