import { describe, it, expect } from 'vitest';
import type { Dart, Match, Throw } from '../../types';
import { editVisit } from '../../utils/editVisit';

const S = (n: number): Dart => ({ segment: n, multiplier: 1, score: n, bed: 'single' });
const T = (n: number): Dart => ({ segment: n, multiplier: 3, score: n * 3, bed: 'triple' });
const D = (n: number): Dart => ({ segment: n, multiplier: 2, score: n * 2, bed: 'double' });
const guess = (d: Dart): Dart => ({ ...d, estimated: true });

let id = 0;
const visit = (playerId: string, darts: Dart[], score: number, remaining: number, isBust = false): Throw =>
  ({ id: `t${++id}`, playerId, darts, score, remaining, isBust, timestamp: new Date(), visitNumber: 1 });

/** 101, double out. a: 60 (→41), b: 60 (→41), a: 40? would check out. */
const match = (throws: Throw[], extra: Partial<Match> = {}): Match => ({
  id: 'm', status: 'in-progress', currentLegIndex: 0,
  settings: { startScore: 101, doubleOut: true, legsToWin: 1 },
  legs: [{ id: 'l', throws }], players: [],
  ...extra,
} as unknown as Match);

describe('editVisit', () => {
  it('re-scores later visits of the same player', () => {
    const a1 = visit('a', [guess(T(20))], 60, 41);
    const b1 = visit('b', [S(20)], 20, 81);
    const a2 = visit('a', [S(20)], 20, 21);
    const r = editVisit(match([a1, b1, a2]), a1.id, [S(20), S(20), S(5)]); // 45 instead of 60
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.previousScore).toBe(60);
    expect(r.score).toBe(45);
    expect(r.throws.map(t => t.remaining)).toEqual([56, 81, 36]);
    expect(r.throws[1]).toMatchObject({ remaining: 81, score: 20 }); // the other player is untouched
  });

  it('a correction can make a later visit a bust — and undo one', () => {
    const a1 = visit('a', [S(20)], 20, 81);
    const a2 = visit('a', [T(20), S(20)], 80, 1); // 81 − 80 = 1 → bust under double out
    const bust = editVisit(match([a1, visit('b', [S(1)], 1, 100), { ...a2, score: 0, remaining: 81, isBust: true }]), a1.id, [S(20)]);
    expect(bust.ok && bust.throws[2].isBust).toBe(true);

    const fixed = editVisit(match([a1, visit('b', [S(1)], 1, 100), { ...a2, score: 0, remaining: 81, isBust: true }]), a1.id, [S(19)]);
    expect(fixed.ok && fixed.throws[2]).toMatchObject({ isBust: false, score: 80, remaining: 2 });
  });

  it('refuses a correction that would check out', () => {
    const a1 = visit('a', [T(20)], 60, 41);
    const a2 = visit('a', [S(1)], 1, 40);
    expect(editVisit(match([a1, a2]), a2.id, [S(1), D(20)])).toEqual({ ok: false, reason: 'checkout' });
  });

  it('a finished leg takes only a swap that scores the same — e.g. how a typed checkout was thrown', () => {
    const a1 = visit('a', [T(20)], 60, 41);
    const fin = visit('a', [guess(S(1)), guess(D(20))], 41, 0);
    const m = match([], { currentLegIndex: 1, legs: [{ id: 'l0', throws: [a1, fin], winner: 'a' }, { id: 'l1', throws: [] }] } as never);
    const swap = editVisit(m, fin.id, [S(9), D(16)]);
    expect(swap.ok && swap.legIndex).toBe(0);
    expect(swap.ok && swap.throws[1].darts).toEqual([S(9), D(16)]);
    // A different total, or a "checkout" not ending on a double, is refused.
    expect(editVisit(m, fin.id, [S(1), D(19)])).toEqual({ ok: false, reason: 'finished_leg' });
    expect(editVisit(m, fin.id, [S(1), S(20), S(20)])).toEqual({ ok: false, reason: 'finished_leg' });
  });

  it('refuses re-scoring a finished leg, unknown ids and empty darts', () => {
    const old = visit('a', [S(20)], 20, 81);
    const m = match([], { currentLegIndex: 1, legs: [{ id: 'l0', throws: [old], winner: 'a' }, { id: 'l1', throws: [] }] } as never);
    expect(editVisit(m, old.id, [S(19)])).toEqual({ ok: false, reason: 'finished_leg' });
    expect(editVisit(m, 'nope', [S(19)])).toEqual({ ok: false, reason: 'not_found' });
    const a1 = visit('a', [S(20)], 20, 81);
    expect(editVisit(match([a1]), a1.id, [])).toEqual({ ok: false, reason: 'invalid' });
    expect(editVisit(match([a1], { status: 'completed' }), a1.id, [S(1)])).toEqual({ ok: false, reason: 'finished_leg' });
    expect(editVisit(match([a1], { status: 'completed' }), a1.id, [S(5), S(15)]).ok).toBe(true);
  });
});
