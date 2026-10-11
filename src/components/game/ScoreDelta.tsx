import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

interface ScoreDeltaProps {
  /** The remaining score shown next to it. */
  value: number;
  /** The score before this mount — a card that just turned into a row (or
   *  back) is a new element, but the visit still has to show. */
  from?: number;
  className?: string;
}

/**
 * "−60" rising off a score when it goes down — the visit landing. Only a drop
 * of a plausible visit counts (1–180): an undo or a new leg raises the score
 * and shows nothing. Decorative (`aria-hidden`; the live region announces
 * visits) and absent under reduced motion.
 */
const ScoreDelta: React.FC<ScoreDeltaProps> = ({ value, from, className = '' }) => {
  const reduce = useReducedMotion();
  const [prev, setPrev] = useState(value);
  const [delta, setDelta] = useState<{ n: number; id: number } | null>(() => {
    const drop = from != null ? from - value : 0;
    return drop > 0 && drop <= 180 ? { n: drop, id: 1 } : null;
  });
  // State adjusted during render: compares with the value of the last render.
  if (value !== prev) {
    const drop = prev - value;
    setDelta(drop > 0 && drop <= 180 ? { n: drop, id: (delta?.id ?? 0) + 1 } : null);
    setPrev(value);
  }
  if (reduce) return null;
  return (
    <AnimatePresence>
      {delta && (
        <motion.span
          key={delta.id}
          data-testid="score-delta"
          aria-hidden="true"
          initial={{ opacity: 0, y: 6, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], y: -26, scale: 1 }}
          transition={{ duration: 1.1, times: [0, 0.12, 0.7, 1], ease: [0.2, 0, 0, 1] }}
          onAnimationComplete={() => setDelta(d => (d?.id === delta.id ? null : d))}
          className={`pointer-events-none absolute font-bold tabular-nums text-primary ${className}`}
        >
          −{delta.n}
        </motion.span>
      )}
    </AnimatePresence>
  );
};

export default ScoreDelta;
