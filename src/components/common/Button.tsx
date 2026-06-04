import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'filled'
  | 'tonal'
  | 'accent'
  | 'elevated'
  | 'outlined'
  | 'text'
  | 'danger'
  | 'success';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  /** Leading icon (lucide component or node). */
  icon?: React.ReactNode;
  /** Show a spinner and disable the button. */
  loading?: boolean;
}

/**
 * Material 3 Expressive button. Pill-shaped by default with a state layer and
 * an expressive shape-morph on press. Variants map to M3 button styles.
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'filled',
  size = 'md',
  fullWidth = false,
  icon,
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}) => {
  const classes = [
    'm3-button',
    'm3-state-layer',
    `m3-${variant}`,
    size === 'sm' ? 'm3-size-sm' : size === 'lg' ? 'm3-size-lg' : '',
    fullWidth ? 'm3-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={18} className="animate-spin" /> : icon}
      {children}
    </button>
  );
};

export default Button;
