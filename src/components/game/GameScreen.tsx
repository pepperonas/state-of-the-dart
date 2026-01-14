import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Pause, Play, X } from 'lucide-react';
import Confetti from 'react-confetti';
import { useGame } from '../../context/GameContext';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings } from '../../context/SettingsContext';
import Dartboard from '../dartboard/Dartboard';
import ScoreInput from './ScoreInput';
import PlayerScore from './PlayerScore';
import CheckoutSuggestion from '../dartboard/CheckoutSuggestion';
import { Dart, Player, GameType, MatchSettings } from '../../types/index';
import { calculateThrowScore } from '../../utils/scoring';
import audioSystem from '../../utils/audio';

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { players, addPlayer } = usePlayer();
  const { settings } = useSettings();
  
  useEffect(() => {
    audioSystem.setEnabled(settings.soundVolume > 0);
    audioSystem.setVolume(settings.soundVolume);
  }, [settings.soundVolume]);
  const [showSetup, setShowSetup] = useState(!state.currentMatch);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showPlayerNameInput, setShowPlayerNameInput] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState('🎯');
  const [showConfetti, setShowConfetti] = useState(false);
  const [gameSettings, setGameSettings] = useState<MatchSettings>({
    startScore: 501,
    legsToWin: 3,
    setsToWin: 1,
    doubleOut: true,
    doubleIn: false,
  });
  
  useEffect(() => {
    if (!state.currentMatch && showSetup === false) {
      setShowSetup(true);
    }
  }, [state.currentMatch]);
  
  const handleStartGame = () => {
    if (selectedPlayers.length < 2) {
      // Add a guest player if only one selected
      const guestPlayer = addPlayer(`Guest ${Date.now() % 1000}`, '👤');
      setSelectedPlayers([...selectedPlayers, guestPlayer]);
    }
    
    dispatch({
      type: 'START_MATCH',
      payload: {
        players: selectedPlayers.length >= 2 ? selectedPlayers : [...selectedPlayers, addPlayer('Guest', '👤')],
        settings: gameSettings,
        gameType: 'x01' as GameType,
      },
    });
    setShowSetup(false);
  };
  
  const handleDartHit = (dart: Dart) => {
    dispatch({ type: 'ADD_DART', payload: dart });
  };
  
  const handleConfirmThrow = () => {
    const currentScore = calculateThrowScore(state.currentThrow);
    
    // Play sounds and animations
    if (currentScore === 180) {
      setShowConfetti(true);
      audioSystem.announceScore(180);
      setTimeout(() => setShowConfetti(false), 3000);
    } else if (currentScore >= 100) {
      audioSystem.announceScore(currentScore);
    }
    
    dispatch({ type: 'CONFIRM_THROW' });
    if (settings.autoNextPlayer) {
      setTimeout(() => {
        dispatch({ type: 'NEXT_PLAYER' });
      }, 1000);
    }
  };
  
  const handleUndoThrow = () => {
    dispatch({ type: 'UNDO_THROW' });
  };
  
  const handleRemoveDart = () => {
    dispatch({ type: 'REMOVE_DART' });
  };
  
  const handleClearThrow = () => {
    dispatch({ type: 'CLEAR_THROW' });
  };
  
  const handleEndMatch = () => {
    dispatch({ type: 'END_MATCH' });
    navigate('/');
  };
  
  if (showSetup) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 text-gray-200 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Menu
          </button>
          
          <div className="glass-card rounded-xl shadow-lg p-6">
            <h2 className="text-3xl font-bold mb-6 text-white">Game Setup</h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-200">Select Players</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {players.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => {
                      if (selectedPlayers.find(p => p.id === player.id)) {
                        setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
                      } else {
                        setSelectedPlayers([...selectedPlayers, player]);
                      }
                    }}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">{player.avatar}</div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{player.name}</div>
                  </button>
                ))}
                {!showPlayerNameInput ? (
                  <button
                    onClick={() => setShowPlayerNameInput(true)}
                    className="p-3 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                  >
                    <div className="text-2xl mb-1">➕</div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Add Player</div>
                  </button>
                ) : (
                  <div className="p-3 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {['🎯', '🏆', '👑', '🔥', '⭐', '💪', '🎪', '🦅'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => setNewPlayerAvatar(emoji)}
                            className={`text-2xl p-1 rounded ${newPlayerAvatar === emoji ? 'bg-green-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && newPlayerName.trim()) {
                            const newPlayer = addPlayer(newPlayerName.trim(), newPlayerAvatar);
                            setSelectedPlayers([...selectedPlayers, newPlayer]);
                            setNewPlayerName('');
                            setNewPlayerAvatar('🎯');
                            setShowPlayerNameInput(false);
                          }
                        }}
                        placeholder="Player name..."
                        className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (newPlayerName.trim()) {
                              const newPlayer = addPlayer(newPlayerName.trim(), newPlayerAvatar);
                              setSelectedPlayers([...selectedPlayers, newPlayer]);
                              setNewPlayerName('');
                              setNewPlayerAvatar('🎯');
                              setShowPlayerNameInput(false);
                            }
                          }}
                          disabled={!newPlayerName.trim()}
                          className="flex-1 py-1 px-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowPlayerNameInput(false);
                            setNewPlayerName('');
                            setNewPlayerAvatar('🎯');
                          }}
                          className="flex-1 py-1 px-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Starting Score
                </label>
                <select
                  value={gameSettings.startScore}
                  onChange={(e) => setGameSettings({ ...gameSettings, startScore: parseInt(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-gray-300/30 bg-white/10 backdrop-blur-sm text-white"
                >
                  <option value={301}>301</option>
                  <option value={501}>501</option>
                  <option value={701}>701</option>
                  <option value={1001}>1001</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200">
                  Legs to Win
                </label>
                <select
                  value={gameSettings.legsToWin}
                  onChange={(e) => setGameSettings({ ...gameSettings, legsToWin: parseInt(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-gray-300/30 bg-white/10 backdrop-blur-sm text-white"
                >
                  <option value={1}>First to 1</option>
                  <option value={2}>First to 2</option>
                  <option value={3}>First to 3</option>
                  <option value={5}>First to 5</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={gameSettings.doubleOut}
                  onChange={(e) => setGameSettings({ ...gameSettings, doubleOut: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-gray-200">Double Out</span>
              </label>
              
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={gameSettings.doubleIn}
                  onChange={(e) => setGameSettings({ ...gameSettings, doubleIn: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-gray-200">Double In</span>
              </label>
            </div>
            
            <button
              onClick={handleStartGame}
              disabled={selectedPlayers.length === 0}
              className="w-full py-3 px-6 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Start Game
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!state.currentMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">No active game</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }
  
  const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
  const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
  const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
  const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
  const currentThrowScore = calculateThrowScore(state.currentThrow);
  const remaining = (state.currentMatch.settings.startScore || 501) - totalScored - currentThrowScore;
  
  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} gravity={0.3} />}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            Menu
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleUndoThrow}
              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-white transition-all"
              title="Undo last throw"
            >
              <RotateCcw size={20} />
            </button>
            
            <button
              onClick={() => {
                if (state.currentMatch?.status === 'paused') {
                  dispatch({ type: 'RESUME_MATCH' });
                } else {
                  dispatch({ type: 'PAUSE_MATCH' });
                }
              }}
              className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-white transition-all"
              title={state.currentMatch?.status === 'paused' ? 'Resume' : 'Pause'}
            >
              {state.currentMatch?.status === 'paused' ? <Play size={20} /> : <Pause size={20} />}
            </button>
            
            <button
              onClick={handleEndMatch}
              className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              title="End match"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Players Section */}
          <div className="lg:col-span-1 space-y-4">
            {state.currentMatch.players.map((player, index) => (
              <PlayerScore
                key={player.playerId}
                player={player}
                remaining={
                  index === state.currentPlayerIndex
                    ? remaining
                    : (() => {
                        const throws = currentLeg.throws.filter(t => t.playerId === player.playerId);
                        const scored = throws.reduce((sum, t) => sum + t.score, 0);
                        return (state.currentMatch!.settings.startScore || 501) - scored;
                      })()
                }
                isActive={index === state.currentPlayerIndex}
                average={player.matchAverage}
                legsWon={player.legsWon}
                setsWon={player.setsWon}
              />
            ))}
          </div>
          
          {/* Center Section - Dartboard and Input */}
          <div className="lg:col-span-1 flex flex-col items-center space-y-6">
            {settings.showDartboardHelper && (
              <div className="w-full max-w-sm">
                <Dartboard
                  onDartHit={handleDartHit}
                  highlightedSegments={state.checkoutSuggestion || []}
                  size={320}
                />
              </div>
            )}
            
            {state.checkoutSuggestion && (
              <CheckoutSuggestion
                suggestion={state.checkoutSuggestion}
                remaining={remaining}
              />
            )}
            
            <ScoreInput
              currentThrow={state.currentThrow}
              onAddDart={handleDartHit}
              onRemoveDart={handleRemoveDart}
              onClearThrow={handleClearThrow}
              onConfirm={handleConfirmThrow}
              remaining={remaining}
            />
          </div>
          
          {/* Stats Section */}
          <div className="lg:col-span-1">
            {settings.showStatsDuringGame && (
              <div className="glass-card rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold mb-4 text-white">Match Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Average:</span>
                    <span className="font-semibold text-white">{currentPlayer.matchAverage.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Highest Score:</span>
                    <span className="font-semibold text-white">{currentPlayer.matchHighestScore}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">180s:</span>
                    <span className="font-semibold text-white">{currentPlayer.match180s}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">140+:</span>
                    <span className="font-semibold text-white">{currentPlayer.match140Plus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">100+:</span>
                    <span className="font-semibold text-white">{currentPlayer.match100Plus}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Checkout %:</span>
                    <span className="font-semibold text-white">
                      {currentPlayer.checkoutAttempts > 0
                        ? ((currentPlayer.checkoutsHit / currentPlayer.checkoutAttempts) * 100).toFixed(1)
                        : '0.0'}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameScreen;