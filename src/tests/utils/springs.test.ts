import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  SPATIAL, STANDARD, EFFECTS, springPosition, settleTime, springCss, springCssBlock, framerDamping,
  SPRING_BEGIN, SPRING_END,
} from '../../utils/springs';
import * as motion from '../../utils/motion';

const css = readFileSync(resolve(__dirname, '../../styles/motion.css'), 'utf8');

describe('spring maths', () => {
  it('starts at 0 and settles at 1', () => {
    for (const s of [SPATIAL.fast, STANDARD.default, EFFECTS.slow]) {
      expect(springPosition(s, 0)).toBeCloseTo(0, 6);
      expect(springPosition(s, settleTime(s))).toBeCloseTo(1, 2);
    }
  });

  it('effects never overshoot, expressive spatial springs do', () => {
    const peak = (s: { stiffness: number; dampingRatio: number }) =>
      Math.max(...Array.from({ length: 2000 }, (_, i) => springPosition(s, i / 1000)));
    for (const s of Object.values(EFFECTS)) {
      expect(s.dampingRatio).toBe(1);
      expect(peak(s)).toBeLessThanOrEqual(1);
    }
    for (const s of Object.values(SPATIAL)) expect(peak(s)).toBeGreaterThan(1.005);
  });

  it('the CSS easing runs from 0 to 1', () => {
    const { easing } = springCss(SPATIAL.fast);
    expect(easing.startsWith('linear(0, ')).toBe(true);
    expect(easing.endsWith(', 1)')).toBe(true);
  });
});

describe('one source', () => {
  it('motion.css carries exactly the generated spring block (re-run tools/gen-springs.ts)', () => {
    const begin = css.indexOf(SPRING_BEGIN);
    const end = css.indexOf(SPRING_END);
    expect(begin).toBeGreaterThanOrEqual(0);
    expect(css.slice(begin, end + SPRING_END.length)).toBe(springCssBlock());
  });

  it('framer transitions are derived from the same specs', () => {
    const pairs: [unknown, { stiffness: number; dampingRatio: number }][] = [
      [motion.springSpatialFast, SPATIAL.fast],
      [motion.springSpatialDefault, SPATIAL.default],
      [motion.springSpatialSlow, SPATIAL.slow],
      [motion.springStandardFast, STANDARD.fast],
      [motion.springStandardDefault, STANDARD.default],
      [motion.effectsFast, EFFECTS.fast],
      [motion.effectsDefault, EFFECTS.default],
      [motion.effectsSlow, EFFECTS.slow],
    ];
    for (const [t, s] of pairs) {
      expect(t).toMatchObject({ type: 'spring', stiffness: s.stiffness });
      expect((t as { damping: number }).damping).toBeCloseTo(framerDamping(s), 6);
    }
  });
});
