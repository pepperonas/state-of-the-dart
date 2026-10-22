import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { animate, motion, useMotionValue, useReducedMotion } from 'framer-motion';
import { Trophy, UserMinus } from 'lucide-react';
import type { MatchPlayer } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import AnimatedNumber from '../common/AnimatedNumber';
import { GAME_TALLY } from '../../utils/springs';
import IconButton from '../common/IconButton';
import { springHandover, springSpatialDefault, springSpatialFast } from '../../utils/motion';
import { CONTAINER_MORPH, CONTENT_IN, FLAMES_AFTER_MS } from './spotlightMotion';
import NameReveal from './NameReveal';
import RankStamp from './RankStamp';
import LegPips, { MAX_PIPS } from './LegPips';
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
  visits: { id?: string; score: number; bust: boolean }[];
  /** Tap a last-visit pill to correct that visit. */
  onEditVisit?: (throwId: string) => void;
  /** Checkout route for the darts left (only when one exists). */
  checkoutRoute?: string[] | null;
  /** Remaining score at which a finish is possible (170 double out, 180 otherwise). */
  checkoutMax?: number;
  size?: HeroSize;
  /** The match's single fire canvas host (null = no flames, e.g. small phones). */
  fireHost?: HTMLElement | null;
  onRemove?: (playerId: string) => void;
  removeLabel?: string;
  /** Remaining score before this render (the hand-over): shows the "−60". */
  previousRemaining?: number;
  /** Changes when the turn passes — the only time the layout is measured. */
  turnKey?: string;
  /** This card just became the hero through a turn change (not the first
   *  render, not a reload): the name builds up, the number grows, a ring pulses. */
  arrived?: boolean;
  /** Whether this player is really at the oche. The hero card can still show
   *  the thrower for a moment after the visit (0.34.0); `aria-current` follows
   *  the game, not the picture. */
  isCurrent?: boolean;
}

/** The remaining score, sized by viewport height so a big screen gets a big number. */
const NUMBER_SIZE: Record<HeroSize, string> = {
  compact: 'text-[clamp(3.5rem,14vw,5rem)]',
  regular: 'text-[clamp(4rem,10vh,6.5rem)]',
  large: 'text-[clamp(5rem,13vh,11rem)]',
};

