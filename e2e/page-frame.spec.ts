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
      // Visible header buttons only: the report actions are md:hidden on desktop.
      const back = page.locator('[data-page-header] button').locator('visible=true').first();
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

/** 0.38.0 — no section on the home screen ends in a hole. */
for (const width of [700, 1440]) {
  test(`home sections fill their last row at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await login(page);
    await page.goto('/');
    for (const id of ['play', 'review']) {
      const grid = page.locator(`section[aria-labelledby="sec-${id}"] > div`);
      await expect(grid).toBeVisible();
      await page.waitForTimeout(500);
      const g = (await grid.boundingBox())!;
      const tiles = grid.locator('> button');
      const last = (await tiles.last().boundingBox())!;
      expect(Math.abs(last.x + last.width - (g.x + g.width)), `${id}: last tile leaves a hole`).toBeLessThanOrEqual(1);
    }
  });
}

/**
 * 0.43.0 — the four game setups sit in the same frame as every other page,
 * the report buttons never float over content, and filter chips stay one row.
 */
for (const size of [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 900 }]) {
  test(`game setups, report buttons and chip rows on ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await login(page);

    await page.goto('/stats');
    await expect(page.locator('[data-page-title]')).toBeVisible();
    await page.waitForTimeout(400);
    const ref = (await page.locator('[data-page-title]').boundingBox())!;

    for (const url of ['/game?new=1', '/cricket', '/around-the-clock', '/shanghai']) {
      await page.goto(url);
      const title = page.locator('[data-page-title]');
      await expect(title, url).toBeVisible();
      await page.waitForTimeout(400);
      const b = (await title.boundingBox())!;
      expect(Math.abs(b.y - ref.y), `${url}: title not on the page line`).toBeLessThanOrEqual(2);
      const back = page.locator('[data-page-header]').getByRole('button', { name: /Zurück/ });
      const bb = (await back.boundingBox())!;
      expect(Math.abs(bb.y + bb.height / 2 - (b.y + b.height / 2)), `${url}: back off the title line`).toBeLessThan(8);
      expect(await page.locator('h1').count(), `${url}: one h1`).toBe(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow, `${url}: horizontal scroll`).toBeLessThanOrEqual(0);
    }

    // Report buttons: in the title row on phones, at the foot of the rail on desktop.
    await page.goto('/players');
    await expect(page.locator('[data-page-title]')).toBeVisible();
    const where = size.name === 'phone' ? 'report-actions-header' : 'report-actions-rail';
    const actions = page.getByTestId(where).locator('visible=true');
    await expect(actions).toBeVisible();
    await expect(actions.getByRole('button', { name: 'Bug melden' })).toBeVisible();
    if (size.name === 'desktop') {
      const nav = (await page.locator('nav').locator('visible=true').boundingBox())!;
      const a = (await actions.boundingBox())!;
      expect(a.x + a.width, 'report buttons leave the rail').toBeLessThanOrEqual(nav.x + nav.width + 1);
    }
    // Nothing fixed sits over the content except the navigation itself.
    const floaters = await page.evaluate(() =>
      [...document.querySelectorAll('body *')].filter((el) => {
        const s = getComputedStyle(el);
        if (s.position !== 'fixed' || s.visibility === 'hidden' || s.display === 'none') return false;
        if (el.closest('nav') || el.closest('[role="dialog"]') || el.closest('[aria-live]')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.width < innerWidth * 0.5;
      }).map((el) => el.outerHTML.slice(0, 80)));
    expect(floaters, 'floating elements over the content').toEqual([]);

    // The leaderboard's chips stay one scrolling row.
    await page.goto('/leaderboard');
    const row = page.locator('[data-chip-row]').first();
    await expect(row).toBeVisible();
    // offsetTop, not the box: the chips are still in their entrance motion.
    const tops = await row.evaluate((el) => [...el.querySelectorAll('button')].map((b) => (b as HTMLElement).offsetTop));
    expect(tops.length).toBeGreaterThan(3);
    expect(new Set(tops).size, `chips wrap into several lines: ${tops}`).toBe(1);
  });
}
