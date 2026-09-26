import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Accessible name when the label is an icon or abbreviation. */
  ariaLabel?: string;
}

interface SegmentedButtonProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  /** Name of the group for assistive tech. */
  label: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * M3 segmented button: one choice out of a few, with a pill that glides to the
 * selection. Replaces three hand-copied versions of the same markup.
 */
function SegmentedButton<T extends string>({ value, onChange, options, label, size = 'md', className = '' }: SegmentedButtonProps<T>) {
  const index = Math.max(0, options.findIndex(o => o.value === value));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex gap-1 p-1 bg-surface-container rounded-m3-full m3-segmented ${className}`}
      style={{ '--m3-seg-count': options.length, '--m3-seg-index': index } as React.CSSProperties}
    >
      <span className="m3-segmented-indicator" aria-hidden="true" />
      {options.map(o => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={o.ariaLabel}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-m3-full m3-label-large transition-colors flex items-center justify-center gap-2 ${
              size === 'sm' ? 'min-h-[40px] py-1.5' : 'min-h-[44px] py-2'
            } ${selected ? 'text-on-secondary-container' : 'text-on-surface-variant'}`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedButton;
