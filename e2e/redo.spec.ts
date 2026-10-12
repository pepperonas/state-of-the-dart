import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * Taken back one visit too many (0.35.0): "Wurf vor" books it again — one
 * step or several, at phone and desktop size, and a reload keeps the result.
 */
const API = `http://localhost:${BACKEND_PORT}/api`;

async function start(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await login(page);
  const s = String(Date.now()).slice(-5);
  const names = ['Ann', 'Ben'].map(n => `${n}${s}`);
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

/** Achievement toasts land over the input on a desktop; close them first. */
const calm = async (page: Page) => {
  const stage = page.getByTestId('achievement-stage');
  await stage.waitFor({ timeout: 1500 }).catch(() => {});
  for (let i = 0; i < 5 && await stage.count(); i++) {
    await page.getByRole('button', { name: /Alle schließen|Schließen|Weiter/ }).first().click().catch(() => {});
    await page.waitForTimeout(200);
  }
};

const type = async (page: Page, score: string) => {
  await page.keyboard.type(score);
  await page.keyboard.press('Enter');
};

for (const [label, w, h] of [['phone', 390, 844], ['desktop', 1440, 900]] as const) {
  test(`${label}: undo too far, then walk forward again`, async ({ page }) => {
    const [ann, ben] = await start(page, w, h);
    const card = (n: string) => page.getByTestId(`player-card-${n}`).locator('visible=true').first();
    const undo = page.getByRole('button', { name: /Wurf zurück/ }).locator('visible=true').first();
    const redo = page.getByTestId('redo-throw').locator('visible=true');
    const clear = page.getByRole('button', { name: 'Aufnahme leeren' }).locator('visible=true').first();

    await type(page, '60');
    await expect(card(ann)).toContainText('441');
    await type(page, '45');
    await expect(card(ben)).toContainText('456');
    await type(page, '100');
    await expect(card(ann)).toContainText('341');
    await expect(redo).toHaveCount(0); // nothing taken back yet
    await calm(page);

    // One back, and forward again straight away.
    await undo.click();
    await expect(redo).toHaveAccessibleName(new RegExp(`${ann} · 100`));
    await redo.click();
    await expect(card(ann)).toContainText('341');
    await expect(redo).toHaveCount(0);

    // Three back (clearing the darts undo puts into the input each time).
    await undo.click();
    await clear.click();
    await undo.click();
    await clear.click();
    await undo.click();
    await clear.click();
    await expect(card(ann)).toContainText('501');
    await expect(card(ben)).toContainText('501');

    // Forward, one visit per press, in order — the keyboard works too.
    await expect(redo).toHaveAccessibleName(new RegExp(`${ann} · 60`));
    await redo.click();
    await expect(card(ann)).toContainText('441');
    await expect(redo).toHaveAccessibleName(new RegExp(`${ben} · 45`));
    await page.keyboard.press('Control+Shift+Z');
    await expect(card(ben)).toContainText('456');
    await page.keyboard.press('Control+y');
    await expect(card(ann)).toContainText('341');
    await expect(redo).toHaveCount(0);

    // The match is the one that was played: a reload brings it back as is.
    await page.waitForTimeout(800);
    await page.reload();
    await expect(card(ann)).toContainText('341');
    await expect(card(ben)).toContainText('456');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}

test('a different visit after an undo drops the way forward', async ({ page }) => {
  const [ann, ben] = await start(page, 1440, 900);
  const card = (n: string) => page.getByTestId(`player-card-${n}`).locator('visible=true').first();
  await type(page, '60');
  await type(page, '45');
  await expect(card(ben)).toContainText('456');
  await calm(page);
  await page.getByRole('button', { name: /Wurf zurück/ }).first().click();
  await expect(page.getByTestId('redo-throw')).toBeVisible();
  // Ben's 45 comes back as "45 → …"; he types 26 instead.
  await type(page, '26');
  await expect(card(ben)).toContainText('475');
  await expect(card(ann)).toContainText('441');
  await expect(page.getByTestId('redo-throw')).toHaveCount(0);
});
