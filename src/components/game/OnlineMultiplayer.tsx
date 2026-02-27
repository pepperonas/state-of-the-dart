import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Users, Plus, Play, RefreshCw, Send, 
  Globe, Lock, Wifi, WifiOff, Crown, MessageCircle 
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { usePlayer } from '../../context/PlayerContext';
import { useAuth } from '../../context/AuthContext';
import PlayerAvatar from '../player/PlayerAvatar';

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

  const isHost = currentRoom?.host === socket?.id;

  // Room View
  if (currentRoom) {
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleLeaveRoom}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={20} />
              Raum verlassen
            </button>
            <div className="flex items-center gap-2">
              {connected ? (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <Wifi size={16} /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400 text-sm">
                  <WifiOff size={16} /> Offline
                </span>
              )}
            </div>
          </div>

          {/* Room Info */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  {currentRoom.settings.isPrivate && <Lock size={20} className="text-yellow-400" />}
                  {currentRoom.name}
                </h1>
                <p className="text-gray-400">
                  {currentRoom.settings.startScore} • Best of {currentRoom.settings.legsToWin * 2 - 1}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                currentRoom.status === 'waiting' 
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : currentRoom.status === 'playing'
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {currentRoom.status === 'waiting' ? 'Wartet...' : 
                 currentRoom.status === 'playing' ? 'Läuft' : 'Beendet'}
              </div>
            </div>

            {/* Players */}
            <h3 className="text-white font-semibold mb-3">Spieler ({currentRoom.players.length}/4)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {currentRoom.players.map((player, idx) => (
                <div
                  key={player.socketId}
                  className={`p-4 rounded-xl text-center ${
                    player.socketId === currentRoom.host 
                      ? 'bg-yellow-500/20 ring-2 ring-yellow-500' 
                      : 'bg-dark-800'
                  }`}
                >
                  <div className="relative inline-block">
                    <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white text-xl font-bold">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    {player.socketId === currentRoom.host && (
                      <Crown size={16} className="absolute -top-1 -right-1 text-yellow-400" />
                    )}
                  </div>
                  <p className="text-white font-medium mt-2 text-sm truncate">{player.name}</p>
                  {currentRoom.gameState && (
                    <p className="text-primary-400 text-xl font-bold">
                      {currentRoom.gameState.scores[player.socketId]}
                    </p>
                  )}
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: 4 - currentRoom.players.length }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="p-4 rounded-xl text-center bg-dark-800/50 border-2 border-dashed border-dark-600"
                >
                  <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center mx-auto">
                    <Users size={20} className="text-gray-600" />
                  </div>
                  <p className="text-gray-600 mt-2 text-sm">Leer</p>
                </div>
              ))}
            </div>

            {/* Start Button (Host only) */}
            {currentRoom.status === 'waiting' && isHost && (
              <button
                onClick={handleStartGame}
                disabled={currentRoom.players.length < 2}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                  currentRoom.players.length >= 2
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                    : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Play size={24} />
                Spiel starten
              </button>
            )}

            {currentRoom.status === 'waiting' && !isHost && (
              <p className="text-center text-gray-400">
                Warte auf Host zum Starten...
              </p>
            )}
          </div>

          {/* Chat */}
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <MessageCircle size={18} />
              Chat
            </h3>
            
            <div className="h-48 overflow-y-auto mb-3 space-y-2 bg-dark-900 rounded-lg p-3">
              {chatMessages.length === 0 ? (
                <p className="text-gray-600 text-center text-sm">Noch keine Nachrichten</p>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="text-primary-400 font-medium">{msg.from}:</span>
                    <span className="text-gray-300 ml-2">{msg.message}</span>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Nachricht..."
                className="flex-1 px-4 py-2 rounded-lg bg-dark-800 border border-dark-600 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
              />
              <button
                onClick={handleSendChat}
                className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
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
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>
          <div className="flex items-center gap-2">
            {connected ? (
              <span className="flex items-center gap-1 text-green-400 text-sm">
                <Wifi size={16} /> {onlinePlayers.length} Online
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-400 text-sm">
                <WifiOff size={16} /> Verbinde...
              </span>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Globe className="text-primary-400" />
            Online Multiplayer
          </h1>
          <p className="text-gray-400">Spiele gegen andere Spieler in Echtzeit</p>
        </div>

        {/* Create Room Button */}
        <button
          onClick={() => setShowCreateRoom(true)}
          className="w-full mb-6 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all"
        >
          <Plus size={24} />
          Raum erstellen
        </button>

        {/* Create Room Modal */}
        <AnimatePresence>
          {showCreateRoom && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="glass-card rounded-2xl p-6 w-full max-w-md"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Raum erstellen</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 mb-2">Raumname</label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="z.B. Freitagsrunde"
                      className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-600 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 mb-2">Startscore</label>
                    <div className="flex gap-2">
                      {[301, 501, 701].map(score => (
                        <button
                          key={score}
                          onClick={() => setStartScore(score)}
                          className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                            startScore === score
                              ? 'bg-primary-500 text-white'
                              : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-400 mb-2">Legs zum Gewinnen</label>
                    <div className="flex gap-2">
                      {[2, 3, 4, 5].map(legs => (
                        <button
                          key={legs}
                          onClick={() => setLegsToWin(legs)}
                          className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                            legsToWin === legs
                              ? 'bg-primary-500 text-white'
                              : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                          }`}
                        >
                          {legs}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-white flex items-center gap-2">
                      <Lock size={16} />
                      Privater Raum
                    </span>
                  </label>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowCreateRoom(false)}
                    className="flex-1 py-3 rounded-xl bg-dark-700 hover:bg-dark-600 text-white font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleCreateRoom}
                    disabled={!roomName.trim()}
                    className="flex-1 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium disabled:opacity-50"
                  >
                    Erstellen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Available Rooms */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Verfügbare Räume</h2>
            <button
              onClick={() => socket?.emit('rooms:refresh')}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          
          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">Keine offenen Räume verfügbar</p>
              <p className="text-gray-500 text-sm">Erstelle einen neuen Raum!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map(room => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-dark-800 hover:bg-dark-700 transition-all"
                >
                  <div>
                    <h3 className="text-white font-semibold">{room.name}</h3>
                    <p className="text-gray-400 text-sm">
                      {room.settings.startScore} • {room.players.length}/4 Spieler
                    </p>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    className="px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium"
                  >
                    Beitreten
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlineMultiplayer;
