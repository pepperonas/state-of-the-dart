/**
 * Material 3 Expressive — motion tokens for framer-motion.
 *
 * M3 Expressive replaces duration/easing with a physics-based spring system.
 * Each spring has a `stiffness` and a `damping ratio` (0–1, where 1 = critically
 * damped / no bounce). framer-motion uses an absolute `damping`, related by
 *   damping = ratio · 2 · √(stiffness · mass)   (mass = 1 here).
 *
 * The "spatial" springs animate position/size/rotation/corners and intentionally
 * overshoot (the expressive bounce). The "effects" springs animate opacity/colour
 * and never overshoot. Speeds (fast/default/slow) are chosen by component size /
 * travel distance: small UI → fast, full-screen transitions → slow.
 *
 * Reference: https://m3.material.io/styles/motion/overview/how-it-works
 */
import type { Transition } from 'framer-motion';
import { SPATIAL, STANDARD, EFFECTS, framerDamping, type SpringSpec } from './springs';

/** A framer spring from an M3 spec (`utils/springs.ts` is the one source). */
export const toFramer = (s: SpringSpec): Transition =>
  ({ type: 'spring', stiffness: s.stiffness, damping: framerDamping(s), mass: 1 });

/* Spatial — expressive (damping ratio < 1 → noticeable overshoot) */
export const springSpatialFast: Transition = toFramer(SPATIAL.fast);
export const springSpatialDefault: Transition = toFramer(SPATIAL.default);
export const springSpatialSlow: Transition = toFramer(SPATIAL.slow);

/* Spatial — standard (barely any bounce) */
export const springStandardFast: Transition = toFramer(STANDARD.fast);
export const springStandardDefault: Transition = toFramer(STANDARD.default);
export const springStandardSlow: Transition = toFramer(STANDARD.slow);

/* Effects — critically damped, for opacity/colour/fades (M3 defines these as
   springs too; they used to be 150/200 ms tweens). */
export const effectsFast: Transition = toFramer(EFFECTS.fast);
export const effectsDefault: Transition = toFramer(EFFECTS.default);
export const effectsSlow: Transition = toFramer(EFFECTS.slow);

/* Convenience presets for common patterns ---------------------------------- */

/** Card / tile entrance: fade + rise with expressive spring. */
export const enterRise = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: springSpatialDefault,
};

/** Pop-in for emphasised elements (scale with overshoot). */
export const enterPop = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1 },
  transition: springSpatialDefault,
};

/** Header / hero slide-down. */
export const enterDrop = {
  initial: { opacity: 0, y: -24 },
  animate: { opacity: 1, y: 0 },
  transition: springSpatialDefault,
};

/** Staggered list helper — call with the item index. */
export const staggerChild = (index: number, base = 0.04) => ({
  initial: { opacity: 0, y: 16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { ...springSpatialDefault, delay: index * base },
});

/** Pressable tap/hover feedback for interactive surfaces. */
export const pressable = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: springSpatialFast,
};

/** Dialog enter/exit (use with AnimatePresence). */
export const dialogMotion = {
  initial: { opacity: 0, scale: 0.9, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 8 },
  transition: springStandardDefault,
};

/**
 * Chart motion (recharts).
 *
 * Recharts only accepts its own easing keywords — it will not take a
 * cubic-bezier — so `ease-out` is the closest thing to the emphasized-decelerate
 * curve the rest of the app uses. The duration is a real token value
 * (`--m3-dur-long-4` = 600ms, `styles/motion.css`); recharts' own default is 1500ms, which reads as
 * sluggish next to everything else on screen.
 */
export const CHART_MOTION = { duration: 600, easing: 'ease-out' } as const;

/**
 * M3 fade-through for moving between top-level destinations. Entrance only —
 * an exit animation would hold the old route on screen and delay every
 * navigation. ⚠️ Opacity only: a transform on the route wrapper would make it
 * the containing block of every `position: fixed` child (dialogs, snackbars,
 * the leg-won overlay) for the duration of the animation.
 */
export const fadeThrough = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.22, ease: [0.2, 0, 0, 1] } as Transition,
};
