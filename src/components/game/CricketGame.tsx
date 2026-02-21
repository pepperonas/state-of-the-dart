import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Target, X, Check } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { usePlayer } from '../../context/PlayerContext';
import { Player, CricketState, Dart } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import confetti from 'canvas-confetti';

// Cricket numbers: 20, 19, 18, 17, 16, 15, Bull
const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25];

interface CricketGameProps {
  onBack?: () => void;
}

const CricketGame: React.FC<CricketGameProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { players } = usePlayer();
  
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [currentDarts, setCurrentDarts] = useState<Dart[]>([]);
  const [showWinner, setShowWinner] = useState(false);
  
  // Cricket state per player
  const [cricketState, setCricketState] = useState<CricketState>({});
  
  // Initialize cricket state when match starts
  useEffect(() => {
    if (state.currentMatch?.type === 'cricket' && Object.keys(cricketState).length === 0) {
      const initialState: CricketState = {};
      state.currentMatch.players.forEach(player => {
        initialState[player.playerId] = {
          '20': 0, '19': 0, '18': 0, '17': 0, '16': 0, '15': 0, '25': 0,
          points: 0
        };
      });
      setCricketState(initialState);
    }
  }, [state.currentMatch, cricketState]);

  const currentPlayer = useMemo(() => {
    if (!state.currentMatch) return null;
    return state.currentMatch.players[state.currentPlayerIndex];
  }, [state.currentMatch, state.currentPlayerIndex]);

  const handleStartGame = () => {
    if (selectedPlayers.length < 2) return;
    
    dispatch({
      type: 'START_MATCH',
      payload: {
        players: selectedPlayers,
        settings: {
          cricketMode: 'standard',
          cricketNumbers: CRICKET_NUMBERS,
        },
        gameType: 'cricket',
      },
    });
    
    // Initialize cricket state
    const initialState: CricketState = {};
    selectedPlayers.forEach(player => {
      initialState[player.id] = {
        '20': 0, '19': 0, '18': 0, '17': 0, '16': 0, '15': 0, '25': 0,
        points: 0
      };
    });
    setCricketState(initialState);
    setShowSetup(false);
  };

  const handleDartHit = (segment: number, multiplier: 1 | 2 | 3) => {
    if (!currentPlayer || currentDarts.length >= 3) return;
    
    const dart: Dart = {
      segment,
      multiplier,
      score: segment * multiplier,
      bed: multiplier === 3 ? 'triple' : multiplier === 2 ? 'double' : 'single'
    };
    
    setCurrentDarts(prev => [...prev, dart]);
  };

  const handleConfirmThrow = () => {
    if (!currentPlayer || currentDarts.length === 0) return;
    
    const playerId = currentPlayer.playerId;
    const newState = { ...cricketState };
    
    // Process each dart
    currentDarts.forEach(dart => {
      const num = dart.segment.toString();
      
      // Only count cricket numbers (15-20, 25)
      if (!CRICKET_NUMBERS.includes(dart.segment)) return;
      
      const currentMarks = newState[playerId][num] || 0;
      const marksToAdd = dart.multiplier;
      
      if (currentMarks < 3) {
        // Still need to close this number
        const marksNeeded = 3 - currentMarks;
        const actualMarks = Math.min(marksToAdd, marksNeeded);
        newState[playerId][num] = currentMarks + actualMarks;
        
        // Extra marks = points (if opponent hasn't closed)
        const extraMarks = marksToAdd - actualMarks;
        if (extraMarks > 0) {
          // Check if any opponent hasn't closed this number
          const canScore = state.currentMatch?.players.some(p => {
            if (p.playerId === playerId) return false;
            return (newState[p.playerId]?.[num] || 0) < 3;
          });
          
          if (canScore) {
            const pointValue = dart.segment === 25 ? 25 : dart.segment;
            newState[playerId].points += extraMarks * pointValue;
          }
        }
      } else {
        // Already closed - score points if opponent hasn't closed
        const canScore = state.currentMatch?.players.some(p => {
          if (p.playerId === playerId) return false;
          return (newState[p.playerId]?.[num] || 0) < 3;
        });
        
        if (canScore) {
          const pointValue = dart.segment === 25 ? 25 : dart.segment;
          newState[playerId].points += marksToAdd * pointValue;
        }
      }
    });
    
    setCricketState(newState);
    
    // Check for winner
    const playerState = newState[playerId];
    const allClosed = CRICKET_NUMBERS.every(num => (playerState[num.toString()] || 0) >= 3);
    
    if (allClosed) {
      // Check if player has equal or more points than all opponents
      const playerPoints = playerState.points;
      const hasWon = state.currentMatch?.players.every(p => {
        if (p.playerId === playerId) return true;
        return playerPoints >= (newState[p.playerId]?.points || 0);
      });
      
      if (hasWon) {
        setShowWinner(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        dispatch({ type: 'END_MATCH' });
      }
    }
    
    // Next player
    setCurrentDarts([]);
    dispatch({ type: 'NEXT_PLAYER' });
  };

  const handleUndo = () => {
    if (currentDarts.length > 0) {
      setCurrentDarts(prev => prev.slice(0, -1));
    }
  };

  const getMarkDisplay = (marks: number) => {
    if (marks === 0) return '';
    if (marks === 1) return '/';
    if (marks === 2) return 'X';
    return '⊗'; // Closed (circled X)
  };

  const getMarkColor = (marks: number) => {
    if (marks === 0) return 'text-gray-600';
    if (marks < 3) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Setup screen
  if (showSetup) {
    return (
      <div className="min-h-screen p-4 md:p-8 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack || (() => { window.location.href = '/'; })}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>

          <div className="glass-card rounded-2xl p-6">
            <h1 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Target className="text-primary-400" />
              Cricket
            </h1>

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-white mb-3">{t('game.select_players')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {players.filter(p => !p.isBot).map(player => (
                  <button
                    key={player.id}
                    onClick={() => {
                      if (selectedPlayers.find(p => p.id === player.id)) {
                        setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
                      } else if (selectedPlayers.length < 4) {
                        setSelectedPlayers(prev => [...prev, player]);
                      }
                    }}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'border-primary-500 bg-primary-500/20'
                        : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                    }`}
                  >
                    <PlayerAvatar avatar={player.avatar} name={player.name} size="md" />
                    <p className="text-white font-medium mt-2">{player.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 mb-6">
              <h3 className="text-white font-semibold mb-2">🎯 Cricket Regeln:</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Zahlen 15-20 und Bull müssen 3x getroffen werden</li>
                <li>• Triple = 3 Marks, Double = 2 Marks, Single = 1 Mark</li>
                <li>• Nach dem Schließen: Punkte sammeln (solange Gegner offen)</li>
                <li>• Gewinner: Alle Zahlen geschlossen + meiste Punkte</li>
              </ul>
            </div>

            <button
              onClick={handleStartGame}
              disabled={selectedPlayers.length < 2}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                selectedPlayers.length >= 2
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:from-primary-600 hover:to-accent-600'
                  : 'bg-dark-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedPlayers.length < 2 
                ? `${t('game.select_players')} (${selectedPlayers.length}/2)`
                : 'Cricket starten 🎯'
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-screen p-4 gradient-mesh">
      {/* Winner Modal */}
      <AnimatePresence>
        {showWinner && currentPlayer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="glass-card rounded-2xl p-8 text-center max-w-md"
            >
              <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-white mb-2">
                {currentPlayer.name} gewinnt!
              </h2>
              <p className="text-gray-400 mb-6">
                Cricket Match beendet
              </p>
              <button
                onClick={() => {
                  setShowWinner(false);
                  setShowSetup(true);
                  setCricketState({});
                }}
                className="px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold"
              >
                Neues Spiel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack || (() => navigate('/'))}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white">🎯 Cricket</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Scoreboard */}
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl p-4 mb-6">
          {/* Cricket Grid */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-gray-400 p-2 w-20">Zahl</th>
                  {state.currentMatch?.players.map((player, idx) => (
                    <th 
                      key={player.playerId}
                      className={`text-center p-2 ${
                        idx === state.currentPlayerIndex 
                          ? 'bg-primary-500/20 rounded-t-lg' 
                          : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <PlayerAvatar 
                          avatar={players.find(p => p.id === player.playerId)?.avatar || ''} 
                          name={player.name} 
                          size="sm" 
                        />
                        <span className="text-white font-medium text-sm mt-1">
                          {player.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRICKET_NUMBERS.map(num => (
                  <tr key={num} className="border-t border-dark-700">
                    <td className="text-white font-bold p-3 text-lg">
                      {num === 25 ? 'Bull' : num}
                    </td>
                    {state.currentMatch?.players.map((player, idx) => {
                      const marks = cricketState[player.playerId]?.[num.toString()] || 0;
                      return (
                        <td 
                          key={player.playerId}
                          className={`text-center p-3 ${
                            idx === state.currentPlayerIndex 
                              ? 'bg-primary-500/10' 
                              : ''
                          }`}
                        >
                          <span className={`text-2xl font-bold ${getMarkColor(marks)}`}>
                            {getMarkDisplay(marks)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Points row */}
                <tr className="border-t-2 border-primary-500">
                  <td className="text-primary-400 font-bold p-3">Punkte</td>
                  {state.currentMatch?.players.map((player, idx) => (
                    <td 
                      key={player.playerId}
                      className={`text-center p-3 ${
                        idx === state.currentPlayerIndex 
                          ? 'bg-primary-500/10' 
                          : ''
                      }`}
                    >
                      <span className="text-2xl font-bold text-white">
                        {cricketState[player.playerId]?.points || 0}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Current Throw Display */}
        <div className="glass-card rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">
              {currentPlayer?.name}'s Wurf ({currentDarts.length}/3)
            </h3>
            <button
              onClick={handleUndo}
              disabled={currentDarts.length === 0}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 disabled:opacity-50"
            >
              <RotateCcw size={18} />
            </button>
          </div>
          
          <div className="flex gap-4 mb-4">
            {[0, 1, 2].map(idx => (
              <div
                key={idx}
                className={`flex-1 h-16 rounded-xl flex items-center justify-center text-xl font-bold ${
                  currentDarts[idx]
                    ? 'bg-primary-500/20 text-white border-2 border-primary-500'
                    : 'bg-dark-800 text-gray-600 border-2 border-dashed border-dark-600'
                }`}
              >
                {currentDarts[idx] ? (
                  <span>
                    {currentDarts[idx].multiplier === 3 ? 'T' : currentDarts[idx].multiplier === 2 ? 'D' : 'S'}
                    {currentDarts[idx].segment === 25 ? 'Bull' : currentDarts[idx].segment}
                  </span>
                ) : (
                  <span>-</span>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleConfirmThrow}
            disabled={currentDarts.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
              currentDarts.length > 0
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                : 'bg-dark-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check size={24} />
            Wurf bestätigen
          </button>
        </div>

        {/* Cricket Dartboard Input */}
        <div className="glass-card rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-4 text-center">Treffer eingeben</h3>
          
          {/* Quick buttons for cricket numbers */}
          <div className="grid grid-cols-4 gap-3">
            {CRICKET_NUMBERS.map(num => (
              <div key={num} className="space-y-2">
                <div className="text-center text-gray-400 text-sm font-medium">
                  {num === 25 ? 'Bull' : num}
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleDartHit(num, 1)}
                    disabled={currentDarts.length >= 3}
                    className="py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-medium disabled:opacity-50"
                  >
                    S
                  </button>
                  <button
                    onClick={() => handleDartHit(num, 2)}
                    disabled={currentDarts.length >= 3}
                    className="py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50"
                  >
                    D
                  </button>
                  {num !== 25 && (
                    <button
                      onClick={() => handleDartHit(num, 3)}
                      disabled={currentDarts.length >= 3}
                      className="py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium disabled:opacity-50"
                    >
                      T
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Miss button */}
            <div className="space-y-2">
              <div className="text-center text-gray-400 text-sm font-medium">Miss</div>
              <button
                onClick={() => handleDartHit(0, 0 as any)}
                disabled={currentDarts.length >= 3}
                className="w-full py-8 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 font-medium disabled:opacity-50"
              >
                <X size={24} className="mx-auto" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CricketGame;
