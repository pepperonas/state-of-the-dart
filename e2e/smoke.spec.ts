import { test, expect, type ConsoleMessage } from '@playwright/test';

test.describe('Production build smoke', () => {
  test('loads / and redirects to /login without console errors', async ({ page }) => {
    // React Router throws an internal "Redirecting…" signal when <Navigate> fires;
    // filter it out so only real bugs surface.
    const IGNORABLE_ERRORS = [/^Error: Redirecting/];
    const consoleErrors: string[] = [];
    const collect = (text: string) => {
      if (!IGNORABLE_ERRORS.some((re) => re.test(text))) consoleErrors.push(text);
    };
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() === 'error') collect(msg.text());
    });
    page.on('pageerror', (err) => {
      collect(String(err));
    });

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'State of the Dart' })).toBeVisible();

    expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('initial asset count is bounded (regression guard)', async ({ page }) => {
    // Sprint 1 baseline: ~5 eager assets (index, vendor, utils, icons, css)
    // land before "networkidle". Counting requests is more reliable than byte
    // measurement on vite preview (which doesn't always emit content-length).
    const assetUrls = new Set<string>();
    page.on('request', (req) => {
      const url = req.url();
      if (!url.includes('/assets/')) return;
      if (url.endsWith('.js') || url.endsWith('.css')) assetUrls.add(url);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const list = Array.from(assetUrls).map((u) => u.split('/').pop());
    expect(assetUrls.size, `Loaded: ${JSON.stringify(list)}`).toBeGreaterThan(0);
    // Bound at 10: catches a regression where a previously-lazy chunk leaks
    // back into the eager path. Today we load 5 assets on /login.
    expect(assetUrls.size, `Loaded: ${JSON.stringify(list)}`).toBeLessThanOrEqual(10);
  });

  test('no heavy lazy chunks load on the login page', async ({ page }) => {
    // Verifies Sprint 1 bundle hygiene: html2canvas, xlsx, jspdf, recharts,
    // confetti, and the lazy game routes must NOT appear in the initial waterfall.
    const requests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/assets/')) requests.push(url);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const forbidden = ['html2canvas', 'xlsx', 'jspdf', 'recharts', 'charts-', 'confetti', 'GameScreen', 'MatchHistoryPage', 'AchievementsScreen', 'StatsOverview', 'AdminPanel'];
    const violations = requests.filter((url) =>
      forbidden.some((needle) => url.toLowerCase().includes(needle.toLowerCase()))
    );

    expect(violations, `Heavy chunks loaded eagerly:\n${violations.join('\n')}`).toEqual([]);
  });
});
