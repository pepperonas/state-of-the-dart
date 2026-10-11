import { describe, it, expect, beforeEach } from 'vitest';
import {
  momentBetween, parseSnapshot, isNewer, publishScoreboard, readScoreboard, subscribeScoreboard,
  SCOREBOARD_KEY, type ScoreboardSnapshot, type ScoreboardPlayer,
} from '../../utils/scoreboard';
import { DEVICE_GAME_KEYS } from '../../utils/storage';

const player = (id: string, over: Partial<ScoreboardPlayer> = {}): ScoreboardPlayer => ({
  id, name: id.toUpperCase(), remaining: 501, rank: null, average: 0, legsWon: 0, setsWon: 0,
  dartsInLeg: 0, visits: [], ...over,
});

const snap = (over: Partial<ScoreboardSnapshot> = {}): ScoreboardSnapshot => ({
  v: 1, matchId: 'm1', updatedAt: 1, startScore: 501, status: 'in-progress',
  players: [player('a'), player('b')], activeIndex: 0, legsToWin: 3, showSets: false, setsToWin: 1,
  rules: 'DO', checkoutRoute: null, throwTotal: 0, throwDarts: 0, winnerName: null, ...over,
});

const after = (base: ScoreboardSnapshot, id: string, p: Partial<ScoreboardPlayer>, over: Partial<ScoreboardSnapshot> = {}) => ({
  ...base, updatedAt: base.updatedAt + 1,
  players: base.players.map(x => (x.id === id ? { ...x, ...p } : x)), ...over,
});

describe('momentBetween', () => {
  const base = snap();

  it('names the visit that just landed and grades it', () => {
    expect(momentBetween(base, after(base, 'a', { dartsInLeg: 3, visits: [{ score: 60, bust: false }] })))
      .toEqual({ kind: 'visit', name: 'A', score: 60 });
    expect(momentBetween(base, after(base, 'a', { dartsInLeg: 3, visits: [{ score: 140, bust: false }] }))?.kind).toBe('ton');
    expect(momentBetween(base, after(base, 'a', { dartsInLeg: 3, visits: [{ score: 180, bust: false }] }))?.kind).toBe('180');
    expect(momentBetween(base, after(base, 'b', { dartsInLeg: 3, visits: [{ score: 40, bust: true }] })))
      .toEqual({ kind: 'bust', name: 'B', score: 40 });
  });

  it('a leg won outranks the checkout visit, a match won outranks the leg', () => {
    const leg = after(base, 'a', { legsWon: 1, dartsInLeg: 0, visits: [] });
    expect(momentBetween(base, leg)).toEqual({ kind: 'leg', name: 'A', score: 0 });
    const won = after(base, 'a', { legsWon: 1 }, { status: 'completed', winnerName: 'A' });
    expect(momentBetween(base, won)).toEqual({ kind: 'match', name: 'A', score: 0 });
    // A set won resets legsWon to 0 — still a leg won.
    const set = after(base, 'a', { legsWon: 0, setsWon: 1 });
    expect(momentBetween(snap({ players: [player('a', { legsWon: 2 }), player('b')] }), set)?.kind).toBe('leg');
  });

  it('shows nothing for an undo, a typed dart, another match or a first snapshot', () => {
    const thrown = after(base, 'a', { dartsInLeg: 3, visits: [{ score: 60, bust: false }] });
    expect(momentBetween(thrown, { ...base, updatedAt: 9 })).toBeNull();
    // Undoing the second visit leaves the first one in the list: still no moment.
    const two = after(base, 'a', { dartsInLeg: 6, visits: [{ score: 60, bust: false }, { score: 100, bust: false }] });
    expect(momentBetween(two, after(two, 'a', { dartsInLeg: 3, visits: [{ score: 60, bust: false }] }))).toBeNull();
    expect(momentBetween(base, { ...base, updatedAt: 2, throwTotal: 20, throwDarts: 1 })).toBeNull();
    expect(momentBetween(base, after(base, 'a', { dartsInLeg: 3, visits: [{ score: 60, bust: false }] }, { matchId: 'm2' }))).toBeNull();
    expect(momentBetween(null, base)).toBeNull();
  });
});

describe('snapshot transport', () => {
  beforeEach(() => localStorage.clear());

  it('parses only well-formed snapshots', () => {
    expect(parseSnapshot(JSON.stringify(snap()))?.matchId).toBe('m1');
    expect(parseSnapshot('{"v":2}')).toBeNull();
    expect(parseSnapshot('not json')).toBeNull();
    expect(parseSnapshot(null)).toBeNull();
  });

  it('drops snapshots older than the one shown, but takes any new match', () => {
    expect(isNewer(snap({ updatedAt: 5 }), snap({ updatedAt: 4 }))).toBe(false);
    expect(isNewer(snap({ updatedAt: 5 }), snap({ updatedAt: 6 }))).toBe(true);
    expect(isNewer(snap({ updatedAt: 5 }), snap({ updatedAt: 1, matchId: 'm2' }))).toBe(true);
    expect(isNewer(null, snap())).toBe(true);
  });

  it('a newly opened window reads the last published snapshot', () => {
    publishScoreboard(snap({ updatedAt: 7 }));
    expect(readScoreboard()?.updatedAt).toBe(7);
  });

  it('delivers snapshots arriving through the storage event (no BroadcastChannel needed)', () => {
    const got: number[] = [];
    const off = subscribeScoreboard(s => got.push(s.updatedAt));
    window.dispatchEvent(new StorageEvent('storage', { key: SCOREBOARD_KEY, newValue: JSON.stringify(snap({ updatedAt: 3 })) }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'other', newValue: JSON.stringify(snap({ updatedAt: 4 })) }));
    off();
    window.dispatchEvent(new StorageEvent('storage', { key: SCOREBOARD_KEY, newValue: JSON.stringify(snap({ updatedAt: 5 })) }));
    expect(got).toEqual([3]);
  });

  it('signing out takes the scoreboard copy with the running games', () => {
    expect(DEVICE_GAME_KEYS).toContain(SCOREBOARD_KEY);
  });
});
