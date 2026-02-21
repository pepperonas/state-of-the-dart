import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Zap, Check, X } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Player, Dart } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import confetti from 'canvas-confetti';

interface ShanghaiGameProps {
  onBack?: () => void;
}

const ShanghaiGame: React.FC<ShanghaiGameProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players } = usePlayer();
  
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [startNumber, setStartNumber] = useState(1);
  const [rounds, setRounds] = useState(7); // Default: 1-7
  
  // Game state
  const [currentRound, setCurrentRound] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerScores, setPlayerScores] = useState<Record<string, number>>({});
  const [roundScores, setRoundScores] = useState<Record<string, Record<number, number>>>({});
  const [currentDarts, setCurrentDarts] = useState<Dart[]>([]);
  const [showWinner, setShowWinner] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [shanghaiWinner, setShanghaiWinner] = useState<Player | null>(null);

  const targetNumbers = useMemo(() => {
    return Array.from({ length: rounds }, (_, i) => startNumber + i);
  }, [startNumber, rounds]);

  const currentTarget = useMemo(() => {
    return targetNumbers[currentRound] || targetNumbers[0];
  }, [targetNumbers, currentRound]);

  const currentPlayer = useMemo(() => {
    return selectedPlayers[currentPlayerIndex];
  }, [selectedPlayers, currentPlayerIndex]);

  const handleStartGame = () => {
    if (selectedPlayers.length < 2) return;
    
    const initialScores: Record<string, number> = {};
    const initialRoundScores: Record<string, Record<number, number>> = {};
    selectedPlayers.forEach(p => {
      initialScores[p.id] = 0;
      initialRoundScores[p.id] = {};
    });
    
    setPlayerScores(initialScores);
    setRoundScores(initialRoundScores);
    setCurrentRound(0);
    setCurrentPlayerIndex(0);
    setCurrentDarts([]);
    setShowSetup(false);
  };

  const handleDartHit = (segment: number, multiplier: 1 | 2 | 3) => {
    if (!currentPlayer || currentDarts.length >= 3) return;
    
    const dart: Dart = {
      segment,
      multiplier,
      score: segment * multiplier,
      bed: multiplier === 3 ? 'triple' : multiplier === 2 ? 'double' : segment === 25 ? 'bull' : 'single'
    };
    
    setCurrentDarts(prev => [...prev, dart]);
  };

  const handleMiss = () => {
    if (currentDarts.length >= 3) return;
    
    const dart: Dart = {
      segment: 0,
      multiplier: 0 as any,
      score: 0,
      bed: 'miss'
    };
    
    setCurrentDarts(prev => [...prev, dart]);
  };

  const handleConfirmThrow = () => {
    if (!currentPlayer || currentDarts.length === 0) return;
    
    const playerId = currentPlayer.id;
    let roundScore = 0;
    let hasSingle = false;
    let hasDouble = false;
    let hasTriple = false;
    
    // Calculate score for this round (only target number counts)
    currentDarts.forEach(dart => {
      if (dart.segment === currentTarget) {
        roundScore += dart.score;
        if (dart.multiplier === 1) hasSingle = true;
        if (dart.multiplier === 2) hasDouble = true;
        if (dart.multiplier === 3) hasTriple = true;
      }
    });
    
    // Check for Shanghai (Single + Double + Triple of the same number)
    const isShanghai = hasSingle && hasDouble && hasTriple;
    
    // Update scores
    setPlayerScores(prev => ({
      ...prev,
      [playerId]: (prev[playerId] || 0) + roundScore
    }));
    
    setRoundScores(prev => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [currentRound]: roundScore
      }
    }));
    
    // Shanghai instant win!
    if (isShanghai) {
      setShanghaiWinner(currentPlayer);
      setWinner(currentPlayer);
      setShowWinner(true);
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 }
      });
      return;
    }
    
    // Next player or round
    setCurrentDarts([]);
    
    if (currentPlayerIndex < selectedPlayers.length - 1) {
      // Next player
      setCurrentPlayerIndex(prev => prev + 1);
    } else {
      // Next round
      if (currentRound < rounds - 1) {
        setCurrentRound(prev => prev + 1);
        setCurrentPlayerIndex(0);
      } else {
        // Game over - find winner by highest score
        const finalScores = { ...playerScores, [playerId]: (playerScores[playerId] || 0) + roundScore };
        const highestScore = Math.max(...Object.values(finalScores));
        const winnerId = Object.keys(finalScores).find(id => finalScores[id] === highestScore);
        const gameWinner = selectedPlayers.find(p => p.id === winnerId);
        
        if (gameWinner) {
          setWinner(gameWinner);
          setShowWinner(true);
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    }
  };

  const handleUndo = () => {
    if (currentDarts.length > 0) {
      setCurrentDarts(prev => prev.slice(0, -1));
    }
  };

  const getSortedPlayers = () => {
    return [...selectedPlayers].sort((a, b) => 
      (playerScores[b.id] || 0) - (playerScores[a.id] || 0)
    );
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
              <Zap className="text-yellow-400" />
              Shanghai
            </h1>

            {/* Options */}
            <div className="mb-6 space-y-4">
              <h2 className="text-lg font-semibold text-white mb-3">Optionen</h2>
              
              <div>
                <label className="block text-gray-400 mb-2">Startnummer</label>
                <div className="flex gap-2">
                  {[1, 5, 10, 15].map(num => (
                    <button
                      key={num}
                      onClick={() => setStartNumber(num)}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                        startNumber === num
                          ? 'bg-primary-500 text-white'
                          : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">Runden</label>
                <div className="flex gap-2">
                  {[5, 7, 10, 15, 20].map(num => (
                    <button
                      key={num}
                      onClick={() => setRounds(num)}
                      className={`flex-1 py-2 rounded-lg font-medium transition-all ${
                        rounds === num
                          ? 'bg-primary-500 text-white'
                          : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="text-gray-500 text-sm mt-2">
                  Spielt Zahlen {startNumber} bis {Math.min(startNumber + rounds - 1, 20)}
                </p>
              </div>
            </div>

            {/* Player Selection */}
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
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'border-success-500 bg-success-500/20 shadow-lg'
                        : 'border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                    </div>
                    <div className="text-sm font-medium text-white text-center">{player.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-dark-800 rounded-xl p-4 mb-6">
              <h3 className="text-white font-semibold mb-2">⚡ Spielregeln:</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Jede Runde zielt auf eine bestimmte Zahl</li>
                <li>• Nur Treffer auf die Zielzahl zählen Punkte</li>
                <li>• Single = Zahl × 1, Double = × 2, Triple = × 3</li>
                <li>• <span className="text-yellow-400 font-semibold">SHANGHAI</span>: Single + Double + Triple = Sofortiger Sieg!</li>
                <li>• Höchste Punktzahl am Ende gewinnt</li>
              </ul>
            </div>

            <button
              onClick={handleStartGame}
              disabled={selectedPlayers.length < 2}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                selectedPlayers.length >= 2
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600'
                  : 'bg-dark-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedPlayers.length < 2 
                ? `${t('game.select_players')} (${selectedPlayers.length}/2)`
                : 'Shanghai starten ⚡'
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
        {showWinner && winner && (
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
                {winner.name} gewinnt!
              </h2>
              {shanghaiWinner && (
                <div className="bg-yellow-500/20 rounded-xl p-3 mb-4">
                  <p className="text-yellow-400 font-bold text-xl">⚡ SHANGHAI! ⚡</p>
                </div>
              )}
              <p className="text-primary-400 text-2xl font-bold mb-6">
                {playerScores[winner.id]} Punkte
              </p>
              <button
                onClick={() => {
                  setShowWinner(false);
                  setShowSetup(true);
                  setWinner(null);
                  setShanghaiWinner(null);
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
      <div className="max-w-4xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack || (() => navigate('/'))}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-white">⚡ Shanghai</h1>
            <p className="text-gray-400 text-sm">Runde {currentRound + 1}/{rounds}</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Current Target */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="glass-card rounded-xl p-6 text-center">
          <p className="text-gray-400 mb-2">Zielzahl</p>
          <div className="text-7xl font-bold text-yellow-400">
            {currentTarget}
          </div>
          <p className="text-white mt-2">{currentPlayer?.name} ist dran</p>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="glass-card rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Punktestand</h3>
          <div className="space-y-2">
            {getSortedPlayers().map((player, idx) => {
              const isActive = player.id === currentPlayer?.id;
              const score = playerScores[player.id] || 0;
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isActive ? 'bg-primary-500/20 ring-2 ring-primary-500' : 'bg-dark-800'
                  }`}
                >
                  <span className="text-lg font-bold text-gray-500 w-6">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                  <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                  <span className="text-white font-medium flex-1">{player.name}</span>
                  <span className="text-2xl font-bold text-primary-400">{score}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Throw */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Wurf ({currentDarts.length}/3)</h3>
            <button
              onClick={handleUndo}
              disabled={currentDarts.length === 0}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 disabled:opacity-50"
            >
              <RotateCcw size={18} />
            </button>
          </div>
          
          <div className="flex gap-3 mb-4">
            {[0, 1, 2].map(idx => {
              const dart = currentDarts[idx];
              const isTarget = dart && dart.segment === currentTarget;
              
              return (
                <div
                  key={idx}
                  className={`flex-1 h-14 rounded-xl flex items-center justify-center text-lg font-bold ${
                    dart
                      ? isTarget
                        ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500'
                        : 'bg-dark-700 text-gray-400 border-2 border-dark-600'
                      : 'bg-dark-800 text-gray-600 border-2 border-dashed border-dark-600'
                  }`}
                >
                  {dart ? (
                    dart.segment === 0 ? 'Miss' : 
                    `${dart.multiplier === 3 ? 'T' : dart.multiplier === 2 ? 'D' : ''}${dart.segment}`
                  ) : '-'}
                </div>
              );
            })}
          </div>

          <button
            onClick={handleConfirmThrow}
            disabled={currentDarts.length === 0}
            className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              currentDarts.length > 0
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                : 'bg-dark-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check size={20} />
            Bestätigen
          </button>
        </div>
      </div>

      {/* Input for Target Number */}
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-xl p-4">
          <p className="text-gray-400 text-center mb-3">Ziel: <span className="text-yellow-400 font-bold">{currentTarget}</span></p>
          
          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => handleDartHit(currentTarget, 1)}
              disabled={currentDarts.length >= 3}
              className="py-4 rounded-lg bg-dark-700 hover:bg-dark-600 text-white font-bold text-lg disabled:opacity-50"
            >
              Single {currentTarget}
            </button>
            <button
              onClick={() => handleDartHit(currentTarget, 2)}
              disabled={currentDarts.length >= 3}
              className="py-4 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-lg disabled:opacity-50"
            >
              Double {currentTarget}
            </button>
            <button
              onClick={() => handleDartHit(currentTarget, 3)}
              disabled={currentDarts.length >= 3}
              className="py-4 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-lg disabled:opacity-50"
            >
              Triple {currentTarget}
            </button>
          </div>
          
          <button
            onClick={handleMiss}
            disabled={currentDarts.length >= 3}
            className="w-full py-3 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X size={20} />
            Miss / Andere Zahl
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShanghaiGame;
