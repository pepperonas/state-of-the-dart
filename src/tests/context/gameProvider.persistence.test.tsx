import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';

vi.mock('../../utils/audio', () => ({
  default: { announceCheckout: vi.fn(), announceBust: vi.fn(), setEnabled: vi.fn(), setVolume: vi.fn() },
}));

const create = vi.fn().mockResolvedValue({});
const update = vi.fn().mockResolvedValue({});
vi.mock('../../services/api', () => ({
  api: { matches: { create: (...a: unknown[]) => create(...a), update: (...a: unknown[]) => update(...a) } },
}));

const baseStats = {
  gamesPlayed: 10, gamesWon: 4, totalLegsPlayed: 30, totalLegsWon: 12, highestCheckout: 100,
  total180s: 2, total171Plus: 0, total140Plus: 5, total100Plus: 20, total60Plus: 40,
  bestAverage: 60, averageOverall: 50, checkoutPercentage: 30, totalCheckoutAttempts: 40, totalCheckoutHits: 12,
};
const players = [
  { id: 'a', name: 'Alice', isBot: false, stats: baseStats },
  { id: 'b', name: 'Bob', isBot: false, stats: baseStats },
];
const updatePlayer = vi.fn().mockResolvedValue(undefined);
vi.mock('../../context/PlayerContext', () => ({
  usePlayer: () => ({ players, updatePlayer, updatePlayerHeatmap: vi.fn() }),
}));
let authUser: { id: string } | null = { id: 'u1' };
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: authUser }),
}));
vi.mock('../../context/TenantContext', () => ({
  useTenant: () => ({ storage: { get: () => undefined, set: () => {} } }),
}));

import { GameProvider, useGame } from '../../context/GameContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let game: any;
const Grab = () => { game = useGame(); return null; };
const D1 = { segment: 1, multiplier: 2, score: 2, bed: 'double' };

const mount = () => render(<GameProvider><Grab /></GameProvider>);
const act_ = (action: Record<string, unknown>) => act(() => { game.dispatch(action); });
const startAndWin = () => {
  act_({
    type: 'START_MATCH',
    payload: {
      players,
      settings: { startScore: 2, legsToWin: 1, setsToWin: 1, doubleOut: true, doubleIn: false },
      gameType: 'x01',
    },
  });
  act_({ type: 'ADD_DART', payload: D1 });
  act_({ type: 'CONFIRM_THROW' });
};
/** Final-stat updates carry gamesPlayed; live updates do not change it. */
const countingCalls = () =>
  updatePlayer.mock.calls.filter(([, u]) => u.stats.gamesPlayed !== baseStats.gamesPlayed);

beforeEach(() => {
  authUser = { id: 'u1' };
  localStorage.clear();
  create.mockClear(); update.mockClear(); updatePlayer.mockClear();
});

describe('GameProvider — finishing a match', () => {
  it('saves the finished match with its winner', async () => {
    mount();
    startAndWin();
    await act(async () => {});
    const saved = [...create.mock.calls, ...update.mock.calls].map(c => c[c.length === 2 && typeof c[0] === 'string' ? 1 : 0]);
    const final = saved.find(m => m.status === 'completed');
    expect(final).toMatchObject({ winner: 'a', status: 'completed' });
    expect(typeof final.completedAt).toBe('number');
  });

  it('counts the match in the career stats exactly once per player', () => {
    mount();
    startAndWin();
    expect(countingCalls()).toHaveLength(2);
    expect(countingCalls()[0][1].stats.gamesPlayed).toBe(11);
  });

  it('end → undo → end counts the match once, and the undo restores the totals', () => {
    mount();
    startAndWin();
    act_({ type: 'UNDO_END_MATCH' });
    // The rollback writes the totals from before the match.
    const rollback = updatePlayer.mock.calls.slice(-2).map(c => c[1].stats.gamesPlayed);
    expect(rollback).toEqual([10, 10]);

    updatePlayer.mockClear();
    act_({ type: 'CONFIRM_THROW' }); // the checkout darts are back in the input
    expect(countingCalls()).toHaveLength(2);
  });

  it('an abandoned match is not a played game', () => {
    mount();
    act_({
      type: 'START_MATCH',
      payload: { players, settings: { startScore: 501, legsToWin: 1, setsToWin: 1 }, gameType: 'x01' },
    });
    act_({ type: 'END_MATCH' });
    expect(countingCalls()).toHaveLength(0);
  });
});

describe('GameProvider — changing account', () => {
  it('drops the running match when another account signs in', () => {
    const view = mount();
    act_({
      type: 'START_MATCH',
      payload: { players, settings: { startScore: 501, legsToWin: 1, setsToWin: 1 }, gameType: 'x01' },
    });
    expect(game.state.currentMatch).not.toBeNull();
    authUser = { id: 'u2' };
    view.rerender(<GameProvider><Grab /></GameProvider>);
    expect(game.state.currentMatch).toBeNull();
  });
});
