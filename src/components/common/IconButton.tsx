import React from 'react';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'standard' | 'filled' | 'tonal' | 'outlined';
  /** Accessible label — required since the button has no visible text. */
  label: string;
}

/**
 * Material 3 Expressive icon button (40×40 circular, state layer).
 * Pass the icon as `children`, e.g. `<IconButton label="Close"><X/></IconButton>`.
 */
const IconButton: React.FC<IconButtonProps> = ({
  variant = 'standard',
  label,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'm3-icon-button',
    'm3-state-layer',
    'm3-ripple',
    variant !== 'standard' ? `m3-${variant}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
};

export default IconButton;
