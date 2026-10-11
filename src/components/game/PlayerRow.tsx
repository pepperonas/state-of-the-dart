import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { UserMinus } from 'lucide-react';
import type { MatchPlayer } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import AnimatedNumber from '../common/AnimatedNumber';
import IconButton from '../common/IconButton';
import { springSpatialDefault } from '../../utils/motion';
import { rankTone } from '../../utils/legRanks';
import RankStamp from './RankStamp';
import ScoreDelta from './ScoreDelta';

export interface PlayerRowProps {
  player: MatchPlayer;
  avatar?: string;
  remaining: number;
  rank: number | null;
  average: number;
  legsWon: number;
  setsWon: number;
  showSets?: boolean;
  legsToWin?: number;
  onRemove?: (playerId: string) => void;
  removeLabel?: string;
}

/**
 * A player who is not at the oche: one compact line, like a TV scoreboard row.
 * The place in the leg colours a stripe on the left. Shares its layout ids
 * with `HeroCard`, so taking the turn morphs this row into the hero card.
 */
const PlayerRow: React.FC<PlayerRowProps> = ({
  player, avatar, remaining, rank, average, legsWon, setsWon, showSets = false, legsToWin,
  onRemove, removeLabel,
}) => {
  const { t } = useTranslation();
  const id = player.playerId;
  const legs = legsToWin ? `${legsWon}/${legsToWin}` : String(legsWon);
  return (
    <motion.div
      layoutId={`spot-${id}`}
      transition={{ layout: springSpatialDefault }}
      role="listitem"
      data-testid={`player-card-${player.name}`}
      style={rank ? ({ '--rank-color': `var(--m3-rank-${rankTone(rank)})` } as React.CSSProperties) : undefined}
      className="relative m3-card bg-surface-container rounded-m3-lg flex items-center gap-3 pl-4 pr-2 py-2 overflow-hidden"
    >
      {rank && <span aria-hidden="true" className="absolute left-0 inset-y-0 w-1.5 bg-[var(--rank-color)]" />}
      <PlayerAvatar avatar={avatar} name={player.name} size="sm" />
      <div className="min-w-0 flex-1">
        <motion.div layoutId={`spot-name-${id}`} className="m3-title-small text-on-surface truncate">
          {player.name}
        </motion.div>
        <div className="m3-label-small text-on-surface-variant tabular-nums truncate">
          Ø {average.toFixed(1)} · {showSets ? `${setsWon}S · ` : ''}{legs} L
          {legsToWin ? <span className="sr-only"> {t('player_score.legs_to_win_long', { won: legsWon, total: legsToWin })}</span> : null}
        </div>
      </div>
      {rank && <RankStamp rank={rank} size="strip" />}
      <motion.div layoutId={`spot-rest-${id}`} className="relative">
        <AnimatedNumber numeral value={remaining} className="block text-3xl text-on-surface" />
        <ScoreDelta value={remaining} className="right-full mr-1 bottom-0 m3-label-large" />
      </motion.div>
      {onRemove && (
        <IconButton
          label={removeLabel ?? t('player_score.remove')}
          onClick={() => onRemove(id)}
          className="text-on-surface-variant shrink-0"
        >
          <UserMinus size={16} />
        </IconButton>
      )}
    </motion.div>
  );
};

export default React.memo(PlayerRow);
