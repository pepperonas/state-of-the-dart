/**
 * Pure helpers for the admin activity column.
 *
 * The geometry and the wording live here, apart from the SVG, so both can be
 * tested without rendering anything — the same split the rest of the app uses
 * (see `utils/playerOrder.ts`).
 */

export interface ActivityBar {
  /** Left edge in view-box units. */
  x: number;
  /** Top edge — SVG y grows downward, so a taller bar has a smaller y. */
  y: number;
  width: number;
  height: number;
  /** The count this bar represents, for the tooltip. */
  value: number;
  /** Index in the source series, 0 = oldest. */
  index: number;
}

export interface BarOptions {
  width: number;
  height: number;
  /** Gap between bars in view-box units. */
  gap?: number;
  /** Height of a zero-value bar, so an empty day is still a visible baseline. */
  minHeight?: number;
}

/**
 * Lays out one bar per value across `width`.
 *
 * Scaled to the series' own maximum, not a global one: the question this chart
 * answers is "when was this person active", not "who is most active". A shared
 * scale would flatten every light user into an unreadable line.
 */
export function activityBars(values: number[], opts: BarOptions): ActivityBar[] {
  const { width, height, gap = 1, minHeight = 1 } = opts;
  if (values.length === 0) return [];

  const slot = width / values.length;
  const barWidth = Math.max(0.5, slot - gap);
  const max = Math.max(...values, 0);

  return values.map((value, index) => {
    // Every bar keeps `minHeight` so the row reads as a timeline even when idle.
    const h = max === 0 ? minHeight : Math.max(minHeight, (value / max) * height);
    return {
      x: index * slot,
      y: height - h,
      width: barWidth,
      height: h,
      value,
      index,
    };
  });
}

/** Total across the window. */
export function activityTotal(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Number of days in the window on which anything happened. */
export function activeDays(values: number[]): number {
  return values.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Short German relative time, e.g. "vor 3 Tagen".
 *
 * Returns `null` when there is no timestamp — the caller decides how to render
 * "never", rather than this function inventing a string for it.
 */
export function relativeTime(timestamp: number | null | undefined, now: number = Date.now()): string | null {
  if (!timestamp || timestamp <= 0) return null;
  const diff = now - timestamp;

  // A clock skew between client and server must not read as "in 3 days".
  if (diff < MINUTE) return 'gerade eben';
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `vor ${m} Min.`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `vor ${h} Std.`;
  }
  const d = Math.floor(diff / DAY);
  if (d === 1) return 'gestern';
  if (d < 30) return `vor ${d} Tagen`;
  const months = Math.floor(d / 30);
  if (months < 12) return months === 1 ? 'vor 1 Monat' : `vor ${months} Monaten`;
  const years = Math.floor(d / 365);
  return years === 1 ? 'vor 1 Jahr' : `vor ${years} Jahren`;
}

/**
 * How stale a last-seen timestamp is, for colouring.
 * Deliberately coarse — three buckets a reader can hold in their head.
 */
export type Recency = 'recent' | 'idle' | 'dormant' | 'never';

export function recencyOf(timestamp: number | null | undefined, now: number = Date.now()): Recency {
  if (!timestamp || timestamp <= 0) return 'never';
  const days = (now - timestamp) / DAY;
  if (days <= 7) return 'recent';
  if (days <= 30) return 'idle';
  return 'dormant';
}
