/**
 * Material 3 Expressive shapes as CSS `clip-path: polygon(…)`.
 *
 * Computed, never typed (same rule as the icon set): each shape is a polar
 * curve r(θ) sampled into a polygon in percent, so it scales with its box and
 * stays round. Every radius is ≤ 50 %, so a shape never leaves its box.
 */
export type ShapeName = 'circle' | 'cookie' | 'sunny' | 'clover' | 'gem';

const RADIUS: Record<ShapeName, (t: number) => number> = {
  circle: () => 1,
  // Nine gentle scallops — the M3 "cookie".
  cookie: t => 0.9 + 0.1 * Math.cos(9 * t),
  // Eight soft points.
  sunny: t => 0.84 + 0.16 * Math.cos(8 * t),
  // Four round leaves.
  clover: t => 0.68 + 0.32 * Math.abs(Math.cos(2 * t)) ** 0.6,
  // Five facets, softened.
  gem: t => 0.86 + 0.14 * Math.cos(5 * t),
};

const cache = new Map<string, string>();

/** `polygon(…)` for a shape. `steps` points; results are memoised. */
export function shapePolygon(name: ShapeName, steps = 90): string {
  const key = `${name}:${steps}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const r = RADIUS[name];
  const points: string[] = [];
  for (let i = 0; i < steps; i++) {
    // Start at the top so shapes with an odd symmetry stand upright.
    const t = (i / steps) * Math.PI * 2 - Math.PI / 2;
    const rr = 50 * r(t + Math.PI / 2);
    points.push(`${(50 + rr * Math.cos(t)).toFixed(2)}% ${(50 + rr * Math.sin(t)).toFixed(2)}%`);
  }
  const value = `polygon(${points.join(', ')})`;
  cache.set(key, value);
  return value;
}

/** Achievement tier → shape: rarer tiers get more expressive outlines. */
export const TIER_SHAPE: Record<'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond', ShapeName> = {
  bronze: 'circle',
  silver: 'cookie',
  gold: 'sunny',
  platinum: 'clover',
  diamond: 'gem',
};
