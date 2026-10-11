import { describe, it, expect } from 'vitest';
import { widthClassFor, paneCountFor } from '../../hooks/useWindowClass';
import { lastVisits, dartsInLeg } from '../../utils/arena';
import type { Throw, Dart } from '../../types/index';

describe('window size classes (M3)', () => {
  it('maps widths to the M3 classes', () => {
    expect(widthClassFor(390)).toBe('compact');
    expect(widthClassFor(599)).toBe('compact');
    expect(widthClassFor(600)).toBe('medium');
    expect(widthClassFor(839)).toBe('medium');
    expect(widthClassFor(840)).toBe('expanded');
    expect(widthClassFor(1199)).toBe('expanded');
    expect(widthClassFor(1200)).toBe('large');
    expect(widthClassFor(1599)).toBe('large');
    expect(widthClassFor(1600)).toBe('xl');
    expect(widthClassFor(2560)).toBe('xl');
  });

  it('one pane up to medium, two on expanded, three from large; never two on a phone held sideways', () => {
    expect(paneCountFor('compact', false)).toBe(1);
    expect(paneCountFor('medium', false)).toBe(1);
    expect(paneCountFor('expanded', false)).toBe(2);
    expect(paneCountFor('large', false)).toBe(3);
    expect(paneCountFor('xl', false)).toBe(3);
    expect(paneCountFor('expanded', true)).toBe(1);
  });
});

const visit = (playerId: string, score: number, extra: Partial<Throw> = {}): Throw =>
  ({ id: Math.random().toString(), playerId, score, darts: [{}, {}, {}] as Dart[], remaining: 0, timestamp: new Date(), ...extra } as Throw);

describe('lastVisits', () => {
  const throws = [visit('a', 60), visit('b', 26), visit('a', 100), visit('a', 0, { isBust: true }), visit('a', 140)];

  it('newest last, only the player, at most n', () => {
    expect(lastVisits(throws, 'a', 3)).toMatchObject([
      { score: 100, bust: false },
      { score: 0, bust: true },
      { score: 140, bust: false },
    ]);
  });

  it('a fresh leg has none', () => {
    expect(lastVisits([], 'a', 5)).toEqual([]);
  });
});

describe('dartsInLeg', () => {
  it('counts three per visit and the darts actually used on the checkout', () => {
    const throws = [
      visit('a', 60), visit('a', 100),
      visit('a', 40, { remaining: 0, darts: [{ segment: 20, multiplier: 2, score: 40 }] as Dart[] }),
      visit('b', 26),
    ];
    expect(dartsInLeg(throws, 'a')).toBe(7);
    expect(dartsInLeg(throws, 'b')).toBe(3);
  });
});
