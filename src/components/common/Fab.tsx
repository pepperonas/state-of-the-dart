import React from 'react';

interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  /** Optional label → renders an extended FAB. */
  label?: string;
  /** Required name for an icon-only FAB (no `label`). */
  ariaLabel?: string;
  /** Tertiary container (default, expressive), primary or secondary container. */
  color?: 'tertiary' | 'primary' | 'secondary';
  /** sm = M3 small FAB (40px, 48px touch target). */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Material 3 Expressive FAB. Tertiary-container by default for the expressive
 * colour pop. Provide `label` for the extended (pill) variant.
 */
const Fab: React.FC<FabProps> = ({
  icon,
  label,
  ariaLabel,
  color = 'tertiary',
  size = 'md',
  className = '',
  ...rest
}) => {
  const classes = [
    'm3-fab',
    'm3-state-layer',
    'm3-ripple',
    color === 'primary' ? 'm3-primary' : color === 'secondary' ? 'm3-secondary' : '',
    size === 'lg' ? 'm3-fab-lg' : size === 'sm' ? 'm3-fab-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} aria-label={label ? undefined : ariaLabel} title={label ? undefined : ariaLabel} {...rest}>
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
};

export default Fab;
