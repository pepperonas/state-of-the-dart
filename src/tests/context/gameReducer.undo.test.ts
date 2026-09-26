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

describe('UNDO_THROW in a sets match', () => {
  // First to 2 legs, first to 2 sets. Alice wins set 1 two legs to nil.
  const intoSetTwo = () => {
    let s = start({ legsToWin: 2, setsToWin: 2 });
    s = visit(s, D1);                  // leg 1: Alice (starter) checks out
    s = visit(s, MISS); s = next(s);   // leg 2: Bob starts, misses
    s = visit(s, D1);                  // Alice checks out → set 1 to Alice
    return s;
  };

  it('sanity: Alice holds one set and no legs of set 2', () => {
    const s = intoSetTwo();
    expect(player(s, 'a').setsWon).toBe(1);
    expect(player(s, 'a').legsWon).toBe(0);
    expect(s.currentMatch!.currentSetIndex).toBe(1);
  });

  it('recounts legs per set — an undo in set 2 must not restore set 1 legs', () => {
    let s = intoSetTwo();
    s = visit(s, MISS);                // set 2: Alice starts, misses
    s = undo(s);
    expect(player(s, 'a').legsWon).toBe(0);
    expect(player(s, 'a').setsWon).toBe(1);
    expect(player(s, 'b').setsWon).toBe(0);
  });

  it('can reach back across the set boundary and reopen set 1', () => {
    let s = intoSetTwo();
    s = undo(s);                       // takes back the set-winning checkout
    expect(player(s, 'a').setsWon).toBe(0);
    expect(player(s, 'a').legsWon).toBe(1);
    expect(s.currentMatch!.currentSetIndex).toBe(0);
    expect(s.currentMatch!.legs).toHaveLength(2);
    expect(s.currentMatch!.legs[1].winner).toBeUndefined();
    expect(s.currentPlayerIndex).toBe(0); // Alice is back at the oche
    expect(s.currentThrow).toEqual([D1]); // with her darts loaded for editing
  });
});

describe('UNDO_THROW across a leg boundary', () => {
  it('takes back the checkout that started the new leg', () => {
    let s = start({ legsToWin: 3 });
    s = visit(s, D1);                  // Alice wins leg 1, Bob starts leg 2
    expect(s.currentMatch!.legs).toHaveLength(2);
    s = undo(s);
    const m = s.currentMatch!;
    expect(m.legs).toHaveLength(1);
    expect(m.currentLegIndex).toBe(0);
    expect(m.legs[0].winner).toBeUndefined();
    expect(m.legs[0].throws).toHaveLength(0);
    expect(m.legStartPlayerIndex).toBe(0);
    expect(player(s, 'a').legsWon).toBe(0);
    expect(player(s, 'a').checkoutsHit).toBe(0);
  });

  it('does nothing at the very start of the match', () => {
    const s = start({});
    expect(undo(s)).toBe(s);
  });
});

describe('undoing the match-winning checkout', () => {
  it('UNDO_THROW reopens a completed match', () => {
    let s = start({});
    s = visit(s, D1);
    expect(s.currentMatch!.status).toBe('completed');
    s = undo(s);
    expect(s.currentMatch!.status).toBe('in-progress');
    expect(s.currentMatch!.winner).toBeUndefined();
    expect(s.currentMatch!.completedAt).toBeUndefined();
    expect(s.currentMatch!.legs[0].throws).toHaveLength(0);
  });

  it('UNDO_END_MATCH after a real checkout takes the checkout back instead of freezing the leg', () => {
    let s = start({});
    s = visit(s, D1);
    s = gameReducer(s, { type: 'UNDO_END_MATCH' } as any);
    expect(s.currentMatch!.status).toBe('in-progress');
    expect(s.currentMatch!.legs[0].winner).toBeUndefined();
    expect(s.currentThrow).toEqual([D1]);
  });

  it('UNDO_END_MATCH after a manual end leaves every throw in place', () => {
    let s = start({ startScore: 501 });
    s = visit(s, T20);
    s = gameReducer(s, { type: 'END_MATCH' } as any);
    s = gameReducer(s, { type: 'UNDO_END_MATCH' } as any);
    expect(s.currentMatch!.status).toBe('in-progress');
    expect(s.currentMatch!.legs[0].throws).toHaveLength(1);
    expect(s.currentThrow).toEqual([]);
  });
});

describe('double-in', () => {
  it('a visit without a double does not open the leg', () => {
    const s = visit(start({ startScore: 501, doubleIn: true }), T20, T20);
    const leg = s.currentMatch!.legs[0];
    expect(leg.throws[0].score).toBe(0);
    expect(leg.throws[0].remaining).toBe(501);
  });

  it('only darts from the opening double count', () => {
    const s = visit(start({ startScore: 501, doubleIn: true }), T20, D16, T20);
    expect(s.currentMatch!.legs[0].throws[0].score).toBe(92);
  });

  it('is ignored when switched off', () => {
    const s = visit(start({ startScore: 501 }), T20, T20);
    expect(s.currentMatch!.legs[0].throws[0].score).toBe(120);
  });
});
