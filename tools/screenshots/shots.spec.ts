import { test, expect, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { login } from '../../e2e/helpers/login';
import { BACKEND_PORT } from '../../e2e/fixtures';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const API = `http://localhost:${BACKEND_PORT}/api`;
const PLAYERS = [
  { id: 'shot-anna', name: 'Anna', avatar: 'trophy' },
  { id: 'shot-ben', name: 'Ben', avatar: 'flame' },
  { id: 'shot-chris', name: 'Chris', avatar: 'rocket' },
];

test.use({ deviceScaleFactor: 2, reducedMotion: 'no-preference' });

const shot = (page: Page, name: string, fullPage = false) =>
  page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage, animations: 'allow' });

/** Settles staggered entrances and number tallies before a capture. */
const settle = (page: Page, ms = 1200) => page.waitForTimeout(ms);

async function visit(page: Page, total: number) {
  await page.keyboard.type(String(total));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(350);
}

async function closeToasts(page: Page) {
  const all = page.getByRole('button', { name: /Alle schließen/ });
  if (await all.count()) await all.first().click().catch(() => undefined);
  await page.mouse.click(30, 880);
  await page.waitForTimeout(300);
}

async function setup(page: Page, names: string[], opts: { start?: number; legs?: number } = {}) {
  await page.goto('/game?new=1');
  // The last players come preselected (one-tap rematch): set exactly these.
  await page.waitForTimeout(600);
  for (const tile of await page.locator('button[aria-pressed="true"]').all()) {
    const label = (await tile.textContent()) ?? '';
    if (!names.some(n => label.includes(n))) await tile.click();
  }
  for (const n of names) {
    const tile = page.locator('button[aria-pressed]', { hasText: n }).first();
    if ((await tile.getAttribute('aria-pressed')) !== 'true') await tile.click();
  }
  if (opts.start) {
    await page.getByRole('combobox', { name: 'Startpunkte' }).click();
    await page.getByRole('option', { name: String(opts.start), exact: true }).click();
  }
  if (opts.legs) {
    await page.getByRole('combobox', { name: 'Legs zum Sieg' }).click();
    await page.getByRole('option', { name: new RegExp(` ${opts.legs}$`) }).click();
  }
  await page.getByRole('button', { name: /Spiel starten/i }).click();
}

test('screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  for (const p of PLAYERS) {
    const res = await page.request.post(`${API}/players`, { headers: { Authorization: `Bearer ${token}` }, data: p });
    expect(res.ok()).toBeTruthy();
  }

  // ── A finished 301 match, so statistics, history and the heatmap have data.
  await setup(page, ['Anna', 'Ben'], { start: 301, legs: 1 });
  await page.getByRole('button', { name: /Anna beginnt/ }).click();
  await settle(page);
  for (const v of [140, 100, 140, 85]) await visit(page, v);
  await visit(page, 21);
  await settle(page, 2500);
  // Achievements of the match take centre stage first; "Weiter" clears them.
  for (let i = 0; i < 3; i++) {
    const next = page.getByRole('button', { name: /^Weiter$/ });
    if (await next.count()) await next.first().click().catch(() => undefined);
    await page.waitForTimeout(600);
  }
  await settle(page, 1500);
  await shot(page, 'match-won');

  // ── The wheel, mid-result.
  await setup(page, ['Anna', 'Ben', 'Chris']);
  await expect(page.getByTestId('spinner-wheel')).toBeVisible();
  await page.waitForTimeout(700);
  await shot(page, 'wheel-intro');
  await expect(page.getByTestId('spinner-wheel')).toHaveAttribute('data-phase', 'result', { timeout: 15_000 });
  await page.waitForTimeout(500);
  await shot(page, 'wheel-result');
  await page.getByRole('dialog').locator('> div').first().screenshot({ path: path.join(OUT, 'wheel-dialog.png'), animations: 'allow' });
  await page.waitForTimeout(3000);
  // Whoever the wheel picked: play to an interesting board.
  await expect(page.locator('[data-hero="true"]')).toHaveCount(1, { timeout: 10_000 });

  // ── Scoreboard window opened beside the game.
  const board = await page.context().newPage();
  await board.setViewportSize({ width: 1920, height: 1080 });
  await board.goto('/scoreboard');

  for (const v of [60, 45, 100, 81, 140, 60, 100, 41]) await visit(page, v);
  await closeToasts(page);
  await settle(page, 1800);
  await shot(page, 'game-desktop');

  // Insights below the panes.
  await page.getByTestId('insights-grid').scrollIntoViewIfNeeded();
  await settle(page, 1500);
  await page.getByTestId('insights-grid').screenshot({ path: path.join(OUT, 'insights.png'), animations: 'allow' });
  await page.evaluate(() => window.scrollTo(0, 0));

  await board.bringToFront();
  await settle(board, 1500);
  await shot(board, 'scoreboard-tv');

  // A 180, seen on the TV: the board window stays in front while the game
  // page takes the visit (keyboard input reaches a background page).
  await visit(page, 180);
  await board.waitForTimeout(500);
  await shot(board, 'scoreboard-180');
  await board.close();
  await page.bringToFront();
  await page.bringToFront();
  await page.waitForTimeout(2500);
  await closeToasts(page);

  // ── Phone: the docked input.
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(page, 1500);
  await shot(page, 'game-phone');
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Other screens.
  for (const [route, name] of [
    ['/', 'home'], ['/stats', 'stats'], ['/achievements', 'achievements'], ['/players', 'players'],
    ['/leaderboard', 'leaderboard'], ['/training', 'training'], ['/match-history', 'history'],
  ] as const) {
    await page.goto(route);
    await settle(page, 2200);
    await closeToasts(page);
    await shot(page, name);
  }

});
