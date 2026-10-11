import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import FireCanvas from './FireCanvas';
import { useTranslation } from 'react-i18next';
import { LayoutGroup } from 'framer-motion';
import HeroCard, { type HeroCardProps, type HeroSize } from './HeroCard';
import PlayerRow, { type PlayerRowProps } from './PlayerRow';

export type SpotPlayer = Omit<HeroCardProps, 'size' | 'fireHost' | 'checkoutRoute' | 'checkoutMax' | 'onRemove' | 'removeLabel' | 'previousRemaining' | 'turnKey'>;

interface SpotlightProps {
  players: SpotPlayer[];
  activeIndex: number;
  showSets: boolean;
  legsToWin?: number;
  checkoutRoute?: string[] | null;
  checkoutMax?: number;
  size: HeroSize;
  flames: boolean;
  /** Phones: rows above the hero, so the hero sits right over the input dock. */
  rowsFirst?: boolean;
  /** Rows in two columns (big screens, four players and more). */
  rowColumns?: 1 | 2;
  onRemove?: PlayerRowProps['onRemove'];
  removeLabel?: string;
}

/**
 * The scoreboard as a spotlight: the player at the oche is the hero card,
 * everyone else a compact row in match order. Both share layout ids, so when
 * the turn passes the next row grows into the hero and the hero shrinks back
 * into its row — one continuous movement instead of a highlight jumping.
 */
const Spotlight: React.FC<SpotlightProps> = ({
  players, activeIndex, showSets, legsToWin, checkoutRoute, checkoutMax, size, flames,
  rowsFirst = false, rowColumns = 1, onRemove, removeLabel,
}) => {
  const { t } = useTranslation();
  // Remaining scores of the previous render: when the turn passes, the card
  // that just threw becomes a new row — it needs the old score to show "−60".
  // State adjusted during render (no ref read during render, no effect).
  const scores = players.map(p => `${p.player.playerId}:${p.remaining}`).join('|');
  const [snap, setSnap] = useState<{ key: string; cur: Record<string, number>; prev: Record<string, number> }>(
    () => ({ key: scores, cur: Object.fromEntries(players.map(p => [p.player.playerId, p.remaining])), prev: {} }),
  );
  if (snap.key !== scores) {
    setSnap({ key: scores, prev: snap.cur, cur: Object.fromEntries(players.map(p => [p.player.playerId, p.remaining])) });
  }
  const prev = snap.prev;
  const turnKey = players[activeIndex]?.player.playerId;
  // ONE fire for the whole match: a canvas keeps its WebGL context when it is
  // moved in the DOM, so each new hero card adopts this host instead of
  // building (and later tearing down) a context of its own — that cost
  // 400–450 ms of main thread on every turn.
  const fireHost = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const host = document.createElement('div');
    host.className = 'sotd-fire-host';
    host.setAttribute('aria-hidden', 'true');
    return host;
  }, []);
  const hero = players[activeIndex];
  const rows = players.filter((_, i) => i !== activeIndex);

  const heroCard = hero ? (
    <HeroCard
      key={`hero-${hero.player.playerId}`}
      {...hero}
      showSets={showSets}
      legsToWin={legsToWin}
      checkoutRoute={checkoutRoute}
      checkoutMax={checkoutMax}
      size={size}
      fireHost={flames ? fireHost : null}
      onRemove={onRemove}
      removeLabel={removeLabel}
      previousRemaining={prev[hero.player.playerId]}
      turnKey={turnKey}
    />
  ) : null;

  const rowList = rows.length > 0 ? (
    <div
      role="list"
      aria-label={t('game.scoreboard')}
      className={`grid gap-2 ${rowColumns === 2 ? 'sm:grid-cols-2' : ''}`}
    >
      {rows.map(p => (
        <PlayerRow
          key={`row-${p.player.playerId}`}
          player={p.player}
          avatar={p.avatar}
          remaining={p.remaining}
          rank={p.rank}
          average={p.average}
          legsWon={p.legsWon}
          setsWon={p.setsWon}
          showSets={showSets}
          legsToWin={legsToWin}
          onRemove={onRemove}
          removeLabel={removeLabel}
          previousRemaining={prev[p.player.playerId]}
          turnKey={turnKey}
        />
      ))}
    </div>
  ) : null;

  return (
    <LayoutGroup id="spotlight">
      {flames && fireHost && createPortal(<FireCanvas />, fireHost)}
      <div className="flex flex-col gap-3" data-testid="spotlight">
        {rowsFirst ? <>{rowList}{heroCard}</> : <>{heroCard}{rowList}</>}
      </div>
    </LayoutGroup>
  );
};

export default Spotlight;
