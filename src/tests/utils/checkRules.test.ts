import { describe, it, expect } from 'vitest';
import { inRuleOf, outRuleOf, ruleSettings, checkoutRoute } from '../../utils/checkRules';
import { evaluateVisit, rulesOf } from '../../utils/visit';
import { numpadDarts, routeToDarts, calculateThrowScore } from '../../utils/scoring';
import type { Dart, Throw } from '../../types/index';

const d = (segment: number, multiplier: number): Dart => ({ segment, multiplier, score: segment * multiplier } as Dart);
const visitOn = (settings: object, remaining: number, darts: Dart[]) => {
  const rules = rulesOf({ startScore: 501, ...settings });
  const scored = 501 - remaining;
  const throws = scored > 0 ? [{ playerId: 'p', score: scored } as Throw] : [];
  return evaluateVisit(rules, throws, 'p', darts);
};

describe('rules from settings', () => {
  it('old matches keep their meaning (doubleOut default on, doubleIn off)', () => {
    expect(outRuleOf({})).toBe('double');
    expect(outRuleOf({ doubleOut: false })).toBe('single');
    expect(inRuleOf({})).toBe('single');
    expect(inRuleOf({ doubleIn: true })).toBe('double');
  });

  it('triple wins over double and writes consistent flags', () => {
    expect(outRuleOf({ doubleOut: true, tripleOut: true })).toBe('triple');
    expect(ruleSettings('triple', 'double')).toEqual({ tripleIn: true, doubleIn: false, doubleOut: true, tripleOut: false });
    const s = ruleSettings('double', 'triple');
    expect(inRuleOf(s)).toBe('double');
    expect(outRuleOf(s)).toBe('triple');
  });
});

describe('triple out', () => {
  it('a finish must land on a triple', () => {
    expect(visitOn({ tripleOut: true }, 60, [d(20, 3)]).checkout).toBe(true);
    const onDouble = visitOn({ tripleOut: true }, 40, [d(20, 2)]);
    expect(onDouble.checkout).toBe(false);
    expect(onDouble.bust).toBe(true);
  });

  it('1 and 2 left cannot be finished on a triple: bust', () => {
    expect(visitOn({ tripleOut: true }, 22, [d(20, 1)]).bust).toBe(true);
    expect(visitOn({ tripleOut: true }, 21, [d(20, 1)]).bust).toBe(true);
    expect(visitOn({ tripleOut: true }, 23, [d(20, 1)]).bust).toBe(false);
  });

  it('suggests routes up to 180 that end on a triple and add up', () => {
    for (const score of [3, 57, 99, 140, 171, 180]) {
      const route = checkoutRoute(score, 3, 'triple');
      expect(route, String(score)).not.toBeNull();
      const darts = routeToDarts(route!)!;
      expect(calculateThrowScore(darts)).toBe(score);
      expect(darts[darts.length - 1].multiplier).toBe(3);
    }
    expect(checkoutRoute(181, 3, 'triple')).toBeNull();
    expect(checkoutRoute(2, 3, 'triple')).toBeNull();
    // one dart left: only a triple itself
    expect(checkoutRoute(60, 1, 'triple')).toEqual(['T20']);
    expect(checkoutRoute(62, 1, 'triple')).toBeNull();
  });

  it('a typed total that finishes follows a triple route', () => {
    const darts = numpadDarts(99, 99, 3, 'triple');
    expect(calculateThrowScore(darts)).toBe(99);
    expect(darts[darts.length - 1].multiplier).toBe(3);
  });
});

describe('triple in', () => {
  it('nothing counts before the first triple, the triple itself counts', () => {
    expect(visitOn({ tripleIn: true }, 501, [d(20, 2), d(20, 1)]).score).toBe(0);
    expect(visitOn({ tripleIn: true }, 501, [d(20, 1), d(19, 3), d(5, 1)]).score).toBe(62);
  });

  it('once in, everything counts', () => {
    expect(visitOn({ tripleIn: true }, 441, [d(20, 1)]).score).toBe(20);
  });
});

describe('double rules are unchanged', () => {
  it('double out still needs a double, double in a double', () => {
    expect(visitOn({}, 40, [d(20, 2)]).checkout).toBe(true);
    expect(visitOn({}, 60, [d(20, 3)]).bust).toBe(true);
    expect(visitOn({ doubleIn: true }, 501, [d(20, 3)]).score).toBe(0);
  });
});
