import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { navSection } from '../../components/navigation/navSection';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../../', rel), 'utf8');

/**
 * 0.47.0: the navigation has a fifth destination, "Konto", and every app
 * screen lights up the destination it belongs to.
 */
describe('navSection', () => {
  it.each([
    ['/', 'home'], ['/training', 'home'], ['/tournament', 'home'], ['/resume', 'home'], ['/unknown', 'home'],
    ['/stats', 'stats'], ['/dashboard', 'stats'], ['/match-history', 'stats'], ['/leaderboard', 'stats'],
    ['/global-leaderboard', 'stats'], ['/training-stats', 'stats'],
    ['/achievements', 'achievements'], ['/players', 'players'], ['/players/abc', 'players'],
    ['/me', 'account'], ['/settings', 'account'], ['/account', 'account'], ['/admin', 'account'],
  ])('%s belongs to %s', (p, s) => expect(navSection(p)).toBe(s));

  it('does not match a prefix of another word', () => {
    expect(navSection('/statsx')).toBe('home');
    expect(navSection('/meadow')).toBe('home');
  });
});

describe('settings are one tap from everywhere', () => {
  it('the bar and rail carry the account destination', () => {
    const nav = read('components/navigation/AppNavigation.tsx');
    expect(nav).toContain("to: '/me'");
    expect(nav).toContain("section: 'account'");
  });

  it('the account page links settings, profile, subscription, guide, contact and bug report', () => {
    const hub = read('components/account/AccountHub.tsx');
    for (const id of ['profile', 'plan', 'settings', 'guide', 'shortcuts', 'contact', 'bug']) expect(hub, id).toContain(`id: '${id}'`);
    expect(hub).toContain("navigate('/settings')");
    expect(hub).toContain("navigate('/account')");
    expect(hub).toContain("navigate('/pricing')");
  });

  it('/me is routed and the home header has no second, hidden account menu', () => {
    expect(read('App.tsx')).toContain('<Route path="/me" element={');
    expect(read('components/MainMenu.tsx')).not.toMatch(/UserMenu/);
  });

  it('settings and account lead back to the account page', () => {
    expect(read('components/Settings.tsx')).toContain("onBack={() => navigate('/me')}");
    expect(read('components/auth/UserSettings.tsx')).toContain("onBack={() => navigate('/me')}");
  });
});
