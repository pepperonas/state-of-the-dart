import { describe, it, expect, vi } from 'vitest';

// CONFIRM_THROW announces checkouts/busts — keep the audio pipeline out of jsdom.
vi.mock('../../utils/audio', () => ({
  default: {
    announceCheckout: vi.fn(),
    announceBust: vi.fn(),
    setEnabled: vi.fn(),
    setVolume: vi.fn(),
  },
}));

import { gameReducer, initialState, MIN_MATCH_PLAYERS } from '../../context/GameContext';
import type { GameState } from '../../context/GameContext';

const threePlayers = [
  { id: 'a', name: 'Alice', isBot: false },
  { id: 'b', name: 'Bob', isBot: false },
  { id: 'c', name: 'Cara', isBot: false },
] as any;

const startMatch = (players = threePlayers, startScore = 501): GameState =>
  gameReducer(initialState, {
    type: 'START_MATCH',
    payload: {
      players,
      settings: { startScore, legsToWin: 3, setsToWin: 1, doubleOut: false, doubleIn: false },
      gameType: 'x01',
    },
  } as any);

/** One confirmed visit for whoever is at the oche, then hand over. */
const visit = (state: GameState, score = 60): GameState => {
  const withDart = gameReducer(state, {
    type: 'ADD_DART',
    payload: { segment: 20, multiplier: 3, score },
  } as any);
  const confirmed = gameReducer(withDart, { type: 'CONFIRM_THROW' } as any);
  // A leg-winning throw already puts the new leg's starter at the oche — advancing
  // again would skip them (GameScreen guards the same way).
  const wonTheLeg =
    confirmed.currentMatch!.currentLegIndex !== state.currentMatch!.currentLegIndex;
  return wonTheLeg ? confirmed : gameReducer(confirmed, { type: 'NEXT_PLAYER' } as any);
};

const remove = (state: GameState, playerId: string): GameState =>
  gameReducer(state, { type: 'REMOVE_PLAYER', payload: { playerId } } as any);

const throwsOf = (state: GameState, playerId: string) =>
  state.currentMatch!.legs.flatMap(l => l.throws.filter(t => t.playerId === playerId));

describe('gameReducer — REMOVE_PLAYER', () => {
  it('drops the player and every throw they made', () => {
    let state = startMatch();
    state = visit(state); // Alice
    state = visit(state); // Bob
    state = visit(state); // Cara
    state = visit(state); // Alice again

    const after = remove(state, 'b');

    expect(after.currentMatch!.players.map(p => p.playerId)).toEqual(['a', 'c']);
    expect(throwsOf(after, 'b')).toHaveLength(0);
    // Everyone else keeps their visits — Alice threw twice, Cara once.
    expect(throwsOf(after, 'a')).toHaveLength(2);
    expect(throwsOf(after, 'c')).toHaveLength(1);
  });

  it('leaves the remaining players\' stats untouched', () => {
    let state = startMatch();
    state = visit(state, 180); // Alice
    state = visit(state, 60); // Bob
    state = visit(state, 60); // Cara

    const before = state.currentMatch!.players.find(p => p.playerId === 'a')!;
    const after = remove(state, 'b').currentMatch!.players.find(p => p.playerId === 'a')!;

    expect(after.match180s).toBe(before.match180s);
    expect(after.matchAverage).toBe(before.matchAverage);
    expect(after.matchHighestScore).toBe(before.matchHighestScore);
    expect(after.legsWon).toBe(before.legsWon);
  });

  it('shifts the turn pointer down when someone earlier in the order leaves', () => {
    let state = startMatch();
    state = visit(state); // Alice → Bob
    state = visit(state); // Bob → Cara
    expect(state.currentPlayerIndex).toBe(2); // Cara at the oche

    const after = remove(state, 'a');

    expect(after.currentMatch!.players.map(p => p.playerId)).toEqual(['b', 'c']);
    expect(after.currentPlayerIndex).toBe(1); // still Cara
    expect(after.currentMatch!.players[after.currentPlayerIndex].playerId).toBe('c');
  });

  it('passes the turn on and discards the pending darts when the player at the oche leaves', () => {
    let state = startMatch();
    state = visit(state); // Alice → Bob is at the oche
    state = gameReducer(state, {
      type: 'ADD_DART',
      payload: { segment: 20, multiplier: 3, score: 60 },
    } as any);
    expect(state.currentThrow).toHaveLength(1);

    const after = remove(state, 'b');

    expect(after.currentThrow).toEqual([]);
    expect(after.currentMatch!.players[after.currentPlayerIndex].playerId).toBe('c');
  });

  it('wraps to the first player when the last one in the order leaves mid-turn', () => {
    let state = startMatch();
    state = visit(state); // Alice
    state = visit(state); // Bob → Cara (index 2) is at the oche

    const after = remove(state, 'c');

    expect(after.currentMatch!.players.map(p => p.playerId)).toEqual(['a', 'b']);
    expect(after.currentPlayerIndex).toBe(0);
  });

  it('keeps another player\'s pending darts alive', () => {
    let state = startMatch();
    state = gameReducer(state, {
      type: 'ADD_DART',
      payload: { segment: 20, multiplier: 3, score: 60 },
    } as any); // Alice is mid-visit

    const after = remove(state, 'c');

    expect(after.currentThrow).toHaveLength(1);
    expect(after.currentMatch!.players[after.currentPlayerIndex].playerId).toBe('a');
  });

  it('refuses to strip the match below two players', () => {
    const state = startMatch(threePlayers.slice(0, 2));
    expect(state.currentMatch!.players).toHaveLength(MIN_MATCH_PLAYERS);

    expect(remove(state, 'a')).toBe(state); // untouched state object
  });

  it('ignores an unknown player id', () => {
    const state = startMatch();
    expect(remove(state, 'nobody')).toBe(state);
  });

  it('releases a leg the removed player had won', () => {
    // startScore 60 → a single T20 checks the leg out (doubleOut off).
    let state = startMatch(threePlayers, 60);
    state = visit(state, 60); // Alice wins leg 1, a new leg opens

    expect(state.currentMatch!.legs[0].winner).toBe('a');

    const after = remove(state, 'a');

    expect(after.currentMatch!.legs[0].winner).toBeUndefined();
    expect(after.currentMatch!.legs[0].completedAt).toBeUndefined();
    expect(after.currentMatch!.legs[0].throws).toHaveLength(0);
  });

  it('keeps the leg-start index consistent, so a reloaded match resumes with the right player', () => {
    let state = startMatch(threePlayers, 60);
    state = visit(state, 60); // Alice wins leg 1 → leg 2 starts with Bob (index 1)
    expect(state.currentMatch!.legStartPlayerIndex).toBe(1);

    state = visit(state, 20); // Bob throws in leg 2 → Cara is at the oche
    const after = remove(state, 'b');

    // Bob sat at the start index; with him gone the leg belongs to Cara, who is
    // now at index 1 of [Alice, Cara] — and a reload must agree.
    expect(after.currentPlayerIndex).toBe(1);
    const reloaded = gameReducer(initialState, { type: 'LOAD_MATCH', payload: after.currentMatch! } as any);
    expect(reloaded.currentMatch!.players[reloaded.currentPlayerIndex].playerId).toBe(
      after.currentMatch!.players[after.currentPlayerIndex].playerId,
    );
  });
});
