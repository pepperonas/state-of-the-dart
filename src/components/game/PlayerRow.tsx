import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { UserMinus } from 'lucide-react';
import type { MatchPlayer } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import AnimatedNumber from '../common/AnimatedNumber';
import IconButton from '../common/IconButton';
import { CONTAINER_MORPH, CONTENT_IN } from './spotlightMotion';
import { useReducedMotion } from 'framer-motion';
import { rankTone } from '../../utils/legRanks';
import RankStamp from './RankStamp';
import LegPips, { MAX_PIPS } from './LegPips';
import ScoreDelta from './ScoreDelta';

export interface PlayerRowProps {
  player: MatchPlayer;
  /** Really at the oche while the hero card still shows the thrower (0.34.0). */
  isCurrent?: boolean;
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
  /** Remaining score before this render (the hand-over): shows the "−60". */
  previousRemaining?: number;
  /** Changes when the turn passes — the only time the layout is measured. */
  turnKey?: string;
}

/**
 * A player who is not at the oche: one compact line, like a TV scoreboard row.
 * The place in the leg colours a stripe on the left. Shares its layout ids
 * with `HeroCard`, so taking the turn morphs this row into the hero card.
 */
const PlayerRow: React.FC<PlayerRowProps> = ({
  player, avatar, remaining, rank, average, legsWon, setsWon, showSets = false, legsToWin,
  onRemove, removeLabel, previousRemaining, turnKey, isCurrent = false,
}) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const id = player.playerId;
  return (
    <motion.div
      // Container transform: shares the hero card's layout id, so the row
      // grows into the card (and back). The content is counter-scaled.
      layoutId={`spot-${id}`}
      layoutDependency={turnKey}
      // The card shrinking back into a row would squash its text (a row is far
      // wider than tall), so the row stands at once — only avatar, name and
      // score fly in from the card. The opposite way the card still grows.
      transition={{ layout: { duration: 0 } }}
      role="listitem"
      aria-current={isCurrent ? 'true' : undefined}
      data-testid={`player-card-${player.name}`}
      style={{ borderRadius: 'var(--m3-shape-lg)', ...(rank ? { '--rank-color': `var(--m3-rank-${rankTone(rank)})` } : {}) } as React.CSSProperties}
      className="relative m3-card bg-surface-container overflow-hidden"
    >
      {rank && <span aria-hidden="true" className="absolute left-0 inset-y-0 w-1.5 bg-[var(--rank-color)]" />}
      <motion.div
        layout="position"
        layoutDependency={turnKey}
        className="relative flex items-center gap-3 pl-4 pr-2 py-2"
      >
      <motion.div layoutId={`spot-avatar-${id}`} layout="position" layoutDependency={turnKey} transition={{ layout: CONTAINER_MORPH }} className="shrink-0">
        <span className="relative block">
          <PlayerAvatar avatar={avatar} name={player.name} size="sm" />
          {rank && <RankStamp rank={rank} size="badge" />}
        </span>
      </motion.div>
      <div className="min-w-0 flex-1">
        <motion.div layoutId={`spot-name-${id}`} layout="position" layoutDependency={turnKey} transition={{ layout: CONTAINER_MORPH }} className="m3-title-small text-on-surface truncate">
          {player.name}
        </motion.div>
        {/* The figures echo the hero card's tiles: value emphasised, legs as pips. */}
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={CONTENT_IN}
          className="flex items-center gap-2.5 m3-label-small text-on-surface-variant tabular-nums whitespace-nowrap overflow-hidden"
        >
          <span>Ø <span className="text-on-surface font-semibold">{average.toFixed(1)}</span></span>
          {showSets && (
            <span data-testid="row-sets">
              <span className="text-on-surface font-semibold">{setsWon}</span> {t('game_screen.sets_short')}
            </span>
          )}
          <span data-testid="row-legs" className="flex items-center gap-1.5">
            <span className={`font-semibold ${legsWon > 0 ? 'text-tertiary' : 'text-on-surface'}`}>{legsWon}</span>
            {legsToWin && legsToWin <= MAX_PIPS
              ? <LegPips won={legsWon} total={legsToWin} size="sm" />
              : <span>{legsToWin ? `/ ${legsToWin} ` : ''}{t('game_screen.legs_short')}</span>}
          </span>
          {legsToWin ? <span className="sr-only">{t('player_score.legs_to_win_long', { won: legsWon, total: legsToWin })}</span> : null}
        </motion.div>
      </div>
      <motion.div layoutId={`spot-rest-${id}`} layout="position" layoutDependency={turnKey} transition={{ layout: CONTAINER_MORPH }} className="relative" data-testid="row-rest">
        <AnimatedNumber numeral value={remaining} className="block text-3xl text-on-surface" />
        <ScoreDelta value={remaining} from={previousRemaining} className="right-full mr-1 bottom-0 m3-label-large" />
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
    </motion.div>
  );
};

export default React.memo(PlayerRow);
