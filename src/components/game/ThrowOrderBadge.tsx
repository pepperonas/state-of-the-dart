import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * The place of a selected player in the throwing order (0.45.0). The order of
 * selection is the order at the oche — the start wheel only rotates it — and
 * with eight players nobody could see it before.
 */
const ThrowOrderBadge: React.FC<{ index: number }> = ({ index }) => {
  const { t } = useTranslation();
  if (index < 0) return null;
  return (
    <span
      data-testid="throw-order"
      className="absolute top-1.5 left-1.5 min-w-6 h-6 px-1.5 rounded-m3-full bg-primary text-on-primary m3-label-medium tabular-nums flex items-center justify-center"
    >
      <span aria-hidden="true">{index + 1}</span>
      <span className="sr-only">{t('game_screen.throw_order', { n: index + 1 })}</span>
    </span>
  );
};

export default ThrowOrderBadge;
