import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, Plus, Play, RefreshCw, Send,
  Globe, Lock, Wifi, WifiOff, Crown, MessageCircle, Copy, Check, LogIn
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import PlayerAvatar from '../player/PlayerAvatar';
import { Button, Card, TextField, Dialog, IconButton, Chip, BackButton } from '../common';

interface OnlinePlayer {
  id: string;
  name: string;
  socketId: string;
  playerId?: string;
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

interface ChatMessage {
  from: string;
  message: string;
  timestamp: number;
}

const OnlineMultiplayer: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players } = usePlayer();
  const { user } = useAuth();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  
  // Create room form
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [startScore, setStartScore] = useState(501);
  const [legsToWin, setLegsToWin] = useState(3);
  const [isPrivate, setIsPrivate] = useState(false);

  // Join private room
  const [joinRoomId, setJoinRoomId] = useState('');
  const [copiedRoomId, setCopiedRoomId] = useState(false);

  // Connect to socket
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://api.stateofthedart.com';
    const newSocket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('[Socket.IO] Connected');
      setConnected(true);
      
      // Join with player info
      const mainPlayer = players.find(p => !p.isBot);
      newSocket.emit('player:join', {
        name: mainPlayer?.name || user?.email || 'Guest',
        playerId: mainPlayer?.id,
      });
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected');
      setConnected(false);
    });

    newSocket.on('players:online', (players: OnlinePlayer[]) => {
      setOnlinePlayers(players);
    });

    newSocket.on('rooms:list', (roomList: GameRoom[]) => {
      setRooms(roomList);
    });

    newSocket.on('room:created', (room: GameRoom) => {
      setCurrentRoom(room);
      setShowCreateRoom(false);
    });

    newSocket.on('room:updated', (room: GameRoom) => {
      setCurrentRoom(room);
    });

    newSocket.on('game:started', (room: GameRoom) => {
      setCurrentRoom(room);
    });

    newSocket.on('game:state', (state: any) => {
      setCurrentRoom(prev => prev ? { ...prev, gameState: state } : null);
    });

    newSocket.on('chat:message', (msg: ChatMessage) => {
      setChatMessages(prev => [...prev, msg]);
    });

    newSocket.on('error', (error: { message: string }) => {
      console.error('[Socket.IO] Error:', error.message);
      alert(error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [players, user]);

  const handleCreateRoom = () => {
    if (!socket || !roomName.trim()) return;
    
    socket.emit('room:create', {
      name: roomName,
      settings: {
        gameType: 'x01',
        startScore,
        legsToWin,
        isPrivate,
      },
    });
  };

  const handleJoinRoom = (roomId: string) => {
    if (!socket) return;
    socket.emit('room:join', roomId);
  };

  const handleLeaveRoom = () => {
    if (!socket || !currentRoom) return;
    socket.emit('room:leave', currentRoom.id);
    setCurrentRoom(null);
    setChatMessages([]);
  };

  const handleStartGame = () => {
    if (!socket || !currentRoom) return;
    socket.emit('game:start', currentRoom.id);
  };

  const handleSendChat = () => {
    if (!socket || !currentRoom || !chatInput.trim()) return;
    socket.emit('chat:message', {
      roomId: currentRoom.id,
      message: chatInput,
    });
    setChatInput('');
  };

  const handleCopyRoomId = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.id).then(() => {
      setCopiedRoomId(true);
      setTimeout(() => setCopiedRoomId(false), 2000);
    });
  };

  const handleJoinByCode = () => {
    if (!socket || !joinRoomId.trim()) return;
    socket.emit('room:join', joinRoomId.trim());
    setJoinRoomId('');
  };

  const isHost = currentRoom?.host === socket?.id;

  // Room View
  if (currentRoom) {
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <BackButton onClick={handleLeaveRoom} label="Raum verlassen" />
            <div className="flex items-center gap-2">
              {connected ? (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-m3-full bg-success-container text-on-success-container m3-label-large">
                  <Wifi size={16} /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1.5 rounded-m3-full bg-error-container text-on-error-container m3-label-large">
                  <WifiOff size={16} /> Offline
                </span>
              )}
            </div>
          </div>

          {/* Room Info */}
          <Card variant="elevated" className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="m3-headline-small text-on-surface flex items-center gap-2">
                  {currentRoom.settings.isPrivate && <Lock size={20} className="text-tertiary" />}
                  {currentRoom.name}
                </h1>
                <p className="text-on-surface-variant">
                  {currentRoom.settings.startScore} • Best of {currentRoom.settings.legsToWin * 2 - 1}
                </p>
                {currentRoom.settings.isPrivate && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-on-surface-variant m3-body-small">{t('online.room_id')}:</span>
                    <code className="text-primary font-mono">{currentRoom.id}</code>
                    <IconButton variant="tonal" label="Copy room ID" onClick={handleCopyRoomId}>
                      {copiedRoomId ? (
                        <Check size={16} className="text-success" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </IconButton>
                  </div>
                )}
              </div>
              <div className={`px-4 py-2 rounded-m3-full m3-label-large ${
                currentRoom.status === 'waiting'
                  ? 'bg-tertiary-container text-on-tertiary-container'
                  : currentRoom.status === 'playing'
                  ? 'bg-success-container text-on-success-container'
                  : 'bg-surface-container-high text-on-surface-variant'
              }`}>
                {currentRoom.status === 'waiting' ? 'Wartet...' :
                 currentRoom.status === 'playing' ? 'Läuft' : 'Beendet'}
              </div>
            </div>

            {/* Players */}
            <h3 className="text-on-surface m3-title-small mb-3">Spieler ({currentRoom.players.length}/4)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {currentRoom.players.map((player, idx) => (
                <div
                  key={player.socketId}
                  className={`p-4 rounded-m3-lg text-center ${
                    player.socketId === currentRoom.host
                      ? 'bg-tertiary-container ring-2 ring-tertiary'
                      : 'bg-surface-container-high'
                  }`}
                >
                  <div className="relative inline-block">
                    <div className="w-12 h-12 rounded-m3-full bg-primary flex items-center justify-center text-on-primary text-xl font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    {player.socketId === currentRoom.host && (
                      <Crown size={16} className="absolute -top-1 -right-1 text-tertiary" />
                    )}
                  </div>
                  <p className="text-on-surface font-medium mt-2 text-sm truncate">{player.name}</p>
                  {currentRoom.gameState && (
                    <p className="text-primary text-xl font-bold">
                      {currentRoom.gameState.scores[player.socketId]}
                    </p>
                  )}
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: 4 - currentRoom.players.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="p-4 rounded-m3-lg text-center bg-surface-container border-2 border-dashed border-outline-variant"
                >
                  <div className="w-12 h-12 rounded-m3-full bg-surface-container-high flex items-center justify-center mx-auto">
                    <Users size={20} className="text-on-surface-variant" />
                  </div>
                  <p className="text-on-surface-variant mt-2 text-sm">Leer</p>
                </div>
              ))}
            </div>

            {/* Start Button (Host only) */}
            {currentRoom.status === 'waiting' && isHost && (
              <Button
                variant="success"
                size="lg"
                fullWidth
                onClick={handleStartGame}
                disabled={currentRoom.players.length < 2}
                icon={<Play size={24} />}
              >
                Spiel starten
              </Button>
            )}

            {currentRoom.status === 'waiting' && !isHost && (
              <p className="text-center text-on-surface-variant">
                Warte auf Host zum Starten...
              </p>
            )}
          </Card>

          {/* Chat */}
          <Card variant="elevated" className="p-4">
            <h3 className="text-on-surface m3-title-small mb-3 flex items-center gap-2">
              <MessageCircle size={18} />
              Chat
            </h3>

            <div className="h-48 overflow-y-auto mb-3 space-y-2 bg-surface-container rounded-m3-md p-3">
              {chatMessages.length === 0 ? (
                <p className="text-on-surface-variant text-center text-sm">Noch keine Nachrichten</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="text-primary font-medium">{msg.from}:</span>
                    <span className="text-on-surface-variant ml-2">{msg.message}</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 items-end">
              <TextField
                className="flex-1"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Nachricht..."
              />
              <IconButton variant="filled" label="Send message" onClick={handleSendChat}>
                <Send size={18} />
              </IconButton>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Lobby View
  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <BackButton onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-m3-full bg-success-container text-on-success-container m3-label-large">
                <Wifi size={16} /> {onlinePlayers.length} Online
              </span>
            ) : (
              <span className="flex items-center gap-1 px-3 py-1.5 rounded-m3-full bg-error-container text-on-error-container m3-label-large">
                <WifiOff size={16} /> Verbinde...
              </span>
            )}
          </div>
        </div>

        <Card variant="elevated" className="p-6 mb-6">
          <h1 className="m3-headline-medium text-on-surface mb-2 flex items-center gap-3">
            <Globe className="text-primary" />
            Online Multiplayer
          </h1>
          <p className="text-on-surface-variant">Spiele gegen andere Spieler in Echtzeit</p>
        </Card>

        {/* Create Room Button */}
        <Button
          variant="filled"
          size="lg"
          fullWidth
          onClick={() => setShowCreateRoom(true)}
          icon={<Plus size={24} />}
          className="mb-6"
        >
          Raum erstellen
        </Button>

        {/* Join Private Room by Code */}
        <Card variant="elevated" className="p-4 mb-6">
          <h3 className="text-on-surface m3-title-small mb-3 flex items-center gap-2">
            <LogIn size={18} />
            {t('online.join_private')}
          </h3>
          <div className="flex gap-2 items-end">
            <TextField
              className="flex-1"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinByCode()}
              placeholder={t('online.enter_room_id')}
            />
            <Button
              variant="filled"
              onClick={handleJoinByCode}
              disabled={!joinRoomId.trim()}
            >
              {t('online.join')}
            </Button>
          </div>
        </Card>

        {/* Create Room Modal */}
        <Dialog
          open={showCreateRoom}
          onClose={() => setShowCreateRoom(false)}
          title="Raum erstellen"
          actions={
            <>
              <Button variant="text" onClick={() => setShowCreateRoom(false)}>
                Abbrechen
              </Button>
              <Button variant="filled" onClick={handleCreateRoom} disabled={!roomName.trim()}>
                Erstellen
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <TextField
              label="Raumname"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="z.B. Freitagsrunde"
            />

            <div>
              <label className="block text-on-surface-variant m3-label-large mb-2">Startscore</label>
              <div className="flex gap-2">
                {[301, 501, 701].map(score => (
                  <Chip
                    key={score}
                    selected={startScore === score}
                    onClick={() => setStartScore(score)}
                    className="flex-1 justify-center"
                  >
                    {score}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-on-surface-variant m3-label-large mb-2">Legs zum Gewinnen</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(legs => (
                  <Chip
                    key={legs}
                    selected={legsToWin === legs}
                    onClick={() => setLegsToWin(legs)}
                    className="flex-1 justify-center"
                  >
                    {legs}
                  </Chip>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-5 h-5 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary"
              />
              <span className="text-on-surface flex items-center gap-2">
                <Lock size={16} />
                Privater Raum
              </span>
            </label>
          </div>
        </Dialog>

        {/* Available Rooms */}
        <Card variant="elevated" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="m3-title-large text-on-surface">Verfügbare Räume</h2>
            <IconButton variant="tonal" label="Refresh rooms" onClick={() => socket?.emit('rooms:refresh')}>
              <RefreshCw size={18} />
            </IconButton>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-on-surface-variant mb-4" />
              <p className="text-on-surface-variant">Keine offenen Räume verfügbar</p>
              <p className="text-on-surface-variant text-sm">Erstelle einen neuen Raum!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map(room => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 rounded-m3-lg bg-surface-container-high"
                >
                  <div>
                    <h3 className="text-on-surface m3-title-small">{room.name}</h3>
                    <p className="text-on-surface-variant text-sm">
                      {room.settings.startScore} • {room.players.length}/4 Spieler
                    </p>
                  </div>
                  <Button variant="filled" size="sm" onClick={() => handleJoinRoom(room.id)}>
                    Beitreten
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OnlineMultiplayer;
