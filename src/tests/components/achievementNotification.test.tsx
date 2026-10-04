import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '../../i18n/config';
import { ACHIEVEMENTS } from '../../types/achievements';
import { setCelebrationMoment } from '../../utils/celebrationMoment';

const dismissNotification = vi.fn();
const dismissAllNotifications = vi.fn();
let queue: unknown[] = [];
let current: unknown = null;

vi.mock('../../context/AchievementContext', () => ({
  useAchievements: () => ({ currentNotification: current, notificationQueue: queue, dismissNotification, dismissAllNotifications }),
}));
vi.mock('../../context/PlayerContext', () => ({ usePlayer: () => ({ getPlayer: () => ({ name: 'Anna' }) }) }));
vi.mock('../../utils/celebration', () => ({ celebrate: vi.fn() }));
vi.mock('../../utils/audio', () => ({ audioSystem: { playAchievementSound: vi.fn() } }));

import AchievementNotification from '../../components/achievements/AchievementNotification';

const note = (i: number) => ({ achievement: ACHIEVEMENTS[i], playerId: 'p', unlockedCount: 3, timestamp: new Date() });

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <button type="button">outside</button>
      <AchievementNotification />
    </MemoryRouter>,
  );

describe('AchievementNotification', () => {
  beforeEach(() => {
    current = note(0);
    queue = [note(1)];
    dismissNotification.mockClear();
    dismissAllNotifications.mockClear();
  });
  afterEach(() => act(() => setCelebrationMoment(false)));

  it('during a game a tap outside closes the notifications', () => {
    renderAt('/game');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'outside' }));
    expect(dismissAllNotifications).toHaveBeenCalledTimes(1);
  });

  it('a tap on a card itself does not count as outside', () => {
    renderAt('/game');
    fireEvent.pointerDown(screen.getAllByTestId('achievement-card')[0]);
    expect(dismissAllNotifications).not.toHaveBeenCalled();
  });

  it('outside a game a tap elsewhere leaves them open', () => {
    renderAt('/stats');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'outside' }));
    expect(dismissAllNotifications).not.toHaveBeenCalled();
  });

  it('at the end of a leg they sit centred, do not close on an outside tap and offer "Weiter"', () => {
    act(() => setCelebrationMoment(true));
    renderAt('/game');
    expect(screen.getByTestId('achievement-stage')).toHaveAttribute('data-placement', 'center');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'outside' }));
    fireEvent.pointerDown(screen.getByTestId('achievement-scrim'));
    expect(dismissAllNotifications).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(dismissAllNotifications).toHaveBeenCalledTimes(1);
  });

  it('stay centred after the leg animation ends, until they are closed', () => {
    act(() => setCelebrationMoment(true));
    renderAt('/game');
    act(() => setCelebrationMoment(false));
    expect(screen.getByTestId('achievement-stage')).toHaveAttribute('data-placement', 'center');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'outside' }));
    expect(dismissAllNotifications).not.toHaveBeenCalled();
  });

  it('sit at the top during play', () => {
    renderAt('/game');
    expect(screen.getByTestId('achievement-stage')).toHaveAttribute('data-placement', 'top');
    expect(screen.queryByTestId('achievement-scrim')).toBeNull();
  });
});
