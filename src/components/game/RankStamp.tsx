import React from 'react';
import { useTranslation } from 'react-i18next';
import { rankTone } from '../../utils/legRanks';

interface RankStampProps {
  rank: number;
  /**
   * `card` = the poster on the hero card, `strip` = the phone score strip,
   * `badge` = a small disc on the avatar of a player row (0.37.0: the poster
   * beside the remaining score read as one number — "2 75" as 275).
   */
  size?: 'card' | 'strip' | 'large' | 'badge';
  className?: string;
}

/**
 * The player's place in the current leg as a poster — the style of the match
 * score on gostumblr's feed. The digits are `aria-hidden`; a full sentence is
 * read instead.
 */
const RankStamp: React.FC<RankStampProps> = ({ rank, size = 'card', className = '' }) => {
  const { t } = useTranslation();
  const style = { '--rank-color': `var(--m3-rank-${rankTone(rank)})` } as React.CSSProperties;
  if (size === 'badge') {
    return (
      <span data-testid="leg-rank" data-rank={rank} className={`sotd-rank-badge ${className}`} style={style}>
        <span className="sr-only">{t('player_score.leg_rank', { rank })}</span>
        <span aria-hidden="true">{rank}</span>
      </span>
    );
  }
  return (
    <span
      data-testid="leg-rank"
      data-rank={rank}
      className={`sotd-rank-stamp ${size === 'large' ? 'text-[6rem]' : size === 'card' ? 'text-[4.5rem]' : 'text-[2.25rem]'} ${className}`}
      style={style}
    >
      <span className="sr-only">{t('player_score.leg_rank', { rank })}</span>
      <span aria-hidden="true">{rank}</span>
    </span>
  );
};

export default RankStamp;
