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

  // Place in the leg: Ann 441 → 1, Ben 456 → 2, Cid and Dan still on 501 share 3.
  const rank = (n: string) => page.getByTestId(`player-card-${n}`).getByTestId('leg-rank');
  await expect(rank(names[0])).toHaveAttribute('data-rank', '1');
  await expect(rank(names[1])).toHaveAttribute('data-rank', '2');
  await expect(rank(names[2])).toHaveAttribute('data-rank', '3');
  await expect(rank(names[3])).toHaveAttribute('data-rank', '3');

  // Three panes (1440 px): the whole scoreboard sits left of the input — the
  // player at the oche as the hero card on top, the others as rows.
  const box = async (name: string) => (await page.getByTestId(`player-card-${name}`).boundingBox())!;
  const input = (await page.getByRole('radiogroup', { name: 'Eingabemodus' }).first().boundingBox())!;
  for (const n of names) {
    const b = await box(n);
    expect(b.x + b.width).toBeLessThan(input.x);
  }
  await expect(page.getByTestId(`player-card-${names[2]}`)).toHaveAttribute('data-hero', 'true');

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

  // The insights below the game: all four cards at once on a desktop, in two
  // columns, so the space left of the board is used. 0.19.0 deleted two of
  // them by accident and no test noticed.
  const grid = page.getByTestId('insights-grid');
  await grid.scrollIntoViewIfNeeded();
  for (const id of ['stats', 'history', 'chart', 'heatmap']) await expect(grid.getByTestId(`insight-${id}`)).toBeVisible();
  const stats = (await grid.getByTestId('insight-stats').boundingBox())!;
  const heat = (await grid.getByTestId('insight-heatmap').boundingBox())!;
  expect(heat.x).toBeGreaterThan(stats.x + stats.width - 1); // side by side
  expect(Math.abs(heat.y - stats.y)).toBeLessThan(2);
  await expect(page.getByText('Wurf #1').first()).toBeVisible();
  await expect(page.locator('.recharts-line-dots circle').first()).toBeVisible({ timeout: 10_000 });
  // Ann only typed a total: her heatmap says so (0.32.0). Cid's dart was exact.
  const heatCard = grid.getByTestId('insight-heatmap');
  await expect(heatCard.getByTestId('heatmap-only-typed')).toBeVisible();
  await heatCard.getByRole('button', { name: names[2] }).click();
  await expect(heatCard.getByTestId('heatmap-board')).toBeVisible();
});
