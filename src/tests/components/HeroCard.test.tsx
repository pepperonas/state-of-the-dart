import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '../../i18n/config';

vi.mock('../../context/PlayerContext', () => ({ usePlayer: () => ({ players: [] }) }));

import HeroCard from '../../components/game/HeroCard';
import PlayerRow from '../../components/game/PlayerRow';
import Spotlight, { type SpotPlayer } from '../../components/game/Spotlight';
import type { MatchPlayer } from '../../types/index';

const mp = (id: string, name: string, over: Partial<MatchPlayer> = {}) => ({
  playerId: id, name, legsWon: 0, setsWon: 0, matchAverage: 0,
  match180s: 0, match140Plus: 0, match100Plus: 0, matchHighestScore: 0, ...over,
} as unknown as MatchPlayer);

const hero = (over: Record<string, unknown> = {}) => ({
  player: mp('p', 'Anna'), remaining: 301, rank: null, average: 50, legsWon: 0, setsWon: 0,
  dartsInLeg: 6, visits: [], ...over,
});

describe('HeroCard', () => {
  it('is the current player and shows the place in the leg as a stamp', () => {
    render(<HeroCard {...hero({ rank: 2 })} />);
    const card = screen.getByTestId('player-card-Anna');
    expect(card).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('leg-rank')).toHaveAttribute('data-rank', '2');
    expect(screen.getByTestId('leg-rank')).toHaveTextContent('Platz 2 im Leg');
  });

  it('shows darts thrown in the leg and the last visits, busts named', () => {
    render(<HeroCard {...hero({ visits: [{ score: 60, bust: false }, { score: 0, bust: true }, { score: 140, bust: false }] })} />);
    expect(screen.getByTestId('darts-in-leg')).toHaveTextContent('6');
    const visits = screen.getByTestId('last-visits');
    expect(visits).toHaveTextContent('60');
    expect(visits).toHaveTextContent(/bust/i);
    expect(visits).toHaveTextContent('140');
  });

  it('shows the checkout route only when there is one', () => {
    const { rerender } = render(<HeroCard {...hero()} />);
    expect(screen.queryByTestId('checkout-route')).toBeNull();
    rerender(<HeroCard {...hero({ remaining: 40, checkoutRoute: ['D20'] })} />);
    expect(screen.getByTestId('checkout-route')).toHaveTextContent('D20');
  });

  it('tints the legs tile once a leg is won and says how far from the win', () => {
    render(<HeroCard {...hero({ legsWon: 1, legsToWin: 3 })} />);
    expect(screen.getByTestId('legs-tile')).toHaveAttribute('data-won', 'true');
    expect(screen.getByTestId('legs-to-win')).toHaveTextContent('1/3 zum Sieg');
  });

  it('on a phone the legs are pips in the meta line too', () => {
    render(<HeroCard {...hero({ size: 'compact', legsWon: 2, legsToWin: 3 })} />);
    const pips = within(screen.getByTestId('legs-tile')).getByTestId('legs-pips').children;
    expect([...pips].map(p => p.getAttribute('data-on'))).toEqual(['true', 'true', null]);
    expect(screen.getByTestId('legs-to-win')).toHaveTextContent('2/3 zum Sieg');
  });

  it('springs only when a leg is won during play, not on mount or resume', () => {
    const { rerender } = render(<HeroCard {...hero({ legsWon: 2 })} />);
    expect(screen.getByTestId('legs-tile')).toHaveAttribute('data-pulse', '0');
    rerender(<HeroCard {...hero({ legsWon: 3 })} />);
    expect(screen.getByTestId('legs-tile')).toHaveAttribute('data-pulse', '1');
    expect(screen.getByTestId('legs-tile').className).toContain('sotd-leg-won');
    rerender(<HeroCard {...hero({ legsWon: 2 })} />);
    expect(screen.getByTestId('legs-tile')).toHaveAttribute('data-pulse', '1');
  });
});

describe('PlayerRow', () => {
  it('is a compact line with the place colouring a stripe, not the current player', () => {
    render(<PlayerRow player={mp('b', 'Ben')} remaining={441} rank={1} average={60} legsWon={1} setsWon={0} legsToWin={3} />);
    const row = screen.getByTestId('player-card-Ben');
    expect(row).not.toHaveAttribute('aria-current');
    expect(row.style.getPropertyValue('--rank-color')).toBe('var(--m3-rank-1)');
    expect(row).toHaveTextContent('441');
    // Legs as pips like the hero card's tile: three strokes, one filled.
    const pips = within(screen.getByTestId('row-legs')).getByTestId('legs-pips').children;
    expect(pips).toHaveLength(3);
    expect([...pips].filter(p => p.getAttribute('data-on') === 'true')).toHaveLength(1);
    expect(row).toHaveTextContent('1 von 3 Legs zum Sieg');
  });

  it('a long match shows "/ N" instead of pips, sets when played', () => {
    render(<PlayerRow player={mp('b', 'Ben')} remaining={441} rank={null} average={60} legsWon={4} setsWon={2} showSets legsToWin={11} />);
    expect(screen.queryByTestId('legs-pips')).toBeNull();
    expect(screen.getByTestId('row-legs')).toHaveTextContent('4/ 11 L');
    expect(screen.getByTestId('row-sets')).toHaveTextContent('2 S');
  });
});

describe('Spotlight', () => {
  const players: SpotPlayer[] = [
    { player: mp('a', 'Ann'), remaining: 441, rank: 1, average: 60, legsWon: 0, setsWon: 0, dartsInLeg: 3, visits: [] },
    { player: mp('b', 'Ben'), remaining: 501, rank: 2, average: 0, legsWon: 0, setsWon: 0, dartsInLeg: 0, visits: [] },
    { player: mp('c', 'Cid'), remaining: 501, rank: 2, average: 0, legsWon: 0, setsWon: 0, dartsInLeg: 0, visits: [] },
  ];

  it('the player at the oche is the hero, everyone else a row in match order', () => {
    render(<Spotlight players={players} activeIndex={1} showSets={false} size="regular" flames={false} />);
    expect(screen.getByTestId('player-card-Ben')).toHaveAttribute('data-hero', 'true');
    const list = screen.getByRole('list');
    const rows = within(list).getAllByRole('listitem').map(r => r.getAttribute('data-testid'));
    expect(rows).toEqual(['player-card-Ann', 'player-card-Cid']);
  });

  it('passing the turn swaps the hero', () => {
    const { rerender } = render(<Spotlight players={players} activeIndex={0} showSets={false} size="regular" flames={false} />);
    expect(screen.getByTestId('player-card-Ann')).toHaveAttribute('data-hero', 'true');
    rerender(<Spotlight players={players} activeIndex={2} showSets={false} size="regular" flames={false} />);
    expect(screen.getByTestId('player-card-Cid')).toHaveAttribute('data-hero', 'true');
    expect(screen.getByTestId('player-card-Ann')).not.toHaveAttribute('data-hero');
  });

  it('phones put the rows above the hero (closest to the input dock)', () => {
    render(<Spotlight players={players} activeIndex={0} showSets={false} size="compact" flames={false} rowsFirst />);
    const spot = screen.getByTestId('spotlight');
    expect(spot.firstElementChild?.getAttribute('role')).toBe('list');
  });
});
