import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * A quick match with eight players (0.45.0): the throwing order is visible at
 * setup, the start wheel fits, and during play the whole field, the player at
 * the oche, the next player and the confirm button share one screen.
 */
const API = `http://localhost:${BACKEND_PORT}/api`;

async function setup(page: Page, width: number, height: number, theme: 'modern' | 'modern-light' = 'modern') {
  await page.setViewportSize({ width, height });
  await login(page);
  // The theme is stored per account — set it, or a previous spec decides.
  const auth = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect((await page.request.put(`${API}/settings`, { headers: { Authorization: `Bearer ${auth}` }, data: { theme, language: 'de' } })).ok()).toBeTruthy();
  const s = String(Date.now()).slice(-5);
  const names = ['Ann', 'Ben', 'Cid', 'Dee', 'Eva', 'Fin', 'Gus', 'Hal'].map(n => `${n}${s}`);
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
  return names;
}

async function start(page: Page, names: string[]) {
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await page.getByRole('button', { name: `${names[0]} beginnt` }).click();
  await expect(page.locator('[data-hero="true"]')).toHaveCount(1);
}

const inViewport = async (page: Page, testId: string) => {
  const b = (await page.getByTestId(testId).boundingBox())!;
  const vh = page.viewportSize()!.height;
  expect(b.y, `${testId} above the screen`).toBeGreaterThanOrEqual(-1); // sub-pixel
  expect(b.y + b.height, `${testId} below the screen`).toBeLessThanOrEqual(vh + 1);
};

// Both themes: the light theme's legacy button border once made the input
// 10 px taller and pushed the top row off the screen.
for (const theme of ['modern', 'modern-light'] as const) test(`phone (${theme}): setup shows the order, the wheel fits, the whole field and the input share one screen`, async ({ page }) => {
  const names = await setup(page, 390, 844, theme);
  // The throwing order on the selected tiles.
  const order = page.getByTestId('throw-order');
  await expect(order).toHaveCount(8);
  await expect(page.getByRole('button', { name: new RegExp(names[7]) }).first().getByTestId('throw-order')).toContainText('8');

  // The wheel lists the starters two a line, all on screen.
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  const starters = page.getByTestId('starter-buttons').getByRole('button');
  await expect(starters).toHaveCount(8);
  const first = (await starters.nth(0).boundingBox())!;
  const second = (await starters.nth(1).boundingBox())!;
  expect(Math.abs(first.y - second.y)).toBeLessThan(2);
  // Two equal columns (a wrapping row of pills happened to pair up too, with
  // uneven widths — that was not the point), and the label is the name alone.
  const boxes = await Promise.all([...Array(8).keys()].map(async i => (await starters.nth(i).boundingBox())!));
  expect(new Set(boxes.map(b => Math.round(b.x))).size).toBe(2);
  for (const b of boxes) expect(Math.abs(b.width - boxes[0].width)).toBeLessThan(1);
  await expect(starters.nth(0)).toHaveText(names[0]);
  const last = (await starters.nth(7).boundingBox())!;
  expect(last.y + last.height).toBeLessThanOrEqual(844);
  await page.getByRole('button', { name: `${names[0]} beginnt` }).click();
  await expect(page.locator('[data-hero="true"]')).toHaveCount(1);

  // A full round of typed visits (bots never play here, no waiting).
  for (let i = 0; i < 8; i++) {
    await page.keyboard.type(String(20 + i));
    await page.keyboard.press('Enter');
    await expect(page.getByTestId(`player-card-${names[(i + 1) % 8]}`)).toHaveAttribute('aria-current', 'true');
  }
  // Settled: Ann at the oche again, Ben next.
  await expect(page.getByTestId(`player-card-${names[0]}`)).toHaveAttribute('data-hero', 'true', { timeout: 4000 });
  await expect(page.getByTestId(`player-card-${names[1]}`)).toHaveAttribute('data-next', 'true');
  await expect(page.locator('[data-next="true"]')).toHaveCount(1);
  await page.waitForTimeout(1500); // the dock scrolls in smoothly

  await expect(async () => {
    for (const n of names) await inViewport(page, `player-card-${n}`);
    await inViewport(page, 'input-dock');
  }).toPass({ timeout: 4000 });
  const confirm = (await page.getByRole('button', { name: /Bestätigen/ }).boundingBox())!;
  expect(confirm.y + confirm.height).toBeLessThanOrEqual(845);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});

for (const [w, h] of [[1024, 768], [1440, 900], [1920, 1080]] as const) {
  test(`${w}×${h}: every player is on screen beside the input`, async ({ page }) => {
    const names = await setup(page, w, h);
    await start(page, names);
    await page.keyboard.type('60');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId(`player-card-${names[1]}`)).toHaveAttribute('data-hero', 'true', { timeout: 4000 });
    await expect(page.getByTestId(`player-card-${names[2]}`)).toHaveAttribute('data-next', 'true');
    await expect(async () => {
      for (const n of names) await inViewport(page, `player-card-${n}`);
    }).toPass({ timeout: 4000 });
    const confirm = (await page.getByRole('button', { name: /Bestätigen/ }).boundingBox())!;
    expect(confirm.y + confirm.height).toBeLessThanOrEqual(h);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}
