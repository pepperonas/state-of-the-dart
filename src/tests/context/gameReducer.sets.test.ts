import { describe, it, expect, vi } from 'vitest';

// The reducer calls audioSystem.announceCheckout on a leg/set/match win — mock the
// whole audio module so the test doesn't touch the (jsdom-less) audio pipeline.
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

// Start a match where each leg is worth a single checkout (startScore 2 → a
// double-1 finishes it) and a set is won with a single leg. That makes the
// set/match transition reachable with one confirmed throw.
const startMatch = (setsToWin: number): GameState =>
  gameReducer(initialState, {
    type: 'START_MATCH',
    payload: {
      players,
      settings: { startScore: 2, legsToWin: 1, setsToWin, doubleOut: false, doubleIn: false },
      gameType: 'x01',
    },
  } as any);

// Alice throws a double-1 (= 2) and confirms → checks out from 2.
const checkout = (state: GameState): GameState => {
  const withDart = gameReducer(state, {
    type: 'ADD_DART',
    payload: { segment: 1, multiplier: 2, score: 2, bed: 'double' },
  } as any);
  return gameReducer(withDart, { type: 'CONFIRM_THROW' } as any);
};

describe('gameReducer — sets', () => {
  it('winning a set in a multi-set match advances setsWon and starts a new set instead of ending the match', () => {
    const after = checkout(startMatch(2));
    const alice = after.currentMatch!.players.find(p => p.playerId === 'a')!;

    expect(alice.setsWon).toBe(1); // set counted
    expect(alice.legsWon).toBe(0); // legs reset for the new set
    expect(after.currentMatch!.status).toBe('in-progress'); // match NOT over after one set
    expect(after.currentMatch!.currentSetIndex).toBe(1); // advanced into set 2
    expect(after.currentMatch!.legs.length).toBe(2); // a fresh leg was opened
  });

  it('single-set match still completes when the deciding leg is won (regression)', () => {
    const after = checkout(startMatch(1));
    const alice = after.currentMatch!.players.find(p => p.playerId === 'a')!;

    expect(after.currentMatch!.status).toBe('completed');
    expect(after.currentMatch!.winner).toBe('a');
    expect(alice.setsWon).toBe(0); // single-set matches never count sets
  });
});
