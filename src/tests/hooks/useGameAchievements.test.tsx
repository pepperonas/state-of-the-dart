import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { Dart, Leg, Match, MatchPlayer, Throw } from '../../types';

const checkAchievement = vi.fn();
const checkStreakProgress = vi.fn();
const unlockAchievement = vi.fn();
vi.mock('../../context/AchievementContext', () => ({
  useAchievements: () => ({ checkAchievement, checkStreakProgress, unlockAchievement }),
}));
vi.mock('../../services/api', () => ({ api: { achievements: { getCalendarStats: vi.fn() } } }));

import { useGameAchievements } from '../../hooks/useGameAchievements';

const hook = () => renderHook(() => useGameAchievements()).result.current;
/** Calls of a metric as [playerId, value, options] */
const calls = (metric: string) =>
  checkAchievement.mock.calls.filter(c => c[1] === metric).map(c => [c[0], c[2], c[4]]);
const streakCalls = (metric: string) =>
  checkStreakProgress.mock.calls.filter(c => c[1] === metric).map(c => [c[0], c[2]]);

const T20: Dart = { segment: 20, multiplier: 3, score: 60, bed: 'triple' };
const D20: Dart = { segment: 20, multiplier: 2, score: 40, bed: 'double' };
const S20: Dart = { segment: 20, multiplier: 1, score: 20, bed: 'single' };
const MISS: Dart = { segment: 0, multiplier: 0, score: 0, bed: 'miss' };
const est = (d: Dart): Dart => ({ ...d, estimated: true });

let seq = 0;
const visit = (playerId: string, score: number, remaining: number, over: Partial<Throw> = {}): Throw => ({
  id: `t${seq++}`, playerId, darts: [T20, T20, T20], score, remaining, timestamp: new Date(), visitNumber: 1, ...over,
});
const player = (id: string, over: Partial<MatchPlayer> = {}): MatchPlayer => ({
  playerId: id, name: id, setsWon: 0, legsWon: 0, matchAverage: 50, matchHighestScore: 0,
  match180s: 0, match171Plus: 0, match140Plus: 0, match100Plus: 0, match60Plus: 0,
  checkoutAttempts: 0, checkoutsHit: 0, ...over,
});
const legOf = (winner: string, throws: Throw[] = [], id = `leg${seq++}`): Leg =>
  ({ id, throws, winner, startedAt: new Date() });
const matchOf = (over: Partial<Match> = {}): Match => ({
  id: 'm1', type: 'x01', settings: { startScore: 501, legsToWin: 3 }, players: [player('a'), player('b')],
  legs: [], currentLegIndex: 0, currentSetIndex: 0, status: 'completed', winner: 'a', startedAt: new Date(), ...over,
} as Match);

/** A 501 leg won by `a` in exactly `visits` full visits (checkout on the last). */
const legInVisits = (visits: number, startScore = 501): Leg => {
  const throws: Throw[] = [];
  let rem = startScore;
  for (let i = 0; i < visits; i++) {
    const score = i === visits - 1 ? rem : Math.min(60, rem - 40);
    rem -= score;
    throws.push(visit('a', score, rem, { visitNumber: i + 1 }));
    if (i < visits - 1) throws.push(visit('b', 20, 400, { darts: [S20, MISS, MISS] }));
  }
  return legOf('a', throws);
};

beforeEach(() => {
  checkAchievement.mockReset();
  checkStreakProgress.mockReset();
  unlockAchievement.mockReset();
});

describe('throw level — typed totals are not judged dart by dart', () => {
  it('a typed 180 counts as 180 but not as three triples', () => {
    hook().checkThrowAchievements('a', [est(T20), est(T20), est(T20)], 180, false);
    expect(calls('score_180')).toHaveLength(1);
    expect(calls('triples_hit')).toHaveLength(0);
    expect(calls('perfect_180')).toHaveLength(0);
  });
  it('three triples entered bed by bed do count', () => {
    hook().checkThrowAchievements('a', [T20, T20, T20], 180, false);
    expect(calls('triples_hit')).toHaveLength(3);
    expect(calls('perfect_180')).toHaveLength(1);
  });
  it('a typed checkout does not claim the double it was reconstructed with', () => {
    hook().checkThrowAchievements('a', [est(T20), est(D20)], 100, true, 100);
    expect(calls('checkouts')).toHaveLength(1);
    expect(calls('checkout_d20')).toHaveLength(0);
    expect(calls('checkout_two_dart')).toHaveLength(0);
  });
});

