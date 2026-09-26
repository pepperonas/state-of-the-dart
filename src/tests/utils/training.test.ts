import { describe, it, expect } from 'vitest';
import { advanceThroughSequence, bobs27Round, BOBS_27_BULL } from '../../utils/training';
import type { Dart } from '../../types/index';

const d = (segment: number, multiplier: 0 | 1 | 2 | 3): Dart =>
  ({ segment, multiplier, score: segment === 50 ? 50 : segment * multiplier, bed: 'single' });

describe('advanceThroughSequence', () => {
  it('moves one target per dart that hits in order', () => {
    const r = advanceThroughSequence([d(1, 2), d(2, 2), d(3, 2)], 1, { multiplier: 2, last: 20, step: 1 });
    expect(r).toMatchObject({ target: 4, hits: 3, points: 12, completed: false });
  });

  it('a dart on a later target does not count before the current one is hit', () => {
    const r = advanceThroughSequence([d(2, 2), d(1, 2)], 1, { multiplier: 2, last: 20, step: 1 });
    expect(r).toMatchObject({ target: 2, hits: 1 });
  });

  it('needs the right multiplier when one is required', () => {
    expect(advanceThroughSequence([d(20, 1)], 20, { multiplier: 3, last: 1, step: -1 }).hits).toBe(0);
  });

  it('counts down for triples and completes on the last target', () => {
    const r = advanceThroughSequence([d(2, 3), d(1, 3), d(20, 3)], 2, { multiplier: 3, last: 1, step: -1 });
    expect(r).toMatchObject({ target: 1, hits: 2, completed: true });
  });

  it('around the clock accepts any bed', () => {
    const r = advanceThroughSequence([d(5, 1), d(6, 3)], 5, { last: 20, step: 1 });
    expect(r).toMatchObject({ target: 7, hits: 2 });
  });
});

describe("Bob's 27", () => {
  it('each dart in the double adds its value', () => {
    expect(bobs27Round(27, 10, [d(10, 2), d(10, 2), d(10, 1)])).toMatchObject({ hits: 2, score: 67 });
  });

  it('a hit elsewhere in the segment is not a double', () => {
    expect(bobs27Round(27, 10, [d(10, 1), d(10, 3)])).toMatchObject({ hits: 0, score: 7 });
  });

  it('a round without a double costs the double\'s value', () => {
    expect(bobs27Round(27, 5, [d(1, 1)]).score).toBe(17);
  });

  it('ends at zero or below', () => {
    expect(bobs27Round(10, 5, [])).toMatchObject({ score: 0, completed: true, busted: true });
  });

  it('goes to the bull after 20 and finishes there', () => {
    expect(bobs27Round(100, 20, []).nextTarget).toBe(BOBS_27_BULL);
    const bull = bobs27Round(100, BOBS_27_BULL, [d(50, 2)]);
    expect(bull).toMatchObject({ hits: 1, score: 150, completed: true, busted: false });
  });
});
