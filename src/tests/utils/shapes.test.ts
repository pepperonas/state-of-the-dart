import { describe, it, expect } from 'vitest';
import { shapePolygon, TIER_SHAPE, type ShapeName } from '../../utils/shapes';

const points = (poly: string) =>
  poly.replace(/^polygon\(|\)$/g, '').split(', ').map(p => p.split(' ').map(v => parseFloat(v)));

describe('M3 expressive shapes', () => {
  const NAMES: ShapeName[] = ['circle', 'cookie', 'sunny', 'clover', 'gem'];

  it('every shape stays inside its box', () => {
    for (const n of NAMES) {
      for (const [x, y] of points(shapePolygon(n))) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('the circle is actually round', () => {
    for (const [x, y] of points(shapePolygon('circle'))) expect(Math.hypot(x - 50, y - 50)).toBeCloseTo(50, 1);
  });

  it('shapes are distinct and have their symmetry', () => {
    const polys = NAMES.map(n => shapePolygon(n));
    expect(new Set(polys).size).toBe(NAMES.length);
    // cookie: nine scallops → nine local maxima of the radius
    const radii = points(shapePolygon('cookie', 180)).map(([x, y]) => Math.hypot(x - 50, y - 50));
    const peaks = radii.filter((r, i) => r > radii[(i + radii.length - 1) % radii.length] && r >= radii[(i + 1) % radii.length]);
    expect(peaks).toHaveLength(9);
  });

  it('every tier has a shape', () => {
    expect(Object.keys(TIER_SHAPE).sort()).toEqual(['bronze', 'diamond', 'gold', 'platinum', 'silver']);
  });
});
