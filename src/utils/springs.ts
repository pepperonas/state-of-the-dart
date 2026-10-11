/**
 * Material 3 Expressive springs — the one source for every movement.
 *
 * M3 describes motion as springs: a stiffness and a damping ratio (1 =
 * critically damped, no bounce; below 1 = overshoot). framer-motion consumes
 * them directly (`utils/motion.ts`); CSS cannot run a spring, so
 * `tools/gen-springs.ts` samples the same curves into `linear()` easings plus a
 * duration and writes them into `styles/motion.css`. A test keeps both sides
 * equal — change a value here, re-run the generator.
 *
 * Values: https://m3.material.io/styles/motion/overview/specs
 */

export interface SpringSpec {
  stiffness: number;
  /** 1 = critically damped (no overshoot), < 1 overshoots. */
  dampingRatio: number;
}

/** Expressive spatial: position, size, rotation, corners — they overshoot. */
export const SPATIAL = {
  fast: { stiffness: 800, dampingRatio: 0.6 },
  default: { stiffness: 380, dampingRatio: 0.8 },
  slow: { stiffness: 200, dampingRatio: 0.8 },
} as const satisfies Record<string, SpringSpec>;

/** Standard spatial: utilitarian movement, barely any bounce. */
export const STANDARD = {
  fast: { stiffness: 1400, dampingRatio: 0.9 },
  default: { stiffness: 700, dampingRatio: 0.9 },
  slow: { stiffness: 300, dampingRatio: 0.9 },
} as const satisfies Record<string, SpringSpec>;

/** Effects: opacity and colour — critically damped, an overshooting fade would flicker. */
export const EFFECTS = {
  fast: { stiffness: 3800, dampingRatio: 1 },
  default: { stiffness: 1600, dampingRatio: 1 },
  slow: { stiffness: 800, dampingRatio: 1 },
} as const satisfies Record<string, SpringSpec>;

/** Number tally (AnimatedNumber): no overshoot — a score must not run past
 *  its target and show a wrong digit — and slow enough to be seen counting. */
export const TALLY: SpringSpec = { stiffness: 260, dampingRatio: 1 };

/** framer-motion takes an absolute damping: ratio · 2 · √(stiffness · mass), mass = 1. */
export const framerDamping = (s: SpringSpec): number => s.dampingRatio * 2 * Math.sqrt(s.stiffness);

/**
 * Position of a unit step response at time t (seconds), from 0 towards 1.
 * Closed form for under-, critically and over-damped springs.
 */
export const springPosition = (s: SpringSpec, t: number): number => {
  const w0 = Math.sqrt(s.stiffness);
  const z = s.dampingRatio;
  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
  }
  if (z === 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const r = Math.sqrt(z * z - 1);
  const a = -w0 * (z - r);
  const b = -w0 * (z + r);
  return 1 - (b * Math.exp(a * t) - a * Math.exp(b * t)) / (b - a);
};

/** Time until the spring stays within `epsilon` of its target (seconds). */
export const settleTime = (s: SpringSpec, epsilon = 0.002): number => {
  const step = 0.001;
  let last = 0;
  for (let t = 0; t < 5; t += step) {
    if (Math.abs(springPosition(s, t) - 1) > epsilon) last = t;
  }
  return Math.ceil((last + step) * 1000) / 1000;
};

/** The spring as a CSS `linear()` easing over its settle time. */
export const springCss = (s: SpringSpec, points = 40): { easing: string; durationMs: number } => {
  const duration = settleTime(s);
  const stops: string[] = [];
  for (let i = 0; i <= points; i++) {
    const v = i === points ? 1 : springPosition(s, (duration * i) / points);
    stops.push(String(Math.round(v * 1000) / 1000));
  }
  return { easing: `linear(${stops.join(', ')})`, durationMs: Math.round(duration * 1000) };
};

/** Every spring with its CSS token name, in a fixed order. */
export const SPRING_TOKENS: { name: string; spec: SpringSpec }[] = [
  ...Object.entries(SPATIAL).map(([k, spec]) => ({ name: `spatial-${k}`, spec })),
  ...Object.entries(STANDARD).map(([k, spec]) => ({ name: `standard-${k}`, spec })),
  ...Object.entries(EFFECTS).map(([k, spec]) => ({ name: `effects-${k}`, spec })),
];

/** The block the generator writes into motion.css (and the test compares). */
export const springCssBlock = (): string => {
  const lines = SPRING_TOKENS.flatMap(({ name, spec }) => {
    const { easing, durationMs } = springCss(spec);
    return [`  --m3-spring-${name}: ${easing};`, `  --m3-spring-${name}-duration: ${durationMs}ms;`];
  });
  return [SPRING_BEGIN, ':root {', ...lines, '}', SPRING_END].join('\n');
};

export const SPRING_BEGIN = '/* @generated springs — tools/gen-springs.ts, do not edit by hand */';
export const SPRING_END = '/* @end springs */';
