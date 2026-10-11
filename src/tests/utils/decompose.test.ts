import { describe, it, expect } from 'vitest';
import { likelyDecompositions } from '../../utils/decompose';
import { calculateThrowScore, validateScore } from '../../utils/scoring';

/**
 * 0.32.0 — after a typed total the app offers a few likely ways it was thrown.
 * Tapping one makes the darts exact, so the heatmap learns from a mental-
 * arithmetic player without slowing the numpad down.
 */
const label = (darts: { segment: number; multiplier: number }[]) =>
  darts.map(d => (d.segment === 0 ? '0' : d.segment === 50 ? 'Bull' : d.segment === 25 ? '25' : `${['', 'S', 'D', 'T'][d.multiplier]}${d.segment}`)).join(' ');

describe('likelyDecompositions', () => {
  it('60 suggests 20 20 20 first and T20 among the options', () => {
    const options = likelyDecompositions(60, { isCheckout: false, outRule: 'double' }).map(label);
    expect(options[0]).toBe('S20 S20 S20');
    expect(options.some(o => o.includes('T20'))).toBe(true);
  });

  it('every suggestion adds up exactly, has three darts and is exact', () => {
    for (let total = 1; total <= 180; total++) {
      if (!validateScore(total)) continue;
      const options = likelyDecompositions(total, { isCheckout: false, outRule: 'double' });
      expect(options.length, `total ${total}`).toBeGreaterThan(0);
      expect(options.length).toBeLessThanOrEqual(3);
      for (const darts of options) {
        expect(calculateThrowScore(darts), `total ${total}`).toBe(total);
        expect(darts).toHaveLength(3);
        expect(darts.every(d => !d.estimated)).toBe(true);
      }
      // No duplicates (same darts in another order).
      const keys = options.map(o => label([...o].sort((a, b) => a.score - b.score || a.segment - b.segment)));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('a checkout ends on a double under double-out, may use fewer darts', () => {
    for (let total = 2; total <= 170; total++) {
      const options = likelyDecompositions(total, { isCheckout: true, outRule: 'double' });
      for (const darts of options) {
        expect(calculateThrowScore(darts), `checkout ${total}`).toBe(total);
        const last = darts[darts.length - 1];
        expect(last.multiplier === 2 || last.segment === 50, `checkout ${total}: ${label(darts)}`).toBe(true);
        expect(darts.length).toBeLessThanOrEqual(3);
        expect(darts.slice(0, -1).every(d => d.segment !== 0)).toBe(true);
      }
    }
    expect(likelyDecompositions(40, { isCheckout: true, outRule: 'double' }).map(label)[0]).toBe('D20');
  });

  it('a triple-out checkout ends on a triple', () => {
    for (const darts of likelyDecompositions(60, { isCheckout: true, outRule: 'triple' })) {
      expect(darts[darts.length - 1].multiplier).toBe(3);
    }
  });

  it('offers nothing for 0, a bust or an impossible total', () => {
    expect(likelyDecompositions(0, { isCheckout: false, outRule: 'double' })).toEqual([]);
    expect(likelyDecompositions(60, { isCheckout: false, outRule: 'double', bust: true })).toEqual([]);
    expect(likelyDecompositions(179, { isCheckout: false, outRule: 'double' })).toEqual([]);
    expect(likelyDecompositions(169, { isCheckout: true, outRule: 'double' })).toEqual([]);
  });
});
