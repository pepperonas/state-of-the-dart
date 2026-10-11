import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * The "who throws first" wheel (0.31.3): the flapper stays a flapper — a peg
 * knocks it aside by at most FLAP_MAX degrees and it springs back — and the
 * wheel fills the screen it is shown on.
 *
 * Before 0.31.3 every peg started a new spring that inherited the previous
 * one's velocity; the pegs pumped it up until the flapper spun through 10^13
 * degrees while the wheel turned.
 */
const API = `http://localhost:${BACKEND_PORT}/api`;
test.use({ reducedMotion: 'no-preference' });

async function openWheel(page: Page, tag: string) {
  await login(page);
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const names = ['Ana', 'Bo', 'Cy'].map(n => `${n}${tag}`);
  for (const n of names) {
    const res = await page.request.post(`${API}/players`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id: `e2e-wheel-${n.toLowerCase()}`, name: n, avatar: 'target' },
    });
    expect(res.ok()).toBeTruthy();
  }
  await page.goto('/game?new=1');
  for (const n of names) {
    const tile = page.locator('button[aria-pressed]', { hasText: n }).first();
    if ((await tile.getAttribute('aria-pressed')) !== 'true') await tile.click();
  }
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await expect(page.getByTestId('spinner-wheel')).toBeVisible();
}

for (const vp of [
  { name: 'phone', width: 390, height: 844, minWheel: 350 },
  { name: 'desktop', width: 1440, height: 900, minWheel: 700 },
]) {
  test(`wheel on ${vp.name}: big, and the flapper never spins out`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await openWheel(page, `${vp.name[0]}${String(Date.now()).slice(-4)}`);

    await page.waitForTimeout(700); // the dialog's entrance scales it up from 0.9
    const box = await page.getByTestId('spinner-wheel').boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(vp.minWheel);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height);

    // Sample the flapper's rotation on every frame of the spin.
    await page.evaluate(() => {
      const w = window as unknown as { __flap: number[] };
      w.__flap = [];
      const read = () => {
        const el = document.querySelector('[data-testid="spinner-flapper"]') as HTMLElement | null;
        const m = el?.style.transform.match(/rotate\((-?[\d.e+]+)deg\)/);
        if (m) w.__flap.push(Number(m[1]));
        if (document.querySelector('[data-testid="spinner-wheel"]')?.getAttribute('data-phase') !== 'result') requestAnimationFrame(read);
      };
      requestAnimationFrame(read);
    });
    await expect(page.getByTestId('spinner-wheel')).toHaveAttribute('data-phase', 'result', { timeout: 15_000 });
    const flap = await page.evaluate(() => (window as unknown as { __flap: number[] }).__flap);
    expect(flap.filter(v => v !== 0).length, 'the pegs moved the flapper').toBeGreaterThan(5);
    // A spring overshoots a little past rest; the peg side is capped at 28°.
    expect(Math.max(...flap.map(Math.abs))).toBeLessThanOrEqual(30);

    await expect(page.getByTestId('spinner-result')).toBeVisible();
    await page.screenshot({ path: `test-results/wheel-${vp.name}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}
