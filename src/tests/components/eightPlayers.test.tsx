import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '../../i18n/config';

vi.mock('../../context/PlayerContext', () => ({ usePlayer: () => ({ players: [] }) }));

import Spotlight, { type SpotPlayer } from '../../components/game/Spotlight';
import ThrowOrderBadge from '../../components/game/ThrowOrderBadge';
import { rowDensity, nextPlayerId, DENSE_FROM } from '../../components/game/spotlightLayout';
import type { HeroSize } from '../../components/game/HeroCard';
import type { MatchPlayer } from '../../types/index';

/** 0.45.0 — up to eight players in a quick match, readable at every size. */
const NAMES = ['Ann', 'Ben', 'Cid', 'Dee', 'Eva', 'Fin', 'Gus', 'Hal'];
const mp = (id: string, name: string) =>
  ({ playerId: id, name, legsWon: 0, setsWon: 0, matchAverage: 0 } as unknown as MatchPlayer);
const field = (n: number): SpotPlayer[] => NAMES.slice(0, n).map((name, i) => ({
  player: mp(name.toLowerCase(), name), remaining: 501 - i, rank: null, average: 0, legsWon: 0, setsWon: 0, dartsInLeg: 0, visits: [],
}));
const spot = (n: number, activeIndex: number, size: HeroSize, currentId?: string) =>
  <Spotlight players={field(n)} activeIndex={activeIndex} currentId={currentId} showSets={false} size={size} flames={false} legsToWin={3} onRemove={() => {}} />;

describe('rowDensity', () => {
  it('roomy up to four players, tighter from five, tiles on a phone', () => {
    expect(DENSE_FROM).toBe(5);
    expect(rowDensity(4, 'compact')).toBe('regular');
    expect(rowDensity(4, 'regular')).toBe('regular');
    expect(rowDensity(5, 'compact')).toBe('tile');
    expect(rowDensity(8, 'compact')).toBe('tile');
    expect(rowDensity(5, 'regular')).toBe('dense');
    expect(rowDensity(8, 'large')).toBe('dense');
  });
});

describe('nextPlayerId', () => {
  const ids = ['a', 'b', 'c', 'd'];
  it('is the player after the current one, wrapping at the end', () => {
    expect(nextPlayerId(ids, 'a')).toBe('b');
    expect(nextPlayerId(ids, 'd')).toBe('a');
  });
  it('is nobody with two players, without a current player or an unknown one', () => {
    expect(nextPlayerId(['a', 'b'], 'a')).toBeUndefined();
    expect(nextPlayerId(ids, undefined)).toBeUndefined();
    expect(nextPlayerId(ids, 'x')).toBeUndefined();
  });
});

describe('Spotlight with eight players', () => {
  it('phone: seven tiles in two columns, no remove button on a tile, the hero keeps it', () => {
    render(spot(8, 0, 'compact', 'ann'));
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('data-density', 'tile');
    expect(list.className).toMatch(/(^|\s)grid-cols-2(\s|$)/);
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(7);
    for (const r of rows) {
      expect(r).toHaveAttribute('data-density', 'tile');
      expect(within(r).queryByRole('button')).toBeNull();
    }
    expect(within(screen.getByTestId('player-card-Ann')).getByRole('button', { name: /entfernen/i })).toBeInTheDocument();
  });

  it('marks the player who throws next — and only that one — for eyes and screen readers', () => {
    render(spot(8, 2, 'compact', 'cid'));
    const next = screen.getByTestId('player-card-Dee');
    expect(next).toHaveAttribute('data-next', 'true');
    expect(within(next).getByTestId('row-next')).toHaveTextContent('Nächster');
    expect(next).toHaveTextContent('wirft als Nächstes');
    expect(document.querySelectorAll('[data-next="true"]')).toHaveLength(1);
  });

  it('the next marker wraps from the last player to the first', () => {
    render(spot(8, 7, 'regular', 'hal'));
    expect(screen.getByTestId('player-card-Ann')).toHaveAttribute('data-next', 'true');
  });

  it('follows the real player at the oche while the hero still shows the thrower', () => {
    render(spot(8, 0, 'compact', 'ben'));
    expect(screen.getByTestId('player-card-Cid')).toHaveAttribute('data-next', 'true');
    expect(screen.getByTestId('player-card-Ben')).not.toHaveAttribute('data-next');
  });

  it('desktop: dense rows keep their remove button', () => {
    render(spot(8, 0, 'regular', 'ann'));
    const list = screen.getByRole('list');
    expect(list).toHaveAttribute('data-density', 'dense');
    expect(within(screen.getByTestId('player-card-Ben')).getByRole('button')).toBeInTheDocument();
  });

  it('four players stay roomy, two players show no next marker', () => {
    const { unmount } = render(spot(4, 0, 'compact', 'ann'));
    expect(screen.getByRole('list')).toHaveAttribute('data-density', 'regular');
    unmount();
    render(spot(2, 0, 'compact', 'ann'));
    expect(document.querySelectorAll('[data-next="true"]')).toHaveLength(0);
  });
});

describe('ThrowOrderBadge', () => {
  it('shows the place in the throwing order, nothing when not selected', () => {
    const { rerender } = render(<ThrowOrderBadge index={2} />);
    expect(screen.getByTestId('throw-order')).toHaveTextContent('3');
    expect(screen.getByTestId('throw-order')).toHaveTextContent('Platz 3 in der Wurfreihenfolge');
    rerender(<ThrowOrderBadge index={-1} />);
    expect(screen.queryByTestId('throw-order')).toBeNull();
  });
});
