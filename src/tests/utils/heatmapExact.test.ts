import { describe, it, expect } from 'vitest';
import type { Dart } from '../../types';
import {
  exactDarts, exactShare, heatmapFromThrows, updateHeatmapData, removeFromHeatmapData,
  createEmptyHeatmapData, diffVisitDarts,
} from '../../utils/heatmap';

/**
 * 0.32.0 — the heatmap only shows darts that were really entered bed by bed.
 * A typed total ("60") is reconstructed into plausible darts (T20) marked
 * `estimated`; counting those painted a mental-arithmetic player's board solid
 * T20. And the stored per-player aggregate is booked by visit id, so taking a
 * visit back subtracts it instead of counting the previous one twice.
 */
const d = (segment: number, multiplier: 0 | 1 | 2 | 3, estimated = false): Dart =>
  ({ segment, multiplier, score: segment * multiplier, ...(estimated ? { estimated: true } : {}) });

describe('exact darts only', () => {
  it('exactDarts drops reconstructed darts', () => {
    expect(exactDarts([d(20, 3, true), d(5, 1), d(1, 1)])).toEqual([d(5, 1), d(1, 1)]);
    expect(exactDarts(undefined)).toEqual([]);
  });

  it('heatmapFromThrows ignores a typed total', () => {
    const throws = [
      { playerId: 'a', darts: [d(20, 3, true)] },
      { playerId: 'a', darts: [d(19, 1), d(19, 1), d(3, 1)] },
    ];
    const h = heatmapFromThrows(throws, 'a');
    expect(h.totalDarts).toBe(3);
    expect(h.segments['20-3']).toBeUndefined();
    expect(h.segments['19-1']).toBe(2);
  });

  it('exactShare counts exact darts against all darts of the player', () => {
    const throws = [
      { playerId: 'a', darts: [d(20, 3, true), d(20, 3, true), d(20, 3, true)] },
      { playerId: 'a', darts: [d(19, 1), d(7, 1)] },
      { playerId: 'b', darts: [d(1, 1)] },
    ];
    expect(exactShare(throws, 'a')).toEqual({ exact: 2, total: 5 });
  });

  it('updateHeatmapData never stores a reconstructed dart', () => {
    const h = updateHeatmapData(createEmptyHeatmapData('a'), [d(20, 3, true), d(5, 1)]);
    expect(h.totalDarts).toBe(1);
    expect(h.segments['20-3']).toBeUndefined();
  });
});

describe('removeFromHeatmapData', () => {
  it('takes darts back out and never goes below zero', () => {
    const base = updateHeatmapData(createEmptyHeatmapData('a'), [d(20, 1), d(20, 1), d(1, 1)]);
    const back = removeFromHeatmapData(base, [d(20, 1), d(1, 1), d(1, 1)]);
    expect(back.totalDarts).toBe(1);
    expect((back.segments['20-1'] as unknown as { count: number }).count).toBe(1);
    expect((back.segments['1-1'] as unknown as { count: number }).count).toBe(0);
  });

  it('ignores reconstructed darts on the way out too', () => {
    const base = updateHeatmapData(createEmptyHeatmapData('a'), [d(20, 3)]);
    expect(removeFromHeatmapData(base, [d(20, 3, true)]).totalDarts).toBe(1);
  });
});

describe('diffVisitDarts — booking by visit id', () => {
  const v = (id: string, playerId: string, darts: Dart[]) => ({ id, playerId, darts });

  it('books a new visit once', () => {
    const r1 = diffVisitDarts(new Map(), [v('1', 'a', [d(20, 1)])]);
    expect(r1.changes).toEqual([{ playerId: 'a', add: [d(20, 1)], remove: [] }]);
    const r2 = diffVisitDarts(r1.next, [v('1', 'a', [d(20, 1)])]);
    expect(r2.changes).toEqual([]);
  });

  it('an undo subtracts the visit and does NOT rebook the one before it', () => {
    const start = diffVisitDarts(new Map(), [v('1', 'a', [d(20, 1)]), v('2', 'b', [d(19, 1)])]).next;
    const r = diffVisitDarts(start, [v('1', 'a', [d(20, 1)])]);
    expect(r.changes).toEqual([{ playerId: 'b', add: [], remove: [d(19, 1)] }]);
  });

  it('a corrected visit swaps old darts for new ones', () => {
    const start = diffVisitDarts(new Map(), [v('1', 'a', [d(20, 3, true)])]).next;
    const r = diffVisitDarts(start, [v('1', 'a', [d(20, 1), d(20, 1), d(20, 1)])]);
    expect(r.changes).toEqual([{ playerId: 'a', add: [d(20, 1), d(20, 1), d(20, 1)], remove: [] }]);
  });

  it('typed totals produce no change at all', () => {
    expect(diffVisitDarts(new Map(), [v('1', 'a', [d(20, 3, true)])]).changes).toEqual([]);
  });
});
