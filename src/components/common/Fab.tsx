import React from 'react';

interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  /** Optional label → renders an extended FAB. */
  label?: string;
  /** Tertiary container (default, expressive) or primary container. */
  color?: 'tertiary' | 'primary';
  size?: 'md' | 'lg';
}

/**
 * Material 3 Expressive FAB. Tertiary-container by default for the expressive
 * colour pop. Provide `label` for the extended (pill) variant.
 */
const Fab: React.FC<FabProps> = ({
  icon,
  label,
  color = 'tertiary',
  size = 'md',
  className = '',
  ...rest
}) => {
  const classes = [
    'm3-fab',
    'm3-state-layer',
    color === 'primary' ? 'm3-primary' : '',
    size === 'lg' ? 'm3-fab-lg' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} aria-label={label} {...rest}>
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
};

export default Fab;
