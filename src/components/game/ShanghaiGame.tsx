import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Zap, Check, X } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Player, Dart } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import { celebrate as confetti } from '../../utils/celebration';
import { saveGameState, loadGameState, clearGameState, STORAGE_KEYS, ShanghaiSavedState } from '../../utils/gameStorage';
import { SpinnerWheel } from './SpinnerWheel';
import BackButton from '../common/BackButton';
import { Button, Card, Dialog } from '../common';

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

  // History stack for undoing confirmed throws
  const [turnHistory, setTurnHistory] = useState<{
    playerId: string;
    playerIndex: number;
    darts: Dart[];
    prevRound: number;
    prevScores: Record<string, number>;
    prevRoundScores: Record<string, Record<number, number>>;
  }[]>([]);

  const autoConfirmRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringRef = useRef(false);

  // Spinner wheel for player order
  const [showSpinner, setShowSpinner] = useState(false);
  const [pendingGamePlayers, setPendingGamePlayers] = useState<Player[] | null>(null);

  // Back confirmation dialog
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const targetNumbers = useMemo(() => {
    return Array.from({ length: rounds }, (_, i) => startNumber + i);
  }, [startNumber, rounds]);

  const currentTarget = useMemo(() => {
    return targetNumbers[currentRound] || targetNumbers[0];
  }, [targetNumbers, currentRound]);

  const currentPlayer = useMemo(() => {
    return selectedPlayers[currentPlayerIndex];
  }, [selectedPlayers, currentPlayerIndex]);

  // Restore saved game on mount
  useEffect(() => {
    const saved = loadGameState<ShanghaiSavedState>(STORAGE_KEYS.SHANGHAI);
    if (!saved) return;
    const validPlayers = saved.selectedPlayers.filter(sp =>
      players.some(p => p.id === sp.id)
    );
    if (validPlayers.length < 2) {
      clearGameState(STORAGE_KEYS.SHANGHAI);
      return;
    }
    const restoredPlayers = saved.selectedPlayers
      .map(sp => players.find(p => p.id === sp.id))
      .filter((p): p is Player => !!p);
    if (restoredPlayers.length < 2) {
      clearGameState(STORAGE_KEYS.SHANGHAI);
      return;
    }
    setSelectedPlayers(restoredPlayers);
    setStartNumber(saved.startNumber);
    setRounds(saved.rounds);
    setCurrentRound(saved.currentRound);
    setCurrentPlayerIndex(saved.currentPlayerIndex);
    setPlayerScores(saved.playerScores);
    setRoundScores(saved.roundScores);
    setTurnHistory(saved.turnHistory || []);
    setShowSetup(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save game state on changes
  useEffect(() => {
    if (showSetup || showWinner || selectedPlayers.length === 0) return;
    saveGameState(STORAGE_KEYS.SHANGHAI, {
      gameType: 'shanghai',
      selectedPlayers: selectedPlayers.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
      startNumber,
      rounds,
      currentRound,
      currentPlayerIndex,
      playerScores,
      roundScores,
      turnHistory,
      savedAt: Date.now(),
    });
  }, [showSetup, showWinner, selectedPlayers, startNumber, rounds, currentRound, currentPlayerIndex, playerScores, roundScores, turnHistory]);

  const handleStartGame = () => {
    if (selectedPlayers.length < 2) return;

    clearGameState(STORAGE_KEYS.SHANGHAI);

    // Show spinner to determine starting player
    setPendingGamePlayers([...selectedPlayers]);
    setShowSpinner(true);
  };

  const initGame = (orderedPlayers: Player[]) => {
    const initialScores: Record<string, number> = {};
    const initialRoundScores: Record<string, Record<number, number>> = {};
    orderedPlayers.forEach(p => {
      initialScores[p.id] = 0;
      initialRoundScores[p.id] = {};
    });

    setSelectedPlayers(orderedPlayers);
    setPlayerScores(initialScores);
    setRoundScores(initialRoundScores);
    setCurrentRound(0);
    setCurrentPlayerIndex(0);
    setCurrentDarts([]);
    setTurnHistory([]);
    setShowSetup(false);
  };

  const handleSpinnerComplete = (startingPlayerIndex: number) => {
    if (!pendingGamePlayers) return;
    const reordered = [
      ...pendingGamePlayers.slice(startingPlayerIndex),
      ...pendingGamePlayers.slice(0, startingPlayerIndex),
    ];
    setShowSpinner(false);
    setPendingGamePlayers(null);
    initGame(reordered);
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

  const handleConfirmThrow = useCallback(() => {
    if (!currentPlayer || currentDarts.length === 0) return;

    const playerId = currentPlayer.id;

    // Save snapshot for undo
    setTurnHistory(prev => [...prev, {
      playerId,
      playerIndex: currentPlayerIndex,
      darts: [...currentDarts],
      prevRound: currentRound,
      prevScores: { ...playerScores },
      prevRoundScores: JSON.parse(JSON.stringify(roundScores)),
    }]);

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
      clearGameState(STORAGE_KEYS.SHANGHAI);
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
        clearGameState(STORAGE_KEYS.SHANGHAI);
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
  }, [currentPlayer, currentDarts, currentPlayerIndex, currentRound, currentTarget, playerScores, roundScores, selectedPlayers, rounds]);

  // Auto-confirm after 3 darts (skip if restoring from undo/history)
  useEffect(() => {
    if (currentDarts.length === 3) {
      if (restoringRef.current) {
        restoringRef.current = false;
        return;
      }
      autoConfirmRef.current = setTimeout(() => {
        handleConfirmThrow();
      }, 300);
      return () => {
        if (autoConfirmRef.current) clearTimeout(autoConfirmRef.current);
      };
    }
  }, [currentDarts.length, handleConfirmThrow]);

  const cancelAutoConfirm = () => {
    if (autoConfirmRef.current) {
      clearTimeout(autoConfirmRef.current);
      autoConfirmRef.current = null;
    }
  };

  const handleUndo = () => {
    if (currentDarts.length > 0) {
      cancelAutoConfirm();
      setCurrentDarts(prev => prev.slice(0, -1));
    } else if (turnHistory.length > 0) {
      // Restore previous confirmed throw
      const last = turnHistory[turnHistory.length - 1];
      setTurnHistory(prev => prev.slice(0, -1));
      setPlayerScores(last.prevScores);
      setRoundScores(last.prevRoundScores);
      setCurrentRound(last.prevRound);
      setCurrentPlayerIndex(last.playerIndex);
      // Only suppress auto-confirm when restoring a FULL 3-dart turn — otherwise the
      // flag stays stuck true (the length===3 effect that clears it never runs) and
      // swallows the next legitimate auto-confirm.
      restoringRef.current = last.darts.length === 3;
      setCurrentDarts(last.darts);
    }
  };

  const getSortedPlayers = () => {
    return [...selectedPlayers].sort((a, b) => 
      (playerScores[b.id] || 0) - (playerScores[a.id] || 0)
    );
  };

  const handleBack = () => {
    if (!showSetup && !showWinner) {
      setShowBackConfirm(true);
      return;
    }
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  const handleConfirmBack = () => {
    setShowBackConfirm(false);
    window.location.href = '/';
  };

  const handleEndGame = () => {
    setShowBackConfirm(false);
    clearGameState(STORAGE_KEYS.SHANGHAI);
    window.location.href = '/';
  };

  // Spinner screen
  if (showSpinner && pendingGamePlayers) {
    return (
      <div className="min-h-dvh gradient-mesh flex items-center justify-center">
        <SpinnerWheel
          players={pendingGamePlayers}
          onComplete={handleSpinnerComplete}
        />
      </div>
    );
  }

  // Setup screen
  if (showSetup) {
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          <BackButton onClick={onBack || (() => { window.location.href = '/'; })} />

          <Card variant="elevated" className="p-6">
            <h1 className="m3-headline-medium font-bold text-on-surface mb-6 flex items-center gap-3">
              <Zap className="text-tertiary" />
              Shanghai
            </h1>

            {/* Options */}
            <div className="mb-6 space-y-4">
              <h2 className="m3-title-medium font-semibold text-on-surface mb-3">Optionen</h2>

              <div>
                <label className="block text-on-surface-variant mb-2">Startnummer</label>
                <div className="flex gap-2">
                  {[1, 5, 10, 15].map(num => (
                    <button
                      key={num}
                      onClick={() => setStartNumber(num)}
                      className={`flex-1 py-2 rounded-m3-md font-medium transition-all ${
                        startNumber === num
                          ? 'bg-surface-container-high text-on-surface ring-2 ring-[var(--m3-primary)]'
                          : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-on-surface-variant mb-2">Runden</label>
                <div className="flex gap-2">
                  {[5, 7, 10, 15, 20].map(num => (
                    <button
                      key={num}
                      onClick={() => setRounds(num)}
                      className={`flex-1 py-2 rounded-m3-md font-medium transition-all ${
                        rounds === num
                          ? 'bg-surface-container-high text-on-surface ring-2 ring-[var(--m3-primary)]'
                          : 'bg-surface-container border border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="text-on-surface-variant text-sm mt-2">
                  Spielt Zahlen {startNumber} bis {Math.min(startNumber + rounds - 1, 20)}
                </p>
              </div>
            </div>

            {/* Player Selection */}
            <div className="mb-6">
              <h2 className="m3-title-medium font-semibold text-on-surface mb-3">{t('game.select_players')}</h2>
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
                    className={`p-3 rounded-m3-md border transition-all ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'border-success-500 bg-success-container shadow-m3-1'
                        : 'border-outline-variant hover:border-outline'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                    </div>
                    <div className="text-sm font-medium text-on-surface text-center">{player.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-container rounded-m3-lg p-4 mb-6">
              <h3 className="text-on-surface font-semibold mb-2">⚡ Spielregeln:</h3>
              <ul className="text-on-surface-variant text-sm space-y-1">
                <li>• Jede Runde zielt auf eine bestimmte Zahl</li>
                <li>• Nur Treffer auf die Zielzahl zählen Punkte</li>
                <li>• Single = Zahl × 1, Double = × 2, Triple = × 3</li>
                <li>• <span className="text-tertiary font-semibold">SHANGHAI</span>: Single + Double + Triple = Sofortiger Sieg!</li>
                <li>• Höchste Punktzahl am Ende gewinnt</li>
              </ul>
            </div>

            <Button
              variant="filled"
              size="lg"
              fullWidth
              onClick={handleStartGame}
              disabled={selectedPlayers.length < 2}
            >
              {selectedPlayers.length < 2
                ? `${t('game.select_players')} (${selectedPlayers.length}/2)`
                : 'Shanghai starten ⚡'
              }
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Game screen
  return (
    <div className="min-h-dvh p-4 gradient-mesh">
      {/* Winner Modal */}
      <AnimatePresence>
        {showWinner && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[color-mix(in_srgb,var(--m3-scrim)_50%,transparent)] flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="m3-dialog p-8 text-center max-w-md"
            >
              <Trophy className="w-20 h-20 text-tertiary mx-auto mb-4" />
              <h2 className="m3-headline-medium font-bold text-on-surface mb-2">
                {winner.name} gewinnt!
              </h2>
              {shanghaiWinner && (
                <div className="bg-tertiary-container rounded-m3-lg p-3 mb-4">
                  <p className="text-on-tertiary-container font-bold text-xl">⚡ SHANGHAI! ⚡</p>
                </div>
              )}
              <p className="text-2xl font-bold mb-6" style={{ color: 'var(--m3-primary)' }}>
                {playerScores[winner.id]} Punkte
              </p>
              <Button
                variant="filled"
                onClick={() => {
                  setShowWinner(false);
                  setShowSetup(true);
                  setWinner(null);
                  setShanghaiWinner(null);
                }}
              >
                Neues Spiel
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Back Confirmation Dialog */}
      <AnimatePresence>
        {showBackConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[color-mix(in_srgb,var(--m3-scrim)_50%,transparent)] flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="m3-dialog p-6 max-w-sm w-full text-center"
            >
              <h3 className="m3-title-large font-bold text-on-surface mb-3">
                {t('resume.pause_title')}
              </h3>
              <p className="text-on-surface-variant mb-6">
                {t('resume.pause_message')}
              </p>
              <div className="flex flex-col gap-3">
                <Button variant="filled" fullWidth onClick={handleConfirmBack}>
                  {t('resume.pause_and_leave')}
                </Button>
                <Button variant="danger" fullWidth onClick={handleEndGame}>
                  {t('resume.end_game')}
                </Button>
                <Button variant="tonal" fullWidth onClick={() => setShowBackConfirm(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <Button
            variant="tonal"
            size="sm"
            icon={<ArrowLeft size={18} />}
            onClick={handleBack}
          >
            {t('common.back')}
          </Button>
          <div className="text-center">
            <h1 className="m3-title-large font-bold text-on-surface">⚡ Shanghai</h1>
            <p className="text-on-surface-variant text-sm">Runde {currentRound + 1}/{rounds}</p>
          </div>
          <div className="w-10" />
        </div>
      </div>

      {/* Current Target */}
      <div className="max-w-4xl mx-auto mb-4">
        <Card variant="elevated" className="p-6 text-center">
          <p className="text-on-surface-variant mb-2">Zielzahl</p>
          <div className="text-7xl font-bold text-tertiary">
            {currentTarget}
          </div>
          <p className="text-on-surface mt-2">{currentPlayer?.name} ist dran</p>
        </Card>
      </div>

      {/* Scoreboard */}
      <div className="max-w-4xl mx-auto mb-4">
        <Card variant="elevated" className="p-4">
          <h3 className="text-on-surface font-semibold mb-3">Punktestand</h3>
          <div className="space-y-2">
            {getSortedPlayers().map((player, idx) => {
              const isActive = player.id === currentPlayer?.id;
              const score = playerScores[player.id] || 0;

              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-m3-lg transition-all ${
                    isActive ? 'bg-surface-container-high ring-2 ring-[var(--m3-primary)]' : 'bg-surface-container'
                  }`}
                >
                  <span className="text-lg font-bold text-on-surface-variant w-6">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </span>
                  <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                  <span className="text-on-surface font-medium flex-1">{player.name}</span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--m3-primary)' }}>{score}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Current Throw */}
      <div className="max-w-4xl mx-auto mb-4">
        <Card variant="elevated" className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-on-surface font-semibold">Wurf ({currentDarts.length}/3)</h3>
            <button
              onClick={handleUndo}
              disabled={currentDarts.length === 0 && turnHistory.length === 0}
              className="p-2 rounded-m3-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant disabled:opacity-50"
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
                  className={`flex-1 h-14 rounded-m3-lg flex items-center justify-center text-lg font-bold ${
                    dart
                      ? isTarget
                        ? 'bg-tertiary-container text-on-tertiary-container border-2 border-tertiary'
                        : 'bg-surface-container text-on-surface-variant border-2 border-outline-variant'
                      : 'bg-surface-container-low text-on-surface-variant border-2 border-dashed border-outline-variant'
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

          <Button
            variant="success"
            fullWidth
            icon={<Check size={20} />}
            onClick={handleConfirmThrow}
            disabled={currentDarts.length === 0}
          >
            Bestätigen
          </Button>
        </Card>
      </div>

      {/* Input for Target Number */}
      <div className="max-w-4xl mx-auto">
        <Card variant="elevated" className="p-4">
          <p className="text-on-surface-variant text-center mb-3">Ziel: <span className="text-tertiary font-bold">{currentTarget}</span></p>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <button
              onClick={() => handleDartHit(currentTarget, 1)}
              disabled={currentDarts.length >= 3}
              className="py-4 rounded-m3-md bg-surface-container hover:bg-surface-container-high text-on-surface font-bold text-lg disabled:opacity-50"
            >
              Single {currentTarget}
            </button>
            <button
              onClick={() => handleDartHit(currentTarget, 2)}
              disabled={currentDarts.length >= 3}
              className="py-4 rounded-m3-md bg-success-container hover:brightness-110 text-on-success-container font-bold text-lg disabled:opacity-50"
            >
              Double {currentTarget}
            </button>
            <button
              onClick={() => handleDartHit(currentTarget, 3)}
              disabled={currentDarts.length >= 3}
              className="py-4 rounded-m3-md bg-error-container hover:brightness-110 text-on-error-container font-bold text-lg disabled:opacity-50"
            >
              Triple {currentTarget}
            </button>
          </div>

          <button
            onClick={handleMiss}
            disabled={currentDarts.length >= 3}
            className="w-full py-3 rounded-m3-md bg-surface-container-low hover:bg-surface-container text-on-surface-variant font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X size={20} />
            Miss / Andere Zahl
          </button>
        </Card>
      </div>
    </div>
  );
};

export default ShanghaiGame;
