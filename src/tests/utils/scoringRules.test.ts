import { describe, it, expect } from 'vitest';
import {
  calculateDartScore, parseDartNotation, formatDartNotation, calculateThrowScore,
  calculateAverage, calculateFirst9Average, isCheckout, isBust, getScoreCategory,
  validateScore, convertScoreToDarts, getQuickScoreButtons, isBogeyNumber,
  getBogeyNumbers, calculateDartsForLeg,
} from '../../utils/scoring';
import type { Dart, Throw } from '../../types/index';

/**
 * The X01 rulebook. `scoring.test.ts` next door covers the happy paths; this
 * file goes after the edges — the ones that decide whether a leg was won or a
 * throw was a bust, where being wrong changes the outcome of somebody's game.
 */
const d = (segment: number, multiplier: 0 | 1 | 2 | 3): Dart =>
  ({ segment, multiplier, score: calculateDartScore(segment, multiplier) }) as Dart;

describe('calculateDartScore', () => {
  it.each([
    [20, 3, 60], [20, 2, 40], [20, 1, 20], [20, 0, 0],
    [1, 3, 3], [19, 2, 38],
  ] as const)('S/D/T %i x%i = %i', (seg, mult, expected) => {
    expect(calculateDartScore(seg, mult)).toBe(expected);
  });

  /** The bull is the one bed where the multiplier does not simply multiply. */
  it('scores the bull as 25 / 50, not 25 x multiplier', () => {
    expect(calculateDartScore(25, 1)).toBe(25);
    expect(calculateDartScore(25, 2)).toBe(50);
  });

  it('a miss is worth nothing whatever the segment', () => {
    expect(calculateDartScore(20, 0)).toBe(0);
    expect(calculateDartScore(0, 0)).toBe(0);
  });
});

describe('dart notation', () => {
  it.each([
    ['T20', 60], ['D16', 32], ['S5', 5], ['20', 20],
  ])('parses %s as %i', (notation, score) => {
    expect(parseDartNotation(notation).score).toBe(score);
  });

  it('parses the bulls', () => {
    expect(parseDartNotation('BULL').score).toBe(50);
    expect(parseDartNotation('25').score).toBe(25);
  });

  it('round-trips through format for the ordinary beds', () => {
    for (const n of ['T20', 'D16', 'S5']) {
      expect(formatDartNotation(parseDartNotation(n))).toBe(n);
    }
  });

  /** It rejects loudly rather than silently scoring 0 — a wrong 0 is worse. */
  it('rejects an unparseable string', () => {
    expect(() => parseDartNotation('nonsense')).toThrow(/Invalid dart notation/);
  });
});

describe('isBust — the rule that decides a turn', () => {
  it('a score above the remainder busts', () => {
    expect(isBust(40, 41, true)).toBe(true);
    expect(isBust(40, 60, true)).toBe(true);
  });

  it('an exact finish on a double is not a bust', () => {
    expect(isBust(40, 40, true, d(20, 2))).toBe(false);
  });

  /** Double-out: reaching zero on anything but a double is a bust. */
  it('reaching zero without a double busts under double-out', () => {
    expect(isBust(40, 40, true, d(20, 1))).toBe(true);
    expect(isBust(60, 60, true, d(20, 3))).toBe(true);
  });

  it('the bull counts as a double for finishing', () => {
    expect(isBust(50, 50, true, d(25, 2))).toBe(false);
  });

  it('reaching zero without a double is fine under straight-out', () => {
    expect(isBust(40, 40, false, d(20, 1))).toBe(false);
  });

  /** 1 cannot be finished with a double, so leaving 1 is a bust. */
  it('leaving exactly 1 busts under double-out', () => {
    expect(isBust(41, 40, true)).toBe(true);
    expect(isBust(41, 40, false)).toBe(false);
  });

  it('leaving a bogey number busts under double-out', () => {
    for (const bogey of getBogeyNumbers()) {
      expect(isBust(bogey + 10, 10, true), `leaving ${bogey}`).toBe(true);
      expect(isBust(bogey + 10, 10, false), `leaving ${bogey} straight-out`).toBe(false);
    }
  });

  it('leaving a checkable score is not a bust', () => {
    expect(isBust(170, 0, true)).toBe(false);
    expect(isBust(100, 60, true)).toBe(false);
  });

  it('a zero-score turn never busts', () => {
    expect(isBust(501, 0, true)).toBe(false);
    expect(isBust(2, 0, true)).toBe(false);
  });
});

