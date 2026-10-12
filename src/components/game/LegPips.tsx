import React from 'react';

interface LegPipsProps {
  won: number;
  total: number;
  /** `container`: drawn on a tertiary container (hero tile with a leg won). */
  tone?: 'surface' | 'container';
  size?: 'sm' | 'md';
  className?: string;
}

/** Above this many legs a row of pips stops being readable; callers show "/ N". */
export const MAX_PIPS = 9;

/**
 * The way to the win at a glance: one stroke per leg needed, the won ones
 * filled. Decorative (`aria-hidden`) — callers keep the sentence for screen
 * readers next to it.
 */
const LegPips: React.FC<LegPipsProps> = ({ won, total, tone = 'surface', size = 'md', className = '' }) => {
  const on = tone === 'container' ? 'bg-on-tertiary-container' : 'bg-tertiary';
  const off = tone === 'container'
    ? 'bg-[color-mix(in_srgb,var(--m3-on-tertiary-container)_28%,transparent)]'
    : 'bg-outline-variant';
  const pip = size === 'sm' ? 'h-1 w-2.5' : 'h-1.5 flex-1 max-w-6';
  return (
    <div aria-hidden="true" data-testid="legs-pips" className={`flex gap-1 min-w-0 ${size === 'md' ? 'flex-1' : ''} ${className}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} data-on={i < won ? 'true' : undefined} className={`${pip} rounded-m3-full transition-colors ${i < won ? on : off}`} />
      ))}
    </div>
  );
};

export default LegPips;