/** Stat tile: a tonal well, a quiet label, a big number (like the score above). */
const TILE = 'flex flex-col bg-surface-container-highest rounded-m3-md px-3 py-2.5 min-w-0';
const TILE_LABEL = 'm3-label-small uppercase tracking-wider text-on-surface-variant truncate';
const TILE_VALUE = 'block mt-1 m3-headline-small font-semibold text-on-surface tabular-nums leading-none';

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
  dartsInLeg, visits, checkoutRoute, checkoutMax = 170, size = 'regular', fireHost = null,
  onRemove, removeLabel, previousRemaining, turnKey, onEditVisit, arrived = false, isCurrent = true,
}) => {
  const { t } = useTranslation();
  // A pill is a button when the visit can be corrected; the invisible ::before
  // grows the hit area past the 24 px minimum without growing the pill.
  const pill = (v: HeroCardProps['visits'][number], key: string, isNew: boolean, cls: string) => {
    const label = v.bust ? t('game.bust') : v.score;
    const motionProps = {
      initial: isNew ? { scale: 0.5, opacity: 0 } : false,
      animate: { scale: 1, opacity: 1 },
      transition: springSpatialFast,
    } as const;
    if (onEditVisit && v.id) {
      const visitId = v.id;
      return (
        <motion.button
          key={key}
          type="button"
          {...motionProps}
          onClick={() => onEditVisit(visitId)}
          aria-label={t('correction.edit_visit', { score: label })}
          data-testid="visit-pill"
          className={`relative before:absolute before:-inset-x-1 before:-inset-y-2 before:content-[''] m3-state-layer ${cls} ${visitTone(v)}`}
        >
          {label}
        </motion.button>
      );
    }
    return <motion.span key={key} {...motionProps} className={`${cls} ${visitTone(v)}`}>{label}</motion.span>;
  };
  const id = player.playerId;
  const reduce = useReducedMotion();
  const play = arrived && !reduce;
  const [opened, setOpened] = useState(!play);

  // The number grows from the row's size into the hero's: a UNIFORM scale on
  // top of the shared-element flight, so the digits are never stretched.
  // Measured before paint, from the row number's rem size (m3-headline-large, 2rem).
  const grow = useMotionValue(1);
  const numberRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (!play || !numberRef.current) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const heroPx = parseFloat(getComputedStyle(numberRef.current).fontSize) || rem * 4;
    const from = Math.min(1, (2 * rem) / heroPx);
    grow.set(from);
    const controls = animate(grow, 1, springHandover);
    return () => controls.stop();
    // Only on arrival; the card is keyed by player, so this runs once per hand-over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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

  // The fire moves in once the card has arrived: the shared canvas host is
  // re-parented into this card (no new WebGL context) and fades in.
  const fireSlot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const slot = fireSlot.current;
    if (!fireHost || !slot) return;
    fireHost.classList.remove('sotd-fire-host--on');
    const timer = setTimeout(() => {
      slot.appendChild(fireHost);
      requestAnimationFrame(() => fireHost.classList.add('sotd-fire-host--on'));
    }, FLAMES_AFTER_MS);
    return () => clearTimeout(timer);
  }, [fireHost]);

  return (
    // M3 container transform: the card morphs out of the player's row. The
    // content stays inside it, clipped, and `layout` on the content wrapper
    // makes framer counter-scale it — text is never stretched.
    // The card travels from the row's place (shared layout id, POSITION only)
    // and opens from the row's height with a clip (0.34.0). Growing it by
    // `layout` scaled the surface, and framer's counter-scale on the content
    // fell short on a slow spring — avatar and number stood visibly squashed.
    // A clip never distorts what is inside.
    <motion.article
      layoutId={`spot-${id}`}
      layout="position"
      layoutDependency={turnKey}
      initial={play ? { clipPath: 'inset(0% 0% 64% 0% round 16px)' } : false}
      animate={opened ? { clipPath: 'none' } : { clipPath: 'inset(0% 0% 0% 0% round 16px)' }}
      transition={{ layout: CONTAINER_MORPH, clipPath: opened ? { duration: 0 } : CONTAINER_MORPH }}
      // The clip would also cut the card's shadow and the fire's glow: gone
      // as soon as the card is open.
      onAnimationComplete={() => { if (play) setOpened(true); }}
      data-testid={`player-card-${player.name}`}
      data-hero="true"
      data-arrived={play ? 'true' : undefined}
      aria-current={isCurrent ? 'true' : undefined}
      className={`relative overflow-hidden m3-card m3-elevated sotd-on-fire bg-surface-container-high ${size === 'compact' ? 'p-3' : 'p-4 md:p-5'}`}
      style={{ borderRadius: 'var(--m3-shape-lg)' }}
    >
      <div ref={fireSlot} aria-hidden="true" className="sotd-fire-slot absolute inset-0 rounded-m3-lg overflow-hidden pointer-events-none" />
      {/* "Your turn": one ring once the card has grown. */}
      {play && <div aria-hidden="true" data-testid="turn-ring" className="sotd-turn-ring absolute inset-0 rounded-m3-lg pointer-events-none" />}
      <motion.div
        layout="position"
        layoutDependency={turnKey}
        className="relative"
      >

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar, name and remaining score fly from the player's row into
              this card as shared elements (and back when the turn passes). */}
          <motion.div layoutId={`spot-avatar-${id}`} layout="position" layoutDependency={turnKey} transition={{ layout: CONTAINER_MORPH }} className="shrink-0">
            <PlayerAvatar avatar={avatar} name={player.name} size={size === 'compact' ? 'sm' : 'md'} />
          </motion.div>
          <motion.h3 layoutId={`spot-name-${id}`} layout="position" layoutDependency={turnKey} transition={{ layout: CONTAINER_MORPH }} className="m3-title-large text-on-surface truncate">
            <NameReveal name={player.name} play={play} />
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
        <motion.div layoutId={`spot-rest-${id}`} layout="position" layoutDependency={turnKey} transition={{ layout: CONTAINER_MORPH }} className="relative">
          {/* In checkout range the number breathes — a finish is on. */}
          <motion.div
            data-breathing={breathing ? 'true' : undefined}
            animate={breathing ? { scale: [1, 1.035, 1] } : { scale: 1 }}
            transition={breathing ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : springSpatialDefault}
            style={{ transformOrigin: 'left bottom' }}
          >
          <motion.span ref={numberRef} className={`block ${NUMBER_SIZE[size]}`} style={{ scale: grow, transformOrigin: 'left bottom' }}>
          <AnimatedNumber
            numeral
            tally={GAME_TALLY}
            value={remaining}
            className={`block leading-none tracking-tight ${NUMBER_SIZE[size]} ${
              remaining <= checkoutMax ? 'text-primary' : 'text-on-surface'
            }`}
          />
          </motion.span>
          </motion.div>
          {/* The visit lands here, big, while the card is still the hero. */}
          <ScoreDelta variant="stamp" value={remaining} from={previousRemaining} className="left-full ml-3 top-0 m3-headline-small" />
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

      {/* The details fade in once the card has arrived. */}
      <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={CONTENT_IN}>
      {size === 'compact' ? (
        // Phones: one meta line instead of tiles — the dock below needs the height.
        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-2 m3-label-medium text-on-surface-variant tabular-nums">
          <span>Ø <span className="text-on-surface font-semibold">{average.toFixed(1)}</span></span>
          <span data-testid="darts-in-leg">{t('game_screen.darts_in_leg')} <span className="text-on-surface font-semibold">{dartsInLeg}</span></span>
          {legsToWin ? (
            <span className="flex items-center gap-1.5" data-testid="legs-tile">
              {t('game.legs')} <span className={`font-semibold ${legsWon > 0 ? 'text-tertiary' : 'text-on-surface'}`}>{legsWon}</span>
              {legsToWin <= MAX_PIPS ? <LegPips won={legsWon} total={legsToWin} size="sm" /> : <span aria-hidden="true">/ {legsToWin}</span>}
              <span data-testid="legs-to-win" className="sr-only">
                {t(showSets ? 'player_score.legs_to_win_set' : 'player_score.legs_to_win', { won: legsWon, total: legsToWin })}
              </span>
            </span>
          ) : null}
          {visits.length > 0 && (
            <span data-testid="last-visits" className="flex items-center gap-1 ml-auto" aria-label={t('game_screen.last_visits')}>
              {visits.slice(-3).map((v, i, arr) =>
                pill(v, `${visits.length}-${i}`, i === arr.length - 1, 'px-1.5 py-0.5 rounded-m3-full m3-label-small'))}
            </span>
          )}
        </div>
      ) : (
        <>
      {/* The stat tiles echo the top of the card: a quiet label, a big tallying
          number. Legs show the way to the win as pips, one per leg needed. */}
      <div className={`grid ${showSets ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mt-4`}>
          <div className={TILE} data-testid="average-tile">
            <div className={TILE_LABEL}>{t('game.average')}</div>
            <AnimatedNumber value={average} decimals={2} className={TILE_VALUE} />
          </div>
          <div className={TILE} data-testid="darts-in-leg">
            <div className={TILE_LABEL}>{t('game_screen.darts_in_leg')}</div>
            <AnimatedNumber value={dartsInLeg} className={TILE_VALUE} />
          </div>
          <motion.div
            key={legPulse}
            data-testid="legs-tile"
            data-won={legsWon > 0 ? 'true' : undefined}
            data-pulse={legPulse}
            initial={legPulse > 0 ? { scale: 1.1 } : false}
            animate={{ scale: 1 }}
            transition={springSpatialDefault}
            className={`${TILE} ${legsWon > 0 ? '!bg-tertiary-container' : ''} ${legPulse > 0 ? 'sotd-leg-won' : ''}`}
          >
            <div className={`${TILE_LABEL} flex items-center gap-1 ${legsWon > 0 ? '!text-on-tertiary-container' : ''}`}>
              <Trophy size={12} className={legsWon > 0 ? '' : 'text-tertiary'} fill={legsWon > 0 ? 'currentColor' : 'none'} aria-hidden="true" />
              {t('game.legs')}
            </div>
            <div className="flex items-center gap-2.5 mt-1">
              <AnimatedNumber value={legsWon} className={`${TILE_VALUE} !mt-0 ${legsWon > 0 ? '!text-on-tertiary-container' : ''}`} />
              {legsToWin && legsToWin <= MAX_PIPS ? (
                <LegPips won={legsWon} total={legsToWin} tone={legsWon > 0 ? 'container' : 'surface'} />
              ) : legsToWin ? (
                <span aria-hidden="true" className={`m3-title-small ${legsWon > 0 ? 'text-on-tertiary-container' : 'text-on-surface-variant'}`}>/ {legsToWin}</span>
              ) : null}
            </div>
            {/* The pips say it at a glance; the sentence is for screen readers. */}
            {legsToWin ? (
              <span data-testid="legs-to-win" className="sr-only">
                {t(showSets ? 'player_score.legs_to_win_set' : 'player_score.legs_to_win', { won: legsWon, total: legsToWin })}
              </span>
            ) : null}
          </motion.div>
          {showSets && (
            <div className={TILE} data-testid="sets-tile">
              <div className={`${TILE_LABEL} flex items-center gap-1`}>
                <Trophy size={12} className="text-primary" aria-hidden="true" />
                {t('game.sets')}
              </div>
              <AnimatedNumber value={setsWon} className={TILE_VALUE} />
            </div>
          )}
        </div>
  
        {/* Last visits in this leg, newest at the end. */}
        {visits.length > 0 && (
          <div data-testid="last-visits" className="flex items-center gap-1.5 mt-3 flex-wrap" aria-label={t('game_screen.last_visits')}>
            <span className="m3-label-small text-on-surface-variant mr-1">{t('game_screen.last_visits')}</span>
            {visits.map((v, i) =>
              pill(v, `${visits.length}-${i}`, i === visits.length - 1, 'px-2 py-0.5 rounded-m3-full m3-label-medium tabular-nums'))}
          </div>
        )}
          </>
      )}
      </motion.div>
      </motion.div>
    </motion.article>
  );
};

export default React.memo(HeroCard);
