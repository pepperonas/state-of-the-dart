import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

/**
 * Material 3 Expressive switch. The thumb grows when on and slides with an
 * emphasized spring (see m3.css). Renders a button with role="switch".
 */
const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled, label, className = '' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={['m3-switch', checked ? 'm3-on' : '', className].filter(Boolean).join(' ')}
    style={disabled ? { opacity: 0.38, cursor: 'not-allowed' } : undefined}
  >
    <span className="m3-switch-thumb" />
  </button>
);

export default Switch;
