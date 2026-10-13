import { describe, it, expect, vi } from 'vitest';

vi.mock('../../utils/audio', () => ({
  default: {
    announceCheckout: vi.fn(), announceBust: vi.fn(),
    setEnabled: vi.fn(), setVolume: vi.fn(), announceScore: vi.fn(),
  },
}));

import { gameReducer, initialState, redoTarget } from '../../context/GameContext';
import type { GameState } from '../../context/GameContext';

/**
 * 0.35.0 — taken back one visit too many? Redo books it again. Undo keeps
 * what it took back; redo replays it in order, bot visits included.
 */
const humans = [
  { id: 'a', name: 'Alice', isBot: false },
  { id: 'b', name: 'Bob', isBot: false },
] as never;

const start = (players = humans, over: Record<string, unknown> = {}): GameState =>
  gameReducer(initialState, {
    type: 'START_MATCH',
    payload: { players, settings: { startScore: 501, legsToWin: 2, setsToWin: 1, doubleOut: true, doubleIn: false, ...over }, gameType: 'x01' },
  } as never);

const dart = (segment: number, multiplier: number) =>
  ({ segment, multiplier, score: segment === 25 ? (multiplier === 2 ? 50 : 25) : segment * multiplier,
     bed: multiplier === 3 ? 'triple' : multiplier === 2 ? 'double' : 'single' });
const act = (s: GameState, a: Record<string, unknown>) => gameReducer(s, a as never);
/** One visit, confirmed, turn passed (what play does after a non-checkout). */
const visit = (s: GameState, ...darts: [number, number][]) => {
  for (const [seg, m] of darts) s = act(s, { type: 'ADD_DART', payload: dart(seg, m) });
  const legs = s.currentMatch!.legs.length;
  s = act(s, { type: 'CONFIRM_THROW' });
  return s.currentMatch!.legs.length === legs && s.currentMatch!.status !== 'completed' ? act(s, { type: 'NEXT_PLAYER' }) : s;
};
const undo = (s: GameState) => act(s, { type: 'UNDO_THROW', payload: { skipBots: true } });
const clear = (s: GameState) => act(s, { type: 'CLEAR_THROW' });
const redo = (s: GameState) => act(s, { type: 'REDO_THROW' });
const scores = (s: GameState) => s.currentMatch!.legs.flatMap(l => l.throws.map(t => `${t.playerId}${t.score}`));