describe('throw level — busts', () => {
  it('a bust is not a zero visit and not a low score', () => {
    hook().checkThrowAchievements('a', [T20, T20, S20], 0, false, undefined, 'm1', { isBust: true });
    expect(calls('three_miss_visit')).toHaveLength(0);
    expect(calls('visit_under_10')).toHaveLength(0);
    expect(calls('consecutive_misses')).toHaveLength(0);
  });
  it('a real zero visit is one', () => {
    hook().checkThrowAchievements('a', [MISS, MISS, MISS], 0, false);
    expect(calls('three_miss_visit')).toHaveLength(1);
    expect(calls('consecutive_misses')).toEqual([['a', 3, { mode: 'max' }]]);
  });
});

describe('throw level — distinct checkout values', () => {
  it('the same value twice is still one value', () => {
    const h = hook();
    h.checkThrowAchievements('a', [D20], 40, true, 40);
    h.checkThrowAchievements('a', [D20], 40, true, 40);
    h.checkThrowAchievements('a', [S20, D20], 60, true, 60);
    expect(calls('unique_checkout_values').map(c => c[1])).toEqual([1, 1, 2]);
    expect(calls('unique_checkout_values')[0][2]).toEqual({ mode: 'max' });
  });
});

describe('throw level — three-dart checkouts are a streak', () => {
  it('reports the streak and resets it on a shorter checkout', () => {
    const h = hook();
    h.checkThrowAchievements('a', [T20, S20, D20], 120, true, 120);
    h.checkThrowAchievements('a', [T20, S20, D20], 120, true, 120);
    h.checkThrowAchievements('a', [D20], 40, true, 40);
    h.checkThrowAchievements('a', [T20, S20, D20], 120, true, 120);
    expect(streakCalls('three_dart_checkout').map(c => c[1])).toEqual([1, 2, 1]);
    expect(calls('three_dart_checkout')).toHaveLength(0);
  });
});

describe('leg level', () => {
  it('darter achievements are for 501 only', () => {
    const leg = legInVisits(3, 301);
    hook().checkLegAchievements(leg, matchOf({ settings: { startScore: 301, legsToWin: 3 }, legs: [leg] }), 'a');
    expect(calls('leg_darts')).toHaveLength(0);
    expect(calls('leg_301_darts')).toHaveLength(1);
  });
  it('"quick finish (301)" gets the darts of the whole leg, not of the last visit', () => {
    const leg = legInVisits(4, 301);
    hook().checkLegAchievements(leg, matchOf({ settings: { startScore: 301, legsToWin: 3 }, legs: [leg] }), 'a');
    expect(calls('checkout_darts_max')).toEqual([['a', 12, { mode: 'absolute' }]]);
  });
  it('no quick-finish check outside 301', () => {
    const leg = legInVisits(6);
    hook().checkLegAchievements(leg, matchOf({ legs: [leg] }), 'a');
    expect(calls('checkout_darts_max')).toHaveLength(0);
    expect(calls('leg_darts')).toEqual([['a', 18, undefined]]);
  });
  it('the same leg announced twice (undo, re-win) counts once', () => {
    const leg = legInVisits(6);
    const h = hook();
    h.checkLegAchievements(leg, matchOf({ legs: [leg] }), 'a');
    h.checkLegAchievements(leg, matchOf({ legs: [leg] }), 'a');
    expect(calls('legs_lost')).toHaveLength(1);
  });
  it('darts per leg are not judged after every leg (efficient winner is a match result)', () => {
    const leg = legInVisits(4);
    hook().checkLegAchievements(leg, matchOf({ legs: [leg] }), 'a');
    expect(calls('avg_darts_per_leg_max')).toHaveLength(0);
  });
  it('a lost leg ends the no-bust run of the loser', () => {
    const h = hook();
    const legB = legOf('b', [visit('b', 501, 0)]);
    h.checkLegAchievements(legB, matchOf({ legs: [legB] }), 'b');
    const legA = legOf('a', [visit('a', 501, 0)]);
    h.checkLegAchievements(legA, matchOf({ legs: [legB, legA] }), 'a');
    const legB2 = legOf('b', [visit('b', 501, 0)]);
    h.checkLegAchievements(legB2, matchOf({ legs: [legB, legA, legB2] }), 'b');
    expect(streakCalls('legs_no_bust').filter(c => c[0] === 'b').map(c => c[1])).toEqual([1, 1]);
  });
  it('first checkout attempt: only when no earlier visit was in range', () => {
    const h = hook();
    const first = legOf('a', [visit('a', 400, 101), visit('a', 101, 0, { isCheckoutAttempt: true })]);
    h.checkLegAchievements(first, matchOf({ legs: [first] }), 'a');
    const second = legOf('a', [visit('a', 400, 101), visit('a', 0, 101, { isCheckoutAttempt: true }), visit('a', 101, 0, { isCheckoutAttempt: true })]);
    h.checkLegAchievements(second, matchOf({ legs: [first, second] }), 'a');
    expect(calls('first_dart_checkout')).toHaveLength(1);
  });
});

