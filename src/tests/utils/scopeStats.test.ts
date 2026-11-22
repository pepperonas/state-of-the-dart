import { describe, it, expect } from 'vitest';
import { scopeStats } from '../../utils/scopeStats';
import type { Throw } from '../../types';

const th = (playerId: string, score: number, remaining: number, extra: Partial<Throw> = {}): Throw => ({
  id: Math.random().toString(36), playerId, score, remaining, darts: [], timestamp: new Date(), visitNumber: 1, ...extra,
});

/** Bug report 21.02.: the in-game table can show the current leg, not only the match. */
describe('scopeStats', () => {
  const leg1 = { winner: 'a', throws: [th('a', 180, 321), th('b', 60, 441), th('a', 140, 181), th('a', 141, 40), th('a', 40, 0)] };
  const leg2 = { winner: undefined, throws: [th('a', 100, 401), th('a', 0, 401, { isBust: true })] };

  it('counts one leg on its own', () => {
    const s = scopeStats([leg2], 'a', 501);
    expect(s).toMatchObject({ highest: 100, s180: 0, s140: 0, s100: 1, checkoutsHit: 0, checkoutAttempts: 0 });
    expect(s.average).toBeCloseTo(50);
  });
  it('adds legs up like the match totals', () => {
    const s = scopeStats([leg1, leg2], 'a', 501);
    expect(s).toMatchObject({ highest: 180, s180: 1, s140: 2, s100: 1, checkoutsHit: 1, checkoutAttempts: 1 });
  });
  it('a player without visits in the leg shows zeros', () => {
    expect(scopeStats([leg2], 'b', 501)).toMatchObject({ average: 0, highest: 0, checkoutAttempts: 0 });
  });
});