describe('REDO_THROW', () => {
  it('brings back a visit taken back, as if it had never been undone', () => {
    let s = visit(start(), [20, 3], [20, 3], [20, 3]); // Alice 180
    s = visit(s, [20, 1], [20, 1], [20, 1]); // Bob 60
    const before = s;
    s = undo(s);
    expect(scores(s)).toEqual(['a180']);
    expect(redoTarget(s)?.score).toBe(60); // input still holds Bob's darts
    s = redo(s);
    expect(scores(s)).toEqual(scores(before));
    expect(s.currentPlayerIndex).toBe(before.currentPlayerIndex);
    expect(s.currentThrow).toEqual([]);
    expect(redoTarget(s)).toBeNull();
  });

  it('walks forward through several undos in order', () => {
    let s = visit(start(), [20, 3], [20, 3], [20, 3]);
    s = visit(s, [19, 3], [19, 3], [19, 3]);
    s = visit(s, [20, 1], [1, 1], [5, 1]);
    const full = scores(s);
    s = clear(undo(s));
    s = clear(undo(s));
    s = undo(s);
    expect(scores(s)).toEqual([]);
    s = redo(s);
    expect(scores(s)).toEqual(full.slice(0, 1));
    s = redo(s);
    expect(scores(s)).toEqual(full.slice(0, 2));
    s = redo(s);
    expect(scores(s)).toEqual(full);
    expect(redo(s)).toBe(s); // nothing left
  });

  it('confirming the darts undo put back unchanged keeps the rest of the history', () => {
    let s = visit(start(), [20, 3], [20, 3], [20, 3]);
    s = visit(s, [20, 1], [20, 1], [20, 1]);
    s = clear(undo(s));
    s = undo(s); // Alice's 180 in the input
    s = act(s, { type: 'CONFIRM_THROW' });
    s = act(s, { type: 'NEXT_PLAYER' });
    expect(redoTarget(s)?.score).toBe(60);
    s = redo(s);
    expect(scores(s)).toEqual(['a180', 'b60']);
  });

  it('a different visit forgets the history', () => {
    let s = visit(start(), [20, 3], [20, 3], [20, 3]);
    s = visit(s, [20, 1], [20, 1], [20, 1]);
    s = clear(undo(s));
    s = visit(s, [1, 1], [1, 1], [1, 1]); // Bob types 3 instead
    expect(s.redoStack).toEqual([]);
    expect(redo(s)).toBe(s);
  });

  it('is not offered while the input holds other darts', () => {
    let s = visit(start(), [20, 3], [20, 3], [20, 3]);
    s = undo(s);
    s = act(s, { type: 'REPLACE_DART', payload: { index: 0, dart: dart(5, 1) } });
    expect(redoTarget(s)).toBeNull();
    expect(redo(s)).toBe(s);
  });

  it('a correction forgets the history', () => {
    let s = visit(start(), [20, 3], [20, 3], [20, 3]);
    s = visit(s, [20, 1], [20, 1], [20, 1]);
    s = visit(s, [20, 1], [20, 1], [20, 1]);
    s = clear(undo(s));
    const first = s.currentMatch!.legs[0].throws[0];
    s = act(s, { type: 'EDIT_THROW', payload: { throwId: first.id, darts: [dart(20, 3), dart(20, 3), dart(20, 1)] } });
    expect(redoTarget(s)).toBeNull();
  });

  it('a checkout comes back across the leg boundary', () => {
    let s = start(humans, { startScore: 101 });
    s = visit(s, [20, 1], [1, 1], [0, 0]); // Alice 21 -> 80
    s = visit(s, [1, 1], [1, 1], [1, 1]); // Bob 3 -> 98
    s = visit(s, [20, 3], [10, 2]); // Alice checks out 80, leg 2 starts
    expect(s.currentMatch!.legs).toHaveLength(2);
    const after = s;
    s = undo(s);
    expect(s.currentMatch!.legs).toHaveLength(1);
    s = redo(s);
    expect(s.currentMatch!.legs).toHaveLength(2);
    expect(s.currentMatch!.players[0].legsWon).toBe(1);
    expect(s.currentPlayerIndex).toBe(after.currentPlayerIndex);
  });

  it('a match-winning checkout comes back and completes the match again', () => {
    let s = start(humans, { startScore: 40, legsToWin: 1 });
    s = visit(s, [20, 2]); // Alice wins
    expect(s.currentMatch!.status).toBe('completed');
    s = act(s, { type: 'UNDO_END_MATCH' });
    expect(s.currentMatch!.status).toBe('in-progress');
    s = redo(s);
    expect(s.currentMatch!.status).toBe('completed');
    expect(s.currentMatch!.winner).toBe('a');
  });

  it('bot visits stepped over by undo come back with the human visit', () => {
    const withBot = [{ id: 'a', name: 'Alice', isBot: false }, { id: 'r', name: 'Robo', isBot: true, botLevel: 5 }] as never;
    let s = visit(start(withBot), [20, 3], [20, 3], [20, 3]); // Alice 180
    s = visit(s, [19, 1], [19, 1], [19, 1]); // Robo 57
    s = undo(s); // back to Alice, past the bot
    expect(scores(s)).toEqual([]);
    s = redo(s);
    expect(scores(s)).toEqual(['a180', 'r57']);
    expect(s.currentPlayerIndex).toBe(0); // Alice is up again, not the bot
  });

  it('a new match starts without history', () => {
    let s = visit(start(), [20, 3], [20, 3], [20, 3]);
    s = undo(s);
    s = start();
    expect(s.redoStack ?? []).toEqual([]);
  });
});

/** 0.40.0 — the redo history survives a refresh (LOAD_MATCH with the saved stack). */
describe('redo after a refresh', () => {
  const twoUndone = () => {
    let s = visit(start(), [20, 3], [20, 3], [20, 3]); // Alice 180
    s = visit(s, [20, 1], [20, 1], [20, 1]); // Bob 60
    s = visit(s, [19, 1], [19, 1], [19, 1]); // Alice 57
    s = clear(undo(clear(undo(s))));
    return s;
  };
  const reload = (s: GameState, stack: unknown) =>
    act(initialState, { type: 'LOAD_MATCH', payload: JSON.parse(JSON.stringify(s.currentMatch)), redoStack: stack });

  it('a reloaded match takes its saved redo history and redo walks on', () => {
    const s = twoUndone();
    const r = reload(s, JSON.parse(JSON.stringify(s.redoStack)));
    expect(r.redoStack).toHaveLength(2);
    expect(redoTarget(r)?.score).toBe(60);
    expect(scores(redo(redo(r)))).toEqual(['a180', 'b60', 'a57']);
  });

  it('a broken or foreign history is dropped whole, never half', () => {
    const s = twoUndone();
    const stack = JSON.parse(JSON.stringify(s.redoStack));
    expect(reload(s, [...stack.slice(0, 1), { ...stack[1], playerId: 'stranger' }]).redoStack ?? []).toEqual([]);
    expect(reload(s, [{ ...stack[0], darts: [{ segment: 21, multiplier: 3, score: 63 }] }]).redoStack ?? []).toEqual([]);
    // An id the match still holds was never undone.
    const booked = s.currentMatch!.legs[0].throws[0].id;
    expect(reload(s, [{ ...stack[0], id: booked }]).redoStack ?? []).toEqual([]);
    expect(reload(s, 'nonsense').redoStack ?? []).toEqual([]);
  });

  it('a load without a saved history still clears the old one', () => {
    const s = twoUndone();
    expect(act(s, { type: 'LOAD_MATCH', payload: s.currentMatch }).redoStack ?? []).toEqual([]);
  });
});
