import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';

import {
  OnlinePlayer, GameRoom, isMember, removeFromRoom, applyThrow, cleanChatMessage,
  markDisconnected, reconnectPlayer, restartMatch, seatIdForJoin,
} from './rooms';

/** How long a seat is held for a player whose connection dropped mid-game. */
export const RECONNECT_GRACE_MS = 60_000;

// In-memory storage (for simplicity)
const onlinePlayers: Map<string, OnlinePlayer> = new Map(); // by socket id
const gameRooms: Map<string, GameRoom> = new Map();
const graceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map(); // `${roomId}:${playerId}`

const publicRooms = () =>
  Array.from(gameRooms.values()).filter(r => !r.settings.isPrivate && r.status === 'waiting');

/**
 * A throwing handler inside socket.io is an uncaught exception in the Node
 * process — i.e. the API goes down for everyone. Every handler is wrapped.
 */
const safe = <A extends unknown[]>(name: string, fn: (...args: A) => void) => (...args: A) => {
  try {
    fn(...args);
  } catch (err) {
    console.error(`[Socket.IO] ${name} failed:`, err);
  }
};

export function setupSocketIO(server: HttpServer): Server {
  const io = new Server(server, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Player joins with their info
    socket.on('player:join', safe('player:join', (data: { name: string; playerId?: string; clientId?: string }) => {
      const player: OnlinePlayer = {
        // Stable across reconnects (the socket id is not), derived from a secret
        // the client never shares — so a broadcast seat id cannot be replayed.
        id: seatIdForJoin(data, socket.id),
        name: typeof data?.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 40) : 'Guest',
        socketId: socket.id,
        playerId: data.playerId,
        connected: true,
      };
      onlinePlayers.set(socket.id, player);
      // The client learns its public seat id from the server (it only holds the secret).
      socket.emit('session:identity', { id: player.id });

      // Back from a dropped connection: take the held seat again.
      gameRooms.forEach((room, roomId) => {
        if (!reconnectPlayer(room, player.id, socket.id)) return;
        const key = `${roomId}:${player.id}`;
        clearTimeout(graceTimers.get(key));
        graceTimers.delete(key);
        socket.join(roomId);
        socket.emit('room:rejoined', room);
        io.to(roomId).emit('room:updated', room);
      });

      // Broadcast updated player list
      io.emit('players:online', Array.from(onlinePlayers.values()));

      // Send available rooms to new player
      socket.emit('rooms:list', publicRooms());
    }));

    // Create a game room
    socket.on('room:create', safe('room:create', (data: { name: string; settings: GameRoom['settings'] }) => {
      const player = onlinePlayers.get(socket.id);
      if (!player) return;

      const roomId = `room-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const room: GameRoom = {
        id: roomId,
        name: typeof data?.name === 'string' ? data.name.trim().slice(0, 60) : 'Room',
        host: player.id,
        players: [player],
        settings: data.settings,
        status: 'waiting',
      };

      gameRooms.set(roomId, room);
      socket.join(roomId);
      
      socket.emit('room:created', room);
      io.emit('rooms:list', publicRooms());
    }));

    // Join a game room
    socket.on('room:join', safe('room:join', (roomId: string) => {
      const player = onlinePlayers.get(socket.id);
      const room = gameRooms.get(roomId);
      
      if (!player || !room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Game already started' });
        return;
      }

      if (room.players.length >= 4) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      if (isMember(room, player.id)) return;
      room.players.push(player);
      socket.join(roomId);
      
      io.to(roomId).emit('room:updated', room);
      io.emit('rooms:list', publicRooms());
    }));

    // Leave a room
    socket.on('room:leave', safe('room:leave', (roomId: string) => {
      const room = gameRooms.get(roomId);
      const me = onlinePlayers.get(socket.id);
      if (!room || !me) return;
      const outcome = removeFromRoom(room, me.id);
      if (outcome === 'not-member') return;
      socket.leave(roomId);
      if (outcome === 'deleted') gameRooms.delete(roomId);
      else io.to(roomId).emit('room:updated', room);
      io.emit('rooms:list', publicRooms());
    }));

    // Start game
    socket.on('game:start', safe('game:start', (roomId: string) => {
      const room = gameRooms.get(roomId);
      const me = onlinePlayers.get(socket.id);
      if (!room || !me || room.host !== me.id || room.status !== 'waiting') return;

      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players' });
        return;
      }

      room.status = 'playing';
      room.gameState = {
        currentPlayerIndex: 0,
        starterIndex: 0,
        legStarterIndex: 0,
        scores: Object.fromEntries(room.players.map(p => [p.id, room.settings.startScore])),
        legs: Object.fromEntries(room.players.map(p => [p.id, 0])),
      };

      io.to(roomId).emit('game:started', room);
      io.emit('rooms:list', publicRooms());
    }));

    // Submit throw
    socket.on('game:throw', safe('game:throw', (data: { roomId: string; darts?: Array<{ multiplier?: number }>; score: unknown }) => {
      const room = gameRooms.get(data?.roomId);
      const me = onlinePlayers.get(socket.id);
      if (!room || !me) return;
      const before = room.gameState?.scores[me.id];
      const result = applyThrow(room, me.id, data);
      if (result.kind === 'rejected') {
        socket.emit('game:rejected', { reason: result.reason });
        return;
      }
      const score = data.score as number;
      // One event per visit: the client shows it and a screen reader announces it.
      io.to(room.id).emit('game:visit', {
        playerId: me.id,
        name: me.name,
        score: result.kind === 'bust' ? 0 : score,
        thrown: score,
        remaining: result.kind === 'bust' ? before : result.kind === 'scored' ? before! - score : 0,
        bust: result.kind === 'bust',
      });
      if (result.kind === 'bust') {
        io.to(room.id).emit('game:bust', { playerId: me.id, darts: data.darts });
      } else if (result.kind === 'leg') {
        io.to(room.id).emit('game:legWon', { winner: result.winner, legs: room.gameState?.legs });
      } else if (result.kind === 'match') {
        io.to(room.id).emit('game:finished', { winner: result.winner, legs: room.gameState?.legs });
        io.to(room.id).emit('room:updated', room);
      }
      io.to(room.id).emit('game:state', room.gameState);
    }));

    // Rematch in the same room (host, after a finished match)
    socket.on('game:rematch', safe('game:rematch', (roomId: string) => {
      const room = gameRooms.get(roomId);
      const me = onlinePlayers.get(socket.id);
      if (!room || !me || room.host !== me.id) return;
      if (restartMatch(room)) io.to(roomId).emit('game:started', room);
    }));

    // Refresh the public room list (the lobby's refresh button)
    socket.on('rooms:refresh', safe('rooms:refresh', () => {
      socket.emit('rooms:list', publicRooms());
    }));

    // Chat message
    socket.on('chat:message', safe('chat:message', (data: { roomId: string; message: unknown }) => {
      const player = onlinePlayers.get(socket.id);
      const room = gameRooms.get(data?.roomId);
      // Only members may talk in a room — it used to accept any roomId.
      if (!player || !isMember(room, player.id)) return;
      const message = cleanChatMessage(data.message);
      if (!message) return;
      io.to(data.roomId).emit('chat:message', { from: player.name, message, timestamp: Date.now() });
    }));

    // Disconnect
    socket.on('disconnect', safe('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      const me = onlinePlayers.get(socket.id);
      onlinePlayers.delete(socket.id);

      if (me) {
        gameRooms.forEach((room, roomId) => {
          const seat = room.players.find(p => p.id === me.id);
          // Only act if this socket still owns the seat (a reconnect may already have taken it over).
          if (!seat || seat.socketId !== socket.id) return;
          const drop = () => {
            const outcome = removeFromRoom(room, me.id);
            if (outcome === 'not-member') return;
            if (outcome === 'deleted') {
              gameRooms.delete(roomId);
            } else {
              io.to(roomId).emit('room:updated', room);
              io.to(roomId).emit('player:left', { playerId: me.id });
              if (room.gameState) io.to(roomId).emit('game:state', room.gameState);
            }
            io.emit('rooms:list', publicRooms());
          };
          if (markDisconnected(room, me.id)) {
            // Mid-game: hold the seat for a while instead of ending the match.
            io.to(roomId).emit('room:updated', room);
            const key = `${roomId}:${me.id}`;
            clearTimeout(graceTimers.get(key));
            graceTimers.set(key, setTimeout(() => {
              graceTimers.delete(key);
              if (room.players.find(p => p.id === me.id)?.connected === false) drop();
            }, RECONNECT_GRACE_MS));
          } else {
            drop();
          }
        });
      }

      io.emit('players:online', Array.from(onlinePlayers.values()));
      io.emit('rooms:list', publicRooms());
    }));
  });

  return io;
}
