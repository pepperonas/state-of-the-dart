import React, { useEffect } from 'react';
import { motion, useSpring, useTransform, useReducedMotion } from 'framer-motion';
import { TALLY, framerDamping } from '../../utils/springs';

interface AnimatedNumberProps {
  value: number;
  /** Decimal places to render (default 0). */
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Material 3 Expressive animated number. Transitions between values with an
 * critically damped spring (no overshoot — numbers must not jitter past their target),
 * so a darts score "tallies" to its new value. Honours `prefers-reduced-motion`
 * (renders the raw value, no animation). The MotionValue updates the DOM
 * directly, so this does not re-render React on every frame.
 */
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, decimals = 0, className, style }) => {
  const reduce = useReducedMotion();
  // Critically damped tally spring from the shared spec: no bounce.
  const spring = useSpring(value, { stiffness: TALLY.stiffness, damping: framerDamping(TALLY), mass: 1 });
  const display = useTransform(spring, (v) => v.toFixed(decimals));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  if (reduce) {
    return (
      <span className={className} style={style}>
        {value.toFixed(decimals)}
      </span>
    );
  }

  return (
    <motion.span className={className} style={style}>
      {display}
    </motion.span>
  );
};

export default AnimatedNumber;
