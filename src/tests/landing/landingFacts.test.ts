import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { LANDING_FACTS } from '../../components/landing/landingFacts';
import { ACHIEVEMENTS } from '../../types/achievements';

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../../', rel), 'utf8');

/**
 * The landing page states numbers. These pin them to the real sources, so a
 * feature that is added or dropped breaks the build instead of turning the
 * marketing copy into a quiet lie.
 */
describe('landing facts match the app', () => {
  it('achievement count', () => {
    expect(LANDING_FACTS.achievements).toBe(ACHIEVEMENTS.length);
  });

  it('training modes match TrainingMenu', () => {
    const menu = read('components/training/TrainingMenu.tsx');
    expect((menu.match(/^\s+mode: '/gm) || []).length).toBe(LANDING_FACTS.trainingModes);
  });

  it('bot levels match botLogic', () => {
    const bots = read('utils/botLogic.ts');
    expect((bots.match(/^\s{2}\{ level: /gm) || []).length).toBe(LANDING_FACTS.botLevels);
  });

  it('game modes match the routed match screens', () => {
    const app = read('App.tsx');
    const routes = ['/game', '/cricket', '/around-the-clock', '/shanghai', '/online'];
    for (const r of routes) {
      expect(app, `route ${r} missing`).toContain(`<Route path="${r}"`);
    }
    expect(routes.length).toBe(LANDING_FACTS.gameModes);
  });
});

/**
 * The seam between landing page and app. These are contract pins: `/` must stay
 * a switch, because ~34 places inside the app navigate to `/` meaning "app
 * home". Turning it into a plain redirect would drop a player mid-match onto
 * the marketing page.
 */
describe('landing ↔ app seam', () => {
  const app = read('App.tsx');

  it('`/` is the auth switch, not a hard route to either side', () => {
    expect(app).toContain('<Route path="/" element={<HomeRoute />} />');
    expect(app).toMatch(/function HomeRoute\(\)/);
  });

  it('HomeRoute serves the landing signed out and MainMenu signed in', () => {
    const body = app.slice(app.indexOf('function HomeRoute()'), app.indexOf('function AppContent()'));
    expect(body).toContain('if (!isAuthenticated) return <Landing />;');
    expect(body).toContain('<MainMenu />');
    expect(body).toContain('<ProtectedRoute>');
  });

  it('the landing stays reachable while signed in', () => {
    expect(app).toContain('<Route path="/willkommen" element={<Landing />} />');
  });

  it('the landing is a lazy chunk (it must not weigh down the login page)', () => {
    expect(app).toMatch(/const Landing = lazyWithRetry\(\(\) => import\('\.\/components\/landing\/Landing'\)\)/);
  });

  it('every auth screen offers a way back to the landing', () => {
    for (const name of ['Login', 'Register', 'ForgotPassword', 'ResetPassword', 'VerifyEmail', 'ResendVerification']) {
      expect(read(`components/auth/${name}.tsx`), name).toContain('<BackToLanding />');
    }
  });
});
