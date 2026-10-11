import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * TV / second-screen scoreboard (0.31.0): the game screen publishes, the
 * scoreboard window on the same device follows every visit at once — without
 * a reload and without writing anything back.
 */
const API = `http://localhost:${BACKEND_PORT}/api`;

test('the scoreboard window follows the match live and shows its moments', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const s = String(Date.now()).slice(-5);
  const names = ['Ann', 'Ben'].map(n => `${n}${s}`);
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  for (const n of names) {
    const res = await page.request.post(`${API}/players`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id: `e2e-sb-${n.toLowerCase()}`, name: n, avatar: 'target' },
    });
    expect(res.ok()).toBeTruthy();
  }

  // Opened before any match exists: it waits.
  const board = await page.context().newPage();
  await board.setViewportSize({ width: 1920, height: 1080 });
  await board.goto('/scoreboard');
  await expect(board.getByTestId('scoreboard-waiting')).toBeVisible();

  await page.goto('/game?new=1');
  for (const n of names) await page.getByRole('button', { name: new RegExp(n) }).first().click();
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await page.getByRole('button', { name: new RegExp(`${names[0]} beginnt`) }).click();

  // The match appears on the waiting window without a reload.
  await expect(board.getByTestId('scoreboard-active-name')).toHaveText(names[0]);
  await expect(board.getByTestId('scoreboard-format')).toContainText('501');

  // The game screen offers the second screen.
  await expect(page.getByRole('button', { name: 'Auf zweitem Bildschirm öffnen' })).toBeVisible();

  await page.keyboard.type('60');
  await page.keyboard.press('Enter');
  await expect(board.getByTestId('scoreboard-active-name')).toHaveText(names[1]);
  await expect(board.getByTestId(`scoreboard-row-${names[0]}`)).toContainText('441');
  await expect(board.getByTestId(`scoreboard-row-${names[1]}`)).toHaveAttribute('aria-current', 'true');
  const visit = board.getByTestId('scoreboard-moment');
  await expect(visit).toHaveAttribute('data-kind', 'visit');
  await expect(visit).toContainText('60');

  await page.keyboard.type('180');
  await page.keyboard.press('Enter');
  await expect(board.locator('[data-testid="scoreboard-moment"][data-kind="180"]')).toBeVisible();
  await expect(board.getByTestId(`scoreboard-row-${names[1]}`)).toContainText('321');

  // A reopened window shows the match at once, from the stored copy.
  await board.reload();
  await expect(board.getByTestId('scoreboard-active-name')).toHaveText(names[0]);
  await expect(board.getByTestId(`scoreboard-row-${names[1]}`)).toContainText('321');

  // No horizontal scroll on the TV page.
  expect(await board.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  await board.screenshot({ path: 'test-results/scoreboard-1080p.png' });
});
