import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, within, waitFor } from '@testing-library/react';
import '../../i18n/config';

vi.mock('../../utils/celebration', () => ({ burst: vi.fn() }));

import ScoreboardScreen from '../../components/game/ScoreboardScreen';
import { burst } from '../../utils/celebration';
import { SCOREBOARD_KEY, type ScoreboardSnapshot, type ScoreboardPlayer } from '../../utils/scoreboard';
import { isGameRoute } from '../../utils/gameRoutes';

const player = (id: string, name: string, over: Partial<ScoreboardPlayer> = {}): ScoreboardPlayer => ({
  id, name, remaining: 501, rank: null, average: 0, legsWon: 0, setsWon: 0, dartsInLeg: 0, visits: [], ...over,
});
const snap = (over: Partial<ScoreboardSnapshot> = {}): ScoreboardSnapshot => ({
  v: 1, matchId: 'm1', updatedAt: 10, startScore: 501, status: 'in-progress',
  players: [player('a', 'Anna'), player('b', 'Bert')], activeIndex: 0, legsToWin: 3,
  showSets: false, setsToWin: 1, rules: 'DO', checkoutRoute: null, throwTotal: 0, throwDarts: 0,
  winnerName: null, ...over,
});
const send = (s: ScoreboardSnapshot) => act(() => {
  window.dispatchEvent(new StorageEvent('storage', { key: SCOREBOARD_KEY, newValue: JSON.stringify(s) }));
});

describe('ScoreboardScreen', () => {
  beforeEach(() => { localStorage.clear(); vi.mocked(burst).mockClear(); });

  it('waits when no match has been published on this device', () => {
    render(<ScoreboardScreen />);
    expect(screen.getByTestId('scoreboard-waiting')).toBeInTheDocument();
  });

  it('shows the stored match at once and follows live updates', async () => {
    localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(snap()));
    render(<ScoreboardScreen />);
    expect(screen.getByTestId('scoreboard-active-name')).toHaveTextContent('Anna');
    expect(screen.getByTestId('scoreboard-format')).toHaveTextContent('501 · 3 Legs zum Sieg · DO');

    send(snap({
      updatedAt: 11, activeIndex: 1,
      players: [player('a', 'Anna', { remaining: 321, dartsInLeg: 3, visits: [{ score: 180, bust: false }] }), player('b', 'Bert')],
    }));
    expect(screen.getByTestId('scoreboard-active-name')).toHaveTextContent('Bert');
    // The score tallies to its new value (spring), so wait for it.
    await waitFor(() => expect(screen.getByTestId('scoreboard-row-Anna')).toHaveTextContent('321'), { timeout: 3000 });
    expect(screen.getByTestId('scoreboard-row-Bert')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByTestId('scoreboard-moment')).toHaveAttribute('data-kind', '180');
    expect(burst).toHaveBeenCalledWith('hero');
  });

  it('ignores a snapshot older than the one shown', () => {
    localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(snap({ updatedAt: 20 })));
    render(<ScoreboardScreen />);
    send(snap({ updatedAt: 19, activeIndex: 1 }));
    expect(screen.getByTestId('scoreboard-active-name')).toHaveTextContent('Anna');
  });

  it('shows the live visit and the checkout route', () => {
    localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(snap({
      throwTotal: 60, throwDarts: 1, checkoutRoute: ['T20', 'D20'],
      players: [player('a', 'Anna', { remaining: 100 }), player('b', 'Bert')],
    })));
    render(<ScoreboardScreen />);
    expect(screen.getByTestId('scoreboard-visit')).toHaveTextContent('60');
    const route = screen.getByTestId('scoreboard-checkout');
    expect(within(route).getByText('T20')).toBeInTheDocument();
    expect(within(route).getByText('D20')).toBeInTheDocument();
  });

  it('a finished match puts the winner on stage', () => {
    localStorage.setItem(SCOREBOARD_KEY, JSON.stringify(snap()));
    render(<ScoreboardScreen />);
    send(snap({ updatedAt: 11, status: 'completed', winnerName: 'Anna' }));
    expect(screen.getByTestId('scoreboard-winner')).toHaveTextContent('Anna gewinnt das Match');
    expect(burst).toHaveBeenCalledWith('match');
  });

  it('counts as a game screen (no navigation, screen kept awake)', () => {
    expect(isGameRoute('/scoreboard')).toBe(true);
  });
});