describe('isCheckout', () => {
  it('is true only when the remainder is cleared on a double', () => {
    expect(isCheckout(40, [d(20, 2)])).toBe(true);
    expect(isCheckout(40, [d(20, 1), d(20, 1)])).toBe(false);
  });

  it('is false when the darts do not clear the remainder', () => {
    expect(isCheckout(60, [d(20, 2)])).toBe(false);
  });

  it('is false for an empty throw', () => {
    expect(isCheckout(40, [])).toBe(false);
  });
});

describe('averages', () => {
  /**
   * A full turn of three darts totalling `score`.
   *
   * ⚠️ The average divides by DARTS THROWN, not by turns. `convertScoreToDarts`
   * returns the *fewest* darts (60 is a single T20), so building a turn from it
   * would make a 60 average 180. A real turn is three darts — pad with misses.
   */
  const t = (score: number): Throw => {
    const darts = convertScoreToDarts(score);
    while (darts.length < 3) darts.push(d(0, 0));
    return { darts, score, isBust: false } as Throw;
  };

  it('is zero with no throws, not NaN', () => {
    expect(calculateAverage([])).toBe(0);
    expect(calculateFirst9Average([])).toBe(0);
  });

  it('averages per three darts', () => {
    expect(calculateAverage([t(60), t(60), t(60)])).toBeCloseTo(60, 5);
    expect(calculateAverage([t(60), t(0)])).toBeCloseTo(30, 5);
  });

  /** The first-9 average is a standard darts statistic: the first three turns. */
  it('first-9 looks at three turns only', () => {
    const throws = [t(60), t(60), t(60), t(0), t(0)];
    expect(calculateFirst9Average(throws)).toBeCloseTo(60, 5);
  });

  it('first-9 handles a leg shorter than three turns', () => {
    expect(calculateFirst9Average([t(60)])).toBeGreaterThan(0);
  });

  it('first-9 counts nine darts, not three turns', () => {
    // Four turns of 60; only the first nine darts may count.
    const throws = [t(60), t(60), t(60), t(180)];
    expect(calculateFirst9Average(throws)).toBeCloseTo(60, 5);
  });

  it('a bust turn still consumes darts in the average', () => {
    const busted = { darts: [d(20, 3), d(0, 0), d(0, 0)], score: 0, isBust: true } as Throw;
    expect(calculateAverage([t(60), busted])).toBeLessThan(60);
  });

  /**
   * The distinguishing case: a leg that ends on a checkout has a final turn of
   * fewer than three darts. Built only from three-dart turns, "score per dart
   * x 3" and "score per turn" give the same number and the test proves nothing.
   */
  it('divides by darts thrown, not by turns', () => {
    const full = t(60);                                    // 3 darts, 60
    const checkout = { darts: [d(20, 2)], score: 40, isBust: false } as Throw; // 1 dart, 40
    // 100 points off 4 darts = 25 per dart = 75 per three darts.
    expect(calculateAverage([full, checkout])).toBeCloseTo(75, 2);
  });

  it('is zero when the turns contain no darts at all', () => {
    expect(calculateAverage([{ darts: [], score: 60, isBust: false } as unknown as Throw])).toBe(0);
  });
});

describe('getScoreCategory', () => {
  it('names the milestone scores', () => {
    expect(getScoreCategory(180)).toBeTruthy();
    expect(getScoreCategory(140)).toBeTruthy();
    expect(getScoreCategory(100)).toBeTruthy();
  });

  it('is null for an ordinary score', () => {
    expect(getScoreCategory(7)).toBeNull();
    expect(getScoreCategory(0)).toBeNull();
  });
});

