import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, useReducedMotion, useAnimationControls } from 'framer-motion';
import { TALLY, framerDamping, type SpringSpec } from '../../utils/springs';

interface AnimatedNumberProps {
  value: number;
  /** Decimal places to render (default 0). */
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Scoreboard numerals (Bangers, `.sotd-numeral`): on every change the
   *  digits punch up for a beat, then settle. */
  numeral?: boolean;
  /** The count spring; `GAME_TALLY` for in-game scores. Must not overshoot. */
  tally?: SpringSpec;
}

/**
 * Material 3 Expressive animated number. Transitions between values with an
 * critically damped spring (no overshoot — numbers must not jitter past their target),
 * so a darts score "tallies" to its new value. Honours `prefers-reduced-motion`
 * (renders the raw value, no animation). The MotionValue updates the DOM
 * directly, so this does not re-render React on every frame.
 */
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, decimals = 0, className, style, numeral = false, tally = TALLY }) => {
  const reduce = useReducedMotion();
  // Critically damped tally spring from the shared spec: no bounce.
  const spring = useSpring(value, { stiffness: tally.stiffness, damping: framerDamping(tally), mass: 1 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  // The punch: the digits kick up and settle (Bangers has no variable axes).
  const controls = useAnimationControls();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!numeral || reduce) return;
    void controls.start({
      scale: [1, 1.12, 1],
      transition: { duration: tally === TALLY ? 0.5 : 1.1, times: [0, 0.3, 1], ease: [0.2, 0, 0, 1] },
    });
  }, [value, numeral, reduce, controls]);

  if (reduce) {
    return (
      <span className={numeral ? `sotd-numeral ${className ?? ''}` : className} style={style}>
        {value.toFixed(decimals)}
      </span>
    );
  }

  return (
    <motion.span className={numeral ? `sotd-numeral ${className ?? ''}` : className} style={style} animate={controls}>
      {display}
    </motion.span>
  );
};

export default AnimatedNumber;
