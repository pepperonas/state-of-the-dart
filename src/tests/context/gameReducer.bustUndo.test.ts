import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/audio', () => ({
  default: {
    announceCheckout: vi.fn(),
    announceBust: vi.fn(),
    setEnabled: vi.fn(),
    setVolume: vi.fn(),
  },
}));

import { gameReducer, initialState } from '../../context/GameContext';
import type { GameState } from '../../context/GameContext';

const players = [
  { id: 'a', name: 'Alice', isBot: false },
  { id: 'b', name: 'Bob', isBot: false },
] as any;

const D1 = { segment: 1, multiplier: 2, score: 2, bed: 'double' } as const;
const MISS = { segment: 0, multiplier: 0, score: 0, bed: 'miss' } as const;
const T20 = { segment: 20, multiplier: 3, score: 60, bed: 'triple' } as const;
const D16 = { segment: 16, multiplier: 2, score: 32, bed: 'double' } as const;

const start = (settings: Record<string, unknown>): GameState =>
  gameReducer(initialState, {
    type: 'START_MATCH',
    payload: {
      players,
      settings: { startScore: 2, legsToWin: 1, setsToWin: 1, doubleOut: false, doubleIn: false, ...settings },
      gameType: 'x01',
    },
  } as any);

const visit = (state: GameState, ...darts: any[]): GameState => {
  let s = state;
  for (const d of darts) s = gameReducer(s, { type: 'ADD_DART', payload: d } as any);
  return gameReducer(s, { type: 'CONFIRM_THROW' } as any);
};
const next = (s: GameState) => gameReducer(s, { type: 'NEXT_PLAYER' } as any);
const undo = (s: GameState) => gameReducer(s, { type: 'UNDO_THROW' } as any);
const player = (s: GameState, id: string) => s.currentMatch!.players.find(p => p.playerId === id)!;


const remaining = (s: GameState, id: string) => {
  const leg = s.currentMatch!.legs[s.currentMatch!.currentLegIndex];
  const mine = leg.throws.filter((t: any) => t.playerId === id);
  return mine.length ? mine[mine.length - 1].remaining : s.currentMatch!.settings.startScore;
};
describe('bug report 21.02.: undo around a bust, legs counted once', () => {
  it('bust, undo, bust again, undo — the remaining score is always right', () => {
    let s = start({ startScore: 100, doubleOut: true, legsToWin: 2 });
    s = visit(s, T20); s = next(s);                    // Alice 40
    s = visit(s, T20); s = next(s);                    // Bob 40
    s = visit(s, T20); s = next(s);                    // Alice busts (60 > 40) → 40
    expect(remaining(s, 'a')).toBe(40);
    s = undo(s);                                        // undo Alice's bust
    expect(remaining(s, 'a')).toBe(40);
    s = gameReducer(s, { type: 'CLEAR_THROW' } as any);
    s = visit(s, D16); s = next(s);                    // Alice 8
    expect(remaining(s, 'a')).toBe(8);
    s = visit(s, T20); s = next(s);                    // Bob busts → 40
    s = visit(s, T20); s = next(s);                    // Alice busts → 8
    expect(remaining(s, 'a')).toBe(8);
    s = undo(s); s = gameReducer(s, { type: 'CLEAR_THROW' } as any);
    s = undo(s); s = gameReducer(s, { type: 'CLEAR_THROW' } as any); // Bob's bust gone too
    expect(remaining(s, 'b')).toBe(40);
    expect(remaining(s, 'a')).toBe(8);
    expect(s.currentMatch!.players[s.currentPlayerIndex].playerId).toBe('b');
    s = visit(s, MISS); s = next(s);                   // Bob misses
    // checkout after the undos counts one leg, exactly once
    s = visit(s, { segment: 4, multiplier: 2, score: 8, bed: 'double' });
    expect(player(s, 'a').legsWon).toBe(1);
    s = undo(s); s = gameReducer(s, { type: 'CLEAR_THROW' } as any);
    expect(player(s, 'a').legsWon).toBe(0);
    s = visit(s, { segment: 4, multiplier: 2, score: 8, bed: 'double' });
    expect(player(s, 'a').legsWon).toBe(1);
  });
});
