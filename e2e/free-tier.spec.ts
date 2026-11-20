import { test, expect, type Page } from '@playwright/test';
import { io } from 'socket.io-client';
import { login } from './helpers/login';
import { BACKEND_PORT, FREE_USER } from './fixtures';

/**
 * The free plan (0.49.0), with a real account whose trial ended yesterday.
 *
 * Checked twice: the screens show what is open and what is not, and the
 * server refuses the same things when asked directly (402) — the app is not
 * the only lock.
 */
const API = `http://localhost:${BACKEND_PORT}/api`;
const token = (page: Page) => page.evaluate(() => localStorage.getItem('auth_token') as string);
const post = async (page: Page, path: string, data: unknown) =>
  page.request.post(`${API}${path}`, { headers: { Authorization: `Bearer ${await token(page)}` }, data });

test('free plan: the app stays usable and shows its limits; the server enforces them', async ({ page }) => {
  await login(page, FREE_USER);
  const s = String(Date.now()).slice(-5);

  // Not locked out after the trial: the home screen, with premium marked.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).not.toHaveURL(/pricing/);
  await expect(page.getByTestId('premium-lock').first()).toBeVisible();

  // Three own players, then no more — server first.
  const ids: string[] = [];
  for (const n of ['A', 'B', 'C']) {
    const id = `free-${n}-${s}`;
    const r = await post(page, '/players', { id, name: `${n}${s}`, avatar: 'target' });
    expect(r.status(), `player ${n}`).toBe(201);
    ids.push(id);
  }
  const fourth = await post(page, '/players', { id: `free-D-${s}`, name: `D${s}`, avatar: 'target' });
  expect(fourth.status()).toBe(402);
  expect(await fourth.json()).toMatchObject({ code: 'premium_required', feature: 'players', limit: 3 });
  // A bot up to level 5 is fine, stronger is not; the solo-start "Guest" is never counted.
  expect((await post(page, '/players', { id: `free-bot5-${s}`, name: 'Bot5', isBot: true, botLevel: 5 })).status()).toBe(201);
  expect((await post(page, '/players', { id: `free-bot9-${s}`, name: 'Bot9', isBot: true, botLevel: 9 })).status()).toBe(402);
  expect((await post(page, '/players', { id: `free-guest-${s}`, name: 'Guest', avatar: 'user' })).status()).toBe(201);

  // A match: two is fine, three is premium.
  const match = (id: string, players: string[]) => ({
    id, gameType: 'x01', status: 'in-progress', settings: { startScore: 501, legsToWin: 1 },
    players: players.map(playerId => ({ playerId })), legs: [], startedAt: Date.now(),
  });
  expect((await post(page, '/matches', match(`m2-${s}`, ids.slice(0, 2)))).status()).toBe(201);
  const three = await post(page, '/matches', match(`m3-${s}`, ids));
  expect(three.status()).toBe(402);
  expect(await three.json()).toMatchObject({ feature: 'match_players', limit: 2 });
  // Re-sending the two-player match with a third player is the same refusal (POST replaces the roster).
  expect((await post(page, '/matches', match(`m2-${s}`, ids))).status()).toBe(402);
  // Same size, swapped roster — a strong bot for a player — is checked too (security review).
  expect((await post(page, '/matches', match(`m2-${s}`, [ids[0], ids[1]]))).status()).toBe(200);
  expect((await post(page, '/matches', match(`m2-${s}`, [ids[0], `free-bot5-${s}`]))).status()).toBe(200);
  expect((await post(page, '/players', { id: `free-botx-${s}`, name: 'BotX', isBot: true, botLevel: 'abc' })).status()).toBe(400);
  // A second "Guest" is just another player (security review): the limit holds.
  expect((await post(page, '/players', { id: `free-guest2-${s}`, name: 'Guest', avatar: 'user' })).status()).toBe(402);

  // Training: doubles yes, Bob's 27 no.
  const training = (id: string, type: string) => ({ id, playerId: ids[0], type, startedAt: Date.now(), settings: {} });
  expect((await post(page, '/training', training(`t1-${s}`, 'doubles'))).status()).toBe(201);
  expect((await post(page, '/training', training(`t2-${s}`, 'bobs-27'))).status()).toBe(402);

  // Tournaments and heatmaps.
  expect((await page.request.put(`${API}/tournaments/tour-${s}`, {
    headers: { Authorization: `Bearer ${await token(page)}` },
    data: { id: `tour-${s}`, name: 'Cup', type: 'knockout', status: 'setup', participants: [], matches: [] },
  })).status()).toBe(402);
  expect((await page.request.get(`${API}/players/${ids[0]}/heatmap`, { headers: { Authorization: `Bearer ${await token(page)}` } })).status()).toBe(402);

  // Online: the socket refuses a free account at the door.
  const refused = await new Promise<string>((resolve) => {
    const sock = io(`http://localhost:${BACKEND_PORT}`, { auth: { token: '' }, transports: ['websocket'], reconnection: false });
    sock.on('connect_error', (e) => { sock.close(); resolve(e.message); });
    sock.on('connect', () => { sock.close(); resolve('connected'); });
  });
  expect(refused).toBe('unauthorized');
  const free = await token(page);
  const refusedFree = await new Promise<string>((resolve) => {
    const sock = io(`http://localhost:${BACKEND_PORT}`, { auth: { token: free }, transports: ['websocket'], reconnection: false });
    sock.on('connect_error', (e) => { sock.close(); resolve(e.message); });
    sock.on('connect', () => { sock.close(); resolve('connected'); });
  });
  expect(refusedFree).toBe('premium_required');

  // The screens: the setup says "2 per game" and a third pick opens the premium dialog.
  await page.goto('/game?new=1');
  await expect(page.getByTestId('free-player-limit')).toBeVisible();
  await page.getByRole('button', { name: new RegExp(`A${s}`) }).first().click();
  await page.getByRole('button', { name: new RegExp(`B${s}`) }).first().click();
  await page.getByRole('button', { name: new RegExp(`C${s}`) }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('2 pro Spiel');
  await expect(page.getByRole('button', { name: new RegExp(`C${s}`) }).first()).toHaveAttribute('aria-pressed', 'false');
  await dialog.getByRole('button', { name: 'Später' }).click();

  // Premium-only screens explain themselves instead of redirecting.
  for (const path of ['/online', '/tournament', '/training/bobs-27']) {
    await page.goto(path);
    await expect(page.getByTestId('premium-gate'), path).toBeVisible();
  }
  await page.goto('/training/doubles');
  await expect(page.getByTestId('premium-gate')).toHaveCount(0);

  // Statistics: heatmap locked, history says 20; the account page lists what premium adds.
  await page.goto('/stats?tab=heatmap');
  await page.getByRole('button', { name: /Heatmap/ }).first().click();
  await expect(page.getByTestId('heatmap-locked')).toBeVisible();
  await page.goto('/match-history');
  await expect(page.getByTestId('history-limit')).toContainText('20');
  await page.goto('/me');
  await expect(page.getByTestId('account-summary')).toContainText('Kostenlos');
  await expect(page.getByTestId('account-free-plan')).toBeVisible();
});

test('premium: the trial account connects online and is not limited', async ({ page }) => {
  await login(page);
  const t = await token(page);
  const result = await new Promise<string>((resolve) => {
    const sock = io(`http://localhost:${BACKEND_PORT}`, { auth: { token: t }, transports: ['websocket'], reconnection: false });
    sock.on('connect_error', (e) => { sock.close(); resolve(e.message); });
    sock.on('connect', () => { sock.close(); resolve('connected'); });
  });
  expect(result).toBe('connected');
  await page.goto('/game?new=1');
  await expect(page.getByTestId('free-player-limit')).toHaveCount(0);
  await page.goto('/online');
  await expect(page.getByTestId('premium-gate')).toHaveCount(0);
});