describe('match level', () => {
  const win = (legs: string[], over: Partial<Match> = {}) => {
    const match = matchOf({ legs: legs.map(w => legOf(w)), ...over });
    hook().checkMatchAchievements(match, 'a', id => id === 'a');
  };

  it('a single-leg match is not a close win', () => {
    win(['a'], { settings: { startScore: 501, legsToWin: 1 } });
    expect(calls('close_win')).toHaveLength(0);
    expect(calls('close_wins')).toHaveLength(0);
  });
  it('3:2 is a close win', () => {
    win(['a', 'b', 'a', 'b', 'a']);
    expect(calls('close_win')).toHaveLength(1);
  });
  it('whitewash is judged over the whole match, not the last set', () => {
    // b won a leg in set 1; MatchPlayer.legsWon (last set only) says 0.
    win(['a', 'b', 'a', 'a', 'a', 'a', 'a'], {
      settings: { startScore: 501, legsToWin: 3, setsToWin: 2 },
      players: [player('a', { setsWon: 2, legsWon: 3 }), player('b', { legsWon: 0 })],
    });
    expect(calls('whitewash')).toHaveLength(0);
  });
  it('tons in a match count every 100+ visit', () => {
    win(['a', 'a', 'a'], { players: [player('a', { match100Plus: 2, match140Plus: 2, match180s: 1 }), player('b')] });
    expect(calls('tons_in_match')).toContainEqual(['a', 5, { mode: 'absolute' }]);
  });
  it('checkout percentage carries the attempts', () => {
    win(['a', 'a', 'a'], { players: [player('a', { checkoutAttempts: 12, checkoutsHit: 6 }), player('b')] });
    expect(calls('checkout_percentage')).toEqual([['a', 50, { mode: 'absolute', attempts: 12 }]]);
  });
  it('efficient winner is checked for the winner only', () => {
    const legs = [legInVisits(4), legInVisits(5)];
    hook().checkMatchAchievements(matchOf({ legs }), 'a', id => id === 'a');
    expect(calls('avg_darts_per_leg_max')).toEqual([['a', 13.5, { mode: 'absolute' }]]);
  });
  it('first-leg streak counts matches, not wins', () => {
    const h = hook();
    // a wins three matches but takes the first leg only in the first one
    for (const legs of [['a', 'a', 'a'], ['b', 'a', 'a', 'a'], ['b', 'a', 'a', 'a']]) {
      h.checkMatchAchievements(matchOf({ legs: legs.map(w => legOf(w)) }), 'a', id => id === 'a');
    }
    expect(streakCalls('first_leg_wins').filter(c => c[0] === 'a').map(c => c[1])).toEqual([1]);
  });
  it('unique opponents are not added per match any more', () => {
    win(['a', 'a', 'a']);
    expect(calls('unique_opponents')).toHaveLength(0);
  });
  it('a loss ends the whitewash run', () => {
    const h = hook();
    h.checkMatchAchievements(matchOf({ legs: ['a', 'a', 'a'].map(w => legOf(w)) }), 'a', id => id === 'a');
    h.checkMatchAchievements(matchOf({ legs: ['b', 'b', 'b'].map(w => legOf(w)), winner: 'b' }), 'b', id => id === 'b');
    h.checkMatchAchievements(matchOf({ legs: ['a', 'a', 'a'].map(w => legOf(w)) }), 'a', id => id === 'a');
    expect(streakCalls('whitewash_streak').filter(c => c[0] === 'a').map(c => c[1])).toEqual([1, 1]);
  });
});

describe('training', () => {
  const done = (hitRate: number, mode = 'doubles', extra = {}) => ({ mode, completed: true, hitRate, ...extra });
  it('80 %+ in a row is a streak per mode', () => {
    const h = hook();
    h.checkTrainingAchievements('a', done(85));
    h.checkTrainingAchievements('a', done(90));
    h.checkTrainingAchievements('a', done(85, 'triples'));
    h.checkTrainingAchievements('a', done(50));
    h.checkTrainingAchievements('a', done(80));
    expect(streakCalls('training_80_percent').map(c => c[1])).toEqual([1, 2, 1, 1]);
  });
  it('perfect training reports the hit rate against target 100', () => {
    hook().checkTrainingAchievements('a', done(100));
    expect(calls('training_perfect')).toEqual([['a', 100, { mode: 'absolute' }]]);
  });
  it('around the clock completed means all numbers hit', () => {
    hook().checkTrainingAchievements('a', done(40, 'around-the-clock', { allNumbersHit: true }));
    expect(calls('training_all_numbers')).toHaveLength(1);
  });
});
