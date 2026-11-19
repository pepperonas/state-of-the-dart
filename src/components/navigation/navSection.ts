/**
 * Which navigation destination a screen belongs to (0.47.0).
 *
 * The bar/rail used to light up only on its four exact paths: on the match
 * history, the leaderboards or the settings no destination was active and the
 * screen had no visible place in the app. Every app screen now names its
 * section; anything unknown falls back to home.
 */
export type NavSection = 'home' | 'stats' | 'achievements' | 'players' | 'account';

const SECTIONS: Array<[NavSection, RegExp]> = [
  ['stats', /^\/(stats|dashboard|match-history|leaderboard|global-leaderboard|training-stats)(\/|$)/],
  ['achievements', /^\/achievements(\/|$)/],
  ['players', /^\/players(\/|$)/],
  ['account', /^\/(me|settings|account|admin)(\/|$)/],
];

export const navSection = (pathname: string): NavSection =>
  SECTIONS.find(([, re]) => re.test(pathname))?.[0] ?? 'home';
