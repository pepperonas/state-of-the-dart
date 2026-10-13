/**
 * The five axes of the statistics radar, each on 0–100.
 *
 * ⚠️ Every value is clamped. The average was divided by 80 and never capped,
 * so a 112.88 average drew at 141 % — a spike far past the chart's outer ring
 * (0.40.0). The scale now treats a 100 average (top amateur / pro level) as
 * the full mark.
 */
export interface RadarStats {
  averageOverall: number;
  checkoutPercentage: number;
  total180s: number;
  gamesWon: number;
  gamesPlayed: number;
}

export const FULL_MARK_AVERAGE = 100;

const clamp = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0);

export const radarValues = (s: RadarStats) => {
  if (s.gamesPlayed <= 0) return null;
  return {
    average: clamp((s.averageOverall / FULL_MARK_AVERAGE) * 100),
    checkout: clamp(s.checkoutPercentage),
    oneEighties: clamp((s.total180s / Math.max(10, s.total180s)) * 100),
    winRate: clamp((s.gamesWon / s.gamesPlayed) * 100),
    experience: clamp((s.gamesPlayed / Math.max(50, s.gamesPlayed)) * 100),
  };
};
