import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/audio', () => ({
  default: { announceCheckout: vi.fn(), announceBust: vi.fn(), setEnabled: vi.fn(), setVolume: vi.fn() },
}));

import { gameReducer, initialState } from '../../context/GameContext';
import type { GameState } from '../../context/GameContext';

/** 0.32.0 — EDIT_THROW corrects a booked visit and rebuilds the statistics. */
const players = [{ id: 'a', name: 'Alice', isBot: false }, { id: 'b', name: 'Bob', isBot: false }] as any;
const T20 = { segment: 20, multiplier: 3, score: 60, bed: 'triple' } as const;
const S20 = { segment: 20, multiplier: 1, score: 20, bed: 'single' } as const;

const start = (): GameState => gameReducer(initialState, {
  type: 'START_MATCH',
  payload: { players, settings: { startScore: 501, legsToWin: 1, setsToWin: 1, doubleOut: true }, gameType: 'x01' },
} as any);
const visit = (state: GameState, ...darts: any[]): GameState => {
  let s = state;
  for (const d of darts) s = gameReducer(s, { type: 'ADD_DART', payload: d } as any);
  s = gameReducer(s, { type: 'CONFIRM_THROW' } as any);
  return gameReducer(s, { type: 'NEXT_PLAYER' } as any);
};
const leg = (s: GameState) => s.currentMatch!.legs[s.currentMatch!.currentLegIndex];
const player = (s: GameState, id: string) => s.currentMatch!.players.find(p => p.playerId === id)!;

describe('EDIT_THROW', () => {
  it('a 180 corrected to 60 changes the remaining score, the 180 count and the average', () => {
    let s = start();
    s = visit(s, T20, T20, T20);   // Alice 180
    s = visit(s, S20);             // Bob 20
    s = visit(s, S20, S20, S20);   // Alice 60
    expect(player(s, 'a').match180s).toBe(1);
    const first = leg(s).throws[0];
    s = gameReducer(s, { type: 'EDIT_THROW', payload: { throwId: first.id, darts: [S20, S20, S20] } } as any);
    expect(leg(s).throws.map(t => t.remaining)).toEqual([441, 481, 381]);
    expect(player(s, 'a').match180s).toBe(0);
    expect(player(s, 'a').matchAverage).toBe(60);
    expect(s.currentPlayerIndex).toBe(1); // whose turn it is does not change
  });

  it('a refused correction leaves the state untouched', () => {
    let s = start();
    s = visit(s, S20);
    const before = s;
    s = gameReducer(s, { type: 'EDIT_THROW', payload: { throwId: 'unknown', darts: [S20] } } as any);
    expect(s).toBe(before);
  });
});
