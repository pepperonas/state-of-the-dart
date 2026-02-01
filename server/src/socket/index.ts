import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config';

interface OnlinePlayer {
  oderId: string;
  odername: string;
  odersocketId: string;
  oderplayerId?: string;
}

interface GameRoom {
  id: string;
  name: string;
  host: string;
  players: OnlinePlayer[];
  settings: {
    gameType: string;
    startScore: number;
    legsToWin: number;
    isPrivate: boolean;
  };
  status: 'waiting' | 'playing' | 'finished';
  gameState?: any;
}

// In-memory storage (for simplicity)
const onlinePlayers: Map<string, OnlinePlayer> = new Map();
const gameRooms: Map<string, GameRoom> = new Map();

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
    socket.on('player:join', (data: { name: string; playerId?: string }) => {
      const player: OnlinePlayer = {
        oderId: socket.id,
        odername: data.name,
        odersocketId: socket.id,
        oderplayerId: data.playerId,
      };
      onlinePlayers.set(socket.id, player);
      
      // Broadcast updated player list
      io.emit('players:online', Array.from(onlinePlayers.values()));
      
      // Send available rooms to new player
      socket.emit('rooms:list', Array.from(gameRooms.values()).filter(r => !r.settings.isPrivate && r.status === 'waiting'));
    });

    // Create a game room
    socket.on('room:create', (data: { name: string; settings: GameRoom['settings'] }) => {
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
      io.emit('rooms:list', Array.from(gameRooms.values()).filter(r => !r.settings.isPrivate && r.status === 'waiting'));
    });

    // Join a game room
    socket.on('room:join', (roomId: string) => {
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
      io.emit('rooms:list', Array.from(gameRooms.values()).filter(r => !r.settings.isPrivate && r.status === 'waiting'));
    });

    // Leave a room
    socket.on('room:leave', (roomId: string) => {
      const room = gameRooms.get(roomId);
      if (!room) return;

      room.players = room.players.filter(p => p.odersocketId !== socket.id);
      socket.leave(roomId);

      if (room.players.length === 0) {
        gameRooms.delete(roomId);
      } else if (room.host === socket.id) {
        // Transfer host to next player
        room.host = room.players[0].odersocketId;
      }

      io.to(roomId).emit('room:updated', room);
      io.emit('rooms:list', Array.from(gameRooms.values()).filter(r => !r.settings.isPrivate && r.status === 'waiting'));
    });

    // Start game
    socket.on('game:start', (roomId: string) => {
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
          acc[p.odersocketId] = room.settings.startScore;
          return acc;
        }, {} as Record<string, number>),
        legs: room.players.reduce((acc, p) => {
          acc[p.odersocketId] = 0;
          return acc;
        }, {} as Record<string, number>),
      };

      io.to(roomId).emit('game:started', room);
      io.emit('rooms:list', Array.from(gameRooms.values()).filter(r => !r.settings.isPrivate && r.status === 'waiting'));
    });

    // Submit throw
    socket.on('game:throw', (data: { roomId: string; darts: any[]; score: number }) => {
      const room = gameRooms.get(data.roomId);
      if (!room || room.status !== 'playing') return;

      const currentPlayer = room.players[room.gameState.currentPlayerIndex];
      if (currentPlayer.odersocketId !== socket.id) return;

      // Update score
      const newScore = room.gameState.scores[socket.id] - data.score;
      
      if (newScore < 0 || newScore === 1) {
        // Bust - score stays the same
        io.to(data.roomId).emit('game:bust', { 
          playerId: socket.id, 
          darts: data.darts 
        });
      } else if (newScore === 0) {
        // Checkout!
        room.gameState.legs[socket.id]++;
        
        // Check for match win
        if (room.gameState.legs[socket.id] >= room.settings.legsToWin) {
          room.status = 'finished';
          io.to(data.roomId).emit('game:finished', {
            winner: currentPlayer,
            legs: room.gameState.legs,
          });
        } else {
          // Reset scores for new leg
          Object.keys(room.gameState.scores).forEach(id => {
            room.gameState.scores[id] = room.settings.startScore;
          });
          io.to(data.roomId).emit('game:legWon', {
            winner: currentPlayer,
            legs: room.gameState.legs,
          });
        }
      } else {
        room.gameState.scores[socket.id] = newScore;
      }

      // Next player
      room.gameState.currentPlayerIndex = (room.gameState.currentPlayerIndex + 1) % room.players.length;

      io.to(data.roomId).emit('game:state', room.gameState);
    });

    // Chat message
    socket.on('chat:message', (data: { roomId: string; message: string }) => {
      const player = onlinePlayers.get(socket.id);
      if (!player) return;

      io.to(data.roomId).emit('chat:message', {
        from: player.odername,
        message: data.message,
        timestamp: Date.now(),
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      
      // Remove from online players
      onlinePlayers.delete(socket.id);
      
      // Remove from rooms
      gameRooms.forEach((room, roomId) => {
        const wasInRoom = room.players.some(p => p.odersocketId === socket.id);
        if (wasInRoom) {
          room.players = room.players.filter(p => p.odersocketId !== socket.id);
          
          if (room.players.length === 0) {
            gameRooms.delete(roomId);
          } else if (room.host === socket.id) {
            room.host = room.players[0].odersocketId;
          }
          
          io.to(roomId).emit('room:updated', room);
          io.to(roomId).emit('player:left', { socketId: socket.id });
        }
      });
      
      // Broadcast updated lists
      io.emit('players:online', Array.from(onlinePlayers.values()));
      io.emit('rooms:list', Array.from(gameRooms.values()).filter(r => !r.settings.isPrivate && r.status === 'waiting'));
    });
  });

  return io;
}
