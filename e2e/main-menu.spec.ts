import { test, expect } from '@playwright/test';
import { login } from './helpers/login';

// React Router's <Navigate> redirect throws an internal signal that surfaces
// as a console error. It's not a real bug; filter it out.
const IGNORABLE_ERRORS = [/^Error: Redirecting/];

test.describe('Main menu after login', () => {
  test('renders quick-match entry and other game-mode tiles', async ({ page }) => {
    await login(page);

    // Match the German labels (default locale). They live in i18n DE.
    await expect(page.getByRole('heading', { name: /State of the Dart/i }).first()).toBeVisible();
    await expect(page.getByText(/Cricket/i).first()).toBeVisible();
    await expect(page.getByText(/Around the Clock/i).first()).toBeVisible();
    await expect(page.getByText(/Shanghai/i).first()).toBeVisible();
  });

  test('navigates to /game?new=1 without uncaught exceptions', async ({ page }) => {
    // Be strict about uncaught exceptions (real bugs), tolerant of transient
    // console errors during context boot / route transitions (PlayerContext +
    // SettingsContext fire fetches concurrently with auth state propagation;
    // a single "Failed to fetch" can show before the JWT settles).
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(String(err)));

    await login(page);
    await page.goto('/game?new=1');
    await expect(page).toHaveURL(/\/game/);
    await page.waitForLoadState('networkidle');

    const real = pageErrors.filter((e) => !IGNORABLE_ERRORS.some((re) => re.test(e)));
    expect(real, `Uncaught exceptions:\n${real.join('\n')}`).toEqual([]);
  });
});
