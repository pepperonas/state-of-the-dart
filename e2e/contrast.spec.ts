import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * Text contrast on the main screens, in both themes, measured in the running
 * browser.
 *
 * How it measures (each rule fixes a way such a check lies):
 * - Colours are painted on a canvas and read back, never parsed from CSS text
 *   — browsers return `color(srgb …)`, `oklch(…)`, `color-mix(…)`.
 * - The background is composed over the ancestors until an opaque layer is
 *   found; a translucent card on a gradient is judged against what shows through.
 * - `opacity` on the element and its ancestors is folded into the text alpha.
 * - Gradient-filled text (`background-clip: text`), disabled controls and
 *   invisible elements are skipped; a gradient background counts with its
 *   first colour stop as a fallback.
 * - The tool is only trusted after the cross-check below: a deliberately
 *   unreadable element must be reported.
 * - Runs with reduced motion, so nothing is caught mid-entrance.
 */

const API = `http://localhost:${BACKEND_PORT}/api`;

async function measure(page: Page) {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const rgba = (css: string): [number, number, number, number] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const over = (top: number[], bottom: number[]) => {
      const a = top[3] + bottom[3] * (1 - top[3]);
      if (a === 0) return [0, 0, 0, 0];
      return [0, 1, 2].map(i => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a).concat(a);
    };
    const lum = (c: number[]) => {
      const [r, g, b] = c.slice(0, 3).map(v => v / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: number[], b: number[]) => {
      const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
      return (x + 0.05) / (y + 0.05);
    };
    const backgroundOf = (el: Element): number[] => {
      const layers: number[][] = [];
      for (let n: Element | null = el; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        let c = rgba(cs.backgroundColor);
        if (c[3] === 0 && cs.backgroundImage.includes('gradient')) {
          const stop = cs.backgroundImage.match(/(rgba?\([^)]*\)|#[0-9a-f]{3,8}|color\([^)]*\))/i);
          if (stop) c = rgba(stop[0]);
        }
        if (c[3] > 0) layers.push(c);
        if (c[3] >= 0.99) break;
      }
      let bg = rgba(getComputedStyle(document.body).backgroundColor);
      if (bg[3] < 1) bg = [255, 255, 255, 1];
      for (let i = layers.length - 1; i >= 0; i--) bg = over(layers[i], bg);
      return bg;
    };
    const opacityOf = (el: Element) => {
      let o = 1;
      for (let n: Element | null = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity || '1');
      return o;
    };

    const failures: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const text = (t.textContent || '').trim();
      if (!text) continue;
      const el = t.parentElement;
      if (!el || seen.has(el)) continue;
      seen.add(el);
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (el.closest('[disabled], [aria-disabled="true"], .sr-only, [aria-hidden="true"], svg')) continue;
      if (cs.backgroundClip === 'text' || (cs as CSSStyleDeclaration & { webkitBackgroundClip?: string }).webkitBackgroundClip === 'text') continue;
      const opacity = opacityOf(el);
      if (opacity < 0.05) continue;
      const fg = rgba(cs.color);
      fg[3] *= opacity;
      const bg = backgroundOf(el);
      const shown = over(fg, bg);
      const r = ratio(shown, bg);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const min = large ? 3 : 4.5;
      if (r < min) failures.push(`${r.toFixed(2)}:1 (min ${min}) "${text.slice(0, 40)}" <${el.tagName.toLowerCase()} class="${el.className.toString().slice(0, 60)}">`);
    }
    return failures;
  });
}

async function setTheme(page: Page, theme: 'modern' | 'modern-light') {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const res = await page.request.put(`${API}/settings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { theme, language: 'de' },
  });
  expect(res.ok()).toBeTruthy();
}

const SCREENS = ['/', '/stats', '/players', '/achievements', '/settings', '/game?new=1', '/dashboard', '/match-history', '/leaderboard', '/training'];

test.describe.configure({ mode: 'serial' });

test('the contrast check reports a deliberately unreadable element (cross-check)', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    const p = document.createElement('p');
    p.textContent = 'barely visible';
    p.style.cssText = 'color:#777;background:#888;font-size:14px;position:relative;z-index:1';
    document.body.appendChild(p);
  });
  const failures = await measure(page);
  expect(failures.some(f => f.includes('barely visible'))).toBe(true);
});

for (const theme of ['modern', 'modern-light'] as const) {
  test(`text contrast meets WCAG AA — ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    // ⚠️ Reduced motion: staggered entrances leave most cards at opacity 0
    // when the measurement runs, and invisible elements are skipped — the first
    // version of this test passed with a deliberately faded card because of it.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page);
    await setTheme(page, theme);
    // ⚠️ Players first: without them several screens (achievements, stats)
    // render an empty state, and the check measured nothing there. The first
    // version passed a deliberately faded achievement card because of it.
    const token = await page.evaluate(() => localStorage.getItem('auth_token'));
    const tag = `${theme}${String(Date.now()).slice(-5)}`;
    for (const n of ['Cara', 'Dirk']) {
      const res = await page.request.post(`${API}/players`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { id: `${n}-${tag}`, name: `${n}${tag}`, avatar: 'target' },
      });
      expect(res.ok()).toBeTruthy();
    }
    const all: string[] = [];
    for (const path of SCREENS) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(700); // let entrance animations settle
      for (const f of await measure(page)) all.push(`${path}: ${f}`);
    }
    // The achievements page must actually have rendered its cards.
    await page.goto('/achievements');
    await expect(page.locator('p.line-clamp-2').first()).toBeVisible();

    // …and the game screen itself, mid-match.
    await page.goto('/game?new=1');
    await page.getByRole('button', { name: new RegExp(`Cara${tag}`) }).first().click();
    await page.getByRole('button', { name: new RegExp(`Dirk${tag}`) }).first().click();
    await page.getByRole('button', { name: /Spiel starten/i }).click();
    await page.getByRole('button', { name: new RegExp(`Cara${tag} beginnt`) }).click();
    await page.waitForTimeout(700);
    for (const f of await measure(page)) all.push(`/game (in play): ${f}`);

    expect(all, `Contrast failures (${theme}):\n${all.join('\n')}`).toEqual([]);
  });
}
