import React from 'react';
import { motion, type MotionProps } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SegmentedButton from '../common/SegmentedButton';
import type { GridMultiplier } from '../../utils/gridDart';

interface DartGridProps {
  multiplier: GridMultiplier;
  onMultiplierChange: (m: GridMultiplier) => void;
  /** A bed was picked; the multiplier falls back to single afterwards (caller's choice). */
  onPick: (segment: number) => void;
  disabled?: boolean;
  /** Layout hooks, so the game input can place the parts in its phone-landscape grid. */
  multiplierClassName?: string;
  numbersClassName?: string;
  bullsClassName?: string;
  numbersMotion?: MotionProps;
  /** Key surface: one step above whatever the grid sits on (a dialog is already container-high). */
  keyTone?: string;
}

/**
 * S/D/T grid: one tap per dart, exact beds — more accurate than tapping a
 * phone-sized dartboard, and reachable by keyboard. Used by the game input
 * and by the visit correction dialog.
 */
export const DartGrid: React.FC<DartGridProps> = ({
  multiplier, onMultiplierChange, onPick, disabled = false,
  multiplierClassName = 'mb-3', numbersClassName = 'mb-1.5', bullsClassName = 'mb-4', numbersMotion,
  keyTone = 'bg-surface-container-high',
}) => {
  const { t } = useTranslation();
  const name = multiplier === '3' ? t('game.triple') : multiplier === '2' ? t('game.double') : t('game.single');
  const key = 'sotd-key m3-state-layer m3-ripple min-h-[44px] font-bold disabled:opacity-30';
  return (
    <>
      <SegmentedButton<GridMultiplier>
        className={multiplierClassName}
        size="sm"
        label={t('game.multiplier')}
        value={multiplier}
        onChange={onMultiplierChange}
        options={[
          { value: '1', label: 'S', ariaLabel: t('game.single') },
          { value: '2', label: 'D', ariaLabel: t('game.double') },
          { value: '3', label: 'T', ariaLabel: t('game.triple') },
        ]}
      />
      <motion.div {...numbersMotion} className={`grid grid-cols-5 gap-1.5 ${numbersClassName}`}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            type="button"
            onClick={() => onPick(n)}
            disabled={disabled}
            aria-label={`${name} ${n}`}
            className={`${key} ${keyTone} text-on-surface text-lg`}
          >
            {n}
          </button>
        ))}
      </motion.div>
      <div className={`grid grid-cols-3 gap-1.5 ${bullsClassName}`}>
        <button type="button" onClick={() => onPick(25)} disabled={disabled} className={`${key} ${keyTone} text-on-surface`}>25</button>
        <button type="button" onClick={() => onPick(50)} disabled={disabled} className={`${key} bg-primary-container text-on-primary-container`}>Bull</button>
        <button type="button" onClick={() => onPick(0)} disabled={disabled} className={`${key} bg-surface-container text-on-surface-variant`}>{t('game.miss')}</button>
      </div>
    </>
  );
};

export default DartGrid;
