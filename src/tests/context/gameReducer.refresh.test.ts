import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/audio', () => ({
  default: { announceCheckout: vi.fn(), announceBust: vi.fn(), setEnabled: vi.fn(), setVolume: vi.fn() },
}));

import { gameReducer, initialState } from '../../context/GameContext';
import { sanitizeRestoredThrow } from '../../utils/restoredThrow';
import type { GameState } from '../../context/GameContext';

/**
 * A browser refresh must not lose the darts already entered for the current
 * visit: LOAD_MATCH takes them back, if they still fit the match.
 */
const players = [
  { id: 'a', name: 'Alice', isBot: false },
  { id: 'b', name: 'Bob', isBot: true, botLevel: 5 },
] as any;
const T20 = { segment: 20, multiplier: 3, score: 60, bed: 'triple' } as const;
const S5 = { segment: 5, multiplier: 1, score: 5, bed: 'single' } as const;

const started = (): GameState =>
  gameReducer(initialState, {
    type: 'START_MATCH',
    payload: { players, settings: { startScore: 501, legsToWin: 1, setsToWin: 1, doubleOut: true }, gameType: 'x01' },
  } as any);

describe('LOAD_MATCH after a refresh', () => {
  it('restores the darts of the current visit and the remaining-score hint', () => {
    const match = started().currentMatch!;
    const s = gameReducer(initialState, { type: 'LOAD_MATCH', payload: match, currentThrow: [T20, S5] } as any);
    expect(s.currentThrow).toEqual([T20, S5]);
    expect(s.currentPlayerIndex).toBe(0);
  });

  it('starts empty without saved darts (resume from the database)', () => {
    const s = gameReducer(initialState, { type: 'LOAD_MATCH', payload: started().currentMatch! } as any);
    expect(s.currentThrow).toEqual([]);
  });

  it('drops saved darts when a bot is at the oche — the bot throws its own visit', () => {
    let s = started();
    s = gameReducer(s, { type: 'ADD_DART', payload: T20 } as any);
    s = gameReducer(s, { type: 'CONFIRM_THROW' } as any);
    s = gameReducer(s, { type: 'NEXT_PLAYER' } as any);
    const restored = gameReducer(initialState, { type: 'LOAD_MATCH', payload: s.currentMatch!, currentThrow: [S5] } as any);
    expect(restored.currentPlayerIndex).toBe(1);
    expect(restored.currentThrow).toEqual([]);
  });
});

describe('sanitizeRestoredThrow', () => {
  it('keeps valid darts only and at most three', () => {
    expect(sanitizeRestoredThrow([T20, S5])).toEqual([T20, S5]);
    expect(sanitizeRestoredThrow([T20, T20, T20, T20])).toEqual([]);
    expect(sanitizeRestoredThrow([{ segment: 21, multiplier: 1, score: 21 }])).toEqual([]);
    expect(sanitizeRestoredThrow([{ segment: 20, multiplier: 3, score: 59 }])).toEqual([]);
    expect(sanitizeRestoredThrow('junk')).toEqual([]);
    expect(sanitizeRestoredThrow(undefined)).toEqual([]);
  });
  it('accepts bulls and misses', () => {
    const bull = { segment: 50, multiplier: 2, score: 50, bed: 'bull' };
    const outer = { segment: 25, multiplier: 1, score: 25, bed: 'outer-bull' };
    const miss = { segment: 0, multiplier: 0, score: 0, bed: 'miss' };
    expect(sanitizeRestoredThrow([bull, outer, miss])).toEqual([bull, outer, miss]);
  });
});
