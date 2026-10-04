import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '../../i18n/config';

vi.mock('../../context/PlayerContext', () => ({ usePlayer: () => ({ players: [] }) }));

import PlayerScore from '../../components/game/PlayerScore';
import type { MatchPlayer } from '../../types/index';

const player = {
  playerId: 'p', name: 'Anna', legsWon: 0, setsWon: 0, matchAverage: 0,
  match180s: 0, match140Plus: 0, match100Plus: 0, matchHighestScore: 0,
} as unknown as MatchPlayer;

const props = (over: Record<string, unknown> = {}) => ({
  player, remaining: 301, isActive: false, isLegLeader: false, average: 50, legsWon: 0, setsWon: 0, ...over,
});

describe('PlayerScore', () => {
  it('the glowing board marks the leg leader, not the player at the oche', () => {
    const { rerender } = render(<PlayerScore {...props({ isActive: true })} />);
    expect(screen.queryByTestId('leg-leader')).toBeNull();
    rerender(<PlayerScore {...props({ isLegLeader: true })} />);
    expect(screen.getByRole('img', { name: 'Führt im Leg' })).toBeInTheDocument();
  });

  it('tints the legs tile once a leg is won', () => {
    const { rerender } = render(<PlayerScore {...props()} />);
    expect(screen.getByTestId('legs-tile')).not.toHaveAttribute('data-won');
    rerender(<PlayerScore {...props({ legsWon: 1 })} />);
    expect(screen.getByTestId('legs-tile')).toHaveAttribute('data-won', 'true');
  });

  it('springs only when a leg is won during play, not on mount or resume', () => {
    const { rerender } = render(<PlayerScore {...props({ legsWon: 2 })} />);
    expect(screen.getByTestId('legs-tile')).toHaveAttribute('data-pulse', '0');
    expect(screen.getByTestId('legs-tile').className).not.toContain('sotd-leg-won');
    rerender(<PlayerScore {...props({ legsWon: 3 })} />);
    expect(screen.getByTestId('legs-tile')).toHaveAttribute('data-pulse', '1');
    expect(screen.getByTestId('legs-tile').className).toContain('sotd-leg-won');
    // An undo back to 2 does not celebrate.
    rerender(<PlayerScore {...props({ legsWon: 2 })} />);
    expect(screen.getByTestId('legs-tile')).toHaveAttribute('data-pulse', '1');
  });
});
