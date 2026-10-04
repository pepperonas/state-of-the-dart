import { describe, it, expect } from 'vitest';
import { RINGS, BOARD_RADIUS, bedAngles, wedgePath, discPath, bedShape } from '../../utils/boardGeometry';
import { BOARD_ORDER } from '../../utils/heatmap';

describe('board geometry', () => {
  it('uses the regulation proportions (WDF, mm relative to the double wire at 170)', () => {
    const mm = (r: number) => (r / BOARD_RADIUS) * 170;
    expect(mm(RINGS.bull)).toBeCloseTo(6.35, 1);
    expect(mm(RINGS.outerBull)).toBeCloseTo(15.9, 1);
    expect(mm(RINGS.tripleInner)).toBeCloseTo(99, 0);
    expect(mm(RINGS.tripleOuter)).toBeCloseTo(107, 0);
    expect(mm(RINGS.doubleInner)).toBeCloseTo(162, 0);
    expect(RINGS.doubleOuter).toBe(BOARD_RADIUS);
  });

  it('has strictly increasing rings', () => {
    const r = [RINGS.bull, RINGS.outerBull, RINGS.tripleInner, RINGS.tripleOuter, RINGS.doubleInner, RINGS.doubleOuter];
    r.slice(1).forEach((v, i) => expect(v).toBeGreaterThan(r[i]));
  });

  it('puts 20 at the top and every number in its own 18° wedge', () => {
    const top = bedAngles(20);
    expect((top.start + top.end) / 2).toBeCloseTo(-90);
    expect(top.end - top.start).toBeCloseTo(18);
    BOARD_ORDER.forEach((n, i) => expect((bedAngles(n).start + bedAngles(n).end) / 2).toBeCloseTo(-90 + i * 18));
  });

  it('draws a wedge whose corners lie on the two radii', () => {
    const d = wedgePath(-99, -81, 10, 20);
    const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
    // First point: outer radius at the start angle.
    expect(Math.hypot(nums[0], nums[1])).toBeCloseTo(20, 2);
    expect(d.startsWith('M')).toBe(true);
    expect(d.trim().endsWith('Z')).toBe(true);
  });

  it('maps beds to the right rings', () => {
    expect(bedShape(20, 3).map(s => [s.inner, s.outer])).toEqual([[RINGS.tripleInner, RINGS.tripleOuter]]);
    expect(bedShape(20, 2).map(s => [s.inner, s.outer])).toEqual([[RINGS.doubleInner, RINGS.doubleOuter]]);
    // A single is stored without inner/outer, so both single areas belong to it.
    expect(bedShape(20, 1)).toHaveLength(2);
    expect(bedShape(25, 2)[0].outer).toBe(RINGS.bull);
    expect(bedShape(25, 1)[0]).toMatchObject({ inner: RINGS.bull, outer: RINGS.outerBull });
  });

  it('draws a full disc for the bull and a ring with a hole for the outer bull', () => {
    expect(discPath(0, 5)).toContain('A');
    expect(discPath(3, 5).match(/M/g)).toHaveLength(2);
  });
});
