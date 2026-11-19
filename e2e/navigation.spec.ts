import { test, expect } from '@playwright/test';
import { login } from './helpers/login';

/**
 * The navigation (0.47.0): settings, account, subscription and help are one
 * tap away from every screen, and every screen lights up its section. Before,
 * they sat in a menu behind an initial in the home header — on the home screen
 * only.
 */
for (const [name, w, h] of [['phone', 390, 844], ['desktop', 1440, 900]] as const) {
  test(`${name}: settings are one tap from any screen, sub-pages light up their section`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await login(page);
    const nav = (s: string) => page.getByTestId(`nav-${s}`).locator('visible=true');

    // The app name fits on the home header (36 px cut it at 390 px, 0.46.1).
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toBeVisible();
    expect(await title.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);

    // From a deep screen, one tap to the account page.
    await page.goto('/match-history');
    await expect(nav('stats')).toHaveAttribute('aria-current', 'page');
    await nav('account').click();
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Konto');
    await expect(page.getByTestId('account-summary')).toContainText('e2e@stateofthedart.test');

    // Everything that used to hide in the menu is a labelled row.
    for (const id of ['profile', 'plan', 'settings', 'guide', 'shortcuts', 'contact', 'bug']) {
      await expect(page.getByTestId(`account-row-${id}`)).toBeVisible();
    }

    // Settings keep the section lit and lead back to the account page.
    await page.getByTestId('account-row-settings').click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(nav('account')).toHaveAttribute('aria-current', 'page');
    await page.getByRole('button', { name: /Zum Konto/ }).first().click();
    await expect(page).toHaveURL(/\/me$/);

    // The help rows open their dialogs.
    await page.getByTestId('account-row-contact').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    // The five destinations fit the bar / rail without clipping a label.
    for (const s of ['home', 'stats', 'achievements', 'players', 'account']) {
      const label = nav(s).locator('span').last();
      expect(await label.evaluate(el => el.scrollWidth <= el.clientWidth), s).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
}
