import { describe, it, expect } from 'vitest';
import { angleAt, landingAngle, crossings, planSpin } from '../../utils/wheelPhysics';

describe('wheel physics (Coulomb friction + drag)', () => {
  it('starts at 0, ends exactly on the requested total rotation', () => {
    const theta = 2000;
    const { w0, mu, k, duration: T } = planSpin(theta);
    expect(angleAt(0, w0, mu, k)).toBeCloseTo(0, 6);
    expect(angleAt(T, w0, mu, k)).toBeCloseTo(theta, 0);
    // never runs backwards, never overshoots before the stop
    expect(angleAt(T * 1.5, w0, mu, k)).toBeCloseTo(theta, 0);
  });

  it('a spin lasts a few seconds with a long slow tail', () => {
    const theta = 2000;
    const { w0, mu, k, duration: T } = planSpin(theta);
    expect(T).toBeGreaterThan(3);
    expect(T).toBeLessThan(7);
    // the last 30% of the time covers only a small share of the angle
    expect(theta - angleAt(T * 0.7, w0, mu, k)).toBeLessThan(theta * 0.12);
  });
});

describe('landingAngle', () => {
  it('stops with the pointer (top) inside the winner wedge, several turns ahead', () => {
    for (const n of [2, 3, 5, 8]) {
      for (let winner = 0; winner < n; winner++) {
        const seg = 360 / n;
        const target = landingAngle(37, winner, n, 0.5, 5);
        expect(target - 37).toBeGreaterThanOrEqual(5 * 360);
        // wheel rotated by `target`: the wedge under the top pointer is at (360 - target mod 360)
        const under = ((360 - (target % 360)) % 360);
        expect(Math.floor(under / seg)).toBe(winner);
      }
    }
  });
});

describe('crossings', () => {
  it('counts every peg passed between two frames, even at high speed', () => {
    expect(crossings(10, 95, 45)).toBe(2);
    expect(crossings(44, 46, 45)).toBe(1);
    expect(crossings(46, 80, 45)).toBe(0);
  });
});
