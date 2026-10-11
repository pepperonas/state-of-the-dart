import React, { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform, useReducedMotion, useAnimationControls } from 'framer-motion';
import { TALLY, framerDamping } from '../../utils/springs';

interface AnimatedNumberProps {
  value: number;
  /** Decimal places to render (default 0). */
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Roboto Flex numerals: on every change the digits swell for a beat
   *  (variable weight and width), then settle. */
  numeral?: boolean;
}

/**
 * Material 3 Expressive animated number. Transitions between values with an
 * critically damped spring (no overshoot — numbers must not jitter past their target),
 * so a darts score "tallies" to its new value. Honours `prefers-reduced-motion`
 * (renders the raw value, no animation). The MotionValue updates the DOM
 * directly, so this does not re-render React on every frame.
 */
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, decimals = 0, className, style, numeral = false }) => {
  const reduce = useReducedMotion();
  // Critically damped tally spring from the shared spec: no bounce.
  const spring = useSpring(value, { stiffness: TALLY.stiffness, damping: framerDamping(TALLY), mass: 1 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  // The swell: weight and width up and back, on the variable axes.
  const controls = useAnimationControls();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!numeral || reduce) return;
    void controls.start({
      fontWeight: [700, 900, 700],
      fontStretch: ['100%', '116%', '100%'],
      transition: { duration: 0.5, times: [0, 0.3, 1], ease: [0.2, 0, 0, 1] },
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
