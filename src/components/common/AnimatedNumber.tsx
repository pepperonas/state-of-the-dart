import React, { useEffect } from 'react';
import { motion, useSpring, useTransform, useReducedMotion } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  /** Decimal places to render (default 0). */
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Material 3 Expressive animated number. Transitions between values with an
 * overdamped spring (no overshoot — numbers must not jitter past their target),
 * so a darts score "tallies" to its new value. Honours `prefers-reduced-motion`
 * (renders the raw value, no animation). The MotionValue updates the DOM
 * directly, so this does not re-render React on every frame.
 */
const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, decimals = 0, className, style }) => {
  const reduce = useReducedMotion();
  // Overdamped spatial spring: smooth, ~0.35s, no bounce.
  const spring = useSpring(value, { stiffness: 260, damping: 42, mass: 1 });
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
