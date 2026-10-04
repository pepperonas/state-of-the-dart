import { BOARD_ORDER } from './heatmap';

/**
 * Regulation dartboard geometry (WDF), scaled so the outer double wire sits at
 * BOARD_RADIUS. Computed, never typed: change the millimetres, not the paths.
 */
export const BOARD_RADIUS = 100;
const MM = BOARD_RADIUS / 170;

export const RINGS = {
  bull: 6.35 * MM,
  outerBull: 15.9 * MM,
  tripleInner: 99 * MM,
  tripleOuter: 107 * MM,
  doubleInner: 162 * MM,
  doubleOuter: BOARD_RADIUS,
} as const;

/** Radius at which the numbers are written. */
export const NUMBER_RADIUS = BOARD_RADIUS * 1.12;

/** Start/end angle in degrees (0° = 3 o'clock, clockwise) of a number's wedge. */
export const bedAngles = (segment: number): { start: number; end: number } => {
  const mid = -90 + BOARD_ORDER.indexOf(segment) * 18;
  return { start: mid - 9, end: mid + 9 };
};

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(r * Math.cos(a)).toFixed(3)} ${(r * Math.sin(a)).toFixed(3)}`;
};

/** Annular sector between two radii and two angles. */
export const wedgePath = (start: number, end: number, inner: number, outer: number): string =>
  `M ${pt(outer, start)} A ${outer} ${outer} 0 0 1 ${pt(outer, end)} L ${pt(inner, end)} A ${inner} ${inner} 0 0 0 ${pt(inner, start)} Z`;

/** Full disc (inner = 0) or a ring with a real hole (use fill-rule evenodd). */
export const discPath = (inner: number, outer: number): string => {
  const circle = (r: number) => `M ${r} 0 A ${r} ${r} 0 1 1 ${-r} 0 A ${r} ${r} 0 1 1 ${r} 0 Z`;
  return inner > 0 ? `${circle(outer)} ${circle(inner)}` : circle(outer);
};

export interface BedShape { inner: number; outer: number; d: string }

/**
 * The area(s) a bed covers. A single is recorded without inner/outer, so both
 * single areas of that number belong to it.
 */
export const bedShape = (segment: number, multiplier: number): BedShape[] => {
  if (segment === 25) {
    return multiplier === 2
      ? [{ inner: 0, outer: RINGS.bull, d: discPath(0, RINGS.bull) }]
      : [{ inner: RINGS.bull, outer: RINGS.outerBull, d: discPath(RINGS.bull, RINGS.outerBull) }];
  }
  const { start, end } = bedAngles(segment);
  const wedge = (inner: number, outer: number) => ({ inner, outer, d: wedgePath(start, end, inner, outer) });
  if (multiplier === 3) return [wedge(RINGS.tripleInner, RINGS.tripleOuter)];
  if (multiplier === 2) return [wedge(RINGS.doubleInner, RINGS.doubleOuter)];
  return [wedge(RINGS.outerBull, RINGS.tripleInner), wedge(RINGS.tripleOuter, RINGS.doubleInner)];
};

/** Every bed on the board, in a stable order (numbers × rings, then the bulls). */
export const ALL_BEDS: { segment: number; multiplier: number }[] = [
  ...BOARD_ORDER.flatMap(segment => [1, 3, 2].map(multiplier => ({ segment, multiplier }))),
  { segment: 25, multiplier: 1 },
  { segment: 25, multiplier: 2 },
];
