import { describe, it, expect } from 'vitest';
import { radarValues, FULL_MARK_AVERAGE } from '../../utils/performanceRadar';

/** 0.40.0 — the radar spiked past its ring: the average was never capped. */
const base = { averageOverall: 50, checkoutPercentage: 30, total180s: 2, gamesWon: 1, gamesPlayed: 4 };

describe('radarValues', () => {
  it('a 112.88 average stays on the chart', () => {
    const v = radarValues({ ...base, averageOverall: 112.88 })!;
    expect(v.average).toBe(100);
  });

  it('every axis lies in 0–100, whatever comes in', () => {
    const v = radarValues({ averageOverall: 400, checkoutPercentage: 250, total180s: -3, gamesWon: 9, gamesPlayed: 4 })!;
    for (const value of Object.values(v)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    expect(radarValues({ ...base, averageOverall: NaN })!.average).toBe(0);
  });

  it('scales the average against a 100 full mark', () => {
    expect(FULL_MARK_AVERAGE).toBe(100);
    expect(radarValues({ ...base, averageOverall: 60 })!.average).toBe(60);
    expect(radarValues(base)!.winRate).toBe(25);
  });

  it('no games, no radar', () => {
    expect(radarValues({ ...base, gamesPlayed: 0 })).toBeNull();
  });
});