describe('validateScore', () => {
  it('accepts every score a turn can actually produce', () => {
    for (const s of [0, 1, 60, 180]) expect(validateScore(s), `${s}`).toBe(true);
  });

  it('rejects impossible totals', () => {
    expect(validateScore(181)).toBe(false);
    expect(validateScore(-1)).toBe(false);
  });

  /** 179, 178, 176, 175, 173, 172, 169, 166, 163 cannot be thrown with 3 darts. */
  it('rejects the three-dart impossibilities', () => {
    for (const s of [179, 178, 176, 175, 173, 172, 169, 166, 163]) {
      expect(validateScore(s), `${s} is not throwable`).toBe(false);
    }
  });
});

describe('convertScoreToDarts', () => {
  /**
   * Regression: 36 throwable scores used to come back short (141 -> 140), and
   * because the reducer scores a turn from its darts, typing 141 on the numpad
   * deducted 140. See the backstop in `convertScoreToDarts`.
   */
  it('produces darts that add up to the score', () => {
    const wrong: string[] = [];
    for (let score = 0; score <= 180; score++) {
      if (!validateScore(score)) continue;
      const darts = convertScoreToDarts(score);
      const sum = darts.reduce((n, x) => n + x.score, 0);
      if (sum !== score) wrong.push(`${score} -> ${sum}`);
    }
    expect(wrong, `Reconstructions that do not add up:\n${wrong.join('\n')}`).toEqual([]);
  });

  it('never returns more than three darts', () => {
    for (let score = 0; score <= 180; score++) {
      if (!validateScore(score)) continue;
      expect(convertScoreToDarts(score).length, `score ${score}`).toBeLessThanOrEqual(3);
    }
  });

  it('gives every dart coordinates, so the heatmap has something to plot', () => {
    for (const score of [0, 26, 60, 100, 140, 180]) {
      for (const dart of convertScoreToDarts(score)) {
        expect(dart, `score ${score}`).toHaveProperty('x');
        expect(dart).toHaveProperty('y');
      }
    }
  });

  it('uses only reachable beds', () => {
    for (let score = 0; score <= 180; score++) {
      if (!validateScore(score)) continue;
      for (const dart of convertScoreToDarts(score)) {
        expect([0, 1, 2, 3]).toContain(dart.multiplier);
        expect(dart.segment === 0 || dart.segment === 25 || (dart.segment >= 1 && dart.segment <= 20)).toBe(true);
      }
    }
  });
});

describe('bogey numbers', () => {
  it('agrees with the checkout table view of impossible finishes', () => {
    expect([...getBogeyNumbers()].sort((a, b) => a - b)).toEqual([159, 162, 163, 165, 166, 168, 169]);
  });

  it('isBogeyNumber matches the list', () => {
    for (const n of getBogeyNumbers()) expect(isBogeyNumber(n)).toBe(true);
    for (const n of [170, 158, 100, 40, 2]) expect(isBogeyNumber(n)).toBe(false);
  });
});

describe('quick score buttons', () => {
  it('offers only throwable scores', () => {
    for (const s of getQuickScoreButtons()) expect(validateScore(s), `${s}`).toBe(true);
  });

  it('has no duplicates', () => {
    const b = getQuickScoreButtons();
    expect(new Set(b).size).toBe(b.length);
  });
});

describe('calculateDartsForLeg', () => {
  it('is zero for a leg with no throws', () => {
    expect(calculateDartsForLeg({ throws: [] } as never)).toBe(0);
  });

  it('counts every dart actually thrown', () => {
    const leg = { throws: [{ darts: [d(20, 3), d(20, 3), d(20, 3)] }, { darts: [d(20, 2)] }] };
    expect(calculateDartsForLeg(leg as never)).toBe(4);
  });
});
