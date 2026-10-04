import { describe, it, expect } from 'vitest';
import { heatmapFromThrows, aggregateBeds } from '../../utils/heatmap';
import type { Dart } from '../../types/index';

/**
 * The heatmap the game screen (live) and the match history build from visits.
 * Both used to carry their own inline copy with different key formats; they
 * now share `heatmapFromThrows`.
 */
const d = (segment: number, multiplier: number): Pick<Dart, 'segment' | 'multiplier'> => ({ segment, multiplier: multiplier as Dart['multiplier'] });

describe('heatmapFromThrows', () => {
  const throws = [
    { playerId: 'a', darts: [d(20, 3), d(20, 3), d(1, 1)] },
    { playerId: 'b', darts: [d(19, 3)] },
    { playerId: 'a', darts: [d(0, 0), d(50, 2), d(25, 1)] },
  ];

  it('keeps only the chosen player and keys beds canonically', () => {
    const h = heatmapFromThrows(throws, 'a');
    expect(h.playerId).toBe('a');
    expect(h.segments['20-3']).toBe(2);
    expect(h.segments['1-1']).toBe(1);
    expect(h.segments['19-3']).toBeUndefined();
  });

  it('counts misses, so live rates have the same basis as the stored heatmap', () => {
    const h = heatmapFromThrows(throws, 'a');
    expect(h.totalDarts).toBe(6);
    const agg = aggregateBeds(h);
    expect(agg.misses).toBe(1);
    expect(agg.total).toBe(6);
  });

  it('puts both bulls in the centre, not on a number', () => {
    const agg = aggregateBeds(heatmapFromThrows(throws, 'a'));
    expect(agg.beds['25-2']).toBe(1);
    expect(agg.beds['25-1']).toBe(1);
  });

  it('tolerates visits without darts and unknown players', () => {
    expect(heatmapFromThrows([{ playerId: 'a' }], 'a').totalDarts).toBe(0);
    expect(heatmapFromThrows(throws, 'nobody').totalDarts).toBe(0);
  });
});
