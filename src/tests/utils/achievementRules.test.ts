import { describe, it, expect } from 'vitest';
import {
  meetsRequirement, allAchievementsReached, hasExactDarts, isZeroVisit, nextMissStreak,
  legsWonInMatch, matchScore, tonsInMatch, minCheckoutAttempts, wonOnFirstCheckoutAttempt, LOWER_IS_BETTER,
} from '../../utils/achievementRules';
import type { Dart, Match, MatchPlayer, Throw } from '../../types';

const miss: Dart = { segment: 0, multiplier: 0, score: 0 };
const t20: Dart = { segment: 20, multiplier: 3, score: 60 };

describe('meetsRequirement', () => {
  it('"unter 12 Darts" is strictly under the target', () => {
    expect(meetsRequirement('checkout_darts_max', 12, { target: 12, matchMode: 'below' })).toBe(false);
    expect(meetsRequirement('checkout_darts_max', 11, { target: 12, matchMode: 'below' })).toBe(true);
  });
  it('"mit nur 12 Darts" allows the target itself', () => {
    expect(meetsRequirement('leg_darts', 12, { target: 12 })).toBe(true);
    expect(meetsRequirement('leg_darts', 13, { target: 12 })).toBe(false);
  });
  it('a lower-better value of 0 means nothing was measured', () => {
    expect(meetsRequirement('leg_darts', 0, { target: 12 })).toBe(false);
  });
  it('"mindestens 20 Würfe" is higher-better (regression: any short leg unlocked it)', () => {
    expect(LOWER_IS_BETTER.has('leg_visits_min')).toBe(false);
    expect(meetsRequirement('leg_visits_min', 8, { target: 20 })).toBe(false);
    expect(meetsRequirement('leg_visits_min', 20, { target: 20 })).toBe(true);
  });
  it('exact matches only the target', () => {
    expect(meetsRequirement('exact_score', 100, { target: 100, matchMode: 'exact' })).toBe(true);
    expect(meetsRequirement('exact_score', 101, { target: 100, matchMode: 'exact' })).toBe(false);
  });
});

describe('allAchievementsReached', () => {
  const all = ['a', 'b', 'all1', 'all2'];
  const isAll = (id: string) => id.startsWith('all');
  it('does not wait for itself or its twin (regression: it could never unlock)', () => {
    expect(allAchievementsReached(['a', 'b'], all, isAll)).toBe(true);
  });
  it('needs every other achievement', () => {
    expect(allAchievementsReached(['a'], all, isAll)).toBe(false);
  });
  it('legacy ids do not make up for a missing one', () => {
    expect(allAchievementsReached(['a', 'first-180', 'x'], all, isAll)).toBe(false);
  });
});

describe('darts and visits', () => {
  it('typed totals are not exact darts', () => {
    expect(hasExactDarts([t20, { ...t20, estimated: true }])).toBe(false);
    expect(hasExactDarts([t20, miss])).toBe(true);
    expect(hasExactDarts([])).toBe(false);
  });
  it('a bust is not a zero visit even though it is stored with score 0', () => {
    expect(isZeroVisit(0, true)).toBe(false);
    expect(isZeroVisit(0, false)).toBe(true);
    expect(isZeroVisit(5, false)).toBe(false);
  });
  it('counts missed darts across visits, a hit ends the run', () => {
    let run = nextMissStreak(0, [t20, miss, miss], 60);
    expect(run).toBe(2);
    run = nextMissStreak(run, [miss, miss, miss], 0);
    expect(run).toBe(5);
    expect(nextMissStreak(run, [miss, t20], 60)).toBe(0);
  });
  it('a typed 0 is three misses, another typed total ends the run', () => {
    expect(nextMissStreak(1, [{ ...miss, estimated: true }], 0)).toBe(4);
    expect(nextMissStreak(4, [{ ...t20, estimated: true }], 60)).toBe(0);
  });
  it('a bust ends the run', () => {
    expect(nextMissStreak(4, [miss], 0, true)).toBe(0);
  });
});

const player = (id: string, over: Partial<MatchPlayer> = {}): MatchPlayer => ({
  playerId: id, name: id, setsWon: 0, legsWon: 0, matchAverage: 0, matchHighestScore: 0,
  match180s: 0, match171Plus: 0, match140Plus: 0, match100Plus: 0, match60Plus: 0,
  checkoutAttempts: 0, checkoutsHit: 0, ...over,
});
const leg = (winner: string) => ({ id: winner + Math.random(), throws: [], winner, startedAt: new Date() });

describe('match score', () => {
  // Best of three sets: a won set 1 (3:0), b won sets 2 and 3. legsWon was reset each set.
  const match = {
    settings: { legsToWin: 3, setsToWin: 2 },
    legs: ['a', 'a', 'a', 'b', 'b', 'b', 'b', 'b', 'b'].map(leg),
    players: [player('a', { setsWon: 1, legsWon: 0 }), player('b', { setsWon: 2, legsWon: 3 })],
  } as unknown as Match;

  it('counts legs over the whole match, not the current set', () => {
    expect(legsWonInMatch(match, 'a')).toBe(3);
  });
  it('a match in sets is decided on sets', () => {
    expect(matchScore(match, match.players[1])).toBe(2);
    expect(matchScore({ ...match, settings: { legsToWin: 3 } } as Match, match.players[1])).toBe(6);
  });
});

describe('tonsInMatch', () => {
  it('adds all 100+ buckets (regression: only 100–139 counted)', () => {
    expect(tonsInMatch(player('a', { match100Plus: 2, match140Plus: 2, match171Plus: 1, match180s: 1 }))).toBe(6);
  });
});

describe('minCheckoutAttempts', () => {
  it('reads the minimum from the description', () => {
    expect(minCheckoutAttempts('Erreiche eine Checkout-Quote von 60% (min. 20 Versuche)')).toBe(20);
    expect(minCheckoutAttempts('Erreiche eine Checkout-Quote von 70% (min. 30 Versuche)')).toBe(30);
    expect(minCheckoutAttempts('ohne Angabe')).toBe(10);
  });
});

describe('wonOnFirstCheckoutAttempt', () => {
  const th = (isCheckoutAttempt: boolean) => ({ isCheckoutAttempt } as Throw);
  it('the winning visit was the only one in checkout range', () => {
    expect(wonOnFirstCheckoutAttempt([th(false), th(false), th(true)])).toBe(true);
  });
  it('an earlier missed attempt does not count', () => {
    expect(wonOnFirstCheckoutAttempt([th(false), th(true), th(true)])).toBe(false);
  });
});
