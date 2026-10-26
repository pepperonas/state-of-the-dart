import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import FireCanvas from './FireCanvas';
import { useTranslation } from 'react-i18next';
import { LayoutGroup } from 'framer-motion';
import HeroCard, { type HeroCardProps, type HeroSize } from './HeroCard';
import PlayerRow, { type PlayerRowProps } from './PlayerRow';
import { rowDensity, nextPlayerId } from './spotlightLayout';

export type SpotPlayer = Omit<HeroCardProps, 'size' | 'fireHost' | 'checkoutRoute' | 'checkoutMax' | 'onRemove' | 'removeLabel' | 'previousRemaining' | 'turnKey' | 'onEditVisit'>;

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
  /** Correct one of the hero's last visits. */
  onEditVisit?: (throwId: string) => void;
  /** The player really at the oche. The hero (`activeIndex`) can still show
   *  the thrower for a moment after a visit (0.34.0); `aria-current` follows this. */
  currentId?: string;
}

/**
 * The scoreboard as a spotlight: the player at the oche is the hero card,
 * everyone else a compact row in match order. Both share layout ids, so when
 * the turn passes the next row grows into the hero and the hero shrinks back
 * into its row — one continuous movement instead of a highlight jumping.
 */
const Spotlight: React.FC<SpotlightProps> = ({
  players, activeIndex, showSets, legsToWin, checkoutRoute, checkoutMax, size, flames,
  rowsFirst = false, rowColumns = 1, onRemove, removeLabel, onEditVisit, currentId,
}) => {
  const { t } = useTranslation();
  // Remaining scores of the previous render: when the turn passes, the card
  // that just threw becomes a new row — it needs the old score to show "−60".
  // State adjusted during render (no ref read during render, no effect).
  const scores = players.map(p => `${p.player.playerId}:${p.remaining}`).join('|');
  // `heroAtChange`: who was the hero when the scores changed. With the relay
  // turn change the visit lands on the thrower's hero card (the stamp), and
  // the row it turns into must not show it a second time.
  const heroId = players[activeIndex]?.player.playerId;
  const [snap, setSnap] = useState<{ key: string; cur: Record<string, number>; prev: Record<string, number>; heroAtChange?: string }>(
    () => ({ key: scores, cur: Object.fromEntries(players.map(p => [p.player.playerId, p.remaining])), prev: {} }),
  );
  if (snap.key !== scores) {
    setSnap({ key: scores, prev: snap.cur, cur: Object.fromEntries(players.map(p => [p.player.playerId, p.remaining])), heroAtChange: heroId });
  }
  const prev = snap.prev;
  const turnKey = heroId;
  // A hero that arrives through a turn change (not the first render) builds
  // its name up, grows its number and pulses once.
  const [heroTrack, setHeroTrack] = useState<{ id?: string; arrived: boolean }>({ id: heroId, arrived: false });
  if (heroTrack.id !== heroId) setHeroTrack({ id: heroId, arrived: heroTrack.id !== undefined });
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
  // Five players and more (0.45.0): tighter rows, on phones two tiles a line,
  // so the whole field stays in view next to the hero and the input.
  const density = rowDensity(players.length, size);
  const nextId = nextPlayerId(players.map(p => p.player.playerId), currentId ?? heroId);

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
      onEditVisit={onEditVisit}
      arrived={heroTrack.arrived}
      isCurrent={currentId === undefined || currentId === hero.player.playerId}
    />
  ) : null;

  const rowList = rows.length > 0 ? (
    <div
      role="list"
      aria-label={t('game.scoreboard')}
      data-density={density}
      className={`grid ${density === 'tile' ? 'gap-1.5' : 'gap-2'} ${density === 'tile' ? 'grid-cols-2' : rowColumns === 2 ? 'sm:grid-cols-2' : ''}`}
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
          previousRemaining={snap.heroAtChange === p.player.playerId ? undefined : prev[p.player.playerId]}
          turnKey={turnKey}
          isCurrent={currentId === p.player.playerId}
          density={density}
          isNext={nextId === p.player.playerId}
        />
      ))}
    </div>
  ) : null;

  return (
    <LayoutGroup id="spotlight">
      {flames && fireHost && createPortal(<FireCanvas />, fireHost)}
      <div className={`flex flex-col ${density === 'tile' ? 'gap-2' : 'gap-3'}`} data-testid="spotlight">
        {rowsFirst ? <>{rowList}{heroCard}</> : <>{heroCard}{rowList}</>}
      </div>
    </LayoutGroup>
  );
};

export default Spotlight;
