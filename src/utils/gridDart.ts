import type { Dart } from '../types';

export type GridMultiplier = '1' | '2' | '3';

/** The dart for a bed picked on the S/D/T grid (25 = outer bull, 50 = bull, 0 = miss). */
export const gridDart = (segment: number, multiplier: GridMultiplier): Dart => {
  const m = Number(multiplier) as 1 | 2 | 3;
  if (segment === 0) return { segment: 0, multiplier: 0, score: 0, bed: 'miss' };
  if (segment === 25) return { segment: 25, multiplier: 1, score: 25, bed: 'outer-bull' };
  if (segment === 50) return { segment: 50, multiplier: 2, score: 50, bed: 'bull' };
  return { segment, multiplier: m, score: segment * m, bed: m === 3 ? 'triple' : m === 2 ? 'double' : 'single' };
};
