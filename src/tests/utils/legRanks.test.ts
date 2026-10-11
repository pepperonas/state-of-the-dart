import { describe, it, expect } from 'vitest';
import { legRanks, rankTone } from '../../utils/legRanks';

const ids = ['a', 'b', 'c', 'd'];
const visit = (playerId: string, score: number, isBust = false) => ({ playerId, score, isBust });

describe('legRanks', () => {
  it('nobody has a rank before anyone threw in the leg', () => {
    expect([...legRanks(ids, [], 501).values()]).toEqual([null, null, null, null]);
  });

  it('ranks by remaining score, lowest first', () => {
    const r = legRanks(ids, [visit('a', 60), visit('b', 100), visit('c', 26), visit('d', 140)], 501);
    expect(r.get('d')).toBe(1);
    expect(r.get('b')).toBe(2);
    expect(r.get('a')).toBe(3);
    expect(r.get('c')).toBe(4);
  });

  it('a shared score shares the rank, the next rank is skipped (1, 1, 3)', () => {
    const r = legRanks(['a', 'b', 'c'], [visit('a', 100), visit('b', 100), visit('c', 60)], 501);
    expect([r.get('a'), r.get('b'), r.get('c')]).toEqual([1, 1, 3]);
  });

  it('a player who has not thrown yet still ranks (they are on the start score)', () => {
    const r = legRanks(['a', 'b'], [visit('a', 60)], 501);
    expect([r.get('a'), r.get('b')]).toEqual([1, 2]);
  });

  it('everyone level again means nobody has a rank', () => {
    const r = legRanks(['a', 'b'], [visit('a', 60), visit('b', 60)], 501);
    expect([r.get('a'), r.get('b')]).toEqual([null, null]);
  });

  it('a bust scores nothing', () => {
    const r = legRanks(['a', 'b'], [visit('a', 60, true), visit('b', 20)], 501);
    expect([r.get('a'), r.get('b')]).toEqual([2, 1]);
  });
});

describe('rankTone', () => {
  it('1 green, 2 yellow, 3 orange, 4 red, then neutral', () => {
    expect([1, 2, 3, 4, 5, 8].map(rankTone)).toEqual([1, 2, 3, 4, 5, 5]);
  });
});
