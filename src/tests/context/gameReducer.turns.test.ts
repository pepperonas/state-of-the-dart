import { describe, it, expect, vi } from 'vitest';

// The reducer announces checkouts and busts; mock the audio pipeline entirely.
vi.mock('../../utils/audio', () => ({
  default: {
    announceCheckout: vi.fn(), announceBust: vi.fn(),
    setEnabled: vi.fn(), setVolume: vi.fn(), announceScore: vi.fn(),
  },
}));

import { gameReducer, initialState } from '../../context/GameContext';
import type { GameState } from '../../context/GameContext';

/**
 * The turn machinery: entering darts, undoing them, busting, and handing the
 * turn on. These are the paths a player walks hundreds of times per match, and
 * every one of them mutates the score that decides the game.
 */
const players = [
  { id: 'a', name: 'Alice', isBot: false },
  { id: 'b', name: 'Bob', isBot: false },
] as never;

const start = (over: Record<string, unknown> = {}): GameState =>
  gameReducer(initialState, {
    type: 'START_MATCH',
    payload: {
      players,
      settings: { startScore: 501, legsToWin: 3, setsToWin: 1, doubleOut: true, doubleIn: false, ...over },
      gameType: 'x01',
    },
  } as never);

const dart = (segment: number, multiplier: number) =>
  ({ segment, multiplier, score: segment === 25 ? (multiplier === 2 ? 50 : 25) : segment * multiplier,
     bed: multiplier === 3 ? 'triple' : multiplier === 2 ? 'double' : 'single' });

const add = (s: GameState, seg: number, mult: number) =>
  gameReducer(s, { type: 'ADD_DART', payload: dart(seg, mult) } as never);
const confirm = (s: GameState) => gameReducer(s, { type: 'CONFIRM_THROW' } as never);
/**
 * The remaining score is derived, not stored — `MatchPlayer` has no score field.
 * A player's confirmed throws in the *current* leg are summed and subtracted
 * from the start score, exactly as the reducer does it.
 */
const remaining = (s: GameState, id = 'a') => {
  const match = s.currentMatch!;
  const leg = match.legs[match.legs.length - 1];
  const scored = leg.throws
    .filter((t) => t.playerId === id)
    .reduce((sum, t) => sum + t.score, 0);
  return (match.settings.startScore || 501) - scored;
};

describe('START_MATCH', () => {
  it('opens a match with both players on the start score', () => {
    const s = start();
    expect(s.currentMatch!.status).toBe('in-progress');
    expect(s.currentMatch!.players).toHaveLength(2);
    expect(remaining(s, 'a')).toBe(501);
    expect(remaining(s, 'b')).toBe(501);
  });

  it('opens exactly one leg and starts with the first player', () => {
    const s = start();
    expect(s.currentMatch!.legs).toHaveLength(1);
    expect(s.currentPlayerIndex).toBe(0);
    expect(s.currentThrow).toEqual([]);
  });

  it('honours a different start score', () => {
    expect(remaining(start({ startScore: 301 }))).toBe(301);
  });
});

describe('ADD_DART', () => {
  it('accumulates darts in the pending throw', () => {
    let s = start();
    s = add(s, 20, 3);
    s = add(s, 20, 3);
    expect(s.currentThrow).toHaveLength(2);
  });

  it('never accepts more than three darts in one turn', () => {
    let s = start();
    for (let i = 0; i < 5; i++) s = add(s, 20, 1);
    expect(s.currentThrow).toHaveLength(3);
  });

  /** The score only moves once the turn is confirmed. */
  it('does not touch the remaining score before confirmation', () => {
    let s = start();
    s = add(s, 20, 3);
    expect(remaining(s)).toBe(501);
  });
});

describe('REMOVE_DART and CLEAR_THROW', () => {
  it('removes the last dart only', () => {
    let s = start();
    s = add(s, 20, 3);
    s = add(s, 19, 3);
    s = gameReducer(s, { type: 'REMOVE_DART' } as never);
    expect(s.currentThrow).toHaveLength(1);
    expect(s.currentThrow[0].segment).toBe(20);
  });

  it('removing from an empty throw is harmless', () => {
    const s = gameReducer(start(), { type: 'REMOVE_DART' } as never);
    expect(s.currentThrow).toEqual([]);
  });

  it('clear empties the pending throw', () => {
    let s = start();
    s = add(s, 20, 3);
    s = add(s, 20, 3);
    s = gameReducer(s, { type: 'CLEAR_THROW' } as never);
    expect(s.currentThrow).toEqual([]);
  });
});

