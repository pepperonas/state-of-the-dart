import { expect, type Page } from '@playwright/test';
import { BACKEND_PORT } from '../fixtures';

const API = `http://localhost:${BACKEND_PORT}/api`;

/** Stored heatmap with trebles, singles, both bulls and misses. */
export const SEED_SEGMENTS = { '20-3': 9, '20-1': 14, '5-1': 6, '1-1': 4, '19-3': 3, '25-1': 2, '25-2': 2, '16-2': 1, '0-0': 3 };

export async function seedHeatmap(page: Page, playerId: string) {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  const res = await page.request.post(`${API}/players/${playerId}/heatmap`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { segments: SEED_SEGMENTS, total_darts: Object.values(SEED_SEGMENTS).reduce((a, b) => a + b, 0) },
  });
  expect(res.ok()).toBeTruthy();
}

/** Opens the statistics heatmap tab for one player and waits for the board. */
export async function openHeatmap(page: Page, playerId: string) {
  await page.evaluate(id => localStorage.setItem('stats_selected_player_id', id), playerId);
  await page.goto('/stats?tab=heatmap');
  await expect(page.getByTestId('heatmap-board')).toBeVisible();
}
