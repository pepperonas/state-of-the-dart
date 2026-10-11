import React from 'react';
import { useTranslation } from 'react-i18next';
import { rankTone } from '../../utils/legRanks';

interface RankStampProps {
  rank: number;
  /** `card` = the poster on a desktop player card, `strip` = the phone score strip. */
  size?: 'card' | 'strip' | 'large';
  className?: string;
}

/**
 * The player's place in the current leg as a poster — the style of the match
 * score on gostumblr's feed. The digits are `aria-hidden`; a full sentence is
 * read instead.
 */
const RankStamp: React.FC<RankStampProps> = ({ rank, size = 'card', className = '' }) => {
  const { t } = useTranslation();
  return (
    <span
      data-testid="leg-rank"
      data-rank={rank}
      className={`sotd-rank-stamp ${size === 'large' ? 'text-[6rem]' : size === 'card' ? 'text-[4.5rem]' : 'text-[2.25rem]'} ${className}`}
      style={{ '--rank-color': `var(--m3-rank-${rankTone(rank)})` } as React.CSSProperties}
    >
      <span className="sr-only">{t('player_score.leg_rank', { rank })}</span>
      <span aria-hidden="true">{rank}</span>
    </span>
  );
};

export default RankStamp;
