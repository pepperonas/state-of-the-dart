import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * The game screen per M3 window size class (0.28.0): one pane with the input
 * docked at the bottom on phones, two panes from 840 px, three from 1200 px
 * with the board above the fold, no width cap on very large screens; the
 * player at the oche is the hero card.
 */
const API = `http://localhost:${BACKEND_PORT}/api`;

async function start(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await login(page);
  const s = String(Date.now()).slice(-5);
  const names = ['Ann', 'Ben', 'Cid'].map(n => `${n}${s}`);
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  for (const n of names) {
    const res = await page.request.post(`${API}/players`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id: `e2e-${n.toLowerCase()}`, name: n, avatar: 'target' },
    });
    expect(res.ok()).toBeTruthy();
  }
  await page.goto('/game?new=1');
  for (const n of names) await page.getByRole('button', { name: new RegExp(n) }).first().click();
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await page.getByRole('button', { name: new RegExp(`${names[0]} beginnt`) }).click();
  await expect(page.locator('[data-hero="true"]')).toHaveCount(1);
  return names;
}

const noOverflow = async (page: Page) =>
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);

test('phone: input docked in reach, hero above it, stats in a sheet', async ({ page }) => {
  await start(page, 390, 844);
  const confirm = (await page.getByRole('button', { name: /Bestätigen/ }).boundingBox())!;
  expect(confirm.y + confirm.height).toBeLessThanOrEqual(844);
  const hero = (await page.locator('[data-hero="true"]').boundingBox())!;
  const dock = (await page.getByTestId('input-dock').boundingBox())!;
  expect(hero.y + hero.height).toBeLessThanOrEqual(dock.y + 1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole('button', { name: 'Statistik & Board' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Match-Statistik')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await noOverflow(page);
});

test('the turn passing makes the next player the hero', async ({ page }) => {
  const names = await start(page, 390, 844);
  await expect(page.getByTestId(`player-card-${names[0]}`)).toHaveAttribute('data-hero', 'true');
  await page.keyboard.type('60');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId(`player-card-${names[1]}`)).toHaveAttribute('data-hero', 'true');
  await expect(page.getByTestId(`player-card-${names[0]}`)).not.toHaveAttribute('data-hero', 'true');
  await expect(page.getByTestId(`player-card-${names[0]}`)).toContainText('441');
});

test('tablet landscape: two panes', async ({ page }) => {
  await start(page, 1024, 768);
  await expect(page.locator('[data-panes]')).toHaveAttribute('data-panes', '2');
  await noOverflow(page);
});

test('laptop: three panes, the board above the fold', async ({ page }) => {
  await start(page, 1440, 900);
  await expect(page.locator('[data-panes]')).toHaveAttribute('data-panes', '3');
  const board = (await page.getByTestId('context-pane').locator('svg').first().boundingBox())!;
  expect(board.y).toBeLessThan(900);
  await noOverflow(page);
});

test('very large screen: no narrow width cap, the UI scales up', async ({ page }) => {
  await start(page, 2560, 1440);
  const panes = (await page.locator('[data-panes]').boundingBox())!;
  expect(panes.width).toBeGreaterThan(1800);
  const rootPx = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  expect(rootPx).toBeGreaterThan(16);
  await noOverflow(page);
});

test('a 180 gets the hero moment, a won leg its recap', async ({ page }) => {
  const names = await start(page, 1280, 900);
  await page.keyboard.type('180');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('hero-moment')).toContainText('180');
  // It does not block input: the next player types straight away.
  await page.keyboard.type('0');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('hero-moment')).toHaveCount(0, { timeout: 4000 });
  const close = page.getByRole('button', { name: /Alle schließen|Weiter/ });
  if (await close.count()) await close.first().click();
  for (const s of ['0', '180', '0', '0', '141']) {
    await page.keyboard.type(s);
    await page.keyboard.press('Enter');
  }
  await expect(page.getByTestId('leg-recap')).toContainText('Checkout 141');
  await expect(page.getByTestId(`player-card-${names[1]}`)).toContainText('501');
});
