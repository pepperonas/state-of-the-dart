import React from 'react';
import { useTranslation } from 'react-i18next';
import AnimatedNumber from '../common/AnimatedNumber';

export interface StripPlayer {
  playerId: string;
  name: string;
  remaining: number;
  legsWon: number;
  setsWon: number;
  isActive: boolean;
}

interface ScoreStripProps {
  players: StripPlayer[];
  showSets: boolean;
  className?: string;
}

/**
 * Every player's remaining score in one row — the phone layout.
 *
 * On a phone the full player cards stacked above the input pushed the numpad
 * below the fold as soon as two players were in the match; the strip keeps the
 * whole score and the input on one screen.
 */
const ScoreStrip: React.FC<ScoreStripProps> = ({ players, showSets, className = '' }) => {
  const { t } = useTranslation();
  return (
    <div
      role="list"
      aria-label={t('game.scoreboard')}
      className={`flex gap-2 overflow-x-auto snap-x ${className}`}
    >
      {players.map(p => (
        <div
          key={p.playerId}
          role="listitem"
          aria-current={p.isActive ? 'true' : undefined}
          className={`snap-start flex-1 min-w-[7.5rem] rounded-m3-lg px-3 py-2 transition-colors ${
            p.isActive
              ? 'bg-primary-container text-on-primary-container ring-2 ring-[var(--m3-primary)]'
              : 'bg-surface-container text-on-surface'
          }`}
        >
          <div className="m3-label-large truncate">{p.name}</div>
          <div className="flex items-baseline justify-between gap-2">
            <AnimatedNumber value={p.remaining} className="text-3xl font-bold tabular-nums" />
            <span className="m3-label-medium opacity-80 whitespace-nowrap">
              {showSets ? `${p.setsWon}S · ` : ''}{p.legsWon}L
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(ScoreStrip);
