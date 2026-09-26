import { describe, it, expect } from 'vitest';
import { applyCricketVisit, emptyCricketState, isCricketWinner, CRICKET_NUMBERS } from '../../utils/cricket';
import type { Dart } from '../../types/index';

const hit = (segment: number, multiplier: 1 | 2 | 3): Dart =>
  ({ segment, multiplier, score: segment * multiplier, bed: 'single' });
const ids = ['a', 'b'];

describe('applyCricketVisit', () => {
  it('does not mutate the previous state', () => {
    const before = emptyCricketState(ids);
    const snapshot = JSON.parse(JSON.stringify(before));
    applyCricketVisit(before, ids, 'a', [hit(20, 3), hit(20, 3)]);
    expect(before).toEqual(snapshot);
  });

  it('marks up to three, then scores while an opponent is open', () => {
    const s = applyCricketVisit(emptyCricketState(ids), ids, 'a', [hit(20, 3), hit(20, 2)]);
    expect(s.a['20']).toBe(3);
    expect(s.a.points).toBe(40);
  });

  it('a triple that closes from two marks scores the two surplus marks', () => {
    let s = applyCricketVisit(emptyCricketState(ids), ids, 'a', [hit(19, 1), hit(19, 1)]);
    s = applyCricketVisit(s, ids, 'a', [hit(19, 3)]);
    expect(s.a['19']).toBe(3);
    expect(s.a.points).toBe(38);
  });

  it('scores nothing on a number every opponent has closed', () => {
    let s = applyCricketVisit(emptyCricketState(ids), ids, 'b', [hit(18, 3)]);
    s = applyCricketVisit(s, ids, 'a', [hit(18, 3), hit(18, 3)]);
    expect(s.a.points).toBe(0);
  });

  it('counts the bull as 25 per mark and ignores non-cricket numbers', () => {
    const s = applyCricketVisit(emptyCricketState(ids), ids, 'a', [hit(25, 2), hit(25, 2), hit(5, 3)]);
    expect(s.a['25']).toBe(3);
    expect(s.a.points).toBe(25);
  });
});

describe('isCricketWinner', () => {
  const allClosed = (points: number) => ({
    ...Object.fromEntries(CRICKET_NUMBERS.map(n => [n.toString(), 3])), points,
  });

  it('needs every number closed', () => {
    expect(isCricketWinner(emptyCricketState(ids), ids, 'a')).toBe(false);
  });

  it('wins with all closed and at least equal points', () => {
    expect(isCricketWinner({ a: allClosed(10), b: { ...allClosed(0), points: 10 } } as never, ids, 'a')).toBe(true);
  });

  it('does not win while behind on points', () => {
    expect(isCricketWinner({ a: allClosed(5), b: { ...allClosed(0), points: 10 } } as never, ids, 'a')).toBe(false);
  });
});
