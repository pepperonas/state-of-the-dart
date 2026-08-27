import React from 'react';

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: React.ReactNode;
}

/**
 * Material 3 Expressive filter/assist chip. `selected` switches to the
 * secondary-container tonal style.
 */
const Chip: React.FC<ChipProps> = ({ selected = false, icon, className = '', children, ...rest }) => {
  const classes = ['m3-chip', 'm3-state-layer', 'm3-ripple', selected ? 'm3-selected' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={classes} aria-pressed={selected} {...rest}>
      {icon}
      {children}
    </button>
  );
};

export default Chip;
