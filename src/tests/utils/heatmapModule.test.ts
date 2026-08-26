import { describe, it, expect } from 'vitest';
import {
  createEmptyHeatmapData,
  updateHeatmapData,
  calculateSegmentHeat,
  getHeatColor,
  getTopSegments,
  formatSegmentName,
  calculateAccuracyStats,
} from '../../utils/heatmap';
import type { Dart, HeatmapData } from '../../types';

/**
 * Exercises the real `src/utils/heatmap.ts` module.
 *
 * `heatmap.test.ts` next door covers a different thing: the `${multiplier}x${segment}`
 * key format that GameScreen builds inline. Both formats exist in this codebase
 * (`3x20` there, `20-3` here) and both are worth pinning — but that file tests a
 * copy of the logic declared inside itself, so it cannot catch a change in this
 * module. These tests import the module and therefore can.
 */

const dart = (segment: number, multiplier: number): Dart =>
  ({ segment, multiplier, score: segment * multiplier }) as Dart;

const seg = (d: HeatmapData, key: string) => {
  const v = d.segments[key] as unknown;
  return typeof v === 'number' ? v : (v as { count: number })?.count;
};

describe('heatmap', () => {
  it('starts empty for a player', () => {
    const d = createEmptyHeatmapData('p1');
    expect(d.playerId).toBe('p1');
    expect(d.totalDarts).toBe(0);
    expect(d.segments).toEqual({});
  });

  describe('recording darts', () => {
    it('keys a regular hit by segment and multiplier', () => {
      const d = updateHeatmapData(createEmptyHeatmapData('p1'), [dart(20, 3)]);
      expect(seg(d, '20-3')).toBe(1);
      expect(d.totalDarts).toBe(1);
    });

    it('accumulates repeats of the same bed', () => {
      let d = updateHeatmapData(createEmptyHeatmapData('p1'), [dart(20, 3)]);
      d = updateHeatmapData(d, [dart(20, 3), dart(20, 3)]);
      expect(seg(d, '20-3')).toBe(3);
      expect(d.totalDarts).toBe(3);
    });

    /** The two bulls are distinct beds and must not collapse into one key. */
    it('separates outer bull from bull', () => {
      const d = updateHeatmapData(createEmptyHeatmapData('p1'), [dart(25, 1), dart(50, 1)]);
      expect(seg(d, '25-1')).toBe(1);
      expect(seg(d, '25-2')).toBe(1);
    });

    it('records a miss under its own key', () => {
      const d = updateHeatmapData(createEmptyHeatmapData('p1'), [dart(0, 1)]);
      expect(seg(d, '0-0')).toBe(1);
    });

    /** Old rows stored a bare count; they must survive being read back. */
    it('migrates the legacy numeric format without losing the count', () => {
      const legacy = { ...createEmptyHeatmapData('p1'), segments: { '20-3': 5 } as never, totalDarts: 5 };
      const d = updateHeatmapData(legacy, [dart(20, 3)]);
      expect(seg(d, '20-3')).toBe(6);
    });

    it('does not mutate the data it is given', () => {
      const before = updateHeatmapData(createEmptyHeatmapData('p1'), [dart(20, 3)]);
      const snapshot = JSON.stringify(before.segments);
      updateHeatmapData(before, [dart(19, 2)]);
      expect(JSON.stringify(before.segments)).toBe(snapshot);
    });
  });

  describe('heat colours', () => {
    it('is the empty tone at zero and the hottest at the top', () => {
      expect(getHeatColor(0)).toBe('#1e293b');
      expect(getHeatColor(99)).toBe('#ef4444');
    });

    it('rises monotonically through the bands', () => {
      const bands = [0.2, 0.7, 1.5, 2.5, 3.5, 4.5, 9].map(getHeatColor);
      expect(new Set(bands).size).toBe(bands.length);
    });
  });

  describe('segment heat', () => {
    it('is empty while no dart has been thrown', () => {
      expect(calculateSegmentHeat(createEmptyHeatmapData('p1'))).toEqual([]);
    });

    it('ranks the most-hit bed first and reports its share', () => {
      let d = updateHeatmapData(createEmptyHeatmapData('p1'), [dart(20, 3), dart(20, 3), dart(20, 3)]);
      d = updateHeatmapData(d, [dart(19, 1)]);
      const heat = calculateSegmentHeat(d);
      expect(heat[0].segment).toBe(20);
      expect(heat[0].count).toBe(3);
      expect(heat[0].percentage).toBeCloseTo(75, 5);
    });

    it('getTopSegments honours its limit', () => {
      let d = createEmptyHeatmapData('p1');
      for (const s of [20, 19, 18, 17, 16]) d = updateHeatmapData(d, [dart(s, 1)]);
      expect(getTopSegments(d, 3)).toHaveLength(3);
    });
  });

  describe('segment names', () => {
    it.each([
      [0, 1, 'Miss'],
      [25, 1, 'Outer Bull'],
      [25, 2, 'Bull'],
      [20, 1, '20'],
      [20, 2, 'D20'],
      [20, 3, 'T20'],
    ])('formats %i x%i as %s', (segment, multiplier, expected) => {
      expect(formatSegmentName(segment, multiplier)).toBe(expected);
    });
  });

  describe('accuracy stats', () => {
    it('reports zeroes rather than NaN before any dart', () => {
      const s = calculateAccuracyStats(createEmptyHeatmapData('p1'));
      expect(s.missRate).toBe(0);
      expect(s.favoriteSegment).toBeNull();
    });

    it('splits the throws across the bed types', () => {
      let d = createEmptyHeatmapData('p1');
      d = updateHeatmapData(d, [dart(20, 3), dart(20, 3), dart(19, 2), dart(5, 1), dart(0, 1)]);
      const s = calculateAccuracyStats(d);
      expect(s.tripleRate).toBeCloseTo(40, 5);
      expect(s.doubleRate).toBeCloseTo(20, 5);
      expect(s.singleRate).toBeCloseTo(20, 5);
      expect(s.missRate).toBeCloseTo(20, 5);
    });

    it('names the favourite bed', () => {
      let d = createEmptyHeatmapData('p1');
      d = updateHeatmapData(d, [dart(20, 3), dart(20, 3), dart(19, 1)]);
      expect(calculateAccuracyStats(d).favoriteTriple).toBe('T20');
    });
  });
});
