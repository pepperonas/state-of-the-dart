import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '../../i18n/config';
import OnlineGamePanel, { type OnlineRoomView } from '../../components/game/OnlineGamePanel';

const room = (over: Partial<OnlineRoomView> = {}): OnlineRoomView => ({
  host: 'me',
  players: [{ id: 'me', name: 'Anna' }, { id: 'op', name: 'Ben', connected: false }],
  settings: { startScore: 301, legsToWin: 2, doubleOut: true },
  status: 'playing',
  gameState: { currentPlayerIndex: 0, scores: { me: 121, op: 301 }, legs: { me: 0, op: 1 } },
  ...over,
});

const renderPanel = (r = room(), onThrow = vi.fn()) =>
  render(<OnlineGamePanel room={r} myId="me" visits={[]} winnerId={null} onThrow={onThrow} onRematch={vi.fn()} onLeave={vi.fn()} />);

describe('OnlineGamePanel', () => {
  it('lets the player at the oche type a score and enter it with the keyboard', async () => {
    const onThrow = vi.fn();
    renderPanel(room(), onThrow);
    expect(screen.getByRole('heading', { name: 'Du bist dran' })).toBeInTheDocument();
    await userEvent.keyboard('60{Enter}');
    expect(onThrow).toHaveBeenCalledWith(60, false);
  });

  it('refuses an impossible total with a reason instead of sending it', async () => {
    const onThrow = vi.fn();
    renderPanel(room(), onThrow);
    await userEvent.keyboard('179{Enter}');
    expect(onThrow).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('179');
  });

  it('offers the checkout of the remaining score and sends it as a checkout', async () => {
    const onThrow = vi.fn();
    renderPanel(room(), onThrow);
    await userEvent.click(screen.getByRole('button', { name: 'Check-out 121' }));
    expect(onThrow).toHaveBeenCalledWith(121, true);
  });

  it('shows whose turn it is and ignores keys when it is not yours', async () => {
    const onThrow = vi.fn();
    renderPanel(room({ gameState: { currentPlayerIndex: 1, scores: { me: 121, op: 301 }, legs: { me: 0, op: 1 } } }), onThrow);
    expect(screen.getByText('Ben ist dran')).toBeInTheDocument();
    await userEvent.keyboard('60{Enter}');
    expect(onThrow).not.toHaveBeenCalled();
  });

  it('marks a player whose connection dropped', () => {
    renderPanel();
    expect(screen.getByText(/Platz wird gehalten/)).toBeInTheDocument();
  });

  it('only the host sees the rematch button', () => {
    const finished = room({ status: 'finished' });
    const { unmount } = render(<OnlineGamePanel room={finished} myId="me" visits={[]} winnerId="op" onThrow={vi.fn()} onRematch={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /Ben gewinnt das Match/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revanche' })).toBeInTheDocument();
    unmount();
    render(<OnlineGamePanel room={finished} myId="op" visits={[]} winnerId="op" onThrow={vi.fn()} onRematch={vi.fn()} onLeave={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Revanche' })).toBeNull();
  });
});
