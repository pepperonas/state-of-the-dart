// Lazy wrapper around canvas-confetti so the ~25 KB module is only fetched
// when the first celebration actually triggers, not at app bootstrap.

type ConfettiOptions = import('canvas-confetti').Options;
type ConfettiFn = (opts?: ConfettiOptions) => Promise<undefined> | null;

let modulePromise: Promise<ConfettiFn> | null = null;

function loadConfetti(): Promise<ConfettiFn> {
  if (!modulePromise) {
    modulePromise = import('canvas-confetti').then((m) => (m as { default: ConfettiFn }).default);
  }
  return modulePromise;
}

export function celebrate(options?: ConfettiOptions): void {
  void loadConfetti().then((confetti) => {
    confetti(options);
  });
}

/** Celebration colours from the theme tokens (canvas-confetti needs real colours). */
const tokenColors = (): string[] | undefined => {
  if (typeof document === 'undefined') return undefined;
  const cs = getComputedStyle(document.documentElement);
  const colors = ['--m3-primary', '--m3-tertiary', '--m3-rank-1', '--m3-rank-2', '--m3-rank-3']
    .map(v => cs.getPropertyValue(v).trim())
    .filter(c => /^#[0-9a-f]{3,8}$/i.test(c));
  return colors.length ? colors : undefined;
};

/** The centre of an element as a confetti origin (0..1 of the viewport). */
export const originOf = (el: Element | null | undefined): { x: number; y: number } => {
  if (!el || typeof window === 'undefined') return { x: 0.5, y: 0.5 };
  const r = el.getBoundingClientRect();
  return { x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight };
};

export type BurstKind = 'spark' | 'hero' | 'radial' | 'match';

/**
 * The feedback ladder's particles, always finite and off under reduced motion:
 * a small spark for a ton, two fountains for a hero moment, a radial burst for
 * a leg, a short sequence for the match.
 */
export function burst(kind: BurstKind, origin: { x: number; y: number } = { x: 0.5, y: 0.5 }): void {
  const base = { colors: tokenColors(), disableForReducedMotion: true, zIndex: 10001 };
  if (kind === 'spark') {
    celebrate({ ...base, particleCount: 70, spread: 70, startVelocity: 34, scalar: 1, ticks: 180, origin });
  } else if (kind === 'hero') {
    celebrate({ ...base, particleCount: 140, angle: 60, spread: 65, startVelocity: 60, ticks: 260, origin: { x: 0, y: 0.9 } });
    celebrate({ ...base, particleCount: 140, angle: 120, spread: 65, startVelocity: 60, ticks: 260, origin: { x: 1, y: 0.9 } });
  } else if (kind === 'radial') {
    celebrate({ ...base, particleCount: 140, spread: 360, startVelocity: 38, ticks: 160, origin });
  } else {
    [0, 350, 700].forEach((delay, i) =>
      setTimeout(() => celebrate({ ...base, particleCount: 120, spread: 360, startVelocity: 42 - i * 4, origin: { x: 0.5, y: 0.4 } }), delay),
    );
  }
}
