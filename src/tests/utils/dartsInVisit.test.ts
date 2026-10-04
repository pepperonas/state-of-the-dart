import { describe, it, expect } from 'vitest';
import { dartsInVisit, calculateAverage, calculateFirst9Average, calculateDartsForLeg, isNineDarter } from '../../utils/scoring';
import type { Throw, Leg } from '../../types/index';

/**
 * A visit is three darts; only the checkout counts the darts actually used.
 * The numpad stores a typed total as "plausible" darts — 60 is ONE dart (T20)
 * — so counting stored darts made a visit of 60 a 180 average.
 */
const T20 = { segment: 20, multiplier: 3, score: 60 } as const;
const D20 = { segment: 20, multiplier: 2, score: 40 } as const;
const v = (score: number, darts: unknown[], remaining: number, isBust = false): Throw =>
  ({ id: String(Math.random()), playerId: 'a', darts, score, remaining, isBust, timestamp: new Date(), visitNumber: 1 }) as Throw;

describe('dartsInVisit', () => {
  it('counts three for an ordinary visit, whatever was stored', () => {
    expect(dartsInVisit(v(60, [T20], 441))).toBe(3);
    expect(dartsInVisit(v(0, [], 501))).toBe(3);
  });
  it('counts the darts used for a checkout', () => {
    expect(dartsInVisit(v(40, [D20], 0))).toBe(1);
    expect(dartsInVisit(v(100, [T20, D20], 0))).toBe(2);
  });
  it('a bust is a full visit', () => {
    expect(dartsInVisit(v(0, [T20], 40, true))).toBe(3);
  });
});

describe('averages count visits, not stored darts', () => {
  it('a numpad 60 is a 60 average, not 180', () => {
    expect(calculateAverage([v(60, [T20], 441)])).toBe(60);
  });
  it('a two-dart checkout lifts the average as it should', () => {
    // 180 + 180 + 141 (three darts) = 501 in 9 darts = 167.
    expect(calculateAverage([v(180, [T20, T20, T20], 321), v(180, [T20, T20, T20], 141), v(141, [T20, T20, T20], 0)])).toBe(167);
  });
  it('first-9 takes the first three visits', () => {
    expect(calculateFirst9Average([v(60, [T20], 441), v(60, [T20], 381), v(60, [T20], 321), v(180, [T20, T20, T20], 141)])).toBe(60);
  });
  it('darts per leg and the nine-darter count visits too', () => {
    const leg = { id: 'l', winner: 'a', throws: [v(60, [T20], 441), v(60, [T20], 381), v(60, [T20], 321), v(180, [T20, T20, T20], 141), v(141, [T20, T20, T20], 0)] } as unknown as Leg;
    expect(calculateDartsForLeg(leg)).toBe(15);
    expect(isNineDarter(leg, 501)).toBe(false);
  });
});
