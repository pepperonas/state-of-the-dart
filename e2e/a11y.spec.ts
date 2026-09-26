import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './helpers/login';
import { BACKEND_PORT } from './fixtures';

/**
 * Accessibility in the running app.
 *
 * - axe-core (WCAG 2.1 A/AA rules) on the main screens and on a game in play.
 *   Only serious and critical findings fail; colour contrast is measured by
 *   contrast.spec.ts with a stricter method (backgrounds composed over
 *   ancestors, opacity folded in), so axe's own contrast rule is off here.
 * - Touch targets: every icon button, chip and button offers at least 48×48 px
 *   to the finger — read from the ::after hit area, not guessed from the box.
 */

const API = `http://localhost:${BACKEND_PORT}/api`;
const SCREENS = ['/', '/stats', '/players', '/achievements', '/settings', '/game?new=1', '/dashboard', '/match-history', '/leaderboard', '/training',
  '/cricket', '/around-the-clock', '/shanghai', '/tournament', '/online', '/resume', '/account', '/global-leaderboard', '/training-stats', '/pricing'];

async function axe(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .disableRules(['color-contrast'])
    .analyze();
  return result.violations
    .filter(v => v.impact === 'serious' || v.impact === 'critical')
    .map(v => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`);
}

async function smallTargets(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const px = (v: string) => (v.endsWith('px') ? parseFloat(v) : 0);
    const label = (el: Element) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || '').trim().slice(0, 30);
    // M3 controls: 48×48 hit area (read from the ::after that extends it).
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.m3-icon-button, .m3-chip, .m3-button'))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const a = getComputedStyle(el, '::after');
      const w = r.width - px(a.left) - px(a.right);
      const h = r.height - px(a.top) - px(a.bottom);
      if (a.content === 'none' || w < 47.5 || h < 47.5) out.push(`48px: ${Math.round(w)}×${Math.round(h)} "${label(el)}"`);
    }
    // Every other control: WCAG 2.5.8 minimum of 24×24. Links inside running
    // text are exempt by the criterion itself.
    const sel = 'button, [role="button"], [role="tab"], [role="switch"], [role="option"], input[type="checkbox"], input[type="radio"], input[type="range"], a[href]';
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      if (el.closest('.m3-icon-button, .m3-chip, .m3-button') === el) continue;
      if (el.closest('[aria-hidden="true"], [inert], .sr-only')) continue; // skip link: off-screen until focused
      // A checkbox/radio inside its <label>: the label is part of the target.
      const host = el instanceof HTMLInputElement && el.closest('label') ? el.closest('label')! : el;
      const r = host.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden') continue;
      if (el.tagName === 'A' && cs.display === 'inline' && el.parentElement && /\S/.test((el.parentElement.textContent || '').replace(el.textContent || '', ''))) continue;
      const a = getComputedStyle(el, '::after');
      const pos = a.content !== 'none' && a.position === 'absolute';
      const w = r.width - (pos ? px(a.left) + px(a.right) : 0);
      const h = r.height - (pos ? px(a.top) + px(a.bottom) : 0);
      if (w < 23.5 || h < 23.5) out.push(`24px: ${Math.round(w)}×${Math.round(h)} <${el.tagName.toLowerCase()}> "${label(el)}"`);
    }
    return out;
  });
}

test('the checks report deliberately broken controls (cross-check)', async ({ page }) => {
  await login(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = '.probe-no-hit::after { content: none !important; }';
    document.head.appendChild(style);
    const wrap = document.createElement('div');
    wrap.innerHTML = '<input type="range" min="0" max="10" class="probe-range">'
      + '<button class="m3-icon-button probe-no-hit" aria-label="probe icon">x</button>'
      + '<button style="width:16px;height:16px;padding:0" aria-label="probe tiny">y</button>';
    document.body.appendChild(wrap);
  });
  const violations = await axe(page);
  expect(violations.some(v => v.startsWith('label'))).toBe(true);
  const small = await smallTargets(page);
  expect(small.some(s => s.includes('probe icon'))).toBe(true);
  expect(small.some(s => s.includes('probe tiny'))).toBe(true);
});

test('axe finds no serious problems and every control is a 48px target', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page);
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const tag = String(Date.now()).slice(-5);
  for (const n of ['Ada', 'Bo']) {
    const res = await page.request.post(`${API}/players`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id: `${n}-${tag}`, name: `${n}${tag}`, avatar: 'target' },
    });
    expect(res.ok()).toBeTruthy();
  }

  const problems: string[] = [];
  for (const path of SCREENS) {
    await page.goto(path);
    // /online holds a socket open, so it never becomes "network idle".
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    for (const v of await axe(page)) problems.push(`${path}: ${v}`);
    for (const s of await smallTargets(page)) problems.push(`${path}: small target ${s}`);
  }

  await page.goto('/game?new=1');
  await page.getByRole('button', { name: new RegExp(`Ada${tag}`) }).first().click();
  await page.getByRole('button', { name: new RegExp(`Bo${tag}`) }).first().click();
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await page.getByRole('button', { name: new RegExp(`Ada${tag} beginnt`) }).click();
  await page.waitForTimeout(500);
  for (const v of await axe(page)) problems.push(`/game (in play): ${v}`);
  for (const s of await smallTargets(page)) problems.push(`/game (in play): small target ${s}`);

  // Cricket, Around the Clock and Shanghai in play — they had no ARIA at all.
  for (const [path, start] of [['/cricket', /Cricket starten/], ['/around-the-clock', /Spiel starten/], ['/shanghai', /Shanghai starten/]] as const) {
    await page.goto(path);
    await page.getByRole('button', { name: new RegExp(`Ada${tag}`) }).first().click();
    await page.getByRole('button', { name: new RegExp(`Bo${tag}`) }).first().click();
    await page.getByRole('button', { name: start }).click();
    await page.getByRole('button', { name: new RegExp(`Ada${tag} beginnt`) }).click();
    await page.waitForTimeout(500);
    for (const v of await axe(page)) problems.push(`${path} (in play): ${v}`);
    for (const s of await smallTargets(page)) problems.push(`${path} (in play): small target ${s}`);
  }

  expect(problems, problems.join('\n')).toEqual([]);
});

test('the game announces each visit to screen readers', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const tag = String(Date.now()).slice(-5);
  for (const n of ['Cy', 'Di']) {
    await page.request.post(`${API}/players`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { id: `${n}-${tag}`, name: `${n}${tag}`, avatar: 'target' },
    });
  }
  await page.goto('/game?new=1');
  await page.getByRole('button', { name: new RegExp(`Cy${tag}`) }).first().click();
  await page.getByRole('button', { name: new RegExp(`Di${tag}`) }).first().click();
  await page.getByRole('button', { name: /Spiel starten/i }).click();
  await page.getByRole('button', { name: new RegExp(`Cy${tag} beginnt`) }).click();

  const live = page.locator('[data-testid="game-announcer"]');
  await expect(live).toHaveAttribute('aria-live', 'polite');
  await page.keyboard.type('100');
  await page.keyboard.press('Enter');
  await expect(live).toContainText(`Cy${tag}`);
  await expect(live).toContainText('100');
  await expect(live).toContainText('401');
});
