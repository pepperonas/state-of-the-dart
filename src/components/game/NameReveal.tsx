import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { springHandover } from '../../utils/motion';
import { LETTER_STAGGER_S } from './spotlightMotion';

interface NameRevealProps {
  name: string;
  /** Build the name up letter by letter (the card just became the hero). */
  play: boolean;
  /** Seconds before the first letter. */
  delay?: number;
}

/**
 * The incoming player's name, built up letter by letter on the turn change
 * (0.34.0). Each letter rises out of its own clipped box — a mask reveal, no
 * opacity: dimmed text is a contrast failure even in motion. Once the last
 * letter lands it is plain text again, so search, selection and tests see a
 * normal name. The letters are `aria-hidden`; the full name sits beside them.
 */
const NameReveal: React.FC<NameRevealProps> = ({ name, play, delay = 0.1 }) => {
  const [done, setDone] = useState(!play);
  if (done) return <>{name}</>;
  const letters = Array.from(name);
  return (
    <span data-testid="name-reveal">
      <span className="sr-only">{name}</span>
      <span aria-hidden="true">
        {letters.map((ch, i) => (
          <span key={i} className="inline-block overflow-hidden align-bottom" style={{ paddingBottom: '0.08em', marginBottom: '-0.08em' }}>
            <motion.span
              className="inline-block whitespace-pre"
              initial={{ y: '110%' }}
              animate={{ y: '0%' }}
              transition={{ ...springHandover, delay: delay + i * LETTER_STAGGER_S }}
              onAnimationComplete={i === letters.length - 1 ? () => setDone(true) : undefined}
            >
              {ch}
            </motion.span>
          </span>
        ))}
      </span>
    </span>
  );
};

export default NameReveal;
