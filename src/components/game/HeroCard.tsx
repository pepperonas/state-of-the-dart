import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Trophy, UserMinus } from 'lucide-react';
import type { MatchPlayer } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import AnimatedNumber from '../common/AnimatedNumber';
import IconButton from '../common/IconButton';
import { springSpatialDefault, springSpatialFast } from '../../utils/motion';
import FireCanvas from './FireCanvas';
import RankStamp from './RankStamp';
import ScoreDelta from './ScoreDelta';

export type HeroSize = 'compact' | 'regular' | 'large';

export interface HeroCardProps {
  player: MatchPlayer;
  avatar?: string;
  remaining: number;
  /** Place in the current leg; null while everyone is level. */
  rank: number | null;
  average: number;
  legsWon: number;
  setsWon: number;
  showSets?: boolean;
  legsToWin?: number;
  dartsInLeg: number;
  /** Last visits in the leg, oldest first. */
  visits: { score: number; bust: boolean }[];
  /** Checkout route for the darts left (only when one exists). */
  checkoutRoute?: string[] | null;
  /** Remaining score at which a finish is possible (170 double out, 180 otherwise). */
  checkoutMax?: number;
  size?: HeroSize;
  /** WebGL flames along the bottom edge (not on small phones). */
  flames?: boolean;
  onRemove?: (playerId: string) => void;
  removeLabel?: string;
}

/** The remaining score, sized by viewport height so a big screen gets a big number. */
const NUMBER_SIZE: Record<HeroSize, string> = {
  compact: 'text-[clamp(3.5rem,14vw,5rem)]',
  regular: 'text-[clamp(4rem,10vh,6.5rem)]',
  large: 'text-[clamp(5rem,13vh,11rem)]',
};

/** Visit pill colour: 180 and 140+ tertiary, 100+ primary, bust error. */
const visitTone = (v: { score: number; bust: boolean }) =>
  v.bust ? 'bg-error-container text-on-error-container'
    : v.score >= 140 ? 'bg-tertiary-container text-on-tertiary-container'
    : v.score >= 100 ? 'bg-primary-container text-on-primary-container'
    : 'bg-surface-container-highest text-on-surface';

/**
 * The player at the oche: the spotlight of the game screen. The remaining
 * score is the largest thing on screen; around it what matters for this
 * visit — the checkout route, the place in the leg, darts thrown, the last
 * visits. Shares its layout ids with `PlayerRow`, so the turn passing morphs
 * the row into this card and this card back into a row.
 */
