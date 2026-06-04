import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'filled' | 'elevated' | 'outlined';
  /** Adds hover elevation + press feedback; pair with onClick/role. */
  interactive?: boolean;
}

/**
 * Material 3 Expressive card. Token-backed surfaces, 16px corners.
 * - elevated: surface-container-low + shadow
 * - filled:   surface-container-highest
 * - outlined: surface + outline border
 */
const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  interactive = false,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'm3-card',
    `m3-${variant}`,
    interactive ? 'm3-interactive m3-state-layer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
};

export default Card;
