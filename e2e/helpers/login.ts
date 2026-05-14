import type { Page } from '@playwright/test';
import { TEST_USER } from '../fixtures';

/**
 * Log in using the seeded test user. Resolves once the app has left /login.
 * Callers receive control on whatever post-login route the app chose.
 */
export async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(TEST_USER.email);
  await page.locator('input[type="password"]').fill(TEST_USER.password);

  const loginPromise = page.waitForResponse(
    (r) => r.url().includes('/api/auth/login') && r.request().method() === 'POST'
  );
  await page.locator('form button[type="submit"]').first().click();
  const resp = await loginPromise;

  if (resp.status() !== 200) {
    throw new Error(`Login failed: ${resp.status()} ${await resp.text()}`);
  }

  // Wait for redirect away from /login (router uses <Navigate>).
  await page.waitForURL((url) => !/\/login$/.test(url.pathname), { timeout: 10_000 });
}
