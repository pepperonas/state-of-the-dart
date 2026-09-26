/**
 * Room bookkeeping for online play, free of Socket.IO so it can be tested.
 *
 * Every function here is total: a handler that throws inside socket.io takes
 * the whole Node process down, and the old code did exactly that when a
 * player left mid-game (`room.players[index]` became undefined).
 */

export interface OnlinePlayer {
  id: string;
  name: string;
  socketId: string;
  playerId?: string;
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
  gameState?: {
    currentPlayerIndex: number;
    scores: Record<string, number>;
    legs: Record<string, number>;
  };
}

export const isMember = (room: GameRoom | undefined, socketId: string): boolean =>
  !!room && room.players.some(p => p.socketId === socketId);

export type LeaveOutcome = 'deleted' | 'updated' | 'not-member';

/**
 * Takes a player out of a room and keeps the turn pointer valid. A running
 * game that drops below two players is over — the one left wins.
 */
export const removeFromRoom = (room: GameRoom, socketId: string): LeaveOutcome => {
  const index = room.players.findIndex(p => p.socketId === socketId);
  if (index === -1) return 'not-member';

  room.players.splice(index, 1);
  if (room.players.length === 0) return 'deleted';

  if (room.host === socketId) room.host = room.players[0].socketId;

  const gs = room.gameState;
  if (gs) {
    delete gs.scores[socketId];
    delete gs.legs[socketId];
    if (index < gs.currentPlayerIndex) gs.currentPlayerIndex -= 1;
    gs.currentPlayerIndex %= room.players.length;
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
export const applyThrow = (room: GameRoom, socketId: string, input: ThrowInput): ThrowResult => {
  const gs = room.gameState;
  if (room.status !== 'playing' || !gs) return { kind: 'rejected', reason: 'not playing' };
  const current = room.players[gs.currentPlayerIndex];
  if (!current) return { kind: 'rejected', reason: 'no current player' };
  if (current.socketId !== socketId) return { kind: 'rejected', reason: 'not your turn' };

  const score = input.score;
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 180) {
    return { kind: 'rejected', reason: 'invalid score' };
  }

  const doubleOut = room.settings.doubleOut ?? true;
  const lastDart = input.darts?.[input.darts.length - 1];
  const remaining = (gs.scores[socketId] ?? room.settings.startScore) - score;
  const advance = () => { gs.currentPlayerIndex = (gs.currentPlayerIndex + 1) % room.players.length; };

  const bust = remaining < 0 ||
    (doubleOut && remaining === 1) ||
    (doubleOut && remaining === 0 && lastDart?.multiplier !== 2);
  if (bust) { advance(); return { kind: 'bust' }; }

  if (remaining > 0) {
    gs.scores[socketId] = remaining;
    advance();
    return { kind: 'scored' };
  }

  gs.legs[socketId] = (gs.legs[socketId] ?? 0) + 1;
  if (gs.legs[socketId] >= room.settings.legsToWin) {
    room.status = 'finished';
    return { kind: 'match', winner: current };
  }
  Object.keys(gs.scores).forEach(id => { gs.scores[id] = room.settings.startScore; });
  advance();
  return { kind: 'leg', winner: current };
};

/** Chat text: a string, trimmed, capped. */
export const cleanChatMessage = (message: unknown): string | null => {
  if (typeof message !== 'string') return null;
  const text = message.trim().slice(0, 500);
  return text.length > 0 ? text : null;
};
