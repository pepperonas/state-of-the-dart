/**
 * Motion of the spotlight's turn change — an M3 container transform.
 *
 * Only the card surface morphs (row ↔ hero) on the slow expressive spatial
 * spring: a hero card is a big element travelling far, and the default spring
 * read as a jump. The content on top is never scaled; the incoming content
 * fades in early in the morph (Material's "fade in" mode: content within the
 * first quarter, the surface settles under finished content). Rows that stay
 * rows only slide.
 */
import type { Transition } from 'framer-motion';
import { springSpatialSlow } from '../../utils/motion';

export const CONTAINER_MORPH: Transition = springSpatialSlow;
export const CONTENT_IN: Transition = { opacity: { duration: 0.24, delay: 0.08, ease: [0.2, 0, 0, 1] }, layout: springSpatialSlow };
/** The flames wait until the surface has (nearly) settled. */
export const FLAMES_AFTER_MS = 650;
