import { test, expect } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * 0.36.0 — every page puts its title in the same place. Before, players and the
 * leaderboard centred a narrow card (title at x 478 on a 1440 screen), history
 * and achievements went full width (x 256) and stats put back beside the title,
 * so the title jumped from page to page.
 */
const PAGES = ['/stats', '/achievements', '/players', '/match-history', '/leaderboard', '/training', '/resume', '/tournament', '/dashboard'];

for (const size of [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 900 }]) {
  test(`page titles line up on ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await login(page);
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const res = await page.request.post(`http://localhost:${BACKEND_PORT}/api/players`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id: `Frame-${Date.now()}`, name: `Frame${String(Date.now()).slice(-5)}`, avatar: 'target' },
    });
    expect(res.ok()).toBeTruthy();

    const boxes: Record<string, { x: number; y: number; frameX: number }> = {};
    for (const url of PAGES) {
      await page.goto(url);
      const title = page.locator('[data-page-title]');
      await expect(title, url).toBeVisible();
      await page.waitForTimeout(400); // entrance motion settles
      const b = (await title.boundingBox())!;
      const f = (await page.locator('[data-page-frame]').boundingBox())!;
      boxes[url] = { x: b.x, y: b.y, frameX: f.x };
      // One header row: back (if any) sits on the title's line.
      const back = page.locator('[data-page-header] button').first();
      if (await back.count()) {
        const bb = (await back.boundingBox())!;
        expect(Math.abs(bb.y + bb.height / 2 - (b.y + b.height / 2)), `${url}: back off the title line`).toBeLessThan(8);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, `${url}: horizontal scroll`).toBeLessThanOrEqual(0);
    }

    const ys = Object.values(boxes).map((b) => b.y);
    const frames = Object.values(boxes).map((b) => b.frameX);
    expect(Math.max(...ys) - Math.min(...ys), `title tops differ: ${JSON.stringify(boxes)}`).toBeLessThanOrEqual(2);
    expect(Math.max(...frames) - Math.min(...frames), `frames differ: ${JSON.stringify(boxes)}`).toBeLessThanOrEqual(1);

    // The navigation destinations have no back button, the others do.
    for (const url of ['/stats', '/achievements', '/players']) {
      await page.goto(url);
      await expect(page.locator('[data-page-title]')).toBeVisible();
      await expect(page.locator('[data-page-header]').getByRole('button', { name: /Zurück/ }), url).toHaveCount(0);
    }
    await page.goto('/match-history');
    await expect(page.locator('[data-page-header]').getByRole('button', { name: /Zurück/ })).toBeVisible();
  });
}
