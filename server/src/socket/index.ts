import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';

import { OnlinePlayer, GameRoom, isMember, removeFromRoom, applyThrow, cleanChatMessage } from './rooms';

// In-memory storage (for simplicity)
const onlinePlayers: Map<string, OnlinePlayer> = new Map();
const gameRooms: Map<string, GameRoom> = new Map();

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
    socket.on('player:join', safe('player:join', (data: { name: string; playerId?: string }) => {
      const player: OnlinePlayer = {
        id: socket.id,
        name: typeof data?.name === 'string' && data.name.trim() ? data.name.trim().slice(0, 40) : 'Guest',
        socketId: socket.id,
        playerId: data.playerId,
      };
      onlinePlayers.set(socket.id, player);
      
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
        name: data.name,
        host: socket.id,
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

      room.players.push(player);
      socket.join(roomId);
      
      io.to(roomId).emit('room:updated', room);
      io.emit('rooms:list', publicRooms());
    }));

    // Leave a room
    socket.on('room:leave', safe('room:leave', (roomId: string) => {
      const room = gameRooms.get(roomId);
      if (!room) return;
      const outcome = removeFromRoom(room, socket.id);
      if (outcome === 'not-member') return;
      socket.leave(roomId);
      if (outcome === 'deleted') gameRooms.delete(roomId);
      else io.to(roomId).emit('room:updated', room);
      io.emit('rooms:list', publicRooms());
    }));

    // Start game
    socket.on('game:start', safe('game:start', (roomId: string) => {
      const room = gameRooms.get(roomId);
      if (!room || room.host !== socket.id) return;

      if (room.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players' });
        return;
      }

      room.status = 'playing';
      room.gameState = {
        currentPlayerIndex: 0,
        scores: room.players.reduce((acc, p) => {
          acc[p.socketId] = room.settings.startScore;
          return acc;
        }, {} as Record<string, number>),
        legs: room.players.reduce((acc, p) => {
          acc[p.socketId] = 0;
          return acc;
        }, {} as Record<string, number>),
      };

      io.to(roomId).emit('game:started', room);
      io.emit('rooms:list', publicRooms());
    }));

    // Submit throw
    socket.on('game:throw', safe('game:throw', (data: { roomId: string; darts?: Array<{ multiplier?: number }>; score: unknown }) => {
      const room = gameRooms.get(data?.roomId);
      if (!room) return;
      const result = applyThrow(room, socket.id, data);
      if (result.kind === 'rejected') return;
      if (result.kind === 'bust') {
        io.to(room.id).emit('game:bust', { playerId: socket.id, darts: data.darts });
      } else if (result.kind === 'leg') {
        io.to(room.id).emit('game:legWon', { winner: result.winner, legs: room.gameState?.legs });
      } else if (result.kind === 'match') {
        io.to(room.id).emit('game:finished', { winner: result.winner, legs: room.gameState?.legs });
      }
      io.to(room.id).emit('game:state', room.gameState);
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
      if (!player || !isMember(room, socket.id)) return;
      const message = cleanChatMessage(data.message);
      if (!message) return;
      io.to(data.roomId).emit('chat:message', { from: player.name, message, timestamp: Date.now() });
    }));

    // Disconnect
    socket.on('disconnect', safe('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      onlinePlayers.delete(socket.id);

      gameRooms.forEach((room, roomId) => {
        const outcome = removeFromRoom(room, socket.id);
        if (outcome === 'not-member') return;
        if (outcome === 'deleted') {
          gameRooms.delete(roomId);
          return;
        }
        io.to(roomId).emit('room:updated', room);
        io.to(roomId).emit('player:left', { socketId: socket.id });
        if (room.gameState) io.to(roomId).emit('game:state', room.gameState);
      });

      io.emit('players:online', Array.from(onlinePlayers.values()));
      io.emit('rooms:list', publicRooms());
    }));
  });

  return io;
}
