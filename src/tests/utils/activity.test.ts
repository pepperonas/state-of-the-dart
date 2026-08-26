import { describe, it, expect } from 'vitest';
import {
  activityBars, activityTotal, activeDays, relativeTime, recencyOf,
} from '../../utils/activity';

const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const NOW = 1_700_000_000_000;

describe('activityBars', () => {
  const opts = { width: 100, height: 20, gap: 1, minHeight: 1 };

  it('returns nothing for an empty series', () => {
    expect(activityBars([], opts)).toEqual([]);
  });

  it('lays one bar per day across the full width', () => {
    const bars = activityBars([1, 2, 3, 4], opts);
    expect(bars).toHaveLength(4);
    expect(bars[0].x).toBe(0);
    expect(bars[3].x).toBeCloseTo(75, 5);
    expect(bars[3].x + bars[3].width).toBeLessThanOrEqual(100);
  });

  /** The tallest day fills the box; that is what makes a light user readable. */
  it('scales to the series own maximum', () => {
    const bars = activityBars([1, 5], opts);
    expect(bars[1].height).toBeCloseTo(20, 5);
    expect(bars[0].height).toBeCloseTo(4, 5);
  });

  it('a quiet series is not flattened by a busy one elsewhere', () => {
    const quiet = activityBars([0, 1, 0, 2], opts);
    const busy = activityBars([0, 50, 0, 100], opts);
    expect(quiet[3].height).toBeCloseTo(busy[3].height, 5);
  });

  /** SVG y grows downward, so a taller bar must start higher up. */
  it('anchors bars to the baseline', () => {
    for (const b of activityBars([3, 1, 7], opts)) {
      expect(b.y + b.height).toBeCloseTo(20, 5);
    }
  });

  it('keeps an idle day visible as a baseline tick', () => {
    const bars = activityBars([0, 0, 0], { ...opts, minHeight: 1.5 });
    for (const b of bars) expect(b.height).toBe(1.5);
  });

  it('an all-zero series does not divide by zero', () => {
    const bars = activityBars([0, 0], opts);
    expect(bars.every((b) => Number.isFinite(b.height) && Number.isFinite(b.y))).toBe(true);
  });

  it('carries the value and index through for the tooltip', () => {
    const bars = activityBars([4, 0, 9], opts);
    expect(bars.map((b) => b.value)).toEqual([4, 0, 9]);
    expect(bars.map((b) => b.index)).toEqual([0, 1, 2]);
  });

  it('never produces a negative or zero width', () => {
    const bars = activityBars(new Array(60).fill(1), { width: 40, height: 20, gap: 1 });
    expect(bars.every((b) => b.width > 0)).toBe(true);
  });
});

describe('summaries', () => {
  it('totals and counts active days', () => {
    expect(activityTotal([1, 0, 3, 0, 2])).toBe(6);
    expect(activeDays([1, 0, 3, 0, 2])).toBe(3);
    expect(activeDays([0, 0])).toBe(0);
  });
});

describe('relativeTime', () => {
  it('returns null when there is no timestamp, rather than inventing wording', () => {
    expect(relativeTime(null)).toBeNull();
    expect(relativeTime(undefined)).toBeNull();
    expect(relativeTime(0)).toBeNull();
  });

  it.each([
    [30_000, 'gerade eben'],
    [5 * MIN, 'vor 5 Min.'],
    [3 * HOUR, 'vor 3 Std.'],
    [1 * DAY, 'gestern'],
    [4 * DAY, 'vor 4 Tagen'],
    [60 * DAY, 'vor 2 Monaten'],
    [400 * DAY, 'vor 1 Jahr'],
  ])('%i ms ago reads as "%s"', (ago, expected) => {
    expect(relativeTime(NOW - ago, NOW)).toBe(expected);
  });

  /** Client and server clocks disagree; a future stamp must not read as "in 3 days". */
  it('treats a future timestamp as just now', () => {
    expect(relativeTime(NOW + 10 * MIN, NOW)).toBe('gerade eben');
  });
});

describe('recencyOf', () => {
  it.each([
    [null, 'never'],
    [0, 'never'],
  ])('%s is never', (ts, expected) => {
    expect(recencyOf(ts as number | null, NOW)).toBe(expected);
  });

  it('buckets by staleness', () => {
    expect(recencyOf(NOW - 2 * DAY, NOW)).toBe('recent');
    expect(recencyOf(NOW - 7 * DAY, NOW)).toBe('recent');
    expect(recencyOf(NOW - 8 * DAY, NOW)).toBe('idle');
    expect(recencyOf(NOW - 30 * DAY, NOW)).toBe('idle');
    expect(recencyOf(NOW - 31 * DAY, NOW)).toBe('dormant');
  });
});
