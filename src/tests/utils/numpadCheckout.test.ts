import { describe, it, expect } from 'vitest';
import { numpadDarts, routeToDarts, convertScoreToDarts, calculateThrowScore } from '../../utils/scoring';
import { getBogeyNumbers } from '../../data/checkoutTable';

/**
 * Typing the exact remaining score on the numpad is a checkout. The greedy
 * reconstruction (T20 first) does not end on a double, so under double-out
 * every such entry was a bust — 141 became T20 T20 S21-ish, never T20 T19 D12.
 */
const endsOnDouble = (darts: { multiplier: number; segment: number }[]) => {
  const last = darts[darts.length - 1];
  return last.multiplier === 2 || last.segment === 50;
};

describe('numpadDarts — checkout on the numpad', () => {
  it('141 at 141 with double-out finishes on a double and adds up', () => {
    const darts = numpadDarts(141, 141, 3, true);
    expect(calculateThrowScore(darts)).toBe(141);
    expect(endsOnDouble(darts)).toBe(true);
  });

  it('every finish 2–170 (no bogey numbers) is a real checkout with three darts', () => {
    const bogeys = new Set(getBogeyNumbers());
    for (let score = 2; score <= 170; score++) {
      if (bogeys.has(score)) continue;
      const darts = numpadDarts(score, score, 3, true);
      expect(calculateThrowScore(darts), `score ${score}`).toBe(score);
      expect(endsOnDouble(darts), `score ${score}`).toBe(true);
      expect(darts.length).toBeLessThanOrEqual(3);
    }
  });

  it('respects the darts left in the visit', () => {
    const darts = numpadDarts(100, 100, 2, true);
    expect(darts.map(d => `${d.multiplier}x${d.segment}`)).toEqual(['3x20', '2x20']);
  });

  it('leaves every other entry to the usual reconstruction', () => {
    expect(numpadDarts(60, 141, 3, true)).toEqual(convertScoreToDarts(60).map(d => ({ ...d, x: expect.any(Number), y: expect.any(Number) })));
    expect(calculateThrowScore(numpadDarts(141, 141, 3, false))).toBe(141);
  });
});

describe('routeToDarts', () => {
  it('reads every token of the checkout table', () => {
    expect(routeToDarts(['T20', 'S5', 'D12', 'Bull', '25'])!.map(d => [d.segment, d.multiplier, d.score])).toEqual([
      [20, 3, 60], [5, 1, 5], [12, 2, 24], [50, 2, 50], [25, 1, 25],
    ]);
  });
  it('returns null for an unknown token', () => {
    expect(routeToDarts(['X9'])).toBeNull();
  });
});
