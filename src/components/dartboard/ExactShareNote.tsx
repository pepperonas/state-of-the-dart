import React from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../icons';

interface ExactShareNoteProps {
  exact: number;
  total: number;
}

/**
 * Under a heatmap: how many of the darts are really known. Typed totals are
 * left out of every heatmap (their darts are only a guess), so a player who
 * enters sums sees why the board is thinner than the score sheet.
 */
export const ExactShareNote: React.FC<ExactShareNoteProps> = ({ exact, total }) => {
  const { t } = useTranslation();
  if (total === 0 || exact === total) return null;
  return (
    <p className="m3-body-small text-on-surface-variant flex items-start gap-2 justify-center text-center" data-testid="heatmap-exact-share">
      <Icon name="info" size={16} className="shrink-0 mt-0.5" />
      <span>
        {t('heatmap.exact_share', { exact, total })} {t('heatmap.exact_hint')}
      </span>
    </p>
  );
};

export default ExactShareNote;
