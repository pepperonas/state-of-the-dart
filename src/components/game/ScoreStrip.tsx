import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedNumber from '../common/AnimatedNumber';
import RankStamp from './RankStamp';
import ScoreDelta from './ScoreDelta';
import { motion } from 'framer-motion';
import { springSpatialDefault } from '../../utils/motion';
import { rankTone } from '../../utils/legRanks';

export interface StripPlayer {
  playerId: string;
  name: string;
  remaining: number;
  legsWon: number;
  setsWon: number;
  isActive: boolean;
  /** Place in the current leg; null while everyone is level. */
  rank?: number | null;
}

interface ScoreStripProps {
  players: StripPlayer[];
  showSets: boolean;
  /** Legs needed to win (match or set). */
  legsToWin?: number;
  className?: string;
}

/**
 * Every player's remaining score in one row — the phone layout.
 *
 * On a phone the full player cards stacked above the input pushed the numpad
 * below the fold as soon as two players were in the match; the strip keeps the
 * whole score and the input on one screen.
 */
const ScoreStrip: React.FC<ScoreStripProps> = ({ players, showSets, legsToWin, className = '' }) => {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const activeId = players.find(p => p.isActive)?.playerId;
  // From three players on the row scrolls sideways; keep the thrower in view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[aria-current="true"]');
    el?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeId]);
  return (
    <div
      ref={listRef}
      role="list"
      aria-label={t('game.scoreboard')}
      className={`flex gap-2 overflow-x-auto snap-x ${className}`}
    >
      {players.map(p => (
        <div
          key={p.playerId}
          role="listitem"
          data-testid={`strip-${p.name}`}
          aria-current={p.isActive ? 'true' : undefined}
          style={p.rank ? ({ '--rank-color': `var(--m3-rank-${rankTone(p.rank)})` } as React.CSSProperties) : undefined}
          className={`relative snap-start flex-1 min-w-[7.5rem] rounded-m3-lg px-3 py-2 phoneland:py-1 phoneland:flex phoneland:items-baseline phoneland:gap-3 transition-colors ${
            p.isActive
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-container text-on-surface'
          } ${p.rank ? 'sotd-rank-tint' : ''}`}
        >
          {/* The turn indicator glides from player to player (shared layout). */}
          {p.isActive && (
            <motion.span
              layoutId="strip-active"
              transition={springSpatialDefault}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-m3-lg ring-2 ring-[var(--m3-primary)]"
            />
          )}
          {p.rank && <RankStamp rank={p.rank} size="strip" className="absolute right-2 top-1.5 phoneland:static phoneland:order-last" />}
          <div className={`m3-label-large truncate phoneland:min-w-0 ${p.rank ? 'pr-8 phoneland:pr-0' : ''}`}>{p.name}</div>
          {/* Phone landscape: name and score on one line — height is what runs out. */}
          <div className="flex items-baseline justify-between gap-2 phoneland:flex-1">
            <span className="relative">
              <AnimatedNumber value={p.remaining} className="m3-headline-large sotd-strip-score tabular-nums" />
              <ScoreDelta value={p.remaining} className="left-full ml-1 bottom-0 m3-label-large" />
            </span>
            <span
              className="m3-label-medium whitespace-nowrap tabular-nums"
              title={legsToWin ? t('player_score.legs_to_win_long', { won: p.legsWon, total: legsToWin }) : undefined}
            >
              {showSets ? `${p.setsWon}S · ` : ''}{legsToWin ? `${p.legsWon}/${legsToWin}` : p.legsWon}L
              {legsToWin ? <span className="sr-only"> {t('player_score.legs_to_win_long', { won: p.legsWon, total: legsToWin })}</span> : null}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

/** The parent rebuilds the array every render; compare what is drawn. */
const samePlayers = (a: ScoreStripProps, b: ScoreStripProps) =>
  a.showSets === b.showSets &&
  a.legsToWin === b.legsToWin &&
  a.className === b.className &&
  a.players.length === b.players.length &&
  a.players.every((p, i) => {
    const q = b.players[i];
    return p.playerId === q.playerId && p.name === q.name && p.remaining === q.remaining &&
      p.legsWon === q.legsWon && p.setsWon === q.setsWon && p.isActive === q.isActive && p.rank === q.rank;
  });

export default React.memo(ScoreStrip, samePlayers);
