import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * "Spiel löschen" under "Spiel fortsetzen" (0.48.1).
 *
 * The device kept a copy of the paused match for refresh safety. After a
 * delete it was restored on the next load and posted again (create-or-
 * replace) — the match came back. Live logs showed every DELETE followed by a
 * POST 201 seconds later.
 */
const API = `http://localhost:${BACKEND_PORT}/api`;

async function createPlayer(page: Page, name: string) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const res = await page.request.post(`${API}/players`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { id: `e2e-${name.toLowerCase()}-${Date.now()}`, name, avatar: 'target' },
  });
  expect(res.ok()).toBeTruthy();
}

test('a deleted paused game stays deleted after a reload', async ({ page }) => {
  await login(page);
  const s = String(Date.now()).slice(-5);
  const [ann, ben] = [`Del${s}`, `Ete${s}`];
  await createPlayer(page, ann);
  await createPlayer(page, ben);

  await page.goto('/game?new=1');
  await page.getByRole('button', { name: new RegExp(ann) }).first().click();
  await page.getByRole('button', { name: new RegExp(ben) }).first().click();
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await page.getByRole('button', { name: new RegExp(`${ann} beginnt`) }).click();
  await page.keyboard.type('60');
  await page.keyboard.press('Enter');
  await expect(page.getByText('441', { exact: true }).locator('visible=true').first()).toBeVisible();

  await page.getByRole('button', { name: /^Zurück$/ }).first().click();
  const saved = page.waitForResponse(r => r.url().includes('/api/matches') && r.request().method() !== 'GET');
  await page.getByRole('button', { name: /Pausieren & verlassen/i }).click();
  await saved;
  // The refresh copy is on the device — the thing that brought the match back.
  expect(await page.evaluate(() => localStorage.getItem('state-of-the-dart-active-match'))).not.toBeNull();

  await page.goto('/resume');
  const card = page.getByTestId(`resume-row-${ann}`).first();
  await expect(card).toBeVisible();
  const cardBox = page.locator('.m3-card').filter({ has: page.getByTestId(`resume-row-${ann}`) }).first();
  await cardBox.getByRole('button', { name: 'Löschen' }).click();
  const deleted = page.waitForResponse(r => r.url().includes('/api/matches/') && r.request().method() === 'DELETE');
  await cardBox.getByRole('button', { name: 'Wirklich?' }).click();
  expect((await deleted).status()).toBe(200);
  await expect(page.getByTestId(`resume-row-${ann}`)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('state-of-the-dart-active-match'))).toBeNull();

  // The reload that used to resurrect it: no create may follow, the list stays empty of it.
  const creates: number[] = [];
  page.on('response', r => { if (r.url().endsWith('/api/matches') && r.request().method() === 'POST') creates.push(r.status()); });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  await page.goto('/resume');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId(`resume-row-${ann}`)).toHaveCount(0);
  expect(creates.filter(c => c === 201)).toEqual([]);
});
