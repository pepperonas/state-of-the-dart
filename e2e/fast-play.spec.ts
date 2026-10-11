import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * Quick play: visits typed back to back, the way two people at the oche
 * actually enter them. Before 0.25.0 the turn only passed one second after a
 * confirm, and a visit typed inside that second was booked to the previous
 * player.
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

async function startMatch(page: Page) {
  await login(page);
  const s = String(Date.now()).slice(-5);
  const [ann, ben] = [`Ann${s}`, `Ben${s}`];
  await createPlayer(page, ann);
  await createPlayer(page, ben);
  await page.goto('/game?new=1');
  await page.getByRole('button', { name: new RegExp(ann) }).first().click();
  await page.getByRole('button', { name: new RegExp(ben) }).first().click();
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await page.getByRole('button', { name: new RegExp(`${ann} beginnt`) }).click();
  await expect(page.getByTestId(`player-card-${ann}`).or(page.getByTestId(`strip-${ann}`)).first())
    .toHaveAttribute('aria-current', 'true');
  return { ann, ben };
}

/** Types a visit and confirms it without waiting for anything. */
const type = async (page: Page, score: string) => {
  await page.keyboard.type(score);
  await page.keyboard.press('Enter');
};

/** Closes achievement notifications if any are open. */
const clearAchievements = async (page: Page) => {
  const stage = page.getByTestId('achievement-stage');
  if (await stage.count()) {
    const next = page.getByRole('button', { name: 'Weiter' });
    if (await next.count()) await next.click();
    else await page.getByRole('button', { name: /Alle schließen|Schließen/ }).first().click();
  }
};

test('visits typed back to back land with the right player', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const { ann, ben } = await startMatch(page);

  // No waiting for the turn indicator between visits.
  await type(page, '60');
  await type(page, '45');
  await type(page, '100');
  await type(page, '26');

  await expect(page.getByTestId(`player-card-${ann}`)).toContainText('341');
  await expect(page.getByTestId(`player-card-${ben}`)).toContainText('430');
  await expect(page.getByTestId(`player-card-${ann}`)).toHaveAttribute('aria-current', 'true');
});

test('a bust never shows a negative remaining score', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const { ann } = await startMatch(page);
  // Ann to 21: 180 + 180 + 120 (Ben throws 0 in between).
  for (const s of ['180', '0', '180', '0', '120', '0']) await type(page, s);
  await clearAchievements(page);
  await expect(page.getByTestId(`player-card-${ann}`)).toContainText('21');

  await page.getByRole('radio', { name: 'Darts' }).click();
  await page.getByRole('radio', { name: /Triple/ }).click();
  await page.getByRole('button', { name: 'Triple 20' }).click();

  // Sample the card while the bust waits for its auto-confirm.
  const seen = await page.evaluate(async (id) => {
    const out: string[] = [];
    const end = performance.now() + 1200;
    while (performance.now() < end) {
      out.push(document.querySelector(`[data-testid="${id}"]`)?.textContent ?? '');
      await new Promise(r => requestAnimationFrame(r));
    }
    return out;
  }, `player-card-${ann}`);
  expect(seen.some(t => /-\d|−\d/.test(t))).toBe(false);
  await expect(page.getByTestId(`player-card-${ann}`)).toContainText('21');
});

test('the leg-won overlay closes on a tap', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await startMatch(page);
  for (const s of ['180', '0', '180', '0', '141']) await type(page, s);
  const overlay = page.getByTestId('leg-won');
  await expect(overlay).toBeVisible();
  await page.mouse.click(640, 120);
  await expect(overlay).toHaveCount(0, { timeout: 1000 });
});

test('phone: the checkout route is on screen without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startMatch(page);
  for (const s of ['180', '0', '180', '0']) await type(page, s);
  await clearAchievements(page);
  const route = page.getByTestId('checkout-route');
  await expect(route).toBeVisible();
  const box = await route.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.y + box!.height).toBeLessThanOrEqual(844);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('phone: no fire canvas runs in the hidden desktop layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await startMatch(page);
  await expect(page.locator('[data-testid^="player-card-"]')).toHaveCount(0);
});

test('reduced motion: no endless animation runs during play', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1280, height: 900 });
  await startMatch(page);
  for (const s of ['100', '26']) await type(page, s);
  await clearAchievements(page);
  // Ann is up with 401, a checkout is not on — enter a busting state too.
  await page.waitForTimeout(800);
  const endless = await page.evaluate(() =>
    document.getAnimations()
      .filter(a => a.playState === 'running' && a.effect?.getTiming().iterations === Infinity)
      .map(a => (a as CSSAnimation).animationName || (a.effect as KeyframeEffect)?.target?.className || 'anon'),
  );
  expect(endless).toEqual([]);
});
