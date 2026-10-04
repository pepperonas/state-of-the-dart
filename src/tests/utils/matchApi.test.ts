import { describe, it, expect } from 'vitest';
import { toApiMatch, matchSaveKey } from '../../utils/matchApi';
import type { Match } from '../../types/index';

const T0 = Date.UTC(2026, 8, 1, 20, 0, 0);
const dart = (score: number) => ({ segment: score / 3, multiplier: 3 as const, score, bed: 'triple' as const });

const match = (over: Partial<Match> = {}): Match => ({
  id: 'm1',
  type: 'x01',
  status: 'in-progress',
  settings: { startScore: 501, legsToWin: 3, setsToWin: 1, doubleOut: true, doubleIn: false },
  players: [
    { playerId: 'a', name: 'A', setsWon: 0, legsWon: 0, matchAverage: 90, matchHighestScore: 180,
      match180s: 1, match171Plus: 0, match140Plus: 0, match100Plus: 0, match60Plus: 1, checkoutAttempts: 0, checkoutsHit: 0 },
  ],
  legs: [{
    id: 'l1',
    startedAt: new Date(T0),
    throws: [
      { id: 't1', playerId: 'a', darts: [dart(60), dart(60), dart(60)], score: 180, remaining: 321, timestamp: new Date(T0 + 1000), visitNumber: 1 },
      { id: 't2', playerId: 'a', darts: [dart(60)], score: 60, remaining: 261, timestamp: new Date(T0 + 2000), visitNumber: 2 },
    ],
  }],
  currentLegIndex: 0,
  startedAt: new Date(T0),
  ...over,
} as Match);

describe('toApiMatch', () => {
  it('always carries winner and completedAt, as null when unset — PUT only writes present fields', () => {
    const api = toApiMatch(match());
    expect(api).toHaveProperty('winner', null);
    expect(api).toHaveProperty('completedAt', null);
    // …and they survive JSON, unlike undefined.
    expect(JSON.parse(JSON.stringify(api))).toMatchObject({ winner: null, completedAt: null });
  });

  it('carries the winner and completion time of a finished match', () => {
    const api = toApiMatch(match({ status: 'completed', winner: 'a', completedAt: new Date(T0 + 9000) }));
    expect(api).toMatchObject({ winner: 'a', completedAt: T0 + 9000 });
  });

  it('sends the per-player totals the server stores', () => {
    const p = toApiMatch(match()).players[0];
    expect(p.highestScore).toBe(180);
    // 180 + a numpad 60 (stored as one T20): two visits = 6 darts, first-9 (180+60)/6*3.
    // Counting stored darts said 4 and 180 — the numpad made a 60 look like a 180.
    expect(p.dartsThrown).toBe(6);
    expect(p.first9Average).toBe(120);
  });

  it('turns every timestamp into epoch ms', () => {
    const api = toApiMatch(match());
    expect(api.startedAt).toBe(T0);
    expect(api.legs[0].startedAt).toBe(T0);
    expect(api.legs[0].completedAt).toBeNull();
    expect(api.legs[0].throws[1].timestamp).toBe(T0 + 2000);
    expect(api.legs[0].legNumber).toBe(1);
  });
});

describe('matchSaveKey', () => {
  it('changes when a visit is corrected to a different score with the same throw count', () => {
    const before = match();
    const corrected = match();
    corrected.legs[0].throws[1] = { ...corrected.legs[0].throws[1], id: 't2b', score: 45 };
    expect(matchSaveKey(corrected, 0)).not.toBe(matchSaveKey(before, 0));
  });

  it('is stable for the same state', () => {
    expect(matchSaveKey(match(), 0)).toBe(matchSaveKey(match(), 0));
  });

  it('changes with the player at the oche', () => {
    expect(matchSaveKey(match(), 1)).not.toBe(matchSaveKey(match(), 0));
  });
});
