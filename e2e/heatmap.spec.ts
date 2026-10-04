import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';
import { seedHeatmap, openHeatmap } from './helpers/heatmap';

const API = `http://localhost:${BACKEND_PORT}/api`;

/**
 * The board heatmap in the statistics: fits a phone, colours the beds that
 * were hit (bulls in the centre, not on the 6) and names a tapped bed.
 */
for (const size of [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1280, height: 900 }]) {
  test(`heatmap on a ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await login(page);
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const id = `Heat-${size.name}-${String(Date.now()).slice(-6)}`;
    const res = await page.request.post(`${API}/players`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id, name: id, avatar: 'target' },
    });
    expect(res.ok()).toBeTruthy();
    await seedHeatmap(page, id);
    // The player list is loaded at sign-in; reload so the seeded heatmap is in it.
    await page.reload();
    await openHeatmap(page, id);

    const board = page.getByTestId('heatmap-board');
    const box = await board.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // Bulls glow in the centre; the 6 stays cold.
    expect(await board.locator('path[data-bed="25-2"]').getAttribute('data-level')).not.toBe('0');
    expect(await board.locator('path[data-bed="6-1"]').first().getAttribute('data-level')).toBe('0');
    await expect(page.getByTestId('heatmap-misses')).toContainText('3 Fehlwürfe');

    await board.locator('path[data-bed="20-3"]').click();
    await expect(page.getByTestId('heatmap-detail')).toContainText('T20 · 9 Treffer');
  });
}
