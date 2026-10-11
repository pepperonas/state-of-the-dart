import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * Player avatars from game-icons.net (0.33.0): found by their German name,
 * stored as gi:<name>, drawn in the player list; the path data is a separate
 * chunk that loads only when needed; the picker credits the icons (CC BY 3.0).
 */
test('a game-icons avatar is picked by name and shown in the player list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const chunk: string[] = [];
  page.on('request', r => { if (r.url().includes('avatarPaths')) chunk.push(r.url()); });
  // The path data must never ride along in an eager bundle: a static import
  // would merge it into the main chunk, where no "avatarPaths" file exists to
  // look for — so look for the data itself.
  const WOLF = 'M179.3 38.94C154.7';
  const eager: string[] = [];
  page.on('response', async r => {
    if (!r.url().endsWith('.js') || r.url().includes('avatarPaths')) return;
    try { if ((await r.text()).includes(WOLF)) eager.push(r.url()); } catch { /* aborted */ }
  });

  await page.goto('/players');
  await page.getByRole('button', { name: 'Spieler hinzufügen' }).first().click();
  expect(chunk, 'no avatar data before it is needed').toHaveLength(0);
  expect(eager, 'avatar path data in an eager bundle').toEqual([]);

  await page.getByRole('button', { name: 'Avatar wählen' }).first().click();
  const picker = page.getByRole('dialog');
  await expect(picker.getByTestId('avatar-credit')).toContainText('CC BY 3.0');
  await picker.getByRole('textbox').fill('Wolf');
  await picker.getByRole('button', { name: 'Wolf', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0); // a pick closes the picker

  const name = `Wolfi${String(Date.now()).slice(-5)}`;
  await page.getByPlaceholder('Spielername eingeben').fill(name);
  await page.getByRole('button', { name: 'Hinzufügen', exact: true }).click();
  const glyph = page.locator('[data-avatar="gi:wolf-head"]').first();
  await expect(glyph).toBeVisible();
  await expect(glyph.locator('path')).toHaveAttribute('d', /^[Mm]/);
  expect(chunk).toHaveLength(1);

  // Stored in the database as gi:<name> (the list is paginated, so a full
  // suite's worth of players can push the new one off the first page).
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const res = await page.request.get(`http://localhost:${BACKEND_PORT}/api/players`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  const list = (Array.isArray(body) ? body : body.players ?? body.data ?? []) as { name: string; avatar: string }[];
  expect(list.find(p => p.name === name)?.avatar).toBe('gi:wolf-head');
});
