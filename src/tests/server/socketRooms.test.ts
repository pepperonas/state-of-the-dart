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

import { markDisconnected, reconnectPlayer, restartMatch, sanitizeClientId, playerForSocket } from '../../../server/src/socket/rooms';

describe('stable identity and reconnecting (0.17.0)', () => {
  /** Seats are keyed by a client id, not the socket: a phone that locks its screen gets a new socket. */
  const seated = (): GameRoom => {
    const room = playing(['alice', 'bob'], 0, 301);
    room.players = room.players.map(pl => ({ ...pl, socketId: `sock-${pl.id}` }));
    return room;
  };

  it('scores and turns follow the player id, whatever the socket', () => {
    const room = seated();
    expect(applyThrow(room, 'alice', { score: 100 }).kind).toBe('scored');
    expect(room.gameState!.scores.alice).toBe(201);
    expect(playerForSocket(room, 'sock-bob')?.id).toBe('bob');
    expect(playerForSocket(room, 'nobody')).toBeUndefined();
  });

  it('a disconnect during a game keeps the seat; reconnecting rebinds the new socket', () => {
    const room = seated();
    applyThrow(room, 'alice', { score: 100 });
    expect(markDisconnected(room, 'bob')).toBe(true); // game running: hold the seat
    expect(room.players.find(pl => pl.id === 'bob')!.connected).toBe(false);
    expect(room.gameState!.scores.bob).toBe(301);
    expect(reconnectPlayer(room, 'bob', 'sock-new')).toBe(true);
    const bob = room.players.find(pl => pl.id === 'bob')!;
    expect(bob.connected).toBe(true);
    expect(bob.socketId).toBe('sock-new');
    expect(applyThrow(room, 'bob', { score: 60 }).kind).toBe('scored');
  });

  it('a disconnect while waiting in the lobby does not hold a seat', () => {
    const room = seated();
    room.status = 'waiting';
    expect(markDisconnected(room, 'bob')).toBe(false);
  });

  it('reconnecting a player who is not in the room does nothing', () => {
    expect(reconnectPlayer(seated(), 'mallory', 'sock-x')).toBe(false);
  });

  it('a rematch resets scores and legs and moves the throw-off on', () => {
    const room = seated();
    applyThrow(room, 'alice', { score: 180 });
    applyThrow(room, 'bob', { score: 60 });
    applyThrow(room, 'alice', { score: 121, darts: [{ multiplier: 1 }, { multiplier: 1 }, { multiplier: 2 }] });
    applyThrow(room, 'bob', { score: 60 });
    room.status = 'finished';
    expect(restartMatch(room)).toBe(true);
    expect(room.status).toBe('playing');
    expect(room.gameState!.scores).toEqual({ alice: 301, bob: 301 });
    expect(room.gameState!.legs).toEqual({ alice: 0, bob: 0 });
    expect(room.players[room.gameState!.currentPlayerIndex].id).toBe('bob');
    room.status = 'finished';
    restartMatch(room);
    expect(room.players[room.gameState!.currentPlayerIndex].id).toBe('alice');
  });

  it('no rematch while a game runs or with fewer than two connected players', () => {
    const room = seated();
    expect(restartMatch(room)).toBe(false);
    room.status = 'finished';
    room.players[1].connected = false;
    expect(restartMatch(room)).toBe(false);
  });

  it('accepts only sane client ids', () => {
    expect(sanitizeClientId('c-1a2b3c4d-5e6f')).toBe('c-1a2b3c4d-5e6f');
    expect(sanitizeClientId('short')).toBeNull();
    expect(sanitizeClientId('x'.repeat(65))).toBeNull();
    expect(sanitizeClientId('bad id with spaces!')).toBeNull();
    expect(sanitizeClientId(42)).toBeNull();
  });
});

describe('throw-off alternates per leg', () => {
  it('the next leg starts with the next player in turn, not whoever follows the winner', () => {
    const room = playing(['a', 'b'], 0, 301); // a throws first in leg 1
    applyThrow(room, 'a', { score: 100 });
    applyThrow(room, 'b', { score: 180 });
    applyThrow(room, 'a', { score: 100 });
    // b (not the starter) wins leg 1
    expect(applyThrow(room, 'b', { score: 121, darts: [{ multiplier: 3 }, { multiplier: 1 }, { multiplier: 2 }] }).kind).toBe('leg');
    // leg 2: b throws first — the old code gave it back to a (who follows b)
    expect(room.players[room.gameState!.currentPlayerIndex].id).toBe('b');
  });

  it('when the starter wins, the other player starts the next leg', () => {
    const room = playing(['a', 'b'], 0, 301);
    applyThrow(room, 'a', { score: 180 });
    applyThrow(room, 'b', { score: 60 });
    applyThrow(room, 'a', { score: 121, darts: [{ multiplier: 1 }, { multiplier: 1 }, { multiplier: 2 }] });
    expect(room.players[room.gameState!.currentPlayerIndex].id).toBe('b');
  });
});
