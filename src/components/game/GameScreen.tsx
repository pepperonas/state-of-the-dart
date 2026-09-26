import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, X, Bot, ChevronDown, AlertTriangle, Smile, Flame, UserMinus, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
const Confetti = lazy(() => import('react-confetti'));
const ThrowChart = lazy(() => import('./ThrowChart'));
import { useGame, MIN_MATCH_PLAYERS } from '../../context/GameContext';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings } from '../../context/SettingsContext';
import { useTenant } from '../../context/TenantContext';
import { useGameAchievements } from '../../hooks/useGameAchievements';
import { useAchievementHints } from '../../hooks/useAchievementHints';
import Dartboard from '../dartboard/Dartboard';
import { DartboardHeatmapBlur } from '../dartboard/DartboardHeatmapBlur';
import ScoreInput from './ScoreInput';
import PlayerScore from './PlayerScore';
import ScoreStrip from './ScoreStrip';
import CheckoutSuggestion from '../dartboard/CheckoutSuggestion';
import AchievementHint from '../achievements/AchievementHint';
import SpinnerWheel from './SpinnerWheel';
import BugReportModal from '../bugReport/BugReportModal';
import PlayerAvatar from '../player/PlayerAvatar';
import AvatarPicker from '../player/AvatarPicker';
import { Dart, Player, GameType, MatchSettings, Throw, HeatmapData } from '../../types/index';
import { calculateThrowScore } from '../../utils/scoring';
import { evaluateVisit, rulesOf } from '../../utils/visit';
import { haptic } from '../../utils/haptics';
import { useWakeLock } from '../../hooks/useWakeLock';
import { getCheckoutAlternatives } from '../../data/checkoutTable';
import { PersonalBests, createEmptyPersonalBests, updatePersonalBests } from '../../types/personalBests';
import audioSystem from '../../utils/audio';
import { api } from '../../services/api';
import { createAdaptiveBotPlayer, getAdaptiveBotConfigs, generateBotTurn, AdaptiveBotCategory } from '../../utils/botLogic';
import BackButton from '../common/BackButton';
import { motion } from 'framer-motion';
import { Button, IconButton, Card, Dialog, Select, Switch, Snackbar } from '../common';
import { loadLastGameSettings, saveLastGameSettings, rotateForRematch, standings, findReusableGuest, GUEST_NAME } from '../../utils/matchSetup';
const MatchDetailModal = lazy(() => import('../dashboard/MatchDetailModal'));
import { staggerChild, springSpatialDefault, springSpatialFast } from '../../utils/motion';
import { Icon, iconForEmoji } from '../icons';

const GameScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const forceNewGameRef = useRef(searchParams.get('new') === '1');
  const resumeRequestedRef = useRef(searchParams.get('resume') === '1');
  // `?quick=1` — the home screen's rematch button: start with the last players
  // and settings straight away.
  const quickStartRef = useRef(searchParams.get('quick') === '1');
  const { state, dispatch, pauseCurrentMatch } = useGame();
  const { players, addPlayer } = usePlayer();
  const { settings } = useSettings();
  const { storage } = useTenant();
  const { checkMatchAchievements, checkLegAchievements, checkThrowAchievements, checkCalendarAchievements } = useGameAchievements();
  
  // Track achievement hints
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());
  const currentMatchPlayer = state.currentMatch?.players[state.currentPlayerIndex];
  const hints = useAchievementHints(
    currentMatchPlayer?.playerId || null,
    currentMatchPlayer ? {
      matchAverage: currentMatchPlayer.matchAverage,
      score180s: currentMatchPlayer.match180s,
      checkoutRate: currentMatchPlayer.checkoutAttempts > 0 
        ? (currentMatchPlayer.checkoutsHit / currentMatchPlayer.checkoutAttempts) * 100 
        : 0,
    } : undefined
  ).filter(hint => !dismissedHints.has(hint.achievementId));
  
  // In-game mute: silences the caller for this device without touching the
  // saved volumes. Remembered, because a player who muted at the board wants
  // the next match quiet too.
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('sotd-muted') === '1'; } catch { return false; }
  });
  const toggleMuted = () => setMuted(m => {
    try { localStorage.setItem('sotd-muted', m ? '0' : '1'); } catch { /* storage unavailable */ }
    return !m;
  });

  useEffect(() => {
    audioSystem.setEnabled(!muted && (settings.soundVolume > 0 || (settings.callerVolume ?? 0) > 0 || (settings.effectsVolume ?? 0) > 0));
    audioSystem.setCallerVolume(settings.callerVolume ?? settings.soundVolume);
    audioSystem.setEffectsVolume(settings.effectsVolume ?? settings.soundVolume);
  }, [settings.soundVolume, settings.callerVolume, settings.effectsVolume, muted]);

  // Reset navigation flag when component mounts (user returns to game)
  useEffect(() => {
    isNavigatingAwayRef.current = false;
  }, []);

  // Track processed matches to avoid duplicate achievement checks
  const [processedMatchIds, setProcessedMatchIds] = useState<Set<string>>(new Set());

  // Spinner wheel state
  const [showSpinner, setShowSpinner] = useState(false);
  const [pendingGameStart, setPendingGameStart] = useState<{
    players: Player[];
    settings: MatchSettings;
  } | null>(null);

  // Confirmation dialogs
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  // Player pending removal from the running match (id, so the callback stays stable
  // across renders and PlayerScore's React.memo keeps working).
  const [playerToRemoveId, setPlayerToRemoveId] = useState<string | null>(null);

  // Leg won animation state
  const [legWonAnimation, setLegWonAnimation] = useState<{
    show: boolean;
    winnerName: string;
    winnerAvatar?: string;
    winnerId?: string;
    legNumber: number;
    legsWon: number;
    legsTotal: number;
  } | null>(null);
  // Seeded with the match that is already loaded, so resuming a match at leg N
  // does not replay a "leg won" animation for leg N-1.
  const lastLegIndexRef = React.useRef<number>(state.currentMatch?.currentLegIndex ?? 0);
  const lastLegMatchIdRef = React.useRef<string | undefined>(state.currentMatch?.id);

  // Detect a leg win: the leg index moved forward within the same match.
  useEffect(() => {
    const match = state.currentMatch;
    if (!match) return;
    const currentLegIndex = match.currentLegIndex;
    const previousIndex = lastLegIndexRef.current;
    const sameMatch = lastLegMatchIdRef.current === match.id;
    lastLegIndexRef.current = currentLegIndex;
    lastLegMatchIdRef.current = match.id;

    // A different match (new, resumed or loaded): just re-anchor.
    if (!sameMatch) return;
    // Stepped back by an undo: the win it announced no longer exists.
    if (currentLegIndex < previousIndex) {
      setLegWonAnimation(null);
      return;
    }
    if (currentLegIndex === previousIndex || match.status !== 'in-progress') return;

    const completedLeg = match.legs[currentLegIndex - 1];
    if (!completedLeg?.winner) return;

    // ⚠️ Before the animation's early return — this used to sit after it, so
    // leg achievements were only ever checked for the final leg of a match.
    checkLegAchievements(completedLeg, match, completedLeg.winner);

    const winnerPlayer = match.players.find(p => p.playerId === completedLeg.winner);
    if (!winnerPlayer) return;
    const fullPlayer = players.find(p => p.id === winnerPlayer.playerId);

    setLegWonAnimation({
      show: true,
      winnerName: winnerPlayer.name,
      winnerAvatar: fullPlayer?.avatar,
      winnerId: winnerPlayer.playerId,
      legNumber: currentLegIndex, // 1-indexed number of the leg just won
      legsWon: winnerPlayer.legsWon,
      legsTotal: match.settings.legsToWin || 3,
    });

    const timer = setTimeout(() => setLegWonAnimation(null), 5000);
    return () => clearTimeout(timer);
  }, [state.currentMatch?.currentLegIndex, state.currentMatch?.id]);

  // Check achievements when match is completed (only once per match)
  useEffect(() => {
    if (state.currentMatch?.status === 'completed' && state.currentMatch.winner && state.currentMatch.id) {
      const match = state.currentMatch;
      const matchId = match.id;
      
      // Skip if we already processed this match
      if (processedMatchIds.has(matchId)) {
        return;
      }

      const winnerId = match.winner;

      if (winnerId && storage) {
        // Mark as processed
        setProcessedMatchIds(prev => new Set(prev).add(matchId));

        // Check match achievements for all players
        checkMatchAchievements(match, winnerId, (playerId) => playerId === winnerId);

        // Check calendar achievements (async, non-blocking)
        for (const player of match.players) {
          if (!player.isBot) {
            checkCalendarAchievements(player.playerId);
          }
        }

        // Check leg achievements for winner
        const lastLeg = match.legs[match.legs.length - 1];
        if (lastLeg) {
          checkLegAchievements(lastLeg, match, winnerId);
        }

        // Update Personal Bests for all players
        const personalBestsData = storage.get<Record<string, PersonalBests>>('personalBests', {});
        
        match.players.forEach((matchPlayer) => {
          const playerId = matchPlayer.playerId;
          const currentBests = personalBestsData[playerId] || createEmptyPersonalBests(playerId);
          
          // Calculate shortest leg for this player
          const playerLegs = match.legs.filter(leg => leg.winner === playerId);
          const shortestLegDarts = playerLegs.length > 0 
            ? Math.min(...playerLegs.map(leg => {
                const playerThrows = leg.throws.filter(t => t.playerId === playerId);
                return playerThrows.length * 3; // Each throw = 3 darts
              }))
            : undefined;

          // Update personal bests
          const updatedBests = updatePersonalBests(currentBests, {
            matchAverage: matchPlayer.matchAverage,
            highestScore: matchPlayer.matchHighestScore,
            score180s: matchPlayer.match180s,
            checkoutsHit: matchPlayer.checkoutsHit,
            checkoutAttempts: matchPlayer.checkoutAttempts,
            legsWon: matchPlayer.legsWon,
            legsLost: match.players.length - 1 - matchPlayer.legsWon, // Simplified
            isWinner: playerId === winnerId,
            gameId: match.id,
            gameDate: new Date(match.startedAt),
            shortestLegDarts,
          });

          personalBestsData[playerId] = updatedBests;
        });

        // Save updated personal bests to localStorage (cache) and API (primary)
        storage.set('personalBests', personalBestsData);

        // Sync each player's personal bests to database
        match.players.forEach((matchPlayer) => {
          const playerId = matchPlayer.playerId;
          const bests = personalBestsData[playerId];
          if (bests && !matchPlayer.isBot) {
            api.players.updatePersonalBests(playerId, bests).catch(error => {
              console.error(`Failed to sync personal bests for ${playerId} to API:`, error);
            });
          }
        });
        console.log('✅ Personal Bests updated for all players');
      }
    }
  }, [state.currentMatch?.status, state.currentMatch?.winner, state.currentMatch?.id, checkMatchAchievements, checkLegAchievements, processedMatchIds, storage]);
  const [showSetup, setShowSetup] = useState(
    !state.currentMatch || forceNewGameRef.current ||
    (state.currentMatch?.status === 'paused' && !resumeRequestedRef.current)
  );

  // Keep the screen on while a match is being played.
  useWakeLock(!showSetup && state.currentMatch?.status === 'in-progress');

  // Clear ?new=1 or ?resume=1 from URL after consuming it
  useEffect(() => {
    if (forceNewGameRef.current || resumeRequestedRef.current) {
      setSearchParams({}, { replace: true });
    }
  }, []);

  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showPlayerNameInput, setShowPlayerNameInput] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState<string | undefined>(undefined);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showBotSelector, setShowBotSelector] = useState(false);
  const [showThrowHistory, setShowThrowHistory] = useState(false);
  const [showThrowChart, setShowThrowChart] = useState(false);
  const [showMatchStats, setShowMatchStats] = useState(false);
  const [showLiveHeatmap, setShowLiveHeatmap] = useState(false);
  const [selectedHeatmapPlayer, setSelectedHeatmapPlayer] = useState<string | null>(null);
  const [heatmapView, setHeatmapView] = useState<'leg' | 'match'>('match');
  const [statsView, setStatsView] = useState<'leg' | 'match'>('match');
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const [editingDartIndex, setEditingDartIndex] = useState<number | null>(null);
  const [isEditingThrow, setIsEditingThrow] = useState(false);

  // Load last players from storage
  const getLastPlayers = (): string[] => {
    if (!storage) return [];
    return storage.get<string[]>('lastPlayerIds', []);
  };
  
  const saveLastPlayers = (playerIds: string[]) => {
    if (!storage) return;
    storage.set('lastPlayerIds', playerIds);
  };
  
  const loadLastPlayers = () => {
    const lastPlayerIds = getLastPlayers();
    const lastPlayers = players.filter(p => lastPlayerIds.includes(p.id));
    if (lastPlayers.length > 0) {
      setSelectedPlayers(lastPlayers);
    }
  };
  const [showConfetti, setShowConfetti] = useState(false);
  // The last settings are remembered; a fresh device starts with the standard
  // game (501, double out) — it used to be 301 without double out.
  const [gameSettings, setGameSettings] = useState<MatchSettings>(loadLastGameSettings);

  // Pre-select the last players once the list has loaded: a rematch of the
  // usual pairing should not start with a hunt through the list.
  const preselectedRef = useRef(false);
  useEffect(() => {
    if (preselectedRef.current || players.length === 0 || selectedPlayers.length > 0) return;
    preselectedRef.current = true;
    loadLastPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length]);

  // "Match ended — undo" (the dialog promised an undo nobody could reach: the
  // screen switched to the setup, where the undo button was never rendered).
  const [endedMatchId, setEndedMatchId] = useState<string | null>(null);
  const [showMatchDetail, setShowMatchDetail] = useState(false);
  const isBotPlayingRef = useRef(false);
  const botTimersRef = useRef<NodeJS.Timeout[]>([]);
  const isNavigatingAwayRef = useRef(false);
  // The auto-advance after a confirmed visit. Kept so an undo inside that
  // one-second window can cancel it — otherwise NEXT_PLAYER fired anyway and
  // threw away the darts the undo had just brought back.
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelAutoNext = () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  };
  useEffect(() => cancelAutoNext, []);

  /** What the given darts do for the player at the oche — see utils/visit. */
  const evaluateCurrent = (darts: Dart[]) => {
    const match = state.currentMatch;
    const player = match?.players[state.currentPlayerIndex];
    const leg = match?.legs[match.currentLegIndex];
    if (!match || !player || !leg) return null;
    return evaluateVisit(rulesOf(match.settings), leg.throws, player.playerId, darts);
  };

  // Calculate total throws count for dependency tracking
  const totalThrowsCount = state.currentMatch?.legs.reduce(
    (total, leg) => total + (leg.throws?.length || 0), 0
  ) || 0;

  // Calculate live heatmap data from current match throws
  const liveHeatmapData = useMemo((): Record<string, HeatmapData> => {
    if (!state.currentMatch) return {};

    const heatmaps: Record<string, HeatmapData> = {};

    // Collect throws based on view mode
    const allThrows: Throw[] = heatmapView === 'leg'
      ? (state.currentMatch.legs[state.currentMatch.currentLegIndex]?.throws || [])
      : state.currentMatch.legs.flatMap(leg => leg.throws || []);
    
    // Group throws by player
    state.currentMatch.players.forEach(player => {
      const playerThrows = allThrows.filter(t => t.playerId === player.playerId);
      const segments: Record<string, number> = {};
      let totalDarts = 0;
      
      playerThrows.forEach(throwData => {
        if (throwData.darts) {
          throwData.darts.forEach(dart => {
            if (dart.segment > 0 && dart.multiplier > 0) {
              // Format: "multiplier x segment" (e.g., "3x20" for triple 20)
              const key = `${dart.multiplier}x${dart.segment}`;
              segments[key] = (segments[key] || 0) + 1;
              totalDarts++;
            }
          });
        }
      });
      
      heatmaps[player.playerId] = {
        playerId: player.playerId,
        segments,
        totalDarts,
        lastUpdated: new Date(),
      };
    });
    
    return heatmaps;
  }, [state.currentMatch?.legs, state.currentMatch?.players, totalThrowsCount, heatmapView]);

  // Announce "You require X" when player's turn STARTS and they can checkout
  useEffect(() => {
    if (!state.currentMatch || state.currentMatch.status !== 'in-progress') return;

    const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
    if (!currentLeg || currentLeg.winner) return;

    const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
    if (!currentPlayer) return;

    // Skip announcement for bots. Read it off the match player: `selectedPlayers`
    // is empty after a resume, which made the caller speak for bots.
    if (currentPlayer.isBot) return;

    const remaining = evaluateCurrent([])?.previousRemaining ?? 0;

    // Announce "You require X" only if player can checkout (2-170)
    if (remaining >= 2 && remaining <= 170) {
      // Small delay to ensure turn transition is complete
      const timer = setTimeout(() => {
        audioSystem.announceRemaining(remaining, true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.currentPlayerIndex, state.currentMatch?.currentLegIndex]);

  // Bot auto-play: When it's a bot's turn, automatically generate and play throws
  const currentTurnPlayerId = state.currentMatch?.players[state.currentPlayerIndex]?.playerId;
  useEffect(() => {
    const match = state.currentMatch;
    if (!match || match.status !== 'in-progress') return;
    if (isBotPlayingRef.current) return; // Prevent multiple concurrent bot plays

    const currentLeg = match.legs[match.currentLegIndex];
    if (!currentLeg || currentLeg.winner) return;

    const currentMatchPlayer = match.players[state.currentPlayerIndex];
    if (!currentMatchPlayer?.isBot || !currentMatchPlayer.botLevel) return;

    const rules = rulesOf(match.settings);
    const legThrows = currentLeg.throws;
    const botId = currentMatchPlayer.playerId;
    const remaining = rules.startScore - legThrows
      .filter(t => t.playerId === botId)
      .reduce((sum, t) => sum + t.score, 0);
    if (remaining <= 0) return;

    // A bot never edits a visit. Darts left in the input — after a pause mid-turn,
    // or an undo that landed on the bot — are cleared, and the bot throws a fresh
    // turn. Otherwise ADD_DART was ignored at three darts and the stale darts got
    // committed, mixed with the new ones.
    setIsEditingThrow(false);
    setEditingDartIndex(null);
    if (state.currentThrow.length > 0) dispatch({ type: 'CLEAR_THROW' });

    isBotPlayingRef.current = true;
    let isCancelled = false;

    const botTurn = generateBotTurn(currentMatchPlayer.botLevel, remaining);
    let dartIndex = 0;

    const confirmTurn = (checkedOut: boolean) => {
      const timer1 = setTimeout(() => {
        if (isCancelled) return;
        dispatch({ type: 'CONFIRM_THROW' });
        // On a checkout CONFIRM_THROW already handles the leg/match transition.
        if (!checkedOut) {
          const timer2 = setTimeout(() => {
            if (isCancelled) return;
            isBotPlayingRef.current = false;
            dispatch({ type: 'NEXT_PLAYER' });
          }, 800);
          botTimersRef.current.push(timer2);
        } else {
          isBotPlayingRef.current = false;
        }
      }, 400);
      botTimersRef.current.push(timer1);
    };

    const playNextDart = () => {
      if (isCancelled) return;
      if (dartIndex >= botTurn.length) {
        confirmTurn(evaluateVisit(rules, legThrows, botId, botTurn).checkout);
        return;
      }

      dispatch({ type: 'ADD_DART', payload: botTurn[dartIndex] });
      audioSystem.playSound('/sounds/OMNI/pop.mp3', false);
      dartIndex++;

      // Stop at a checkout — no more darts after the leg is won.
      if (evaluateVisit(rules, legThrows, botId, botTurn.slice(0, dartIndex)).checkout) {
        confirmTurn(true);
        return;
      }

      const timer = setTimeout(playNextDart, 600);
      botTimersRef.current.push(timer);
    };

    const startDelay = setTimeout(() => {
      if (!isCancelled) playNextDart();
    }, 1000);
    botTimersRef.current.push(startDelay);

    return () => {
      isCancelled = true;
      botTimersRef.current.forEach(timer => clearTimeout(timer));
      botTimersRef.current = [];
      isBotPlayingRef.current = false;
    };
    // currentTurnPlayerId: REMOVE_PLAYER can put a bot at the same index — the
    // index alone did not change, so the bot never started.
  }, [state.currentPlayerIndex, currentTurnPlayerId, state.currentMatch?.currentLegIndex, state.currentMatch?.status, dispatch]);

  useEffect(() => {
    // Don't auto-resume if we're navigating away (user clicked "Pause")
    if (isNavigatingAwayRef.current) {
      return;
    }

    // If user explicitly requested a new game, show setup — don't auto-resume
    if (forceNewGameRef.current) {
      return;
    }

    // Auto-resume paused matches only when explicitly requested via ?resume=1
    if (state.currentMatch?.status === 'paused' && resumeRequestedRef.current) {
      resumeRequestedRef.current = false;
      dispatch({ type: 'RESUME_MATCH' });
      setShowSetup(false);
      return;
    }

    // If there's a paused match but no explicit resume request, show setup
    if (state.currentMatch?.status === 'paused' && !resumeRequestedRef.current) {
      setShowSetup(true);
      return;
    }

    // Show setup if no match or if match is completed
    if ((!state.currentMatch || state.currentMatch.status === 'completed') && showSetup === false) {
      setShowSetup(true);
    }
  }, [state.currentMatch, state.currentMatch?.status, dispatch]);
  
  const handleStartGame = async () => {
    // Play a start sound to unlock audio system
    audioSystem.playSound('/sounds/effects/get_ready.mp3', true);

    let finalPlayers = selectedPlayers;

    if (selectedPlayers.length < 2) {
      // Add a guest player if only one selected — reusing the existing one.
      try {
        const guestPlayer = findReusableGuest(players, selectedPlayers.map(p => p.id))
          ?? await addPlayer(GUEST_NAME, 'user');
        finalPlayers = [...selectedPlayers, guestPlayer];
        setSelectedPlayers(finalPlayers);
      } catch (error) {
        console.error('Failed to create guest player:', error);
        alert('Fehler beim Erstellen eines Gastspielers');
        return;
      }
    }

    // Save last players and settings for quick select
    saveLastPlayers(finalPlayers.map(p => p.id));
    saveLastGameSettings(gameSettings);

    // Show spinner wheel to determine starting player
    setPendingGameStart({
      players: finalPlayers,
      settings: gameSettings,
    });
    setShowSetup(false);
    setShowSpinner(true);
  };

  useEffect(() => {
    if (!quickStartRef.current || !showSetup || selectedPlayers.length === 0) return;
    quickStartRef.current = false;
    handleStartGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayers, showSetup]);

  const handleSpinnerComplete = async (startingPlayerIndex: number) => {
    if (!pendingGameStart) return;

    const spinnerWinner = pendingGameStart.players[startingPlayerIndex];
    console.log(`🎯 Spinner winner: ${spinnerWinner?.name} (index ${startingPlayerIndex})`);

    // Pause existing match before starting a new one
    if (state.currentMatch && (state.currentMatch.status === 'in-progress' || state.currentMatch.status === 'paused')) {
      await pauseCurrentMatch();
    }

    // New game is now being started, clear the force flag
    forceNewGameRef.current = false;

    // Reorder players so the winner goes first
    const reorderedPlayers = [
      ...pendingGameStart.players.slice(startingPlayerIndex),
      ...pendingGameStart.players.slice(0, startingPlayerIndex),
    ];

    console.log(`🎮 Game starting with player order: ${reorderedPlayers.map(p => p.name).join(' → ')}`);

    dispatch({
      type: 'START_MATCH',
      payload: {
        players: reorderedPlayers,
        settings: pendingGameStart.settings,
        gameType: 'x01' as GameType,
      },
    });

    setShowSpinner(false);
    setPendingGameStart(null);
  };
  
  const handleDartHit = React.useCallback((dart: Dart) => {
    // If a dart is selected for editing, replace it
    if (editingDartIndex !== null) {
      dispatch({ type: 'REPLACE_DART', payload: { index: editingDartIndex, dart } });
      setEditingDartIndex(null);
    } else {
      dispatch({ type: 'ADD_DART', payload: dart });
    }
    // Play a subtle click sound for dart hit feedback
    audioSystem.playSound('/sounds/OMNI/pop.mp3', false);
    haptic('dart', settings.vibrationEnabled);
  }, [editingDartIndex, dispatch, settings.vibrationEnabled]);

  // Define handleConfirmThrow with useCallback BEFORE useEffects that use it
  const handleConfirmThrow = React.useCallback(() => {
    const currentScore = calculateThrowScore(state.currentThrow);
    const currentPlayer = state.currentMatch?.players[state.currentPlayerIndex];
    const currentLeg = state.currentMatch?.legs[state.currentMatch.currentLegIndex];
    const visit = evaluateCurrent(state.currentThrow);

    // A checkout is announced by GameContext, a bust too — only plain scores here.
    if (visit && !visit.checkout && !visit.bust) {
      audioSystem.announceScore(visit.score);
    }
    if (currentScore === 180) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    haptic(visit?.checkout ? 'checkout' : visit?.bust ? 'bust' : 'confirm', settings.vibrationEnabled);
    dispatch({ type: 'CONFIRM_THROW' });

    // Check throw achievements (180s, checkouts, etc.)
    if (currentPlayer && currentLeg && visit) {
      const playerThrowsInLeg = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const previousThrow = playerThrowsInLeg[playerThrowsInLeg.length - 1];
      const startScore = state.currentMatch?.settings.startScore || 501;

      let opponentRemaining: number | undefined;
      const opponent = state.currentMatch?.players.find(p => p.playerId !== currentPlayer.playerId);
      if (opponent) {
        opponentRemaining = startScore - currentLeg.throws
          .filter(t => t.playerId === opponent.playerId)
          .reduce((sum, t) => sum + t.score, 0);
      }

      checkThrowAchievements(
        currentPlayer.playerId,
        [...state.currentThrow],
        visit.score,
        visit.checkout,
        visit.checkout ? visit.score : undefined,
        state.currentMatch?.id,
        {
          previousThrowScore: previousThrow?.score,
          visitNumber: playerThrowsInLeg.length + 1,
          opponentRemaining,
          hadBustInLeg: playerThrowsInLeg.some(t => t.isBust),
          isBust: visit.bust,
          isCheckoutAttempt: visit.previousRemaining <= 170 && visit.previousRemaining > 0,
        }
      );
    }

    setIsEditingThrow(false);
    setEditingDartIndex(null);

    // Auto-advance to next player, but NOT after a checkout/leg-win
    // (CONFIRM_THROW already sets currentPlayerIndex for the new leg)
    cancelAutoNext();
    if (settings.autoNextPlayer && !visit?.checkout) {
      autoNextTimerRef.current = setTimeout(() => {
        autoNextTimerRef.current = null;
        dispatch({ type: 'NEXT_PLAYER' });
      }, 1000);
    }
  }, [state.currentThrow, state.currentPlayerIndex, state.currentMatch, settings.autoNextPlayer, settings.vibrationEnabled, dispatch]);

  // Auto-confirm after 3rd dart (skip for bots and editing mode)
  useEffect(() => {
    if (state.currentThrow.length !== 3) return;
    if (state.currentMatch?.players[state.currentPlayerIndex]?.isBot) return;
    if (isEditingThrow) return;
    const timer = setTimeout(() => handleConfirmThrow(), 600);
    return () => clearTimeout(timer);
  }, [state.currentThrow.length, isEditingThrow]);

  // Detect checkout state for pulsing button (when < 3 darts produce a valid checkout)
  const dartboardHighlights = useMemo(
    () => state.checkoutSuggestion || [],
    [state.checkoutSuggestion]
  );

  const isEarlyCheckout = useMemo(() => {
    if (!state.currentMatch || state.currentThrow.length === 0 || state.currentThrow.length >= 3) return false;
    if (isEditingThrow) return false;
    const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
    const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
    if (!currentPlayer || !currentLeg || currentLeg.winner || currentPlayer.isBot) return false;
    return evaluateCurrent(state.currentThrow)?.checkout ?? false;
  }, [state.currentThrow, state.currentMatch, state.currentPlayerIndex, isEditingThrow]);

  // The last confirmed throw of the current leg — labels the undo button so the
  // player sees whose visit they are about to take back. Mirrors UNDO_THROW, which
  // also only ever reaches back within the current leg.
  const lastThrowInfo = useMemo(() => {
    const match = state.currentMatch;
    if (!match || match.status !== 'in-progress') return null;
    // Mirrors UNDO_THROW: a fresh leg reaches back to the checkout that closed
    // the previous one, and bot visits are stepped over.
    const history = match.legs.slice(0, match.currentLegIndex + 1).flatMap(l => l.throws);
    const isBot = (id: string) => match.players.find(p => p.playerId === id)?.isBot;
    const last = [...history].reverse().find(t => !isBot(t.playerId)) ?? history[history.length - 1];
    if (!last) return null;
    return {
      playerName: match.players.find(p => p.playerId === last.playerId)?.name ?? '?',
      score: last.score,
      isBust: last.isBust,
    };
  }, [state.currentMatch]);

  // Auto-confirm a bust at once, and a checkout once all three darts are in.
  // (An early checkout with fewer darts waits for the player — the OK button pulses.)
  useEffect(() => {
    if (!state.currentMatch || state.currentThrow.length === 0) return;
    const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
    const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
    if (!currentPlayer || !currentLeg || currentLeg.winner) return;
    if (currentPlayer.isBot) return; // bots confirm their own turns
    if (isEditingThrow) return;

    const visit = evaluateCurrent(state.currentThrow);
    if (!visit) return;
    const delay = visit.bust ? 800 : visit.checkout && state.currentThrow.length === 3 ? 400 : null;
    if (delay === null) return;
    const timer = setTimeout(() => handleConfirmThrow(), delay);
    return () => clearTimeout(timer);
  }, [state.currentThrow, isEditingThrow]);

  const handleUndoThrow = () => {
    if (!state.currentMatch || !lastThrowInfo) return;
    // An undo inside the auto-advance window must win over the pending NEXT_PLAYER.
    cancelAutoNext();
    // Enter editing mode - darts will be loaded into currentThrow by the reducer
    setIsEditingThrow(true);
    setEditingDartIndex(null);
    dispatch({ type: 'UNDO_THROW', payload: { skipBots: true } });
  };

  // Stable identity: PlayerScore is memoized, an inline arrow would re-render every card.
  const handleRequestRemovePlayer = React.useCallback((playerId: string) => {
    setPlayerToRemoveId(playerId);
  }, []);

  const confirmRemovePlayer = () => {
    if (!playerToRemoveId) return;

    // Only the player at the oche loses their pending darts — and only then may the
    // correction state be cleared. Clearing it while somebody else's darts are still
    // in the input would re-arm the 3-dart auto-confirm and commit their correction
    // behind their back.
    const wasAtTheOche =
      state.currentMatch?.players[state.currentPlayerIndex]?.playerId === playerToRemoveId;

    dispatch({ type: 'REMOVE_PLAYER', payload: { playerId: playerToRemoveId } });
    setPlayerToRemoveId(null);

    if (wasAtTheOche) {
      setIsEditingThrow(false);
      setEditingDartIndex(null);
    }
  };

  const handleRemoveDart = React.useCallback(() => {
    dispatch({ type: 'REMOVE_DART' });
  }, [dispatch]);

  const handleClearThrow = React.useCallback(() => {
    dispatch({ type: 'CLEAR_THROW' });
  }, [dispatch]);
  
  const handleBackToMenu = () => {
    if (state.currentMatch?.status === 'in-progress') {
      setShowBackConfirm(true);
    } else {
      navigate('/');
    }
  };

  const confirmBackToMenu = () => {
    console.log('🔙 confirmBackToMenu called');
    
    // Mark that we're navigating away to prevent auto-resume
    isNavigatingAwayRef.current = true;
    
    // Close dialog
    setShowBackConfirm(false);
    
    // Pause and save (localStorage at once, the API in the background), then
    // leave through the router. This used to be a hard page reload — the
    // whole app booted again just to show the menu.
    void pauseCurrentMatch();
    navigate('/');
  };

  const handleEndMatch = () => {
    setShowEndConfirm(true);
  };
  
  const confirmEndMatch = () => {
    if (state.currentMatch) setEndedMatchId(state.currentMatch.id);
    dispatch({ type: 'END_MATCH' });
    setShowEndConfirm(false);
  };

  const handleUndoEndMatch = () => {
    const match = state.currentMatch;
    setEndedMatchId(null);
    // Only the match that was just ended — a new match may have started since.
    if (!match || match.id !== endedMatchId || match.status !== 'completed') return;
    dispatch({ type: 'UNDO_END_MATCH' });
    setShowSetup(false);
  };
  
  if (showSetup) {
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <Snackbar
          open={endedMatchId !== null && state.currentMatch?.id === endedMatchId}
          message={t('game.match_ended')}
          actionLabel={t('common.undo')}
          onAction={handleUndoEndMatch}
          onClose={() => setEndedMatchId(null)}
        />
        <div className="max-w-4xl mx-auto">
          <BackButton onClick={() => {
              forceNewGameRef.current = false;
              isNavigatingAwayRef.current = true;
              navigate('/');
            }} />
          
          <Card variant="elevated" className="p-6 md:p-8">
            <h2 className="m3-headline-medium mb-6 text-on-surface">{t('game.game_setup')}</h2>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="m3-title-medium text-on-surface">{t('game.select_players')}</h3>
                {getLastPlayers().length > 0 && (
                  <Button
                    variant="tonal"
                    size="sm"
                    onClick={loadLastPlayers}
                    icon={<RotateCcw size={14} />}
                  >
                    {t('game.recent_players')}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Show registered players */}
                {players.map((player) => (
                  <motion.button
                    key={player.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.95 }}
                    transition={springSpatialFast}
                    onClick={() => {
                      if (selectedPlayers.find(p => p.id === player.id)) {
                        setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
                      } else {
                        setSelectedPlayers([...selectedPlayers, player]);
                      }
                    }}
                    className={`p-3 rounded-m3-lg border-2 transition-colors ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'border-success-500 bg-success-container shadow-m3-1'
                        : 'border-outline-variant hover:border-outline'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                    </div>
                    <div className="m3-label-large text-on-surface">{player.name}</div>
                  </motion.button>
                ))}
                {/* Show selected bots */}
                {selectedPlayers.filter(p => p.isBot).map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => setSelectedPlayers(selectedPlayers.filter(p => p.id !== bot.id))}
                    className="p-3 rounded-m3-lg border-2 border-primary-500 bg-primary-container shadow-m3-1 relative group"
                    title="Klicken zum Entfernen"
                  >
                    <div className="absolute top-1 right-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={14} />
                    </div>
                    <div className="flex justify-center mb-1">
                      <PlayerAvatar avatar={bot.avatar} name={bot.name} size="sm" />
                    </div>
                    <div className="m3-label-large text-on-primary-container">{bot.name}</div>
                  </button>
                ))}
                {!showPlayerNameInput && !showBotSelector ? (
                  <>
                    <button
                      onClick={() => setShowPlayerNameInput(true)}
                      className="p-3 rounded-m3-lg border-2 border-dashed border-outline-variant hover:border-outline transition-all"
                    >
                      <div className="mb-1 flex justify-center"><Icon name="plus" size={24} /></div>
                      <div className="m3-label-large text-on-surface">{t('game.add_player')}</div>
                    </button>
                    <button
                      onClick={() => setShowBotSelector(true)}
                      className="p-3 rounded-m3-lg border-2 border-dashed border-primary-700 hover:border-primary-500 transition-all bg-primary-container/40"
                    >
                      <div className="mb-1 flex justify-center"><Icon name="robot" size={24} /></div>
                      <div className="m3-label-large text-primary">{t('game.add_bot')}</div>
                    </button>
                  </>
                ) : showBotSelector ? (
                  <div className="p-4 rounded-m3-lg border-2 border-primary-500 bg-primary-container/40 col-span-2 md:col-span-3">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-on-surface m3-title-small flex items-center gap-2">
                          <Bot size={18} className="text-primary" />
                          Bot-Gegner wählen
                        </span>
                        <button
                          onClick={() => setShowBotSelector(false)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <p className="m3-body-small text-on-surface-variant">
                        Die Schwierigkeit passt sich automatisch an dein Können an
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {getAdaptiveBotConfigs().map((config) => (
                          <button
                            key={config.category}
                            onClick={async () => {
                              // Get stats from selected human players
                              const humanStats = selectedPlayers
                                .filter(p => !p.isBot)
                                .map(p => p.stats);
                              const existingBots = selectedPlayers.filter(p => p.isBot).length;
                              const bot = createAdaptiveBotPlayer(config.category, humanStats, existingBots);

                              // Save bot to database with its existing ID
                              try {
                                const createdBot = await addPlayer(bot.name, bot.avatar || 'robot', bot.isBot, bot.botLevel, bot.id);
                                setSelectedPlayers([...selectedPlayers, createdBot]);
                              } catch (error) {
                                console.error('Failed to create bot player:', error);
                              }

                              setShowBotSelector(false);
                            }}
                            className="p-3 rounded-m3-lg bg-surface-container-high hover:bg-surface-container-highest border-2 border-transparent hover:border-primary-500 transition-all text-center"
                          >
                            <div className="mb-2 flex justify-center"><Icon name={iconForEmoji(config.icon)} size={30} /></div>
                            <div className="m3-label-large text-on-surface">{config.nameDE}</div>
                            <div className="m3-body-small text-on-surface-variant mt-1">{config.descriptionDE}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-m3-lg border-2 border-success-500 bg-success-container">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          {newPlayerAvatar ? (
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{newPlayerAvatar}</span>
                              <button
                                onClick={() => setNewPlayerAvatar(undefined)}
                                className="m3-label-medium px-2 py-1 bg-error-container hover:bg-error-container/80 text-on-error-container rounded-m3-sm transition-all"
                              >
                                Entfernen
                              </button>
                            </div>
                          ) : (
                            <div className="text-on-surface-variant m3-body-medium">Kein Emoji ausgewählt</div>
                          )}
                        </div>
                        <Button
                          variant="filled"
                          size="sm"
                          onClick={() => setShowEmojiPicker(true)}
                          icon={<Smile size={16} />}
                        >
                          Emoji
                        </Button>
                      </div>
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(e) => setNewPlayerName(e.target.value)}
                        onKeyPress={async (e) => {
                          if (e.key === 'Enter' && newPlayerName.trim()) {
                            try {
                              const newPlayer = await addPlayer(newPlayerName.trim(), newPlayerAvatar);
                              setSelectedPlayers([...selectedPlayers, newPlayer]);
                              setNewPlayerName('');
                              setNewPlayerAvatar(undefined);
                              setShowPlayerNameInput(false);
                            } catch (error) {
                              console.error('Failed to add player:', error);
                              alert('Fehler beim Erstellen des Spielers');
                            }
                          }
                        }}
                        placeholder="Player name..."
                        className="w-full px-2 py-1 rounded-m3-sm border border-outline-variant bg-surface-container-high text-on-surface placeholder-on-surface-variant"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          fullWidth
                          onClick={async () => {
                            if (newPlayerName.trim()) {
                              try {
                                const newPlayer = await addPlayer(newPlayerName.trim(), newPlayerAvatar);
                                setSelectedPlayers([...selectedPlayers, newPlayer]);
                                setNewPlayerName('');
                                setNewPlayerAvatar(undefined);
                                setShowPlayerNameInput(false);
                              } catch (error) {
                                console.error('Failed to add player:', error);
                                alert('Fehler beim Erstellen des Spielers');
                              }
                            }
                          }}
                          disabled={!newPlayerName.trim()}
                        >
                          Add
                        </Button>
                        <Button
                          variant="tonal"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            setShowPlayerNameInput(false);
                            setNewPlayerName('');
                              setNewPlayerAvatar(undefined);
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block m3-label-large mb-2 text-on-surface">
                  {t('game.starting_score')}
                </label>
                <Select<number>
                  value={gameSettings.startScore}
                  onChange={(startScore) => setGameSettings({ ...gameSettings, startScore })}
                  aria-label={t('game.starting_score')}
                  options={[301, 501, 701, 1001].map((n) => ({ value: n, label: String(n) }))}
                />
              </div>

              <div>
                <label className="block m3-label-large mb-2 text-on-surface">
                  {t('game.legs_to_win')}
                </label>
                <Select<number>
                  value={gameSettings.legsToWin}
                  onChange={(legsToWin) => setGameSettings({ ...gameSettings, legsToWin })}
                  aria-label={t('game.legs_to_win')}
                  options={[1, 2, 3, 5].map((n) => ({
                    value: n,
                    label: `${t('game.first_to')} ${n}`,
                  }))}
                />
              </div>

              <div>
                <label className="block m3-label-large mb-2 text-on-surface">
                  {t('game.sets_to_win')}
                </label>
                <Select<number>
                  value={gameSettings.setsToWin}
                  onChange={(setsToWin) => setGameSettings({ ...gameSettings, setsToWin })}
                  aria-label={t('game.sets_to_win')}
                  options={[
                    { value: 1, label: t('game.no_sets') },
                    { value: 2, label: `${t('game.first_to')} 2` },
                    { value: 3, label: `${t('game.first_to')} 3` },
                    { value: 5, label: `${t('game.first_to')} 5` },
                  ]}
                />
              </div>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between gap-3 min-h-[48px]">
                <span className="text-on-surface">{t('game.double_out')}</span>
                <Switch
                  checked={gameSettings.doubleOut ?? true}
                  onChange={(doubleOut) => setGameSettings({ ...gameSettings, doubleOut })}
                  label={t('game.double_out')}
                />
              </div>
              <div className="flex items-center justify-between gap-3 min-h-[48px]">
                <span className="text-on-surface">{t('game.double_in')}</span>
                <Switch
                  checked={gameSettings.doubleIn ?? false}
                  onChange={(doubleIn) => setGameSettings({ ...gameSettings, doubleIn })}
                  label={t('game.double_in')}
                />
              </div>
            </div>

            <Button
              variant="success"
              size="lg"
              fullWidth
              onClick={handleStartGame}
              disabled={selectedPlayers.length === 0}
            >
              {t('game.start_game')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }
  
  // Show spinner wheel if determining starting player
  if (showSpinner && pendingGameStart) {
    return (
      <SpinnerWheel
        players={pendingGameStart.players}
        onComplete={handleSpinnerComplete}
      />
    );
  }

  if (!state.currentMatch) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <p className="m3-title-large text-on-surface-variant mb-4">No active game</p>
          <Button
            variant="filled"
            onClick={() => { navigate('/'); }}
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }
  
  // Check if match is completed - show winner screen
  if (state.currentMatch.status === 'completed' && state.currentMatch.winner) {
    const currentMatch = state.currentMatch;
    const table = standings(currentMatch);
    const winner = table[0];
    const isSetsMatch = (currentMatch.settings.setsToWin ?? 1) > 1;

    return (
      <div className="min-h-dvh p-4 gradient-mesh flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none z-0">
          <Suspense fallback={null}>
            <Confetti recycle={true} numberOfPieces={200} gravity={0.15} />
          </Suspense>
        </div>
        <div className="max-w-4xl w-full relative z-10">
          <motion.div
            className="m3-card m3-elevated p-6 sm:p-12 text-center"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={springSpatialDefault}
          >
            <div className="mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -25 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...springSpatialDefault, delay: 0.15 }}
                className="mx-auto mb-4 w-20 h-20 rounded-m3-full bg-tertiary-container text-on-tertiary-container grid place-items-center"
                aria-hidden="true"
              >
                <Icon name="trophy" size={44} />
              </motion.div>
              <h2 className="m3-display-small font-bold text-on-surface mb-2">
                {t('game.winner_title', { name: winner.name })}
              </h2>
              <p className="m3-title-large text-on-surface-variant">
                {table.map(p => (isSetsMatch ? p.setsWon : p.legsWon)).join(' – ')}
              </p>
            </div>

            {/* Standings — every player, not just "the one who is not the winner" */}
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="m3-label-large text-on-surface-variant">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">{t('game.player')}</th>
                    {isSetsMatch && <th className="py-2 pr-3 text-right">{t('game.sets')}</th>}
                    <th className="py-2 pr-3 text-right">{t('game.legs')}</th>
                    <th className="py-2 pr-3 text-right">{t('game.average')}</th>
                    <th className="py-2 pr-3 text-right">{t('game.highest')}</th>
                    <th className="py-2 text-right">180</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((p, i) => (
                    <tr key={p.playerId} className={`border-t border-outline-variant ${i === 0 ? 'text-on-surface font-semibold' : 'text-on-surface-variant'}`}>
                      <td className="py-2 pr-3">{i + 1}</td>
                      <td className="py-2 pr-3 truncate max-w-[10rem]">{p.name}</td>
                      {isSetsMatch && <td className="py-2 pr-3 text-right tabular-nums">{p.setsWon}</td>}
                      <td className="py-2 pr-3 text-right tabular-nums">{p.legsWon}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{p.matchAverage.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{p.matchHighestScore}</td>
                      <td className="py-2 text-right tabular-nums">{p.match180s}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <Button
                variant="success"
                size="lg"
                onClick={() => {
                  // The other player throws first in the rematch.
                  const rematchPlayers = rotateForRematch(currentMatch.players)
                    .map(mp => players.find(p => p.id === mp.playerId))
                    .filter((p): p is Player => !!p);
                  dispatch({ type: 'START_MATCH', payload: {
                    players: rematchPlayers,
                    settings: currentMatch.settings,
                    gameType: currentMatch.type,
                  }});
                }}
              >
                {t('game.rematch')}
              </Button>
              <Button variant="filled" size="lg" onClick={() => setShowMatchDetail(true)}>
                {t('game.match_details')}
              </Button>
              <Button variant="tonal" size="lg" onClick={() => navigate('/')}>
                {t('game.main_menu')}
              </Button>
            </div>
          </motion.div>
        </div>
        {showMatchDetail && (
          <Suspense fallback={null}>
            <MatchDetailModal match={currentMatch} onClose={() => setShowMatchDetail(false)} />
          </Suspense>
        )}
      </div>
    );
  }
  
  const currentPlayer = state.currentMatch!.players[state.currentPlayerIndex];
  const currentLeg = state.currentMatch!.legs[state.currentMatch!.currentLegIndex];
  // Removing is only offered while the match runs and stays a match afterwards.
  const canRemovePlayers =
    state.currentMatch!.status === 'in-progress' &&
    state.currentMatch!.players.length > MIN_MATCH_PLAYERS;
  const playerToRemove = state.currentMatch!.players.find(p => p.playerId === playerToRemoveId) || null;
  const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer!.playerId);
  const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
  const currentThrowScore = calculateThrowScore(state.currentThrow);
  const remaining = (state.currentMatch.settings.startScore || 501) - totalScored - currentThrowScore;
  const remainingOf = (index: number) => {
    if (index === state.currentPlayerIndex) return remaining;
    const player = state.currentMatch!.players[index];
    const scored = currentLeg.throws.filter(t => t.playerId === player.playerId).reduce((sum, t) => sum + t.score, 0);
    return (state.currentMatch!.settings.startScore || 501) - scored;
  };
  const showSets = (state.currentMatch.settings.setsToWin || 1) > 1;
  
  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh overflow-x-hidden">
      {showConfetti && (
        <Suspense fallback={null}>
          <Confetti recycle={false} numberOfPieces={300} gravity={0.3} />
        </Suspense>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <BackButton onClick={handleBackToMenu} inline />
          
          <div className="flex gap-2">
            <IconButton
              variant="tonal"
              label={muted ? t('game.unmute') : t('game.mute')}
              aria-pressed={muted}
              onClick={toggleMuted}
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </IconButton>
            <IconButton
              variant="tonal"
              label="Bug melden"
              onClick={() => setShowBugReportModal(true)}
            >
              <AlertTriangle size={20} />
            </IconButton>

            <IconButton
              variant="filled"
              label="Match beenden"
              onClick={handleEndMatch}
              style={{ backgroundColor: 'var(--m3-error)', color: 'var(--m3-on-error)' }}
            >
              <X size={20} />
            </IconButton>
          </div>
        </div>
        
        {/* Phone/tablet: all scores in one row, so the input stays on screen. */}
        <ScoreStrip
          className="lg:hidden sticky top-0 z-20 -mx-4 px-4 py-2 mb-4 bg-[color-mix(in_srgb,var(--m3-surface)_92%,transparent)] backdrop-blur"
          showSets={showSets}
          players={state.currentMatch.players.map((p, i) => ({
            playerId: p.playerId,
            name: p.name,
            remaining: remainingOf(i),
            legsWon: p.legsWon,
            setsWon: p.setsWon,
            isActive: i === state.currentPlayerIndex,
          }))}
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Players Section (desktop) */}
          <div className="hidden lg:block lg:col-span-1 space-y-4">
            {state.currentMatch.players.map((player, index) => (
              <PlayerScore
                key={player.playerId}
                player={player}
                remaining={remainingOf(index)}
                isActive={index === state.currentPlayerIndex}
                average={player.matchAverage}
                legsWon={player.legsWon}
                setsWon={player.setsWon}
                showSets={showSets}
                onRemove={canRemovePlayers ? handleRequestRemovePlayer : undefined}
                removeLabel={t('game.remove_player')}
              />
            ))}
          </div>
          
          {/* Center Section - Input first, then optional Dartboard helper */}
          <div className="lg:col-span-1 flex flex-col items-center space-y-6">
            <ScoreInput
              currentThrow={state.currentThrow}
              onAddDart={handleDartHit}
              onRemoveDart={handleRemoveDart}
              onClearThrow={handleClearThrow}
              onConfirm={handleConfirmThrow}
              onReplaceDart={(index, dart) => dispatch({ type: 'REPLACE_DART', payload: { index, dart } })}
              editingDartIndex={editingDartIndex}
              onSetEditingDartIndex={setEditingDartIndex}
              isEditingThrow={isEditingThrow}
              remaining={remaining}
              isCheckout={isEarlyCheckout}
              onUndoThrow={handleUndoThrow}
              lastThrow={lastThrowInfo}
            />

            {/* The setting existed but was never read — hints always showed. */}
            {settings.showCheckoutHints && state.checkoutSuggestion && (
              <CheckoutSuggestion
                suggestion={state.checkoutSuggestion}
                alternatives={getCheckoutAlternatives(remaining, 3 - state.currentThrow.length, state.currentMatch?.settings.doubleOut ?? true)}
                remaining={remaining}
              />
            )}

            {settings.showDartboardHelper && (
              <div className="w-full max-w-lg space-y-3">
                <Dartboard
                  onDartHit={handleDartHit}
                  highlightedSegments={dartboardHighlights}
                  size={480}
                />
                {/* Miss Button */}
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleDartHit({ segment: 0, multiplier: 0, score: 0 })}
                  disabled={state.currentThrow.length >= 3}
                  icon={<X size={20} />}
                >
                  Miss / No Score
                </Button>
              </div>
            )}
          </div>
          
          {/* Stats Section - Collapsible */}
          <div className="lg:col-span-1">
            {settings.showStatsDuringGame && (
              <div>
                <button
                  onClick={() => setShowMatchStats(!showMatchStats)}
                  className="w-full m3-card m3-elevated rounded-m3-lg p-4 flex items-center justify-between transition-all"
                >
                  <h3 className="m3-title-medium text-on-surface">Match Statistics</h3>
                  <ChevronDown size={24} className={`m3-chevron ${showMatchStats ? 'm3-open' : ''}`} />
                </button>

                {showMatchStats && (
                  <div className="m3-card m3-elevated rounded-m3-lg p-6 mt-2 m3-enter">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Average:</span>
                        <span className="font-semibold text-on-surface">{currentPlayer!.matchAverage.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Highest Score:</span>
                        <span className="font-semibold text-on-surface">{currentPlayer!.matchHighestScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">180s:</span>
                        <span className="font-semibold text-on-surface">{currentPlayer!.match180s}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">140+:</span>
                        <span className="font-semibold text-on-surface">{currentPlayer!.match140Plus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">100+:</span>
                        <span className="font-semibold text-on-surface">{currentPlayer!.match100Plus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Checkout %:</span>
                        <span className="font-semibold text-on-surface">
                          {currentPlayer!.checkoutAttempts > 0
                            ? ((currentPlayer!.checkoutsHit / currentPlayer!.checkoutAttempts) * 100).toFixed(1)
                            : '0.0'}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Throw History - Collapsable */}
        <div className="mt-6">
          <button
            onClick={() => setShowThrowHistory(!showThrowHistory)}
            className="w-full m3-card m3-elevated rounded-m3-lg p-4 flex items-center justify-between transition-all"
          >
            <h3 className="m3-title-medium text-on-surface">Wurf-Verlauf</h3>
            <ChevronDown size={24} className={`m3-chevron ${showThrowHistory ? 'm3-open' : ''}`} />
          </button>

          {showThrowHistory && (
            <div className="m3-card m3-elevated rounded-m3-lg p-6 mt-2 m3-enter">
              {/* Leg/Match Toggle */}
              <div
                className="flex gap-1 mb-4 p-1 bg-surface-container rounded-m3-lg m3-segmented"
                style={{ '--m3-seg-fill': 'var(--m3-primary)' } as React.CSSProperties}
              >
                <span
                  className="m3-segmented-indicator"
                  data-pos={statsView === 'leg' ? '0' : '1'}
                  aria-hidden="true"
                />
                <button
                  onClick={() => setStatsView('leg')}
                  aria-pressed={statsView === 'leg'}
                  className={`flex-1 py-2 rounded-m3-lg font-semibold text-sm m3-tab ${
                    statsView === 'leg' ? 'text-on-primary' : 'text-on-surface-variant'
                  }`}
                >
                  Aktuelles Leg
                </button>
                <button
                  onClick={() => setStatsView('match')}
                  aria-pressed={statsView === 'match'}
                  className={`flex-1 py-2 rounded-m3-lg font-semibold text-sm m3-tab ${
                    statsView === 'match' ? 'text-on-primary' : 'text-on-surface-variant'
                  }`}
                >
                  Gesamtes Spiel
                </button>
              </div>
              {state.currentMatch.players.map((player) => {
                const allPlayerThrowsView = statsView === 'leg'
                  ? currentLeg.throws.filter(t => t.playerId === player.playerId)
                  : state.currentMatch!.legs.flatMap(l => l.throws.filter(t => t.playerId === player.playerId));
                const playerThrows = allPlayerThrowsView;

                return (
                  <div key={player.playerId} className="mb-6 last:mb-0">
                    <h4 className="text-on-surface font-bold mb-3 flex items-center gap-2">
                      <span>{player.name}</span>
                      <span className="text-sm text-on-surface-variant">
                        ({playerThrows.length} {playerThrows.length === 1 ? 'Wurf' : 'Würfe'})
                      </span>
                    </h4>

                    {playerThrows.length === 0 ? (
                      <p className="text-on-surface-variant text-sm italic">Noch keine Würfe</p>
                    ) : (
                      <div className="space-y-2">
                        {playerThrows.map((throwData, index) => (
                          <div
                            key={throwData.id}
                            className="bg-surface-container rounded-m3-lg p-3 border border-outline-variant"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-on-surface-variant text-sm">
                                Wurf #{index + 1}
                              </span>
                              <div className="flex items-center gap-3">
                                {throwData.isBust && (
                                  <span className="text-on-error-container text-xs font-bold bg-error-container px-2 py-1 rounded-m3-sm">
                                    BUST
                                  </span>
                                )}
                                <span className={`font-bold text-lg ${
                                  throwData.isBust
                                    ? 'text-error line-through'
                                    : throwData.score >= 140
                                      ? 'text-orange-400'
                                      : throwData.score >= 100
                                        ? 'text-blue-400'
                                        : 'text-on-surface'
                                }`}>
                                  {throwData.score}
                                </span>
                                <span className="text-on-surface-variant text-sm">
                                  → {throwData.remaining}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {throwData.darts.map((dart, dartIndex) => (
                                <div
                                  key={dartIndex}
                                  className={`flex-1 text-center py-2 rounded-m3-sm ${
                                    dart.multiplier === 3
                                      ? 'bg-green-500/20 text-green-400'
                                      : dart.multiplier === 2
                                        ? 'bg-red-500/20 text-red-400'
                                        : dart.score === 0
                                          ? 'bg-surface-container-highest text-on-surface-variant'
                                          : 'bg-blue-500/20 text-blue-400'
                                  }`}
                                >
                                  <span className="text-xs font-semibold">
                                    {dart.score === 0
                                      ? 'Miss'
                                      : dart.multiplier === 3
                                        ? `T${dart.segment}`
                                        : dart.multiplier === 2
                                          ? `D${dart.segment}`
                                          : dart.segment
                                    }
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Throw Chart - Collapsable */}
        <div className="mt-6">
          <button
            onClick={() => setShowThrowChart(!showThrowChart)}
            className="w-full m3-card m3-elevated rounded-m3-lg p-4 flex items-center justify-between transition-all"
          >
            <h3 className="m3-title-medium text-on-surface">Wurf-Statistik (Chart)</h3>
            <ChevronDown size={24} className={`m3-chevron ${showThrowChart ? 'm3-open' : ''}`} />
          </button>

          {showThrowChart && (() => {
            const chartThrows = statsView === 'leg'
              ? currentLeg.throws
              : state.currentMatch.legs.flatMap(l => l.throws);
            return (
              <div className="m3-card m3-elevated rounded-m3-lg p-6 mt-2 m3-enter">
                {/* Leg/Match Toggle */}
                <div
                  className="flex gap-1 mb-4 p-1 bg-surface-container rounded-m3-lg m3-segmented"
                  style={{ '--m3-seg-fill': 'var(--m3-primary)' } as React.CSSProperties}
                >
                  <span
                    className="m3-segmented-indicator"
                    data-pos={statsView === 'leg' ? '0' : '1'}
                    aria-hidden="true"
                  />
                  <button
                    onClick={() => setStatsView('leg')}
                    aria-pressed={statsView === 'leg'}
                    className={`flex-1 py-2 rounded-m3-lg font-semibold text-sm m3-tab ${
                      statsView === 'leg' ? 'text-on-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    Aktuelles Leg
                  </button>
                  <button
                    onClick={() => setStatsView('match')}
                    aria-pressed={statsView === 'match'}
                    className={`flex-1 py-2 rounded-m3-lg font-semibold text-sm m3-tab ${
                      statsView === 'match' ? 'text-on-primary' : 'text-on-surface-variant'
                    }`}
                  >
                    Gesamtes Spiel
                  </button>
                </div>
                <Suspense fallback={<div className="h-[600px] flex items-center justify-center text-on-surface-variant">Lade Chart…</div>}>
                  <ThrowChart players={state.currentMatch.players} chartThrows={chartThrows} />
                </Suspense>
              </div>
            );
          })()}
        </div>

        {/* Live Heatmap - Collapsable */}
        <div className="mt-6">
          <button
            onClick={() => setShowLiveHeatmap(!showLiveHeatmap)}
            className="w-full m3-card m3-elevated rounded-m3-lg p-4 flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <Flame size={24} className="text-orange-400" />
              <h3 className="m3-title-medium text-on-surface">Live-Heatmap (aktuelles Spiel)</h3>
            </div>
            <ChevronDown size={24} className={`m3-chevron ${showLiveHeatmap ? 'm3-open' : ''}`} />
          </button>

          {showLiveHeatmap && (
            <div className="m3-card m3-elevated rounded-m3-lg p-6 mt-2 m3-enter">
              {/* Leg/Match Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setHeatmapView('leg')}
                  className={`flex-1 py-2 rounded-m3-lg font-semibold text-sm transition-all ${
                    heatmapView === 'leg' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  Aktuelles Leg
                </button>
                <button
                  onClick={() => setHeatmapView('match')}
                  className={`flex-1 py-2 rounded-m3-lg font-semibold text-sm transition-all ${
                    heatmapView === 'match' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
                >
                  Gesamtes Spiel
                </button>
              </div>
              {/* Player Selector */}
              {state.currentMatch.players.length > 1 && (
                <div className="mb-6">
                  <label className="block m3-label-large text-on-surface-variant mb-2">Spieler auswählen</label>
                  <div className="flex flex-wrap gap-2">
                    {state.currentMatch.players.map(player => (
                      <button
                        key={player.playerId}
                        onClick={() => setSelectedHeatmapPlayer(
                          selectedHeatmapPlayer === player.playerId ? null : player.playerId
                        )}
                        className={`px-4 py-2 rounded-m3-lg font-medium transition-all flex items-center gap-2 ${
                          selectedHeatmapPlayer === player.playerId || (!selectedHeatmapPlayer && state.currentMatch!.players[0].playerId === player.playerId)
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                        }`}
                      >
                        <PlayerAvatar avatar={players.find(p => p.id === player.playerId)?.avatar} name={player.name} size="sm" />
                        {player.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Heatmap Display */}
              {(() => {
                const displayPlayerId = selectedHeatmapPlayer || state.currentMatch.players[0]?.playerId;
                const playerHeatmap = displayPlayerId ? liveHeatmapData[displayPlayerId] : null;
                const playerName = state.currentMatch.players.find(p => p.playerId === displayPlayerId)?.name || '';

                if (!playerHeatmap || playerHeatmap.totalDarts === 0) {
                  return (
                    <div className="text-center py-12">
                      <Flame size={48} className="mx-auto mb-4 text-on-surface-variant" />
                      <p className="text-on-surface-variant text-lg">Noch keine Wurf-Daten für {playerName}</p>
                      <p className="text-on-surface-variant text-sm mt-2">Die Heatmap wird mit jedem Wurf aktualisiert</p>
                    </div>
                  );
                }

                return (
                  <div>
                    <div className="text-center mb-4">
                      <span className="text-lg font-bold text-on-surface">{playerName}</span>
                      <span className="text-on-surface-variant ml-2">({playerHeatmap.totalDarts} Darts)</span>
                    </div>
                    <DartboardHeatmapBlur 
                      heatmapData={playerHeatmap} 
                      size={Math.min(500, window.innerWidth - 80)}
                      compact={true}
                    />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Achievement Hints */}
      {hints.length > 0 && (
        <AchievementHint
          hints={hints}
          onDismiss={(achievementId) => {
            setDismissedHints(prev => new Set(prev).add(achievementId));
          }}
        />
      )}

      {/* Leg Won Animation Overlay */}
      {legWonAnimation?.show && (
        <div className="fixed inset-0 bg-[color-mix(in_srgb,var(--m3-scrim)_80%,transparent)] flex items-center justify-center z-50 animate-fade-in">
          <div className="text-center animate-scale-in">
            {/* Confetti burst effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="animate-confetti-burst">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-3 h-3 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                      backgroundColor: ['#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6'][i % 5],
                      transform: `rotate(${i * 18}deg) translateY(-${100 + Math.random() * 100}px)`,
                      animation: `confetti-fall 1s ease-out ${i * 0.05}s forwards`,
                      opacity: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Winner Avatar */}
            <div className="mb-4 animate-bounce-in flex justify-center">
              <PlayerAvatar 
                avatar={legWonAnimation.winnerAvatar} 
                name={legWonAnimation.winnerName} 
                size="xl" 
              />
            </div>

            {/* LEG text with glow */}
            <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 animate-pulse mb-2"
                 style={{ textShadow: '0 0 40px rgba(245, 158, 11, 0.5)' }}>
              LEG {legWonAnimation.legNumber}
            </div>

            {/* Winner name */}
            <div className="text-3xl md:text-4xl font-bold text-on-surface mb-4">
              {legWonAnimation.winnerName}
            </div>

            {/* Score indicator */}
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="flex gap-2">
                {[...Array(legWonAnimation.legsTotal)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all ${
                      i < legWonAnimation.legsWon
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/50'
                        : 'bg-surface-container-highest'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Progress text */}
            <div className="text-xl text-on-surface-variant">
              {legWonAnimation.legsWon} / {legWonAnimation.legsTotal} Legs
            </div>

            {/* Next leg indicator */}
            <div className="mt-6 text-lg text-primary animate-pulse">
              Nächstes Leg startet...
            </div>
          </div>
        </div>
      )}

      {/* Back to Menu Confirmation Dialog */}
      <Dialog
        open={showBackConfirm}
        onClose={() => setShowBackConfirm(false)}
        title={t('game.leave_title')}
        actions={
          <>
            <Button variant="text" onClick={() => setShowBackConfirm(false)}>{t('common.cancel')}</Button>
            <Button variant="filled" onClick={confirmBackToMenu}>{t('game.pause_and_leave')}</Button>
          </>
        }
      >
        <p className="text-on-surface-variant">{t('game.leave_body')}</p>
      </Dialog>

      {/* End Match Confirmation Dialog */}
      <Dialog
        open={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        title={t('game.end_title')}
        actions={
          <>
            <Button variant="text" onClick={() => setShowEndConfirm(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={confirmEndMatch}>{t('game.end_match')}</Button>
          </>
        }
      >
        <p className="text-on-surface-variant">{t('game.end_body')}</p>
      </Dialog>

      {/* Remove Player Confirmation */}
      <Dialog
        open={Boolean(playerToRemove)}
        onClose={() => setPlayerToRemoveId(null)}
        title={t('game.remove_player_title', { name: playerToRemove?.name ?? '' })}
        actions={
          <>
            <Button variant="text" onClick={() => setPlayerToRemoveId(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmRemovePlayer} icon={<UserMinus size={18} />}>
              {t('game.remove_player')}
            </Button>
          </>
        }
      >
        <p className="text-on-surface-variant mb-2">
          {t('game.remove_player_body', { name: playerToRemove?.name ?? '' })}
        </p>
        <p className="m3-body-small text-on-surface-variant">
          {t('game.remove_player_irreversible')}
        </p>
      </Dialog>

      {/* Bug Report Modal */}
      {showBugReportModal && (
        <BugReportModal
          onClose={() => setShowBugReportModal(false)}
          currentRoute={window.location.pathname}
        />
      )}

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <AvatarPicker
          onSelect={(emoji) => {
            setNewPlayerAvatar(emoji || undefined);
            setShowEmojiPicker(false);
          }}
          onClose={() => setShowEmojiPicker(false)}
          currentEmoji={newPlayerAvatar}
        />
      )}
    </div>
  );
};

export default GameScreen;