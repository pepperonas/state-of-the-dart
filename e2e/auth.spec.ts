import { test, expect } from '@playwright/test';
import { TEST_USER } from './fixtures';

/**
 * Real-auth E2E: hits the isolated backend seeded in global-setup.
 * Verifies that valid credentials → JWT issued → user lands on main menu.
 */
test.describe('Auth flow (real backend)', () => {
  test('login with seeded credentials lands on main menu', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill(TEST_USER.password);

    const loginResponse = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST'
    );
    await page.locator('form button[type="submit"]').first().click();
    const resp = await loginResponse;

    expect(resp.status(), 'POST /api/auth/login should return 200').toBe(200);

    // After login, the app should leave /login.
    await expect(page).not.toHaveURL(/\/login$/, { timeout: 10_000 });

    // JWT should be in localStorage under the key the frontend uses.
    const tokenInStorage = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        if (key.toLowerCase().includes('token') || key.toLowerCase().includes('auth')) {
          return { key, hasValue: !!localStorage.getItem(key) };
        }
      }
      return null;
    });
    expect(tokenInStorage, 'auth token must persist in localStorage').not.toBeNull();
    expect(tokenInStorage!.hasValue).toBe(true);
  });

  test('login with wrong password stays on /login', async ({ page }) => {
    await page.goto('/login');

    await page.locator('input[type="email"]').fill(TEST_USER.email);
    await page.locator('input[type="password"]').fill('definitely-not-the-right-password');

    const loginResponse = page.waitForResponse(
      (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST'
    );
    await page.locator('form button[type="submit"]').first().click();
    const resp = await loginResponse;

    expect(resp.status(), 'wrong password should be rejected').toBe(401);
    await expect(page).toHaveURL(/\/login$/);
  });
});
