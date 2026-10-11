/**
 * Physics for the "who throws first" wheel.
 *
 * A real wheel slows down from two forces: constant friction at the axle (μ)
 * and drag growing with speed (k):  dω/dt = −μ − k·ω.  That gives the long,
 * suspenseful crawl past the last pegs that a cubic-bezier cannot fake.
 *
 *   ω(t) = (ω₀ + μ/k)·e^(−k·t) − μ/k
 *   θ(t) = ((ω₀ + μ/k)·(1 − e^(−k·t)))/k − (μ/k)·t
 *   T    = ln(1 + k·ω₀/μ) / k              (the moment it stops)
 *
 * The winner is decided first; μ is then solved (bisection — θ falls steadily
 * as μ grows) so the wheel coasts out exactly on the chosen wedge.
 * Angles in degrees, time in seconds.
 */

export const stopTime = (w0: number, mu: number, k: number): number =>
  Math.log(1 + (k * w0) / mu) / k;

/** Angle turned after t seconds (constant once the wheel has stopped). */
export const angleAt = (t: number, w0: number, mu: number, k: number): number => {
  const tt = Math.min(Math.max(t, 0), stopTime(w0, mu, k));
  const a = w0 + mu / k;
  return (a * (1 - Math.exp(-k * tt))) / k - (mu / k) * tt;
};

/** Friction μ so that the wheel turns exactly `theta` degrees from ω₀. */
export const solveFriction = (theta: number, w0: number, k: number): number => {
  const total = (mu: number) => angleAt(stopTime(w0, mu, k), w0, mu, k);
  let lo = 1e-6;
  let hi = 1e6;
  for (let i = 0; i < 200; i++) {
    const mid = Math.sqrt(lo * hi); // geometric: μ spans orders of magnitude
    if (total(mid) > theta) lo = mid; else hi = mid;
  }
  return Math.sqrt(lo * hi);
};

/**
 * Absolute wheel rotation to stop at, so the top pointer sits inside the
 * winner's wedge (`frac` 0..1 across it, never on a divider), at least
 * `turns` full turns ahead of `current`. Wedge 0 starts at the top and the
 * wedges run clockwise, the same as the drawing.
 */
export const landingAngle = (current: number, winner: number, count: number, frac: number, turns: number): number => {
  const seg = 360 / count;
  const inWedge = winner * seg + seg * Math.min(0.85, Math.max(0.15, frac));
  // Rotating by R puts the wheel angle (360 − R mod 360) under the pointer.
  const base = (360 - inWedge) % 360;
  let target = current - (((current % 360) + 360) % 360) + base;
  while (target - current < turns * 360) target += 360;
  return target;
};

/** Pegs (every `step` degrees) passed between two angles. */
export const crossings = (from: number, to: number, step: number): number =>
  Math.max(0, Math.floor(to / step) - Math.floor(from / step));

/**
 * A spin that turns exactly `theta` degrees. Drag alone can carry the wheel at
 * most ω₀/k degrees, so the start speed is chosen from the target (`ratio` ×
 * that limit leaves room for friction to do the stopping); μ is then solved.
 */
export const planSpin = (theta: number, k = 0.6, ratio = 1.5) => {
  const w0 = ratio * k * theta;
  const mu = solveFriction(theta, w0, k);
  return { w0, mu, k, duration: stopTime(w0, mu, k) };
};
