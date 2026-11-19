import { getCheckoutSuggestion } from '../../data/checkoutTable';

/**
 * The landing page's demo leg: a nine-darter (180, 180, then 141 as
 * T20 · T19 · D12), played out frame by frame. Pure, so the numbers it shows
 * are tested instead of typed: the checkout hint comes from the app's own
 * checkout table, the average is computed.
 */
export interface DemoDart {
  segment: number;
  multiplier: 1 | 2 | 3;
  /** Darts notation, as the app writes it (T20, D12). */
  label: string;
}

export interface DemoFrame {
  /** Darts on the board right now (the current visit). */
  darts: DemoDart[];
  /** Remaining score as the scoreboard shows it, live during the visit. */
  remaining: number;
  /** Points of the current visit so far. */
  visitTotal: number;
  /** The app's checkout route for this remaining score, when one is on. */
  checkout: string[] | null;
  /** The leg is won. */
  done: boolean;
  /** How long this frame stays, in ms. */
  hold: number;
}

const START = 501;

const dart = (label: string): DemoDart => {
  const m = label[0] === 'T' ? 3 : label[0] === 'D' ? 2 : 1;
  return { segment: Number(label.slice(1)), multiplier: m, label };
};

export const DEMO_VISITS: DemoDart[][] = [
  ['T20', 'T20', 'T20'].map(dart),
  ['T20', 'T20', 'T20'].map(dart),
  ['T20', 'T19', 'D12'].map(dart),
];

export const dartScore = (d: DemoDart): number => d.segment * d.multiplier;

/** Darts thrown in the leg and the three-dart average it makes. */
export const DEMO_DARTS = DEMO_VISITS.flat().length;
export const DEMO_AVERAGE = Math.round((START / DEMO_DARTS) * 3);

const route = (remaining: number): string[] | null =>
  remaining > 0 && remaining <= 170 ? getCheckoutSuggestion(remaining) : null;

export function buildDemoFrames(): DemoFrame[] {
  const frames: DemoFrame[] = [];
  let remaining = START;
  for (const visit of DEMO_VISITS) {
    frames.push({ darts: [], remaining, visitTotal: 0, checkout: route(remaining), done: false, hold: 900 });
    let total = 0;
    visit.forEach((d, i) => {
      total += dartScore(d);
      const left = remaining - total;
      const last = i === visit.length - 1;
      frames.push({
        darts: visit.slice(0, i + 1),
        remaining: left,
        visitTotal: total,
        // Mid-visit the scoreboard shows what is left; the route only at the oche.
        checkout: last ? route(left) : null,
        done: left === 0,
        hold: left === 0 ? 3600 : last ? 1300 : 650,
      });
    });
    remaining -= total;
  }
  return frames;
}

/** The frame shown when motion is reduced: second 180 on the board, 141 left, the route on. */
export const STILL_FRAME_INDEX = 7;