const HeroCard: React.FC<HeroCardProps> = ({
  player, avatar, remaining, rank, average, legsWon, setsWon, showSets = false, legsToWin,
  dartsInLeg, visits, checkoutRoute, checkoutMax = 170, size = 'regular', flames = true,
  onRemove, removeLabel,
}) => {
  const { t } = useTranslation();
  const id = player.playerId;
  const reduce = useReducedMotion();
  const breathing = !reduce && remaining > 1 && remaining <= checkoutMax;

  // A leg just won: the legs tile springs once and glows. Counted from the
  // previous render (state adjusted during render), so mounting or resuming
  // does not replay it.
  const [seenLegs, setSeenLegs] = useState(legsWon);
  const [legPulse, setLegPulse] = useState(0);
  if (legsWon !== seenLegs) {
    if (legsWon > seenLegs) setLegPulse(n => n + 1);
    setSeenLegs(legsWon);
  }

  return (
    <motion.article
      layoutId={`spot-${id}`}
      transition={{ layout: springSpatialDefault }}
      data-testid={`player-card-${player.name}`}
      data-hero="true"
      aria-current="true"
      className={`relative m3-card m3-elevated sotd-on-fire bg-surface-container-high ${size === 'compact' ? 'p-3' : 'p-4 md:p-5'}`}
    >
      {flames && <FireCanvas />}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <PlayerAvatar avatar={avatar} name={player.name} size={size === 'compact' ? 'sm' : 'md'} />
          <motion.h3 layoutId={`spot-name-${id}`} className="m3-title-large text-on-surface truncate">
            {player.name}
          </motion.h3>
        </div>
        {onRemove && (
          <IconButton
            label={removeLabel ?? t('player_score.remove')}
            onClick={() => onRemove(id)}
            className="text-on-surface-variant shrink-0"
          >
            <UserMinus size={18} />
          </IconButton>
        )}
      </div>

      {/* The number and the place in the leg share a row. */}
      <div className="flex items-end justify-between gap-3 mt-1">
        <motion.div layoutId={`spot-rest-${id}`} className="relative">
          {/* In checkout range the number breathes — a finish is on. */}
          <motion.div
            data-breathing={breathing ? 'true' : undefined}
            animate={breathing ? { scale: [1, 1.035, 1] } : { scale: 1 }}
            transition={breathing ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : springSpatialDefault}
            style={{ transformOrigin: 'left bottom' }}
          >
          <AnimatedNumber
            numeral
            value={remaining}
            className={`block leading-none tracking-tight ${NUMBER_SIZE[size]} ${
              remaining <= checkoutMax ? 'text-primary' : 'text-on-surface'
            }`}
          />
          </motion.div>
          <ScoreDelta value={remaining} className="left-full ml-2 top-0 m3-title-large" />
        </motion.div>
        {rank && <RankStamp rank={rank} size={size === 'large' ? 'large' : 'card'} />}
      </div>

      {/* Checkout route — only when a finish exists. */}
      {checkoutRoute && checkoutRoute.length > 0 && (
        <motion.div
          data-testid="checkout-route"
          aria-label={`${t('score_input.checkout')}: ${checkoutRoute.join(' ')}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springSpatialDefault}
          className="flex items-center gap-2 mt-3 px-3 py-2 rounded-m3-md bg-success-container text-on-success-container"
        >
          <span className="m3-label-medium uppercase tracking-wide">{t('score_input.checkout')}</span>
          <span className="flex gap-1.5 ml-auto">
            {checkoutRoute.map((d, i) => (
              <motion.span
                layout
                key={`${i}-${d}`}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springSpatialFast}
                className="px-2 py-0.5 rounded-m3-sm bg-surface text-on-surface m3-label-large tabular-nums"
              >
                {d}
              </motion.span>
            ))}
          </span>
        </motion.div>
      )}

      {size === 'compact' ? (
        // Phones: one meta line instead of tiles — the dock below needs the height.
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-2 m3-label-medium text-on-surface-variant tabular-nums">
          <span>Ø <span className="text-on-surface font-semibold">{average.toFixed(1)}</span></span>
          <span data-testid="darts-in-leg">{t('game_screen.darts_in_leg')} <span className="text-on-surface font-semibold">{dartsInLeg}</span></span>
          {legsToWin ? (
            <span data-testid="legs-to-win" className={legsWon > 0 ? 'text-tertiary font-semibold' : ''}>
              {t(showSets ? 'player_score.legs_to_win_set' : 'player_score.legs_to_win', { won: legsWon, total: legsToWin })}
            </span>
          ) : null}
          {visits.length > 0 && (
            <span data-testid="last-visits" className="flex items-center gap-1 ml-auto" aria-label={t('game_screen.last_visits')}>
              {visits.slice(-3).map((v, i, arr) => (
                <motion.span
                  key={`${visits.length}-${i}`}
                  initial={i === arr.length - 1 ? { scale: 0.5, opacity: 0 } : false}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={springSpatialFast}
                  className={`px-1.5 py-0.5 rounded-m3-full m3-label-small ${visitTone(v)}`}
                >
                  {v.bust ? t('game.bust') : v.score}
                </motion.span>
              ))}
            </span>
          )}
        </div>
      ) : (
        <>
      <div className={`grid ${showSets ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mt-3 text-sm`}>
          <div className="bg-surface-container-highest rounded-m3-sm p-2">
            <div className="text-on-surface-variant m3-label-medium">{t('game.average')}</div>
            <div className="font-semibold text-on-surface tabular-nums">{average.toFixed(2)}</div>
          </div>
          <div className="bg-surface-container-highest rounded-m3-sm p-2" data-testid="darts-in-leg">
            <div className="text-on-surface-variant m3-label-medium">{t('game_screen.darts_in_leg')}</div>
            <div className="font-semibold text-on-surface tabular-nums">{dartsInLeg}</div>
          </div>
          <motion.div
            key={legPulse}
            data-testid="legs-tile"
            data-won={legsWon > 0 ? 'true' : undefined}
            data-pulse={legPulse}
            initial={legPulse > 0 ? { scale: 1.1 } : false}
            animate={{ scale: 1 }}
            transition={springSpatialDefault}
            className={`rounded-m3-sm p-2 ${legsWon > 0 ? 'bg-tertiary-container' : 'bg-surface-container-highest'} ${legPulse > 0 ? 'sotd-leg-won' : ''}`}
          >
            <div className={`m3-label-medium ${legsWon > 0 ? 'text-on-tertiary-container' : 'text-on-surface-variant'}`}>{t('game.legs')}</div>
            <div className={`font-semibold flex items-center gap-1 ${legsWon > 0 ? 'text-on-tertiary-container' : 'text-on-surface'}`}>
              {legsWon}
              {legsWon > 0
                ? Array.from({ length: Math.min(legsWon, 5) }, (_, i) => (
                    <Trophy key={i} size={14} fill="currentColor" aria-hidden="true" />
                  ))
                : <Trophy size={14} className="text-tertiary" aria-hidden="true" />}
            </div>
            {legsToWin ? (
              <div data-testid="legs-to-win" className={`m3-label-small tabular-nums ${legsWon > 0 ? 'text-on-tertiary-container' : 'text-on-surface-variant'}`}>
                {t(showSets ? 'player_score.legs_to_win_set' : 'player_score.legs_to_win', { won: legsWon, total: legsToWin })}
              </div>
            ) : null}
          </motion.div>
          {showSets && (
            <div className="bg-surface-container-highest rounded-m3-sm p-2">
              <div className="text-on-surface-variant m3-label-medium">{t('game.sets')}</div>
              <div className="font-semibold text-on-surface flex items-center gap-1">
                {setsWon}
                <Trophy size={14} className="text-primary" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
  
        {/* Last visits in this leg, newest at the end. */}
        {visits.length > 0 && (
          <div data-testid="last-visits" className="flex items-center gap-1.5 mt-3 flex-wrap" aria-label={t('game_screen.last_visits')}>
            <span className="m3-label-small text-on-surface-variant mr-1">{t('game_screen.last_visits')}</span>
            {visits.map((v, i) => (
              <motion.span
                key={`${visits.length}-${i}`}
                initial={i === visits.length - 1 ? { scale: 0.5, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={springSpatialFast}
                className={`px-2 py-0.5 rounded-m3-full m3-label-medium tabular-nums ${visitTone(v)}`}
              >
                {v.bust ? t('game.bust') : v.score}
              </motion.span>
            ))}
          </div>
        )}
          </>
      )}
    </motion.article>
  );
};

export default React.memo(HeroCard);
