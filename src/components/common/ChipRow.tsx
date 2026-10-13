import React from 'react';

interface ChipRowProps {
  /** Name of the group for assistive tech. */
  label: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * One row of filter chips that scrolls sideways (0.43.0).
 *
 * The leaderboards wrapped their chips: seven categories broke into four uneven
 * lines on a phone, while the achievements already used a single scrolling row.
 * Chips never shrink or wrap (`.m3-chip`); the vertical padding keeps their
 * 48px hit area inside the scroll box, which would otherwise clip it.
 */
const ChipRow: React.FC<ChipRowProps> = ({ label, className = '', children }) => (
  <div
    role="group"
    aria-label={label}
    data-chip-row
    className={`flex flex-nowrap gap-2 overflow-x-auto py-2 -my-2 -mx-1 px-1 ${className}`}
  >
    {children}
  </div>
);

export default ChipRow;
