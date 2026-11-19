import { describe, it, expect } from 'vitest';
import { buildDemoFrames, DEMO_VISITS, DEMO_AVERAGE, DEMO_DARTS, STILL_FRAME_INDEX, dartScore } from '../../components/landing/legScript';
import { getCheckoutSuggestion } from '../../data/checkoutTable';

/** The landing demo states numbers; they are computed and checked, never typed. */
describe('landing demo leg', () => {
  const frames = buildDemoFrames();

  it('is a nine-darter that finishes exactly on a double', () => {
    expect(DEMO_DARTS).toBe(9);
    expect(DEMO_VISITS.flat().reduce((s, d) => s + dartScore(d), 0)).toBe(501);
    const last = DEMO_VISITS[2][2];
    expect(last.multiplier).toBe(2);
    expect(frames[frames.length - 1]).toMatchObject({ remaining: 0, done: true });
    expect(frames.filter(f => f.done)).toHaveLength(1);
  });

  it('the average it shows is the real one', () => {
    expect(DEMO_AVERAGE).toBe(167);
  });

  it('the finish it throws is the route the app itself suggests', () => {
    expect(getCheckoutSuggestion(141)).toEqual(DEMO_VISITS[2].map(d => d.label));
    const at141 = frames.filter(f => f.remaining === 141 && f.darts.length !== 1 && f.darts.length !== 2);
    for (const f of at141) expect(f.checkout).toEqual(['T20', 'T19', 'D12']);
  });

  it('counts down live during each visit', () => {
    expect(frames.map(f => f.remaining)).toEqual([501, 441, 381, 321, 321, 261, 201, 141, 141, 81, 24, 0]);
    for (const f of frames) expect(f.visitTotal).toBe(f.darts.reduce((s, d) => s + dartScore(d), 0));
  });

  it('the still frame (reduced motion) shows the board and the route', () => {
    const still = frames[STILL_FRAME_INDEX];
    expect(still.darts).toHaveLength(3);
    expect(still.remaining).toBe(141);
    expect(still.checkout).not.toBeNull();
  });
});