describe('CONFIRM_THROW', () => {
  it('subtracts the throw and clears the pending darts', () => {
    let s = start();
    s = add(s, 20, 3); s = add(s, 20, 3); s = add(s, 20, 3);
    s = confirm(s);
    expect(remaining(s, 'a')).toBe(501 - 180);
    expect(s.currentThrow).toEqual([]);
  });

  /**
   * ⚠️ Confirming does NOT advance the player — the caller dispatches
   * NEXT_PLAYER. The separation matters: on a checkout, CONFIRM_THROW already
   * handles the leg/match transition and an extra NEXT_PLAYER would skip a
   * player's turn. Pinned so the two never get merged.
   */
  it('does not advance the player by itself', () => {
    let s = start();
    s = add(s, 20, 3);
    s = confirm(s);
    expect(s.currentPlayerIndex).toBe(0);
  });

  it('records the throw in the leg', () => {
    let s = start();
    s = add(s, 20, 3);
    s = confirm(s);
    expect(s.currentMatch!.legs[0].throws.length).toBeGreaterThan(0);
  });

  it('confirming nothing records no throw at all', () => {
    const before = start();
    const after = confirm(before);
    expect(remaining(after)).toBe(501);
    expect(after.currentMatch!.legs[0].throws).toHaveLength(0);
    expect(after).toBe(before);
  });

  describe('bust handling', () => {
    /** Going below zero must leave the score untouched — that is what a bust is. */
    it('a throw beyond the remainder scores nothing', () => {
      let s = start({ startScore: 40 });
      s = add(s, 20, 3); // 60 > 40
      s = confirm(s);
      expect(remaining(s)).toBe(40);
      expect(s.currentThrow).toEqual([]);
    });

    it('reaching zero without a double busts under double-out', () => {
      let s = start({ startScore: 40 });
      s = add(s, 20, 1); s = add(s, 20, 1); // 40, but the last dart is a single
      s = confirm(s);
      expect(remaining(s)).toBe(40);
      expect(s.currentMatch!.status).toBe('in-progress');
    });

    it('leaving exactly one busts under double-out', () => {
      let s = start({ startScore: 41 });
      s = add(s, 20, 2); // leaves 1
      s = confirm(s);
      expect(remaining(s)).toBe(41);
    });
  });

  describe('checkout', () => {
    it('finishing on a double wins the leg', () => {
      let s = start({ startScore: 40, legsToWin: 3 });
      s = add(s, 20, 2);
      s = confirm(s);
      const alice = s.currentMatch!.players.find((p) => p.playerId === 'a')!;
      expect(alice.legsWon).toBe(1);
    });

    it('a won leg resets both players for the next one', () => {
      let s = start({ startScore: 40, legsToWin: 3 });
      s = add(s, 20, 2);
      s = confirm(s);
      expect(remaining(s, 'a')).toBe(40);
      expect(remaining(s, 'b')).toBe(40);
      expect(s.currentMatch!.legs).toHaveLength(2);
    });

    it('taking the last leg completes the match', () => {
      let s = start({ startScore: 40, legsToWin: 1 });
      s = add(s, 20, 2);
      s = confirm(s);
      expect(s.currentMatch!.status).toBe('completed');
      expect(s.currentMatch!.winner).toBe('a');
    });

    it('straight-out lets a single finish the leg', () => {
      let s = start({ startScore: 20, legsToWin: 1, doubleOut: false });
      s = add(s, 20, 1);
      s = confirm(s);
      expect(s.currentMatch!.status).toBe('completed');
    });
  });
});

describe('UNDO_THROW', () => {
  it('gives the points back and returns the turn', () => {
    let s = start();
    s = add(s, 20, 3); s = add(s, 20, 3); s = add(s, 20, 3);
    s = confirm(s);
    expect(remaining(s, 'a')).toBe(321);

    s = gameReducer(s, { type: 'UNDO_THROW' } as never);
    expect(remaining(s, 'a')).toBe(501);
    expect(s.currentPlayerIndex).toBe(0);
  });

  it('undoing with no history is harmless', () => {
    const s = gameReducer(start(), { type: 'UNDO_THROW' } as never);
    expect(remaining(s)).toBe(501);
    expect(s.currentMatch!.status).toBe('in-progress');
  });

  it('drops the throw from the leg as well as the score', () => {
    let s = start();
    s = add(s, 20, 3);
    s = confirm(s);
    const before = s.currentMatch!.legs[0].throws.length;
    s = gameReducer(s, { type: 'UNDO_THROW' } as never);
    expect(s.currentMatch!.legs[0].throws.length).toBe(before - 1);
  });

  /** Undo must be repeatable back to the start, not just one step. */
  it('unwinds several turns in order', () => {
    let s = start();
    for (const [seg, mult] of [[20, 3], [19, 3], [18, 3]] as const) {
      s = add(s, seg, mult);
      s = confirm(s);
    }
    for (let i = 0; i < 3; i++) s = gameReducer(s, { type: 'UNDO_THROW' } as never);
    expect(remaining(s, 'a')).toBe(501);
    expect(remaining(s, 'b')).toBe(501);
  });
});

describe('NEXT_PLAYER', () => {
  it('cycles through the players and wraps', () => {
    let s = start();
    s = gameReducer(s, { type: 'NEXT_PLAYER' } as never);
    expect(s.currentPlayerIndex).toBe(1);
    s = gameReducer(s, { type: 'NEXT_PLAYER' } as never);
    expect(s.currentPlayerIndex).toBe(0);
  });

  it('discards any darts left pending', () => {
    let s = start();
    s = add(s, 20, 3);
    s = gameReducer(s, { type: 'NEXT_PLAYER' } as never);
    expect(s.currentThrow).toEqual([]);
  });
});

describe('pause, resume and end', () => {
  it('pausing marks the match without losing it', () => {
    const s = gameReducer(start(), { type: 'PAUSE_MATCH' } as never);
    expect(s.currentMatch).not.toBeNull();
    expect(s.currentMatch!.status).toBe('paused');
  });

  it('resuming puts it back in progress', () => {
    let s = gameReducer(start(), { type: 'PAUSE_MATCH' } as never);
    s = gameReducer(s, { type: 'RESUME_MATCH' } as never);
    expect(s.currentMatch!.status).toBe('in-progress');
  });

  it('ending marks it completed', () => {
    const s = gameReducer(start(), { type: 'END_MATCH' } as never);
    expect(s.currentMatch?.status === 'completed' || s.currentMatch === null).toBe(true);
  });
});

describe('unknown actions', () => {
  it('leave the state untouched', () => {
    const s = start();
    expect(gameReducer(s, { type: 'NOT_A_REAL_ACTION' } as never)).toBe(s);
  });
});
