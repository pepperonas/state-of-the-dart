import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * A whole X01 round trip: start a match, score a visit, leave with
 * "pause & leave", and pick it up again from the resume screen.
 *
 * Guards two things at once: leaving goes through the router (it used to be
 * a hard page reload), and the paused match really reaches the database.
 */

const API = `http://localhost:${BACKEND_PORT}/api`;

async function createPlayer(page: Page, name: string): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const id = `e2e-${name.toLowerCase()}-${Date.now()}`;
  const res = await page.request.post(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { id, name, avatar: 'target' },
  });
  expect(res.ok(), `create ${name}: ${res.status()} ${await res.text()}`).toBeTruthy();
}

test('start, score, pause & leave without a reload, then resume', async ({ page }) => {
  await login(page);
  const suffix = String(Date.now()).slice(-5);
  const alice = `Alice${suffix}`;
  const bob = `Bob${suffix}`;
  await createPlayer(page, alice);
  await createPlayer(page, bob);

  await page.goto('/game?new=1');
  await page.getByRole('button', { name: new RegExp(alice) }).first().click();
  await page.getByRole('button', { name: new RegExp(bob) }).first().click();
  await page.getByRole('button', { name: /Spiel starten/i }).click();

  // Skip the spinner — Alice starts.
  await page.getByRole('button', { name: new RegExp(`${alice} beginnt`) }).click();

  // Score 60 on the numpad: type and Enter commits the visit.
  await expect(page.getByText('501').first()).toBeVisible();
  await page.keyboard.type('60');
  await page.keyboard.press('Enter');
  await expect(page.getByText('441').first()).toBeVisible();

  // Marker that survives client-side navigation but not a reload.
  await page.evaluate(() => { (window as unknown as { __noReload: boolean }).__noReload = true; });

  await page.getByRole('button', { name: /^Zurück$/ }).first().click();
  const saved = page.waitForResponse(r => r.url().includes('/api/matches') && r.request().method() !== 'GET');
  await page.getByRole('button', { name: /Pausieren & verlassen/i }).click();
  await saved;

  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

  // Resume from the database.
  await page.goto('/resume');
  await page.getByText(new RegExp(alice)).first().click();
  const resume = page.getByRole('button', { name: /Fortsetzen/i }).first();
  if (await resume.isVisible()) await resume.click();
  await expect(page).toHaveURL(/\/game/);
  await expect(page.getByText('441').first()).toBeVisible();
});
