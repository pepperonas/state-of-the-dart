import React from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGroup } from 'framer-motion';
import HeroCard, { type HeroCardProps, type HeroSize } from './HeroCard';
import PlayerRow, { type PlayerRowProps } from './PlayerRow';

export type SpotPlayer = Omit<HeroCardProps, 'size' | 'flames' | 'checkoutRoute' | 'checkoutMax' | 'onRemove' | 'removeLabel'>;

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
      flames={flames}
      onRemove={onRemove}
      removeLabel={removeLabel}
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
        />
      ))}
    </div>
  ) : null;

  return (
    <LayoutGroup id="spotlight">
      <div className="flex flex-col gap-3" data-testid="spotlight">
        {rowsFirst ? <>{rowList}{heroCard}</> : <>{heroCard}{rowList}</>}
      </div>
    </LayoutGroup>
  );
};

export default Spotlight;
