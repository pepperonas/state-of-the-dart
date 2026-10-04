import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * A browser refresh in the middle of a match loses nothing: the scores, whose
 * turn it is and the darts already entered for the current visit come back,
 * straight into the game (not the setup screen). With four players the desktop
 * layout puts players 3 and 4 in the right column.
 */

const API = `http://localhost:${BACKEND_PORT}/api`;

async function createPlayer(page: Page, name: string) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const res = await page.request.post(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { id: `e2e-${name.toLowerCase()}`, name, avatar: 'target' },
  });
  expect(res.ok()).toBeTruthy();
}

const visible = (page: Page, text: string) => page.getByText(text, { exact: true }).locator('visible=true').first();

test('a refresh mid-match keeps scores, turn and the darts of the current visit', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const s = String(Date.now()).slice(-5);
  const names = ['Ann', 'Ben', 'Cid', 'Dee'].map(n => `${n}${s}`);
  for (const n of names) await createPlayer(page, n);

  await page.goto('/game?new=1');
  for (const n of names) await page.getByRole('button', { name: new RegExp(n) }).first().click();
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await page.getByRole('button', { name: new RegExp(`${names[0]} beginnt`) }).click();

  // Ann scores 60, Ben 45.
  await expect(visible(page, '501')).toBeVisible();
  await page.keyboard.type('60');
  await page.keyboard.press('Enter');
  await expect(visible(page, '441')).toBeVisible();
  const active = (n: string) => expect(page.getByTestId(`player-card-${n}`)).toHaveAttribute('aria-current', 'true');
  await active(names[1]);
  await page.keyboard.type('45');
  await page.keyboard.press('Enter');
  await expect(visible(page, '456')).toBeVisible();
  await active(names[2]);

  // The glowing board marks the leg leader (Ann, 441), not the player up (Cid).
  await expect(page.getByTestId(`player-card-${names[0]}`).getByTestId('leg-leader')).toBeVisible();
  await expect(page.getByTestId(`player-card-${names[2]}`).getByTestId('leg-leader')).toHaveCount(0);

  // Desktop: players 1+2 left of the input, 3+4 right of it.
  const box = async (name: string) => (await page.getByTestId(`player-card-${name}`).boundingBox())!;
  const input = (await page.getByRole('radiogroup', { name: 'Eingabemodus' }).first().boundingBox())!;
  expect((await box(names[0])).x).toBeLessThan(input.x);
  expect((await box(names[1])).x).toBeLessThan(input.x);
  expect((await box(names[2])).x).toBeGreaterThan(input.x + input.width);
  expect((await box(names[3])).x).toBeGreaterThan(input.x + input.width);

  // Cid enters one dart (T20) without confirming the visit yet.
  await page.getByRole('radio', { name: 'Darts' }).click();
  await page.getByRole('radio', { name: /Triple/ }).click();
  await page.getByRole('button', { name: 'Triple 20' }).click();
  await expect(page.getByTestId('dart-slot-0')).toContainText('60');

  await page.reload();

  // Straight back into the game, nothing lost.
  await expect(page.getByRole('button', { name: /Spiel starten/i })).toHaveCount(0);
  await expect(visible(page, '441')).toBeVisible();
  await expect(visible(page, '456')).toBeVisible();
  await expect(page.getByTestId('dart-slot-0')).toContainText('60');
  await active(names[2]);

  // Finishing the visit after the refresh counts the restored dart.
  await page.getByRole('radio', { name: 'Numpad' }).click();
  await page.getByRole('button', { name: /Bestätigen/ }).click();
  await active(names[3]);
  expect(await page.getByTestId(`player-card-${names[2]}`).textContent()).toContain('441'); // Cid: 501 - 60

  // The sections below the game: visit history, throw charts, live heatmap.
  // 0.19.0 deleted the first two by accident and no test noticed.
  await page.getByRole('button', { name: /Wurf-Verlauf/ }).first().click();
  await expect(page.getByText("Wurf #1").first()).toBeVisible();
  await page.getByRole('button', { name: /Wurf-Statistik/ }).first().click();
  await expect(page.locator('.recharts-line-dots circle').first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /Live-Heatmap/ }).first().click();
  await expect(page.getByTestId('heatmap-board')).toBeVisible();
});
