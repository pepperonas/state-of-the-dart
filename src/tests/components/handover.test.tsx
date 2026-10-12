import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '../../i18n/config';

vi.mock('../../context/PlayerContext', () => ({ usePlayer: () => ({ players: [] }) }));

import Spotlight, { type SpotPlayer } from '../../components/game/Spotlight';
import NameReveal from '../../components/game/NameReveal';
import ScoreDelta from '../../components/game/ScoreDelta';
import type { MatchPlayer } from '../../types/index';

/** 0.34.0 — the relay turn change. */
const mp = (id: string, name: string) =>
  ({ playerId: id, name, legsWon: 0, setsWon: 0, matchAverage: 0 } as unknown as MatchPlayer);
const players = (annRest = 501): SpotPlayer[] => [
  { player: mp('a', 'Ann'), remaining: annRest, rank: null, average: 0, legsWon: 0, setsWon: 0, dartsInLeg: 0, visits: [] },
  { player: mp('b', 'Ben'), remaining: 501, rank: null, average: 0, legsWon: 0, setsWon: 0, dartsInLeg: 0, visits: [] },
];
const spot = (p: SpotPlayer[], activeIndex: number, currentId?: string) =>
  <Spotlight players={p} activeIndex={activeIndex} currentId={currentId} showSets={false} size="regular" flames={false} />;

describe('Spotlight — relay turn change', () => {
  it('aria-current follows the player at the oche while the hero still shows the thrower', () => {
    render(spot(players(441), 0, 'b'));
    expect(screen.getByTestId('player-card-Ann')).toHaveAttribute('data-hero', 'true');
    expect(screen.getByTestId('player-card-Ann')).not.toHaveAttribute('aria-current');
    expect(screen.getByTestId('player-card-Ben')).toHaveAttribute('aria-current', 'true');
  });

  it('the visit lands as a stamp on the hero, and the row it becomes does not repeat it', () => {
    const { rerender } = render(spot(players(501), 0, 'a'));
    rerender(spot(players(441), 0, 'b'));          // visit booked, hero still Ann
    const stamp = screen.getByTestId('score-delta');
    expect(stamp).toHaveAttribute('data-variant', 'stamp');
    expect(stamp).toHaveTextContent('60');
    rerender(spot(players(441), 1, 'b'));          // hand-over
    expect(screen.getByTestId('player-card-Ann').querySelector('[data-testid="score-delta"]')).toBeNull();
  });

  it('only a hero that arrives through a turn change plays the arrival', () => {
    const { rerender } = render(spot(players(), 0, 'a'));
    expect(screen.getByTestId('player-card-Ann')).not.toHaveAttribute('data-arrived');
    rerender(spot(players(), 1, 'b'));
    expect(screen.getByTestId('player-card-Ben')).toHaveAttribute('data-arrived', 'true');
    expect(screen.getByTestId('turn-ring')).toBeInTheDocument();
    expect(screen.getByTestId('name-reveal')).toBeInTheDocument();
  });
});

describe('NameReveal', () => {
  it('without play it is just the name', () => {
    render(<h3><NameReveal name="Anna" play={false} /></h3>);
    expect(screen.queryByTestId('name-reveal')).toBeNull();
    expect(screen.getByRole('heading')).toHaveTextContent(/^Anna$/);
  });

  it('builds the name letter by letter, the full name for screen readers, plain text afterwards', async () => {
    const { container } = render(<h3><NameReveal name="Ben" play delay={0} /></h3>);
    const reveal = screen.getByTestId('name-reveal');
    expect(reveal.querySelector('.sr-only')).toHaveTextContent('Ben');
    const letters = reveal.querySelectorAll('[aria-hidden="true"] > span');
    expect(letters).toHaveLength(3);
    await waitFor(() => expect(screen.queryByTestId('name-reveal')).toBeNull(), { timeout: 3000 });
    expect(container.querySelector('h3')).toHaveTextContent(/^Ben$/);
  });
});

describe('ScoreDelta stamp', () => {
  it('a drop shows as a pill stamp; a rise (undo) shows nothing', () => {
    const { rerender } = render(<div><ScoreDelta variant="stamp" value={501} /></div>);
    rerender(<div><ScoreDelta variant="stamp" value={441} /></div>);
    expect(screen.getByTestId('score-delta')).toHaveAttribute('data-variant', 'stamp');
    expect(screen.getByTestId('score-delta').className).toContain('bg-primary-container');
    rerender(<div><ScoreDelta variant="stamp" value={501} /></div>);
    expect(screen.queryByText('−-60')).toBeNull();
  });
});
