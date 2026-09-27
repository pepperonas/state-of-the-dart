/**
 * Room bookkeeping for online play, free of Socket.IO so it can be tested.
 *
 * Every function here is total: a handler that throws inside socket.io takes
 * the whole Node process down, and the old code did exactly that when a
 * player left mid-game (`room.players[index]` became undefined).
 */

export interface OnlinePlayer {
  /** Stable client id (localStorage), NOT the socket id — see reconnectPlayer. */
  id: string;
  name: string;
  socketId: string;
  playerId?: string;
  /** false while the seat is held for a player whose connection dropped. */
  connected?: boolean;
}

export interface GameRoom {
  id: string;
  name: string;
  host: string;
  players: OnlinePlayer[];
  settings: {
    gameType: string;
    startScore: number;
    legsToWin: number;
    isPrivate: boolean;
    doubleOut?: boolean;
  };
  status: 'waiting' | 'playing' | 'finished';
  /** Keyed by player id. */
  gameState?: {
    currentPlayerIndex: number;
    scores: Record<string, number>;
    legs: Record<string, number>;
    /** Who threw first in this match; a rematch hands it on. */
    starterIndex?: number;
    /** Who threw first in the current leg; the next leg hands it on. */
    legStarterIndex?: number;
  };
}

export const isMember = (room: GameRoom | undefined, playerId: string): boolean =>
  !!room && room.players.some(p => p.id === playerId);

export const playerForSocket = (room: GameRoom, socketId: string): OnlinePlayer | undefined =>
  room.players.find(p => p.socketId === socketId);

/** A client id from localStorage: 8–64 chars of letters, digits and dashes. */
export const sanitizeClientId = (value: unknown): string | null =>
  typeof value === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : null;

export type LeaveOutcome = 'deleted' | 'updated' | 'not-member';

/**
 * Takes a player out of a room and keeps the turn pointer valid. A running
 * game that drops below two players is over — the one left wins.
 */
export const removeFromRoom = (room: GameRoom, playerId: string): LeaveOutcome => {
  const index = room.players.findIndex(p => p.id === playerId);
  if (index === -1) return 'not-member';

  room.players.splice(index, 1);
  if (room.players.length === 0) return 'deleted';

  if (room.host === playerId) room.host = room.players[0].id;

  const gs = room.gameState;
  if (gs) {
    delete gs.scores[playerId];
    delete gs.legs[playerId];
    if (index < gs.currentPlayerIndex) gs.currentPlayerIndex -= 1;
    gs.currentPlayerIndex %= room.players.length;
    for (const key of ['starterIndex', 'legStarterIndex'] as const) {
      const v = gs[key];
      if (v === undefined) continue;
      gs[key] = (index < v ? v - 1 : v) % room.players.length;
    }
  }
  if (room.status === 'playing' && room.players.length < 2) room.status = 'finished';
  return 'updated';
};

export type ThrowResult =
  | { kind: 'rejected'; reason: string }
  | { kind: 'bust' }
  | { kind: 'scored' }
  | { kind: 'leg'; winner: OnlinePlayer }
  | { kind: 'match'; winner: OnlinePlayer };

interface ThrowInput { score: unknown; darts?: Array<{ multiplier?: number }> }

/**
 * Applies one visit to the room. The client-sent score is range-checked and
 * double-out is enforced from the last dart — the old handler trusted any
 * number and accepted a checkout on a single.
 */
export const applyThrow = (room: GameRoom, playerId: string, input: ThrowInput): ThrowResult => {
  const gs = room.gameState;
  if (room.status !== 'playing' || !gs) return { kind: 'rejected', reason: 'not playing' };
  const current = room.players[gs.currentPlayerIndex];
  if (!current) return { kind: 'rejected', reason: 'no current player' };
  if (current.id !== playerId) return { kind: 'rejected', reason: 'not your turn' };

  const score = input.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 180) {
    return { kind: 'rejected', reason: 'invalid score' };
  }

  const doubleOut = room.settings.doubleOut ?? true;
  const lastDart = input.darts?.[input.darts.length - 1];
  const remaining = (gs.scores[playerId] ?? room.settings.startScore) - score;
  const advance = () => { gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % room.players.length; };

  const bust = remaining < 0 ||
    (doubleOut && remaining === 1) ||
    (doubleOut && remaining === 0 && lastDart?.multiplier !== 2);
  if (bust) { advance(); return { kind: 'bust' }; }

  if (remaining > 0) {
    gs.scores[playerId] = remaining;
    advance();
    return { kind: 'scored' };
  }

  gs.legs[playerId] = (gs.legs[playerId] ?? 0) + 1;
  if (gs.legs[playerId] >= room.settings.legsToWin) {
    room.status = 'finished';
    return { kind: 'match', winner: current };
  }
  Object.keys(gs.scores).forEach(id => { gs.scores[id] = room.settings.startScore; });
  // The throw-off alternates by leg. "Whoever follows the winner" gave the
  // starter a second throw-off whenever the other player won.
  const legStarter = ((gs.legStarterIndex ?? gs.starterIndex ?? 0) + 1) % room.players.length;
  gs.legStarterIndex = legStarter;
  gs.currentPlayerIndex = legStarter;
  return { kind: 'leg', winner: current };
};

/**
 * A connection dropped. During a game the seat is held (true) — a phone that
 * locks its screen loses its socket within seconds, and it used to lose its
 * place in the match with it. In the lobby nothing is held (false).
 */
export const markDisconnected = (room: GameRoom, playerId: string): boolean => {
  const player = room.players.find(p => p.id === playerId);
  if (!player || room.status !== 'playing') return false;
  player.connected = false;
  return true;
};

/** The same client came back on a new socket: give it its seat again. */
export const reconnectPlayer = (room: GameRoom, playerId: string, socketId: string): boolean => {
  const player = room.players.find(p => p.id === playerId);
  if (!player) return false;
  player.socketId = socketId;
  player.connected = true;
  return true;
};

/** New match in the same room, same settings; the throw-off moves on. */
export const restartMatch = (room: GameRoom): boolean => {
  if (room.status !== 'finished' || room.players.filter(p => p.connected !== false).length < 2) return false;
  const starter = ((room.gameState?.starterIndex ?? 0) + 1) % room.players.length;
  room.status = 'playing';
  room.gameState = {
    currentPlayerIndex: starter,
    starterIndex: starter,
    legStarterIndex: starter,
    scores: Object.fromEntries(room.players.map(p => [p.id, room.settings.startScore])),
    legs: Object.fromEntries(room.players.map(p => [p.id, 0])),
  };
  return true;
};

/** Chat text: a string, trimmed, capped. */
export const cleanChatMessage = (message: unknown): string | null => {
  if (typeof message !== 'string') return null;
  const text = message.trim().slice(0, 500);
  return text.length > 0 ? text : null;
};
