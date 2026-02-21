import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Clock, Check, X } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Player, Dart } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import confetti from 'canvas-confetti';

interface AroundTheClockGameProps {
  onBack?: () => void;
}

const AroundTheClockGame: React.FC<AroundTheClockGameProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players } = usePlayer();
  
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [includeDoubles, setIncludeDoubles] = useState(false);
  const [includeTriples, setIncludeTriples] = useState(false);
  const [includeBull, setIncludeBull] = useState(true);
  
  // Game state
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerProgress, setPlayerProgress] = useState<Record<string, number>>({});
  const [playerDarts, setPlayerDarts] = useState<Record<string, number>>({});
  const [currentDarts, setCurrentDarts] = useState<Dart[]>([]);
  const [showWinner, setShowWinner] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Target numbers (1-20, optionally Bull)
  const targetNumbers = useMemo(() => {
    const numbers = Array.from({ length: 20 }, (_, i) => i + 1);
    if (includeBull) numbers.push(25);
    return numbers;
  }, [includeBull]);

  const currentPlayer = useMemo(() => {
    return selectedPlayers[currentPlayerIndex];
  }, [selectedPlayers, currentPlayerIndex]);

  const currentTarget = useMemo(() => {
    if (!currentPlayer) return 1;
    return targetNumbers[playerProgress[currentPlayer.id] || 0] || 'Done';
  }, [currentPlayer, playerProgress, targetNumbers]);

  // Timer
  useEffect(() => {
    if (!showSetup && !showWinner && gameStartTime > 0) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - gameStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showSetup, showWinner, gameStartTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartGame = () => {
    if (selectedPlayers.length < 1) return;
    
    const initialProgress: Record<string, number> = {};
    const initialDarts: Record<string, number> = {};
    selectedPlayers.forEach(p => {
      initialProgress[p.id] = 0;
      initialDarts[p.id] = 0;
    });
    
    setPlayerProgress(initialProgress);
    setPlayerDarts(initialDarts);
    setCurrentPlayerIndex(0);
    setCurrentDarts([]);
    setGameStartTime(Date.now());
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
    let progress = playerProgress[playerId] || 0;
    let dartsUsed = playerDarts[playerId] || 0;
    
    // Check each dart
    currentDarts.forEach(dart => {
      if (progress >= targetNumbers.length) return;
      
      const target = targetNumbers[progress];
      let hit = false;
      
      if (dart.segment === target) {
        // Check multiplier requirements
        if (includeDoubles && includeTriples) {
          hit = dart.multiplier >= 1; // Any hit counts
        } else if (includeDoubles) {
          hit = dart.multiplier === 2 || dart.multiplier === 1;
        } else if (includeTriples) {
          hit = dart.multiplier === 3 || dart.multiplier === 1;
        } else {
          hit = dart.multiplier === 1 || (dart.segment === 25 && dart.multiplier <= 2);
        }
        
        if (hit) {
          progress++;
        }
      }
      
      dartsUsed++;
    });
    
    setPlayerProgress(prev => ({ ...prev, [playerId]: progress }));
    setPlayerDarts(prev => ({ ...prev, [playerId]: dartsUsed }));
    
    // Check for winner
    if (progress >= targetNumbers.length) {
      setWinner(currentPlayer);
      setShowWinner(true);
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } else {
      // Next player
      setCurrentDarts([]);
      setCurrentPlayerIndex((prev) => (prev + 1) % selectedPlayers.length);
    }
  };

  const handleUndo = () => {
    if (currentDarts.length > 0) {
      setCurrentDarts(prev => prev.slice(0, -1));
    }
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
              <Clock className="text-primary-400" />
              Around the Clock
            </h1>

            {/* Options */}
            <div className="mb-6 space-y-3">
              <h2 className="text-lg font-semibold text-white mb-3">Optionen</h2>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBull}
                  onChange={(e) => setIncludeBull(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-white">Bull einschließen (1-20 + Bull)</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDoubles}
                  onChange={(e) => setIncludeDoubles(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-white">Doubles erlaubt</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTriples}
                  onChange={(e) => setIncludeTriples(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-white">Triples erlaubt</span>
              </label>
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
              <h3 className="text-white font-semibold mb-2">🕐 Spielregeln:</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Triff die Zahlen 1-20 der Reihe nach</li>
                <li>• {includeBull ? 'Bull (25) ist das letzte Ziel' : 'Kein Bull'}</li>
                <li>• {includeDoubles || includeTriples ? 'Singles/Doubles/Triples zählen' : 'Nur Singles zählen'}</li>
                <li>• Wer zuerst alle Zahlen trifft, gewinnt!</li>
              </ul>
            </div>

            <button
              onClick={handleStartGame}
              disabled={selectedPlayers.length < 1}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                selectedPlayers.length >= 1
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:from-primary-600 hover:to-accent-600'
                  : 'bg-dark-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedPlayers.length < 1 
                ? `${t('game.select_players')} (min. 1)`
                : 'Spiel starten 🕐'
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
              <p className="text-gray-400 mb-2">
                Around the Clock in {formatTime(elapsedTime)}
              </p>
              <p className="text-primary-400 mb-6">
                {playerDarts[winner.id]} Darts benötigt
              </p>
              <button
                onClick={() => {
                  setShowWinner(false);
                  setShowSetup(true);
                  setWinner(null);
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
            <h1 className="text-xl font-bold text-white">🕐 Around the Clock</h1>
            <p className="text-primary-400 text-sm">{formatTime(elapsedTime)}</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="glass-card rounded-xl p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {targetNumbers.map((num, idx) => {
              const progress = playerProgress[currentPlayer?.id || ''] || 0;
              const isPast = idx < progress;
              const isCurrent = idx === progress;
              
              return (
                <div
                  key={num}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    isPast
                      ? 'bg-green-500 text-white'
                      : isCurrent
                      ? 'bg-primary-500 text-white ring-2 ring-primary-300 animate-pulse'
                      : 'bg-dark-700 text-gray-500'
                  }`}
                >
                  {num === 25 ? 'B' : num}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Player Standings */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="glass-card rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {selectedPlayers.map((player, idx) => {
              const progress = playerProgress[player.id] || 0;
              const darts = playerDarts[player.id] || 0;
              const isActive = idx === currentPlayerIndex;
              
              return (
                <div
                  key={player.id}
                  className={`p-3 rounded-xl text-center transition-all ${
                    isActive ? 'bg-primary-500/20 ring-2 ring-primary-500' : 'bg-dark-800'
                  }`}
                >
                  <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                  <p className="text-white font-medium text-sm mt-1">{player.name}</p>
                  <p className="text-primary-400 text-xs">
                    {progress}/{targetNumbers.length} • {darts} Darts
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Current Target */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="glass-card rounded-xl p-6 text-center">
          <p className="text-gray-400 mb-2">Aktuelles Ziel</p>
          <div className="text-6xl font-bold text-primary-400">
            {currentTarget === 25 ? 'Bull' : currentTarget}
          </div>
          <p className="text-white mt-2">{currentPlayer?.name}</p>
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
              const isHit = dart && dart.segment === currentTarget;
              
              return (
                <div
                  key={idx}
                  className={`flex-1 h-14 rounded-xl flex items-center justify-center text-lg font-bold ${
                    dart
                      ? isHit
                        ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
                        : 'bg-red-500/20 text-red-400 border-2 border-red-500'
                      : 'bg-dark-800 text-gray-600 border-2 border-dashed border-dark-600'
                  }`}
                >
                  {dart ? (
                    dart.segment === 0 ? 'Miss' : 
                    `${dart.multiplier === 3 ? 'T' : dart.multiplier === 2 ? 'D' : ''}${dart.segment === 25 ? 'Bull' : dart.segment}`
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

      {/* Input Buttons */}
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-xl p-4">
          <div className="grid grid-cols-7 gap-2 mb-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(num => (
              <button
                key={num}
                onClick={() => handleDartHit(num, 1)}
                disabled={currentDarts.length >= 3}
                className={`py-3 rounded-lg font-bold transition-all disabled:opacity-50 ${
                  num === currentTarget
                    ? 'bg-primary-500 text-white ring-2 ring-primary-300'
                    : 'bg-dark-700 hover:bg-dark-600 text-white'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          
          <div className="flex gap-2">
            {includeBull && (
              <button
                onClick={() => handleDartHit(25, 1)}
                disabled={currentDarts.length >= 3}
                className={`flex-1 py-3 rounded-lg font-bold transition-all disabled:opacity-50 ${
                  currentTarget === 25
                    ? 'bg-primary-500 text-white ring-2 ring-primary-300'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                Bull
              </button>
            )}
            <button
              onClick={handleMiss}
              disabled={currentDarts.length >= 3}
              className="flex-1 py-3 rounded-lg bg-dark-800 hover:bg-dark-700 text-gray-400 font-bold disabled:opacity-50"
            >
              <X size={20} className="mx-auto" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AroundTheClockGame;
