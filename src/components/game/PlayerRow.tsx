import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { UserMinus } from 'lucide-react';
import type { MatchPlayer } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import AnimatedNumber from '../common/AnimatedNumber';
import { GAME_TALLY } from '../../utils/springs';
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
  /**
   * `regular` = one roomy line; `dense` = tighter (five players and more);
   * `tile` = a half-width tile for the two-column phone grid (0.45.0).
   */
  density?: RowDensity;
  /** Throws after the player at the oche. */
  isNext?: boolean;
}

export type RowDensity = 'regular' | 'dense' | 'tile';

const PAD: Record<RowDensity, string> = {
  regular: 'gap-3 pl-4 pr-2 py-2',
  dense: 'gap-2.5 pl-3 pr-2 py-1.5',
  tile: 'gap-2 pl-3 pr-2.5 py-1',
};
const REST: Record<RowDensity, string> = {
  regular: 'm3-headline-large',
  dense: 'm3-headline-small',
  tile: 'm3-title-large',
};

/**
 * A player who is not at the oche: one compact line, like a TV scoreboard row.
 * The place in the leg colours a stripe on the left. Shares its layout ids
 * with `HeroCard`, so taking the turn morphs this row into the hero card.
 */
const PlayerRow: React.FC<PlayerRowProps> = ({
  player, avatar, remaining, rank, average, legsWon, setsWon, showSets = false, legsToWin,
  onRemove, removeLabel, previousRemaining, turnKey, isCurrent = false,
  density = 'regular', isNext = false,
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
      data-density={density}
      data-next={isNext ? 'true' : undefined}
      className={`relative m3-card bg-surface-container overflow-hidden ${isNext ? 'ring-1 ring-[var(--m3-primary)]' : ''}`}
    >
      {rank && <span aria-hidden="true" className="absolute left-0 inset-y-0 w-1.5 bg-[var(--rank-color)]" />}
      <motion.div
        layout="position"
        layoutDependency={turnKey}
        className={`relative flex items-center ${PAD[density]}`}
      >
      <motion.div layoutId={`spot-avatar-${id}`} layout="position" layoutDependency={turnKey} transition={{ layout: CONTAINER_MORPH }} className="shrink-0">
        <span className="relative block">
          <PlayerAvatar avatar={avatar} name={player.name} size={density === 'regular' ? 'sm' : 'xs'} />
          {rank && <RankStamp rank={rank} size="badge" />}
        </span>
      </motion.div>
      <div className="min-w-0 flex-1">
        <motion.div layoutId={`spot-name-${id}`} layout="position" layoutDependency={turnKey} transition={{ layout: CONTAINER_MORPH }} className={`${density === 'tile' ? 'm3-label-large' : 'm3-title-small'} text-on-surface truncate`}>
          {player.name}
        </motion.div>
        {isNext && <span className="sr-only">{t('game_screen.up_next_long')}</span>}
        {/* The figures echo the hero card's tiles: value emphasised, legs as pips.
            A tile has room for one short line: "next", else the legs. */}
        {density === 'tile' ? (
          <div className="flex items-center gap-1.5 m3-label-small text-on-surface-variant tabular-nums whitespace-nowrap overflow-hidden h-3 leading-3">
            {isNext ? (
              <span aria-hidden="true" data-testid="row-next" className="text-primary font-semibold">{t('game_screen.up_next')}</span>
            ) : (
              <span data-testid="row-legs" className="flex items-center gap-1.5">
                {legsToWin && legsToWin <= MAX_PIPS
                  ? <LegPips won={legsWon} total={legsToWin} size="sm" />
                  : <span><span className={`font-semibold ${legsWon > 0 ? 'text-tertiary' : 'text-on-surface'}`}>{legsWon}</span>{legsToWin ? ` / ${legsToWin}` : ''} {t('game_screen.legs_short')}</span>}
              </span>
            )}
            {showSets && !isNext && <span data-testid="row-sets"><span className="text-on-surface font-semibold">{setsWon}</span> {t('game_screen.sets_short')}</span>}
            {legsToWin ? <span className="sr-only">{t('player_score.legs_to_win_long', { won: legsWon, total: legsToWin })}</span> : null}
          </div>
        ) : (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={CONTENT_IN}
          className="flex items-center gap-2.5 m3-label-small text-on-surface-variant tabular-nums whitespace-nowrap overflow-hidden"
        >
          {isNext && <span aria-hidden="true" data-testid="row-next" className="text-primary font-semibold">{t('game_screen.up_next')}</span>}
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
        )}
      </div>
      <motion.div layoutId={`spot-rest-${id}`} layout="position" layoutDependency={turnKey} transition={{ layout: CONTAINER_MORPH }} className="relative" data-testid="row-rest">
        <AnimatedNumber numeral tally={GAME_TALLY} value={remaining} className={`block ${REST[density]} text-on-surface`} />
        <ScoreDelta value={remaining} from={previousRemaining} className="right-full mr-1 bottom-0 m3-label-large" />
      </motion.div>
      {/* A tile is too narrow for the button; the hero card keeps it. */}
      {onRemove && density !== 'tile' && (
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
