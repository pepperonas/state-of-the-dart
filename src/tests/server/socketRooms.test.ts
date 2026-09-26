import { describe, it, expect } from 'vitest';
import { applyThrow, cleanChatMessage, isMember, removeFromRoom } from '../../../server/src/socket/rooms';
import type { GameRoom } from '../../../server/src/socket/rooms';

const p = (id: string) => ({ id, name: id.toUpperCase(), socketId: id });

const playing = (ids: string[], current = 0, startScore = 501): GameRoom => ({
  id: 'r1',
  name: 'Room',
  host: ids[0],
  players: ids.map(p),
  settings: { gameType: 'x01', startScore, legsToWin: 2, isPrivate: false },
  status: 'playing',
  gameState: {
    currentPlayerIndex: current,
    scores: Object.fromEntries(ids.map(id => [id, startScore])),
    legs: Object.fromEntries(ids.map(id => [id, 0])),
  },
});

describe('removeFromRoom', () => {
  it('keeps the turn pointer valid when the last seat, holding the turn, leaves', () => {
    const room = playing(['a', 'b', 'c'], 2);
    removeFromRoom(room, 'c');
    expect(room.players[room.gameState!.currentPlayerIndex]).toBeDefined();
    expect(room.gameState!.currentPlayerIndex).toBe(0);
  });

  it('shifts the pointer down when someone before the current player leaves', () => {
    const room = playing(['a', 'b', 'c'], 2);
    removeFromRoom(room, 'a');
    expect(room.players[room.gameState!.currentPlayerIndex].socketId).toBe('c');
  });

  it('ends a running game that drops below two players', () => {
    const room = playing(['a', 'b'], 0);
    removeFromRoom(room, 'b');
    expect(room.status).toBe('finished');
  });

  it('hands the host role on and reports an empty room', () => {
    const room = playing(['a', 'b'], 0);
    expect(removeFromRoom(room, 'a')).toBe('updated');
    expect(room.host).toBe('b');
    expect(removeFromRoom(room, 'b')).toBe('deleted');
    expect(removeFromRoom(room, 'zzz')).toBe('not-member');
  });
});

describe('applyThrow', () => {
  it('a throw after the thrower left mid-game is rejected instead of crashing', () => {
    const room = playing(['a', 'b'], 1);
    room.players.pop(); // what the old disconnect handler left behind
    expect(() => applyThrow(room, 'b', { score: 60 })).not.toThrow();
    expect(applyThrow(room, 'b', { score: 60 }).kind).toBe('rejected');
  });

  it('only the player at the oche may throw', () => {
    expect(applyThrow(playing(['a', 'b'], 0), 'b', { score: 60 }).kind).toBe('rejected');
  });

  it('rejects scores no visit can make', () => {
    const room = playing(['a', 'b'], 0);
    for (const score of [-1, 181, 3.5, '60', null]) {
      expect(applyThrow(room, 'a', { score }).kind).toBe('rejected');
    }
    expect(room.gameState!.scores.a).toBe(501);
  });

  it('scores and passes the turn on', () => {
    const room = playing(['a', 'b'], 0);
    expect(applyThrow(room, 'a', { score: 100 }).kind).toBe('scored');
    expect(room.gameState!.scores.a).toBe(401);
    expect(room.gameState!.currentPlayerIndex).toBe(1);
  });

  it('enforces double-out: reaching zero on a single is a bust', () => {
    const room = playing(['a', 'b'], 0, 40);
    expect(applyThrow(room, 'a', { score: 40, darts: [{ multiplier: 1 }] }).kind).toBe('bust');
    expect(room.gameState!.scores.a).toBe(40);
  });

  it('wins the leg on a double and resets the scores', () => {
    const room = playing(['a', 'b'], 0, 40);
    expect(applyThrow(room, 'a', { score: 40, darts: [{ multiplier: 2 }] }).kind).toBe('leg');
    expect(room.gameState!.legs.a).toBe(1);
    expect(room.gameState!.scores).toEqual({ a: 40, b: 40 });
  });

  it('wins the match on the deciding leg', () => {
    const room = playing(['a', 'b'], 0, 40);
    room.gameState!.legs.a = 1;
    expect(applyThrow(room, 'a', { score: 40, darts: [{ multiplier: 2 }] }).kind).toBe('match');
    expect(room.status).toBe('finished');
  });
});

describe('chat', () => {
  it('only members count', () => {
    const room = playing(['a', 'b']);
    expect(isMember(room, 'a')).toBe(true);
    expect(isMember(room, 'outsider')).toBe(false);
    expect(isMember(undefined, 'a')).toBe(false);
  });

  it('messages are strings, trimmed and capped', () => {
    expect(cleanChatMessage('  hi  ')).toBe('hi');
    expect(cleanChatMessage('   ')).toBeNull();
    expect(cleanChatMessage({ evil: true })).toBeNull();
    expect(cleanChatMessage('x'.repeat(2000))).toHaveLength(500);
  });
});
