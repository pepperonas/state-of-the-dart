import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { Dart } from '../../types';
import { shortDart } from '../../utils/decompose';
import { springSpatialFast } from '../../utils/motion';

export interface VisitChipsProps {
  /** Changes with the visit, so a new visit re-enters the row. */
  visitId: string;
  playerName: string;
  score: number;
  options: Dart[][];
  onPick: (darts: Dart[]) => void;
  onOther: () => void;
}

/**
 * "How was it thrown?" — after a typed total, a few likely decompositions.
 * One tap makes the darts exact (heatmap); ignoring the row costs nothing:
 * it never takes focus and Enter stays with the numpad.
 */
export const VisitChips: React.FC<VisitChipsProps> = ({ visitId, playerName, score, options, onPick, onOther }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      key={visitId}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSpatialFast}
      data-testid="visit-chips"
      role="group"
      aria-label={t('correction.how_thrown_label', { name: playerName, score })}
      className="flex flex-wrap items-center gap-1.5 mb-3 phoneland:mb-2 phoneland:col-start-1"
    >
      <span className="m3-label-medium text-on-surface-variant mr-1">
        {t('correction.how_thrown', { name: playerName, score })}
      </span>
      {options.map(darts => {
        const text = darts.map(shortDart).join(' · ');
        return (
          <button
            key={text}
            type="button"
            onPointerDown={e => e.preventDefault()}
            onClick={() => onPick(darts)}
            data-testid="visit-chip"
            aria-label={t('correction.pick', { darts: text })}
            className="m3-chip m3-state-layer m3-ripple tabular-nums"
          >
            {text}
          </button>
        );
      })}
      <button
        type="button"
        onPointerDown={e => e.preventDefault()}
        onClick={onOther}
        data-testid="visit-chip-other"
        className="m3-chip m3-state-layer m3-ripple"
      >
        {t('correction.other')}
      </button>
    </motion.div>
  );
};

export default VisitChips;
