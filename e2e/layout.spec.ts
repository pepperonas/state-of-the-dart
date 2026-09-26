import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * At the board the whole turn must fit on one screen: every player's score, the
 * input and the confirm button, without scrolling. On a phone the stacked player
 * cards used to push the numpad below the fold (confirm at 918px on a 844px
 * screen); the score strip fixed that. Also: never a horizontal scrollbar.
 */
const SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];

for (const size of SIZES) {
  test(`a turn fits on one ${size.name} screen`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await login(page);
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const tag = `${size.name}${String(Date.now()).slice(-5)}`;
    for (const n of ['Anna', 'Bert']) {
      const res = await page.request.post(`http://localhost:${BACKEND_PORT}/api/players`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { id: `${n}-${tag}`, name: `${n}${tag}`, avatar: 'target' },
      });
      expect(res.ok()).toBeTruthy();
    }

    await page.goto('/game?new=1');
    await page.getByRole('button', { name: new RegExp(`Anna${tag}`) }).first().click();
    await page.getByRole('button', { name: new RegExp(`Bert${tag}`) }).first().click();
    await page.getByRole('button', { name: /Spiel starten/i }).click();
    await page.getByRole('button', { name: new RegExp(`Anna${tag} beginnt`) }).click();

    const confirm = page.getByRole('button', { name: /Bestätigen/ });
    await expect(confirm).toBeVisible();
    const box = await confirm.boundingBox();
    expect(box!.y + box!.height, 'confirm button below the fold').toBeLessThanOrEqual(size.height);

    for (const n of ['Anna', 'Bert']) {
      const score = page.getByText(`${n}${tag}`, { exact: true }).locator('visible=true').first();
      const b = await score.boundingBox();
      expect(b && b.y + b.height <= size.height, `${n}'s score off screen`).toBeTruthy();
    }

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow, 'horizontal scroll').toBeLessThanOrEqual(0);
  });
}
