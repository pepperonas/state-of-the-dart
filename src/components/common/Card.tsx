import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'filled' | 'elevated' | 'outlined';
  /** Adds hover elevation + press feedback. */
  interactive?: boolean;
  /** For selectable cards (player pickers, mode choice): announced as pressed. */
  selected?: boolean;
}

/**
 * Material 3 Expressive card. Token-backed surfaces, 16px corners.
 * - elevated: surface-container-low + shadow
 * - filled:   surface-container-highest
 * - outlined: surface + outline border
 *
 * A card with `onClick` is a control: it gets `role="button"`, a tab stop and
 * Enter/Space. It used to be a bare div — every clickable card (tournament
 * modes, player pickers, …) was out of reach for keyboard and screen readers.
 */
const Card: React.FC<CardProps> = ({
  variant = 'elevated',
  interactive = false,
  selected,
  className = '',
  children,
  onClick,
  onKeyDown,
  role,
  tabIndex,
  ...rest
}) => {
  const classes = [
    'm3-card',
    `m3-${variant}`,
    interactive ? 'm3-interactive m3-state-layer' : '',
    // Selected cards (pickers) carry the app's selection mark themselves.
    selected ? 'ring-2 ring-[var(--m3-primary)]' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const actsAsButton = !!onClick && role === undefined;
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || !actsAsButton || e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <div
      className={classes}
      onClick={onClick}
      onKeyDown={actsAsButton || onKeyDown ? handleKeyDown : undefined}
      role={actsAsButton ? 'button' : role}
      tabIndex={actsAsButton ? (tabIndex ?? 0) : tabIndex}
      aria-pressed={actsAsButton && selected !== undefined ? selected : undefined}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
