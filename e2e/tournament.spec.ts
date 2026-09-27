import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

const API = `http://localhost:${BACKEND_PORT}/api`;

/**
 * Tournaments live in the database since 0.16.0. Before, a reload lost the
 * whole bracket. This drives the real UI across two reloads.
 */
test('a tournament and its half-entered score survive a reload', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page);
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const tag = String(Date.now()).slice(-5);
  const names = ['Tia', 'Udo', 'Vic', 'Wes'].map(n => `${n}${tag}`);
  for (const name of names) {
    const res = await page.request.post(`${API}/players`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id: `${name}-id`, name, avatar: 'target' },
    });
    expect(res.ok()).toBeTruthy();
  }

  await page.goto('/tournament');
  await page.getByRole('button', { name: /Neues Turnier erstellen/ }).click();
  await page.getByLabel(/Turniername/).fill(`Cup ${tag}`);
  // Legs to win: 2
  await page.getByRole('button', { name: '2', exact: true }).click();
  // The player cards are keyboard controls now (role=button, aria-pressed).
  for (const name of names) await page.getByRole('button', { name: new RegExp(name) }).click();
  await page.getByRole('button', { name: /Turnier starten/ }).click();

  // One leg for the first player of the current match, then reload before confirming.
  const plus = page.getByRole('button', { name: /Leg hinzufügen/ }).first();
  await plus.click();
  await page.waitForTimeout(1200); // debounced save (600 ms)
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Laufende Turniere' })).toBeVisible();
  await page.getByRole('button', { name: 'Fortsetzen' }).first().click();
  await expect(page.getByRole('heading', { name: `Cup ${tag}` })).toBeVisible();
  // The half-entered leg is still there: one more leg wins the match.
  await plus.click();
  await page.getByRole('button', { name: /Match bestätigen/ }).click();
  await page.waitForTimeout(500);
  await page.reload();

  await page.getByRole('button', { name: 'Fortsetzen' }).first().click();
  // One of four matches decided — and it stayed decided across the reload.
  const res = await page.request.get(`${API}/tournaments`, { headers: { Authorization: `Bearer ${token}` } });
  const [saved] = (await res.json()).filter((t: { name: string }) => t.name === `Cup ${tag}`);
  expect(saved.matches.filter((m: { winner?: string }) => m.winner).length).toBe(1);
  expect(saved.status).toBe('in-progress');
});
