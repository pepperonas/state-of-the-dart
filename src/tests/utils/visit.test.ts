import { describe, it, expect } from 'vitest';
import { countedScore, evaluateVisit, rulesOf, scoredInLeg } from '../../utils/visit';
import type { Dart, Throw } from '../../types/index';

const S = (n: number): Dart => ({ segment: n, multiplier: 1, score: n, bed: 'single' });
const D = (n: number): Dart => ({ segment: n, multiplier: 2, score: n * 2, bed: 'double' });
const T = (n: number): Dart => ({ segment: n, multiplier: 3, score: n * 3, bed: 'triple' });
const MISS: Dart = { segment: 0, multiplier: 0, score: 0, bed: 'miss' };

const throwOf = (playerId: string, score: number): Throw => ({
  id: `t${Math.random()}`, playerId, darts: [], score, remaining: 0,
  timestamp: new Date(), visitNumber: 1,
});

const rules = (over: Partial<ReturnType<typeof rulesOf>> = {}) =>
  ({ startScore: 501, doubleOut: true, doubleIn: false, ...over });

describe('rulesOf', () => {
  it('defaults to 501, double-out on, double-in off', () => {
    expect(rulesOf({})).toEqual({ startScore: 501, doubleOut: true, doubleIn: false });
  });
});

describe('scoredInLeg', () => {
  it('only counts the given player', () => {
    expect(scoredInLeg([throwOf('a', 60), throwOf('b', 100), throwOf('a', 45)], 'a')).toBe(105);
  });
});

describe('countedScore — double-in', () => {
  it('counts everything when double-in is off', () => {
    expect(countedScore([T(20), S(5), S(1)], false, false)).toBe(66);
  });

  it('counts nothing before the first double', () => {
    expect(countedScore([T(20), T(20), S(1)], false, true)).toBe(0);
  });

  it('counts the opening double and everything after it', () => {
    expect(countedScore([S(20), D(10), T(20)], false, true)).toBe(80);
  });

  it('counts everything once the player is in', () => {
    expect(countedScore([T(20), T(20), S(1)], true, true)).toBe(121);
  });
});

describe('evaluateVisit', () => {
  it('scores a normal visit', () => {
    const v = evaluateVisit(rules(), [], 'a', [T(20), T(20), T(20)]);
    expect(v).toMatchObject({ previousRemaining: 501, score: 180, newRemaining: 321, bust: false, checkout: false });
  });

  it('checks out on a double', () => {
    const v = evaluateVisit(rules(), [throwOf('a', 461)], 'a', [D(20)]);
    expect(v).toMatchObject({ score: 40, newRemaining: 0, checkout: true, bust: false });
  });

  it('busts when reaching zero on a single with double-out', () => {
    const v = evaluateVisit(rules(), [throwOf('a', 481)], 'a', [S(20)]);
    expect(v).toMatchObject({ bust: true, checkout: false, score: 0, newRemaining: 20, rawScore: 20 });
  });

  it('allows a single finish without double-out', () => {
    const v = evaluateVisit(rules({ doubleOut: false }), [throwOf('a', 481)], 'a', [S(20)]);
    expect(v.checkout).toBe(true);
  });

  it('applies double-in to the first scoring visit', () => {
    const v = evaluateVisit(rules({ doubleIn: true }), [], 'a', [T(20), D(16), S(5)]);
    expect(v).toMatchObject({ score: 37, newRemaining: 464, rawScore: 97 });
  });

  it('an unopened double-in visit is not a bust, just worth nothing', () => {
    const v = evaluateVisit(rules({ doubleIn: true }), [], 'a', [T(20), MISS, S(1)]);
    expect(v).toMatchObject({ score: 0, bust: false, newRemaining: 501 });
  });

  it('another player having scored does not open the leg for this one', () => {
    const v = evaluateVisit(rules({ doubleIn: true }), [throwOf('b', 100)], 'a', [T(20)]);
    expect(v.score).toBe(0);
  });

  it('an empty visit neither busts nor checks out', () => {
    const v = evaluateVisit(rules(), [throwOf('a', 499)], 'a', []);
    expect(v).toMatchObject({ bust: false, checkout: false, newRemaining: 2 });
  });
});
