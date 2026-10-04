import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * Achievement notifications during a game: mid-leg they are a toast that a tap
 * elsewhere closes; at the end of a leg they go centre stage and stay until
 * "Weiter".
 */
const API = `http://localhost:${BACKEND_PORT}/api`;
const SHOTS = process.env.SHOT_DIR;

async function createPlayer(page: Page, name: string) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const res = await page.request.post(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { id: `e2e-${name.toLowerCase()}`, name, avatar: 'target' },
  });
  expect(res.ok()).toBeTruthy();
}

test('achievements: toast closes on an outside tap mid-leg, centre stage at the end of a leg', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
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

  const active = (n: string) => expect(page.getByTestId(`player-card-${n}`)).toHaveAttribute('aria-current', 'true');
  const visit = async (who: string, score: string) => {
    await active(who);
    await page.keyboard.type(score);
    await page.keyboard.press('Enter');
  };

  // A first 180 unlocks achievements mid-leg: a toast at the top.
  await visit(ann, '180');
  const stage = page.getByTestId('achievement-stage');
  await expect(stage).toHaveAttribute('data-placement', 'top', { timeout: 10_000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/toast.png` });
  // Achievements of one visit arrive one after another; let them all land,
  // then a tap elsewhere closes them (later arrivals would rightly reappear).
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.mouse.click(1100, 500);
  await expect(stage).toHaveCount(0);

  await visit(ben, '0');
  await visit(ann, '180');
  await page.getByTestId('achievement-stage').waitFor({ timeout: 3000 }).then(() => page.getByRole('button', { name: /Alle schließen|Schließen/ }).first().click()).catch(() => {});
  await visit(ben, '0');
  // 141 checks out: the leg ends, and the first leg won unlocks achievements.
  await visit(ann, '141');
  await expect(stage).toHaveAttribute('data-placement', 'center', { timeout: 10_000 });
  if (SHOTS) { await page.waitForTimeout(1500); await page.screenshot({ path: `${SHOTS}/center.png` }); }
  await page.mouse.click(20, 450);
  await page.waitForTimeout(6000); // the leg overlay underneath times out
  await expect(stage).toHaveAttribute('data-placement', 'center');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await expect(stage).toHaveCount(0);
});
