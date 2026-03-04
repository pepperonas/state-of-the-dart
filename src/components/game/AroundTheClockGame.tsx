import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Trophy, Clock, Check, X } from 'lucide-react';
import { usePlayer } from '../../context/PlayerContext';
import { Player, Dart } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import confetti from 'canvas-confetti';
import audioSystem from '../../utils/audio';
import { saveGameState, loadGameState, clearGameState, STORAGE_KEYS, ATCSavedState } from '../../utils/gameStorage';
import { SpinnerWheel } from './SpinnerWheel';

interface AroundTheClockGameProps {
  onBack?: () => void;
}

type BullMode = 'off' | 'standard' | 'split';
type Direction = 'ascending' | 'descending';
type Variant = 'standard' | 'doubles' | 'triples';

interface Target {
  label: string;
  shortLabel: string;
  segment: number;
  multiplier: number;
}

const AroundTheClockGame: React.FC<AroundTheClockGameProps> = ({ onBack }) => {
  const { t } = useTranslation();
  const { players } = usePlayer();

  // Setup state
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showSetup, setShowSetup] = useState(true);
  const [bullMode, setBullMode] = useState<BullMode>('standard');
  const [direction, setDirection] = useState<Direction>('ascending');
  const [variant, setVariant] = useState<Variant>('standard');

  // Game state
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerProgress, setPlayerProgress] = useState<Record<string, number>>({});
  const [playerDarts, setPlayerDarts] = useState<Record<string, number>>({});
  const [playerHits, setPlayerHits] = useState<Record<string, number>>({});
  const [currentDarts, setCurrentDarts] = useState<Dart[]>([]);
  const [showWinner, setShowWinner] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameStartTime, setGameStartTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // History stack for undoing confirmed throws
  const [turnHistory, setTurnHistory] = useState<{
    playerId: string;
    playerIndex: number;
    darts: Dart[];
    prevProgress: number;
    prevDarts: number;
    prevHits: number;
  }[]>([]);

  // Spinner wheel for player order
  const [showSpinner, setShowSpinner] = useState(false);
  const [pendingGamePlayers, setPendingGamePlayers] = useState<Player[] | null>(null);

  // Back confirmation dialog
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const autoConfirmRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoringRef = useRef(false);

  // Build target list
  const targets: Target[] = useMemo(() => {
    const nums = direction === 'ascending'
      ? Array.from({ length: 20 }, (_, i) => i + 1)
      : Array.from({ length: 20 }, (_, i) => 20 - i);

    const multiplier = variant === 'doubles' ? 2 : variant === 'triples' ? 3 : 1;
    const prefix = variant === 'doubles' ? 'D' : variant === 'triples' ? 'T' : '';

    const result: Target[] = nums.map(n => ({
      label: `${prefix}${n}`,
      shortLabel: `${prefix}${n}`,
      segment: n,
      multiplier,
    }));

    if (bullMode === 'standard') {
      result.push({ label: 'Bull', shortLabel: 'B', segment: 25, multiplier: 1 });
    } else if (bullMode === 'split') {
      result.push({ label: 'Outer Bull', shortLabel: 'OB', segment: 25, multiplier: 1 });
      result.push({ label: 'Inner Bull', shortLabel: 'IB', segment: 25, multiplier: 2 });
    }

    return result;
  }, [direction, variant, bullMode]);

  const currentPlayer = useMemo(() => {
    return selectedPlayers[currentPlayerIndex];
  }, [selectedPlayers, currentPlayerIndex]);

  // Effective progress = committed + pending hits in current turn
  const getEffectiveProgress = useCallback((playerId: string) => {
    const committed = playerProgress[playerId] || 0;
    if (currentPlayer?.id !== playerId) return committed;
    const pendingHits = currentDarts.filter(d => d.bed !== 'miss').length;
    return Math.min(committed + pendingHits, targets.length);
  }, [playerProgress, currentPlayer, currentDarts, targets.length]);

  const currentTargetIdx = useMemo(() => {
    if (!currentPlayer) return 0;
    return getEffectiveProgress(currentPlayer.id);
  }, [currentPlayer, getEffectiveProgress]);

  const currentTarget = useMemo(() => {
    return targets[currentTargetIdx] || null;
  }, [targets, currentTargetIdx]);

  // Timer
  useEffect(() => {
    if (!showSetup && !showWinner && gameStartTime > 0) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - gameStartTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showSetup, showWinner, gameStartTime]);

  // Restore saved game on mount
  useEffect(() => {
    const saved = loadGameState<ATCSavedState>(STORAGE_KEYS.ATC);
    if (!saved) return;
    // Validate that saved players still exist
    const validPlayers = saved.selectedPlayers.filter(sp =>
      players.some(p => p.id === sp.id)
    );
    if (validPlayers.length < 1) {
      clearGameState(STORAGE_KEYS.ATC);
      return;
    }
    // Restore full Player objects (with current data from PlayerContext)
    const restoredPlayers = saved.selectedPlayers
      .map(sp => players.find(p => p.id === sp.id))
      .filter((p): p is Player => !!p);
    if (restoredPlayers.length < 1) {
      clearGameState(STORAGE_KEYS.ATC);
      return;
    }
    setSelectedPlayers(restoredPlayers);
    setBullMode(saved.bullMode);
    setDirection(saved.direction);
    setVariant(saved.variant);
    setCurrentPlayerIndex(saved.currentPlayerIndex);
    setPlayerProgress(saved.playerProgress);
    setPlayerDarts(saved.playerDarts);
    setPlayerHits(saved.playerHits);
    setTurnHistory(saved.turnHistory);
    setElapsedTime(saved.elapsedTime);
    setGameStartTime(Date.now() - saved.elapsedTime * 1000);
    setShowSetup(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save game state on changes
  useEffect(() => {
    if (showSetup || showWinner || selectedPlayers.length === 0) return;
    saveGameState(STORAGE_KEYS.ATC, {
      gameType: 'around-the-clock',
      selectedPlayers: selectedPlayers.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
      bullMode,
      direction,
      variant,
      currentPlayerIndex,
      playerProgress,
      playerDarts,
      playerHits,
      turnHistory,
      elapsedTime,
      savedAt: Date.now(),
    });
  }, [showSetup, showWinner, selectedPlayers, bullMode, direction, variant, currentPlayerIndex, playerProgress, playerDarts, playerHits, turnHistory, elapsedTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartGame = () => {
    if (selectedPlayers.length < 1) return;

    clearGameState(STORAGE_KEYS.ATC);

    if (selectedPlayers.length >= 2) {
      // Show spinner to determine starting player
      setPendingGamePlayers([...selectedPlayers]);
      setShowSpinner(true);
    } else {
      // Solo game — start directly
      initGame(selectedPlayers);
    }
  };

  const initGame = (orderedPlayers: Player[]) => {
    const initialProgress: Record<string, number> = {};
    const initialDarts: Record<string, number> = {};
    const initialHits: Record<string, number> = {};
    orderedPlayers.forEach(p => {
      initialProgress[p.id] = 0;
      initialDarts[p.id] = 0;
      initialHits[p.id] = 0;
    });

    setSelectedPlayers(orderedPlayers);
    setPlayerProgress(initialProgress);
    setPlayerDarts(initialDarts);
    setPlayerHits(initialHits);
    setCurrentPlayerIndex(0);
    setCurrentDarts([]);
    setTurnHistory([]);
    setGameStartTime(Date.now());
    setShowSetup(false);
  };

  const handleSpinnerComplete = (startingPlayerIndex: number) => {
    if (!pendingGamePlayers) return;
    // Reorder players so the spinner winner goes first
    const reordered = [
      ...pendingGamePlayers.slice(startingPlayerIndex),
      ...pendingGamePlayers.slice(0, startingPlayerIndex),
    ];
    setShowSpinner(false);
    setPendingGamePlayers(null);
    initGame(reordered);
  };

  const confirmThrow = useCallback(() => {
    if (!currentPlayer || currentDarts.length === 0) return;

    const playerId = currentPlayer.id;
    const prevProgress = playerProgress[playerId] || 0;
    const prevDartsUsed = playerDarts[playerId] || 0;
    const prevHits = playerHits[playerId] || 0;

    // Save snapshot for undo
    setTurnHistory(prev => [...prev, {
      playerId,
      playerIndex: currentPlayerIndex,
      darts: [...currentDarts],
      prevProgress,
      prevDarts: prevDartsUsed,
      prevHits,
    }]);

    let progress = prevProgress;
    let dartsUsed = prevDartsUsed;
    let hits = prevHits;

    currentDarts.forEach(dart => {
      dartsUsed++;
      if (dart.bed !== 'miss') {
        hits++;
        if (progress < targets.length) {
          progress++;
        }
      }
    });

    setPlayerProgress(prev => ({ ...prev, [playerId]: progress }));
    setPlayerDarts(prev => ({ ...prev, [playerId]: dartsUsed }));
    setPlayerHits(prev => ({ ...prev, [playerId]: hits }));

    if (progress >= targets.length) {
      clearGameState(STORAGE_KEYS.ATC);
      setWinner(currentPlayer);
      setShowWinner(true);
      audioSystem.playSound('/sounds/OMNI/pop-success.mp3', true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    } else {
      setCurrentDarts([]);
      setCurrentPlayerIndex(prev => (prev + 1) % selectedPlayers.length);
    }
  }, [currentPlayer, currentDarts, playerProgress, playerDarts, playerHits, targets, selectedPlayers, currentPlayerIndex]);

  // Auto-confirm after 3 darts (skip if restoring from undo/history)
  useEffect(() => {
    if (currentDarts.length === 3) {
      if (restoringRef.current) {
        restoringRef.current = false;
        return;
      }
      autoConfirmRef.current = setTimeout(() => {
        confirmThrow();
      }, 300);
      return () => {
        if (autoConfirmRef.current) clearTimeout(autoConfirmRef.current);
      };
    }
  }, [currentDarts.length, confirmThrow]);

  const handleHit = () => {
    if (!currentPlayer || currentDarts.length >= 3) return;

    const target = targets[(playerProgress[currentPlayer.id] || 0) +
      currentDarts.filter(d => d.bed !== 'miss').length];

    if (!target) {
      handleMiss();
      return;
    }

    const dart: Dart = {
      segment: target.segment,
      multiplier: target.multiplier as 0 | 1 | 2 | 3,
      score: target.segment * target.multiplier,
      bed: target.multiplier === 3 ? 'triple' : target.multiplier === 2 ? 'double' : target.segment === 25 ? 'bull' : 'single',
    };

    setCurrentDarts(prev => [...prev, dart]);
    audioSystem.playSound('/sounds/OMNI/pop-success.mp3');
  };

  const handleMiss = () => {
    if (currentDarts.length >= 3) return;

    const dart: Dart = {
      segment: 0,
      multiplier: 0 as 0 | 1 | 2 | 3,
      score: 0,
      bed: 'miss',
    };

    setCurrentDarts(prev => [...prev, dart]);
    audioSystem.playSound('/sounds/OMNI/pop-success.mp3');
  };

  const cancelAutoConfirm = () => {
    if (autoConfirmRef.current) {
      clearTimeout(autoConfirmRef.current);
      autoConfirmRef.current = null;
    }
  };

  const handleUndo = () => {
    if (currentDarts.length > 0) {
      // Step 1: Remove last dart from current throw
      cancelAutoConfirm();
      setCurrentDarts(prev => prev.slice(0, -1));
    } else if (turnHistory.length > 0) {
      // Step 2: Restore previous confirmed throw (may switch player)
      const last = turnHistory[turnHistory.length - 1];
      setTurnHistory(prev => prev.slice(0, -1));
      setPlayerProgress(prev => ({ ...prev, [last.playerId]: last.prevProgress }));
      setPlayerDarts(prev => ({ ...prev, [last.playerId]: last.prevDarts }));
      setPlayerHits(prev => ({ ...prev, [last.playerId]: last.prevHits }));
      setCurrentPlayerIndex(last.playerIndex);
      restoringRef.current = true;
      setCurrentDarts(last.darts);
    }
  };

  // Tap player card → undo back to that player's last turn
  const handleSwitchToPlayer = (targetIdx: number) => {
    if (targetIdx === currentPlayerIndex && currentDarts.length === 0) return;
    cancelAutoConfirm();

    // Tapping current player: just discard unconfirmed darts
    if (targetIdx === currentPlayerIndex) {
      setCurrentDarts([]);
      return;
    }

    // Discard current unconfirmed darts
    const targetPlayerId = selectedPlayers[targetIdx].id;
    let history = [...turnHistory];

    // Walk backwards through history, undoing each turn until we find target player
    const progressUpdates: Record<string, number> = {};
    const dartsUpdates: Record<string, number> = {};
    const hitsUpdates: Record<string, number> = {};
    let restoredDarts: Dart[] = [];
    let found = false;

    while (history.length > 0) {
      const last = history[history.length - 1];
      history = history.slice(0, -1);

      // Restore this player's state to before their throw
      progressUpdates[last.playerId] = last.prevProgress;
      dartsUpdates[last.playerId] = last.prevDarts;
      hitsUpdates[last.playerId] = last.prevHits;

      if (last.playerId === targetPlayerId) {
        // Found target player's turn — load their darts for editing
        restoredDarts = last.darts;
        found = true;
        break;
      }
    }

    if (found) {
      setTurnHistory(history);
      setPlayerProgress(prev => ({ ...prev, ...progressUpdates }));
      setPlayerDarts(prev => ({ ...prev, ...dartsUpdates }));
      setPlayerHits(prev => ({ ...prev, ...hitsUpdates }));
      setCurrentPlayerIndex(targetIdx);
      restoringRef.current = true;
      setCurrentDarts(restoredDarts);
    }
  };

  const handleBack = () => {
    // If game is active (not setup, not winner), show confirmation
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
    // State is already saved in localStorage via the save useEffect
    window.location.href = '/';
  };

  const handleEndGame = () => {
    setShowBackConfirm(false);
    clearGameState(STORAGE_KEYS.ATC);
    window.location.href = '/';
  };

  // Segmented button component with descriptions
  const SegmentedButtons = ({ options, value, onChange }: {
    options: { value: string; label: string; desc?: string }[];
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div>
      <div className="flex rounded-xl overflow-hidden border border-dark-600">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-2.5 px-3 text-sm font-medium transition-all ${
              value === opt.value
                ? 'bg-primary-500 text-white'
                : 'bg-dark-800 text-gray-400 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {options.find(o => o.value === value)?.desc && (
        <p className="text-xs text-gray-500 mt-1.5 ml-1">
          {options.find(o => o.value === value)?.desc}
        </p>
      )}
    </div>
  );

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
          <button
            onClick={handleBack}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>

          <div className="glass-card rounded-2xl p-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Clock className="text-primary-400" />
              {t('atc.title')}
            </h1>

            {/* Settings */}
            <div className="mb-6 space-y-4">
              {/* Bull Mode */}
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">{t('atc.bull_mode')}</label>
                <SegmentedButtons
                  options={[
                    { value: 'off', label: t('atc.bull_off'), desc: t('atc.bull_off_desc') },
                    { value: 'standard', label: t('atc.bull_standard'), desc: t('atc.bull_standard_desc') },
                    { value: 'split', label: t('atc.bull_split'), desc: t('atc.bull_split_desc') },
                  ]}
                  value={bullMode}
                  onChange={v => setBullMode(v as BullMode)}
                />
              </div>

              {/* Direction */}
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">{t('atc.direction')}</label>
                <SegmentedButtons
                  options={[
                    { value: 'ascending', label: t('atc.ascending') },
                    { value: 'descending', label: t('atc.descending') },
                  ]}
                  value={direction}
                  onChange={v => setDirection(v as Direction)}
                />
              </div>

              {/* Variant */}
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">{t('atc.variant')}</label>
                <SegmentedButtons
                  options={[
                    { value: 'standard', label: t('atc.variant_standard'), desc: t('atc.variant_standard_desc') },
                    { value: 'doubles', label: t('atc.variant_doubles'), desc: t('atc.variant_doubles_desc') },
                    { value: 'triples', label: t('atc.variant_triples'), desc: t('atc.variant_triples_desc') },
                  ]}
                  value={variant}
                  onChange={v => setVariant(v as Variant)}
                />
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
                    <div className="text-sm font-medium text-white text-center truncate">{player.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="bg-dark-800 rounded-xl p-4 mb-6">
              <h3 className="text-white font-semibold mb-2">{t('atc.rules_title')}</h3>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• {t('atc.rules_hit_targets')}</li>
                <li>• {bullMode !== 'off' ? t('atc.rules_bull') : t('atc.rules_no_bull')}</li>
                {variant === 'standard' && <li>• {t('atc.rules_standard_all_count')}</li>}
                {variant === 'doubles' && <li>• {t('atc.rules_doubles_only')}</li>}
                {variant === 'triples' && <li>• {t('atc.rules_triples_only')}</li>}
                <li>• {t('atc.rules_first_wins')}</li>
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
                ? t('atc.select_min')
                : t('atc.start_game')
              }
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compute dart slot display for current throw
  const getDartSlotContent = (idx: number) => {
    const dart = currentDarts[idx];
    if (!dart) return null;
    if (dart.bed === 'miss') return { hit: false, label: 'X' };

    const hitTargetIdx = (playerProgress[currentPlayer?.id || ''] || 0) +
      currentDarts.slice(0, idx).filter(d => d.bed !== 'miss').length;
    const hitTarget = targets[hitTargetIdx];
    return { hit: true, label: hitTarget?.shortLabel || '?' };
  };

  // Game screen
  return (
    <div className="min-h-dvh p-2 sm:p-4 gradient-mesh">
      {/* Winner Modal */}
      <AnimatePresence>
        {showWinner && winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="glass-card rounded-2xl p-6 sm:p-8 text-center max-w-md w-full"
            >
              <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {t('atc.winner_title', { name: winner.name })}
              </h2>
              <p className="text-gray-400 mb-4">
                {t('atc.winner_time', { time: formatTime(elapsedTime) })}
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-dark-800 rounded-xl p-3">
                  <p className="text-2xl font-bold text-primary-400">{playerDarts[winner.id]}</p>
                  <p className="text-xs text-gray-400">{t('game.darts')}</p>
                </div>
                <div className="bg-dark-800 rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-400">
                    {playerDarts[winner.id] > 0
                      ? Math.round((playerHits[winner.id] / playerDarts[winner.id]) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-400">{t('training.accuracy')}</p>
                </div>
                <div className="bg-dark-800 rounded-xl p-3">
                  <p className="text-2xl font-bold text-yellow-400">{formatTime(elapsedTime)}</p>
                  <p className="text-xs text-gray-400">{t('training.duration')}</p>
                </div>
                <div className="bg-dark-800 rounded-xl p-3">
                  <p className="text-2xl font-bold text-accent-400">
                    {targets.length > 0
                      ? (playerDarts[winner.id] / targets.length).toFixed(1)
                      : '0'}
                  </p>
                  <p className="text-xs text-gray-400">{t('game.darts')}/{t('atc.current_target').toLowerCase()}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWinner(false);
                  setShowSetup(true);
                  setWinner(null);
                  setCurrentDarts([]);
                }}
                className="w-full px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold"
              >
                {t('atc.new_game')}
              </button>
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
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-sm w-full text-center"
            >
              <h3 className="text-xl font-bold text-white mb-3">
                {t('resume.pause_title')}
              </h3>
              <p className="text-gray-400 mb-6">
                {t('resume.pause_message')}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleConfirmBack}
                  className="w-full py-3 rounded-xl bg-primary-500 text-white font-semibold hover:bg-primary-600"
                >
                  {t('resume.pause_and_leave')}
                </button>
                <button
                  onClick={handleEndGame}
                  className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-500"
                >
                  {t('resume.end_game')}
                </button>
                <button
                  onClick={() => setShowBackConfirm(false)}
                  className="w-full py-3 rounded-xl bg-dark-700 text-white font-semibold hover:bg-dark-600"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-3">
        <div className="flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 glass-card px-3 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>
          <div className="text-center">
            <h1 className="text-lg sm:text-xl font-bold text-white">{t('atc.title')}</h1>
            <p className="text-primary-400 text-sm">{formatTime(elapsedTime)}</p>
          </div>
          <div className="w-12" />
        </div>
      </div>

      {/* Progress Track — wrapping grid, no scroll */}
      <div className="max-w-4xl mx-auto mb-3">
        <div className="glass-card rounded-xl p-3">
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
            {targets.map((target, idx) => {
              const effectiveProgress = getEffectiveProgress(currentPlayer?.id || '');
              const committedProgress = playerProgress[currentPlayer?.id || ''] || 0;
              const isPast = idx < committedProgress;
              const isPending = idx >= committedProgress && idx < effectiveProgress;
              const isCurrent = idx === effectiveProgress;

              return (
                <div
                  key={`${target.label}-${idx}`}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all ${
                    isPast
                      ? 'bg-green-500 text-white'
                      : isPending
                      ? 'bg-green-500/60 text-white ring-1 ring-green-400'
                      : isCurrent
                      ? 'bg-primary-500 text-white ring-2 ring-primary-300 animate-pulse'
                      : 'bg-dark-700 text-gray-500'
                  }`}
                >
                  {target.shortLabel}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Player Cards — tappable, show current target prominently */}
      {selectedPlayers.length > 1 && (
        <div className="max-w-4xl mx-auto mb-3">
          <div className="glass-card rounded-xl p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {selectedPlayers.map((player, idx) => {
                const effectiveProgress = getEffectiveProgress(player.id);
                const darts = playerDarts[player.id] || 0;
                const isActive = idx === currentPlayerIndex;
                const playerTarget = targets[effectiveProgress];

                return (
                  <button
                    key={player.id}
                    onClick={() => handleSwitchToPlayer(idx)}
                    className={`p-2.5 sm:p-3 rounded-xl text-center transition-all ${
                      isActive
                        ? 'bg-primary-500/20 ring-2 ring-primary-500'
                        : 'bg-dark-800 hover:bg-dark-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-white font-semibold text-sm sm:text-base truncate">{player.name}</p>
                        <p className="text-gray-400 text-xs">
                          {effectiveProgress}/{targets.length} • {darts} Darts
                        </p>
                      </div>
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center font-bold text-sm sm:text-base flex-shrink-0 ${
                        isActive ? 'bg-primary-500 text-white' : 'bg-dark-600 text-gray-300'
                      }`}>
                        {playerTarget ? playerTarget.shortLabel : <Check size={16} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Current Target */}
      <div className="max-w-4xl mx-auto mb-3">
        <div className="glass-card rounded-xl p-4 sm:p-6 text-center">
          <p className="text-gray-400 text-sm mb-1">{t('atc.current_target')}</p>
          <div className="text-5xl sm:text-6xl font-bold text-primary-400 mb-1">
            {currentTarget ? currentTarget.label : '—'}
          </div>
          <p className="text-white text-sm">{currentPlayer?.name}</p>
          <p className="text-gray-500 text-xs mt-1">
            {t('atc.targets_progress', {
              done: getEffectiveProgress(currentPlayer?.id || ''),
              total: targets.length,
            })}
          </p>
        </div>
      </div>

      {/* Dart Slots + Input */}
      <div className="max-w-4xl mx-auto mb-3">
        <div className="glass-card rounded-xl p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm sm:text-base">
              {t('atc.throw_count', { current: currentDarts.length })}
            </h3>
            <button
              onClick={handleUndo}
              disabled={currentDarts.length === 0 && turnHistory.length === 0}
              className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 disabled:opacity-50"
            >
              <RotateCcw size={18} />
            </button>
          </div>

          <div className="flex gap-2 sm:gap-3 mb-4">
            {[0, 1, 2].map(idx => {
              const slot = getDartSlotContent(idx);

              return (
                <div
                  key={idx}
                  className={`flex-1 h-12 sm:h-14 rounded-xl flex items-center justify-center text-base sm:text-lg font-bold ${
                    slot
                      ? slot.hit
                        ? 'bg-green-500/20 text-green-400 border-2 border-green-500'
                        : 'bg-red-500/20 text-red-400 border-2 border-red-500'
                      : 'bg-dark-800 text-gray-600 border-2 border-dashed border-dark-600'
                  }`}
                >
                  {slot ? (slot.hit ? <Check size={20} /> : <X size={20} />) : '—'}
                </div>
              );
            })}
          </div>

          {/* Hit / Miss Buttons */}
          <div className="flex gap-3 mb-3">
            <button
              onClick={handleHit}
              disabled={currentDarts.length >= 3 || !currentTarget}
              className="flex-1 py-6 sm:py-8 rounded-xl font-bold text-xl sm:text-2xl transition-all flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white disabled:opacity-40 disabled:hover:bg-green-600 active:scale-95"
            >
              <Check size={28} />
              {t('atc.hit')}
            </button>
            <button
              onClick={handleMiss}
              disabled={currentDarts.length >= 3}
              className="flex-1 py-6 sm:py-8 rounded-xl font-bold text-xl sm:text-2xl transition-all flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white disabled:opacity-40 disabled:hover:bg-red-600 active:scale-95"
            >
              <X size={28} />
              {t('atc.miss')}
            </button>
          </div>

          {/* Confirm */}
          <button
            onClick={confirmThrow}
            disabled={currentDarts.length === 0}
            className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              currentDarts.length > 0
                ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:from-primary-600 hover:to-accent-600'
                : 'bg-dark-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Check size={20} />
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AroundTheClockGame;
