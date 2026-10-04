import { describe, it, expect } from 'vitest';
import {
  normalizeHeatmapKey,
  bedKey,
  aggregateBeds,
  boardStats,
  heatLevel,
  formatSegmentName,
  boardNeighbours,
  HEAT_LEVELS,
} from '../../utils/heatmap';
import type { HeatmapData } from '../../types';

const hm = (segments: Record<string, unknown>, totalDarts = 0): HeatmapData =>
  ({ playerId: 'p', segments: segments as Record<string, number>, totalDarts, lastUpdated: new Date() });

describe('normalizeHeatmapKey', () => {
  it('reads all three key formats as the same bed', () => {
    expect(normalizeHeatmapKey('3x20')).toEqual({ segment: 20, multiplier: 3 });
    expect(normalizeHeatmapKey('20-3')).toEqual({ segment: 20, multiplier: 3 });
    // Segments 1–3 are the ones the old value heuristic got wrong.
    expect(normalizeHeatmapKey('2-1')).toEqual({ segment: 2, multiplier: 1 });
    expect(normalizeHeatmapKey('1x2')).toEqual({ segment: 2, multiplier: 1 });
  });

  it('maps every bull spelling onto 25 with the right ring', () => {
    for (const k of ['25-2', '50-2', '2x50', '50-1', '1x50']) expect(normalizeHeatmapKey(k)).toEqual({ segment: 25, multiplier: 2 });
    for (const k of ['25-1', '1x25']) expect(normalizeHeatmapKey(k)).toEqual({ segment: 25, multiplier: 1 });
  });

  it('reads segment 0 as a miss and rejects junk', () => {
    expect(normalizeHeatmapKey('0-0')).toEqual({ segment: 0, multiplier: 0 });
    expect(normalizeHeatmapKey('0x0')).toEqual({ segment: 0, multiplier: 0 });
    expect(normalizeHeatmapKey('21-1')).toBeNull();
    expect(normalizeHeatmapKey('20-4')).toBeNull();
    expect(normalizeHeatmapKey('banana')).toBeNull();
  });
});

describe('aggregateBeds', () => {
  it('merges the same bed written in different formats', () => {
    const agg = aggregateBeds(hm({ '3x20': 2, '20-3': { x: [], y: [], count: 3 } }));
    expect(agg.beds[bedKey(20, 3)]).toBe(5);
    expect(agg.hits).toBe(5);
  });

  it('never puts a bull on segment 6 (regression: bull was drawn at 3 o\'clock)', () => {
    const agg = aggregateBeds(hm({ '2x50': 4, '25-1': 2 }));
    expect(agg.beds['25-2']).toBe(4);
    expect(agg.beds['25-1']).toBe(2);
    expect(Object.keys(agg.beds).some(k => k.startsWith('6-'))).toBe(false);
  });

  it('counts misses separately and includes them in the total', () => {
    const agg = aggregateBeds(hm({ '0-0': 3, '20-1': 7 }));
    expect(agg.misses).toBe(3);
    expect(agg.hits).toBe(7);
    expect(agg.total).toBe(10);
    expect(agg.beds['0-0']).toBeUndefined();
  });

  it('gives every source the same total for the same darts', () => {
    const live = aggregateBeds(hm({ '3x20': 1, '0x0': 1, '2x50': 1 }));
    const stored = aggregateBeds(hm({ '20-3': 1, '0-0': 1, '25-2': 1 }, 3));
    expect(live.total).toBe(stored.total);
    expect(live.beds).toEqual(stored.beds);
  });

  it('keeps the larger stored total when old darts were never keyed', () => {
    expect(aggregateBeds(hm({ '20-1': 2 }, 5)).total).toBe(5);
  });

  it('accepts a JSON string and ignores broken entries', () => {
    const agg = aggregateBeds(hm('{"20-3":2,"oops":9}' as unknown as Record<string, unknown>));
    expect(agg.beds['20-3']).toBe(2);
    expect(agg.hits).toBe(2);
  });

  it('reports the hottest bed', () => {
    expect(aggregateBeds(hm({ '20-1': 2, '19-3': 5 })).max).toBe(5);
  });
});

describe('heatLevel', () => {
  it('is 0 for no hits and the top level for the hottest bed', () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(10, 10)).toBe(HEAT_LEVELS);
  });
  it('gives a single hit at least level 1', () => {
    expect(heatLevel(1, 1000)).toBe(1);
  });
  it('lifts small counts so one big bed does not grey out the rest', () => {
    // 1/4 of the maximum is half-way up the ramp (square-root scale).
    expect(heatLevel(25, 100)).toBe(Math.ceil(0.5 * HEAT_LEVELS));
  });
});

describe('boardStats', () => {
  it('computes rates against the total including misses', () => {
    const s = boardStats(aggregateBeds(hm({ '20-3': 2, '20-2': 1, '20-1': 4, '25-2': 1, '25-1': 1, '0-0': 1 })));
    expect(s.tripleRate).toBeCloseTo(20);
    expect(s.doubleRate).toBeCloseTo(10);
    expect(s.singleRate).toBeCloseTo(40);
    expect(s.bullRate).toBeCloseTo(20);
    expect(s.innerBullRate).toBeCloseTo(10);
    expect(s.missRate).toBeCloseTo(10);
  });

  it('finds the favourite number over all its beds and how the darts spill to its neighbours', () => {
    // 20 is the strongest number; its neighbours on the board are 5 (left) and 1 (right).
    const s = boardStats(aggregateBeds(hm({ '20-3': 3, '20-1': 3, '5-1': 3, '1-1': 1, '19-3': 4 })));
    expect(s.zone?.segment).toBe(20);
    expect(s.zone?.left).toBe(5);
    expect(s.zone?.right).toBe(1);
    expect(s.zone?.leftCount).toBe(3);
    expect(s.zone?.rightCount).toBe(1);
    expect(s.zone?.count).toBe(6);
  });

  it('has no zone without hits on the numbers', () => {
    expect(boardStats(aggregateBeds(hm({ '0-0': 3 }))).zone).toBeNull();
  });
});

describe('boardNeighbours', () => {
  it('follows the board order', () => {
    expect(boardNeighbours(20)).toEqual([5, 1]);
    expect(boardNeighbours(5)).toEqual([12, 20]);
    expect(boardNeighbours(3)).toEqual([17, 19]);
  });
});

describe('formatSegmentName', () => {
  const t = (k: string) => ({ 'heatmap.miss': 'Fehlwurf', 'heatmap.bull': 'Bull', 'heatmap.outer_bull': 'Single-Bull' }[k] ?? k);
  it('translates the special beds', () => {
    expect(formatSegmentName(0, 0, t)).toBe('Fehlwurf');
    expect(formatSegmentName(25, 1, t)).toBe('Single-Bull');
    expect(formatSegmentName(25, 2, t)).toBe('Bull');
  });
  it('never calls segment 50 a double fifty', () => {
    expect(formatSegmentName(50, 2, t)).toBe('Bull');
  });
  it('keeps darts notation for the numbers', () => {
    expect(formatSegmentName(20, 3, t)).toBe('T20');
    expect(formatSegmentName(16, 2, t)).toBe('D16');
    expect(formatSegmentName(7, 1, t)).toBe('7');
  });
});
