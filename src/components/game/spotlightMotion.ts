/**
 * Motion of the spotlight's turn change — an M3 container transform.
 *
 * Only the card surface morphs (row ↔ hero) on the hand-over spring (0.34.0,
 * slower than the slow spatial spring): a hero card is a big element travelling far, and the default spring
 * read as a jump. The content on top is never scaled; the incoming content
 * fades in early in the morph (Material's "fade in" mode: content within the
 * first quarter, the surface settles under finished content). Rows that stay
 * rows only slide.
 */
import type { Transition } from 'framer-motion';
import { springHandover } from '../../utils/motion';

export const CONTAINER_MORPH: Transition = springHandover;
export const CONTENT_IN: Transition = { opacity: { duration: 0.24, delay: 0.08, ease: [0.2, 0, 0, 1] }, layout: springHandover };
/** The flames wait until the surface has (nearly) settled. */
export const FLAMES_AFTER_MS = 1050;
/** The incoming name builds up letter by letter, this far apart. */
export const LETTER_STAGGER_S = 0.03;
/** When the one "your turn" ring pulses, after the card has grown. */
export const RING_DELAY_S = 0.7;
