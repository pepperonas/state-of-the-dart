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

/* Spatial — expressive (low damping ratio → noticeable overshoot) */
export const springSpatialFast: Transition = { type: 'spring', stiffness: 800, damping: 34, mass: 1 };
export const springSpatialDefault: Transition = { type: 'spring', stiffness: 380, damping: 30, mass: 1 };
export const springSpatialSlow: Transition = { type: 'spring', stiffness: 200, damping: 25, mass: 1 };

/* Spatial — standard (higher damping → subdued, minimal bounce) */
export const springStandardFast: Transition = { type: 'spring', stiffness: 800, damping: 50, mass: 1 };
export const springStandardDefault: Transition = { type: 'spring', stiffness: 380, damping: 42, mass: 1 };

/* Effects — no overshoot, for opacity/colour/fades */
export const effectsFast: Transition = { duration: 0.15, ease: [0.2, 0, 0, 1] };
export const effectsDefault: Transition = { duration: 0.2, ease: [0.2, 0, 0, 1] };

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
