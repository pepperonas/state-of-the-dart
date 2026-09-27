import { test, expect, type Page } from '@playwright/test';
import { login } from './helpers/login';

/**
 * Two browsers play a whole online match (301, first to 2 legs) through the UI.
 * Until 0.17.0 the online mode could not enter a throw at all.
 *
 * Also pinned: the throw-off alternates by leg, and a player who reloads in the
 * middle of a leg gets their seat back (identity is a client id, not the socket).
 */
test('two players finish an online match, one of them reconnecting mid-leg', async ({ browser }) => {
  test.setTimeout(180_000);
  const host = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();
  for (const p of [host, guest]) {
    await p.setViewportSize({ width: 1024, height: 900 });
    await login(p);
    await p.goto('/online');
    await expect(p.getByText(/online/i).first()).toBeVisible();
  }

  const room = `Duell ${String(Date.now()).slice(-5)}`;
  await host.getByRole('button', { name: 'Raum erstellen' }).first().click();
  await host.getByLabel('Raumname').fill(room);
  await host.getByRole('button', { name: '301', exact: true }).click();
  await host.getByRole('button', { name: '2', exact: true }).click();
  await host.getByRole('button', { name: 'Erstellen', exact: true }).click();

  // The guest joins from the public list.
  await expect(guest.getByText(room)).toBeVisible({ timeout: 15_000 });
  await guest.getByRole('button', { name: `${room} beitreten` }).click();
  await host.getByRole('button', { name: 'Spiel starten' }).click();

  const visit = async (p: Page, score: string) => {
    await expect(p.getByRole('heading', { name: 'Du bist dran' })).toBeVisible({ timeout: 15_000 });
    await p.keyboard.type(score);
    await p.keyboard.press('Enter');
  };
  const checkout = async (p: Page, score: number) => {
    await expect(p.getByRole('heading', { name: 'Du bist dran' })).toBeVisible({ timeout: 15_000 });
    await p.getByRole('button', { name: `Check-out ${score}` }).click();
  };

  // Leg 1 — the host throws first, the GUEST wins it. Only a leg won by the
  // player who did not start tells "alternate the throw-off" apart from the
  // old "whoever follows the winner starts".
  await visit(host, '60');
  // The guest drops out mid-leg and comes back: the seat is held.
  await guest.reload();
  await expect(guest.getByRole('heading', { name: 'Du bist dran' })).toBeVisible({ timeout: 20_000 });
  await visit(guest, '180');
  await visit(host, '60');
  await checkout(guest, 121);

  // Leg 2 — the throw-off moves to the guest (the old rule gave it back to the host).
  await expect(guest.getByRole('heading', { name: 'Du bist dran' })).toBeVisible({ timeout: 15_000 });
  await expect(host.getByText(/ist dran/)).toBeVisible();
  await visit(guest, '180');
  await visit(host, '60');
  await checkout(guest, 121);

  for (const p of [host, guest]) {
    await expect(p.getByRole('heading', { name: /gewinnt das Match/ })).toBeVisible({ timeout: 15_000 });
    await expect(p.getByTestId('online-announcer')).toContainText('gewinnt das Match');
  }
  // Rematch is the host's call.
  await expect(host.getByRole('button', { name: 'Revanche' })).toBeVisible();
  await expect(guest.getByRole('button', { name: 'Revanche' })).toHaveCount(0);
  await host.getByRole('button', { name: 'Revanche' }).click();
  // The match throw-off moves on: the guest starts the rematch.
  await expect(guest.getByRole('heading', { name: 'Du bist dran' })).toBeVisible({ timeout: 15_000 });
});
