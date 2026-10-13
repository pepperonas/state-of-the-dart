import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * Typed totals and corrections (0.32.0): a typed total stays out of the
 * heatmap until the player says how it was thrown; "undo" brings a typed
 * visit back as a sum; an older visit is corrected from its pill; the stored
 * player heatmap never counts a visit twice; everything survives a reload.
 */
const API = `http://localhost:${BACKEND_PORT}/api`;

test('typed totals, chips, sum correction and an older visit corrected', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  const s = String(Date.now()).slice(-5);
  const [ann, ben] = ['Ann', 'Ben'].map(n => `${n}${s}`);
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const auth = { Authorization: `Bearer ${token}` };
  const ids: Record<string, string> = {};
  for (const n of [ann, ben]) {
    ids[n] = `e2e-corr-${n.toLowerCase()}`;
    const res = await page.request.post(`${API}/players`, { headers: auth, data: { id: ids[n], name: n, avatar: 'target' } });
    expect(res.ok()).toBeTruthy();
  }
  await page.goto('/game?new=1');
  for (const n of [ann, ben]) await page.getByRole('button', { name: new RegExp(n) }).first().click();
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await page.getByRole('button', { name: new RegExp(`${ann} beginnt`) }).click();
  const card = (n: string) => page.getByTestId(`player-card-${n}`).locator('visible=true').first();

  // A typed 60: no beds known, so the live heatmap says so instead of painting T20.
  await page.keyboard.type('60');
  await page.keyboard.press('Enter');
  await expect(card(ann)).toContainText('441');
  const heat = page.getByTestId('insight-heatmap');
  // The heatmap follows the player at the oche (Ben now); pick Ann for this turn.
  await heat.getByRole('button', { name: ann }).click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(heat.getByTestId('heatmap-only-typed')).toBeVisible();
  await expect(heat.getByTestId('heatmap-board')).toHaveCount(0);

  // The chip row offers how it was thrown; one tap makes the darts exact.
  const chips = page.getByTestId('visit-chips');
  await expect(chips).toContainText(`${ann} 60`);
  await chips.getByRole('button', { name: /20 · 20 · 20/ }).click();
  await expect(chips).toHaveCount(0);
  await expect(heat.getByTestId('heatmap-board')).toBeVisible();
  await expect(heat.getByTestId('heatmap-board')).toHaveAttribute('aria-label', /3/);
  await expect(card(ann)).toContainText('441'); // same total, nothing re-scored

  // Ben types 26, then takes it back: it returns as "26 → …", typed 41 replaces it.
  await page.keyboard.type('26');
  await page.keyboard.press('Enter');
  await expect(card(ben)).toContainText('475');
  await page.getByRole('button', { name: /Wurf zurück/ }).first().click();
  await expect(page.getByTestId('visit-correction')).toContainText('26 → …');
  await page.keyboard.type('41');
  await page.keyboard.press('Enter');
  await expect(card(ben)).toContainText('460');
  await expect(page.getByTestId('visit-correction')).toHaveCount(0);

  // Ann's stored heatmap: her three exact darts once — the undo of Ben's visit
  // used to book Ann's visit a second time.
  await expect.poll(async () => {
    const res = await page.request.get(`${API}/players/${ids[ann]}/heatmap`, { headers: auth });
    const body = await res.json();
    return body.total_darts ?? body.totalDarts ?? body.heatmap?.total_darts;
  }).toBe(3);

  // Ann is at the oche: her 60 pill opens the correction dialog; 45 instead.
  await card(ann).getByTestId('visit-pill').first().click();
  const dialog = page.getByTestId('edit-visit-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('edit-visit-sum').fill('45');
  await page.getByTestId('edit-visit-save').click();
  await expect(dialog).toHaveCount(0);
  await expect(card(ann)).toContainText('456');

  // The history row shows the visit and offers the same correction.
  await expect(page.getByTestId('insight-history').getByTestId('history-edit').first()).toBeVisible();

  // Everything survives a reload.
  await page.reload();
  await expect(card(ann)).toContainText('456');
  await expect(card(ben)).toContainText('460');
  await expect.poll(async () => {
    const res = await page.request.get(`${API}/players/${ids[ann]}/heatmap`, { headers: auth });
    const body = await res.json();
    return body.total_darts ?? body.totalDarts ?? body.heatmap?.total_darts;
  }).toBe(0); // 20 20 20 replaced by a typed 45: exact darts out, nothing typed in
});
