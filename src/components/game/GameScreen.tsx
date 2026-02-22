import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, X, Bot, ChevronDown, ChevronUp, AlertTriangle, Smile, Flame } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Confetti from 'react-confetti';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useGame } from '../../context/GameContext';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings } from '../../context/SettingsContext';
import { useTenant } from '../../context/TenantContext';
import { useGameAchievements } from '../../hooks/useGameAchievements';
import { useAchievementHints } from '../../hooks/useAchievementHints';
import Dartboard from '../dartboard/Dartboard';
import { DartboardHeatmapBlur } from '../dartboard/DartboardHeatmapBlur';
import ScoreInput from './ScoreInput';
import PlayerScore from './PlayerScore';
import CheckoutSuggestion from '../dartboard/CheckoutSuggestion';
import AchievementHint from '../achievements/AchievementHint';
import SpinnerWheel from './SpinnerWheel';
import BugReportModal from '../bugReport/BugReportModal';
import PlayerAvatar from '../player/PlayerAvatar';
import EmojiPicker from '../player/EmojiPicker';
import { Dart, Player, GameType, MatchSettings, Throw, HeatmapData } from '../../types/index';
import { calculateThrowScore } from '../../utils/scoring';
import { getCheckoutAlternatives } from '../../data/checkoutTable';
import { PersonalBests, createEmptyPersonalBests, updatePersonalBests } from '../../types/personalBests';
import audioSystem from '../../utils/audio';
import { api } from '../../services/api';
import { createAdaptiveBotPlayer, getAdaptiveBotConfigs, generateBotTurn, AdaptiveBotCategory } from '../../utils/botLogic';

const GameScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const forceNewGameRef = useRef(searchParams.get('new') === '1');
  const resumeRequestedRef = useRef(searchParams.get('resume') === '1');
  const { state, dispatch, pauseCurrentMatch } = useGame();
  const { players, addPlayer, updatePlayerHeatmap } = usePlayer();
  const { settings } = useSettings();
  const { storage } = useTenant();
  const { checkMatchAchievements, checkLegAchievements, checkThrowAchievements } = useGameAchievements();
  
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
  
  useEffect(() => {
    audioSystem.setEnabled(settings.soundVolume > 0 || (settings.callerVolume ?? 0) > 0 || (settings.effectsVolume ?? 0) > 0);
    audioSystem.setCallerVolume(settings.callerVolume ?? settings.soundVolume);
    audioSystem.setEffectsVolume(settings.effectsVolume ?? settings.soundVolume);
  }, [settings.soundVolume, settings.callerVolume, settings.effectsVolume]);

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
  const lastLegIndexRef = React.useRef<number>(0);

  // Detect leg win and show animation (ONLY when leg changes, not on every player turn)
  useEffect(() => {
    if (!state.currentMatch || state.currentMatch.status !== 'in-progress') return;

    const currentLegIndex = state.currentMatch.currentLegIndex;
    const legs = state.currentMatch.legs;

    // Check if we moved to a new leg (meaning previous leg was won)
    // currentLegIndex is now pointing to the NEW leg, so the completed leg is at currentLegIndex - 1
    if (currentLegIndex > lastLegIndexRef.current && legs.length > 1) {
      const completedLegIndex = currentLegIndex - 1;
      const completedLeg = legs[completedLegIndex];

      if (completedLeg?.winner) {
        const winnerPlayer = state.currentMatch.players.find(p => p.playerId === completedLeg.winner);

        if (winnerPlayer) {
          console.log('🏆 Leg won animation triggered:', {
            legNumber: completedLegIndex + 1,
            winner: winnerPlayer.name,
            legsWon: winnerPlayer.legsWon,
          });

          // Get full player data to access avatar
          const fullPlayer = players.find(p => p.id === winnerPlayer.playerId);

          setLegWonAnimation({
            show: true,
            winnerName: winnerPlayer.name,
            winnerAvatar: fullPlayer?.avatar,
            winnerId: winnerPlayer.playerId,
            legNumber: completedLegIndex + 1, // Convert to 1-indexed for display (Leg 1, Leg 2, etc.)
            legsWon: winnerPlayer.legsWon,
            legsTotal: state.currentMatch.settings.legsToWin || 3,
          });

          // Hide animation after 5 seconds
          const timer = setTimeout(() => {
            setLegWonAnimation(null);
          }, 5000);

          // Cleanup on unmount
          return () => clearTimeout(timer);
        }
      }
    }

    // Check leg achievements for the completed leg
    if (lastLegIndexRef.current !== null && lastLegIndexRef.current < currentLegIndex) {
      const completedLeg = state.currentMatch?.legs[lastLegIndexRef.current];
      if (completedLeg?.winner && state.currentMatch) {
        checkLegAchievements(completedLeg, state.currentMatch, completedLeg.winner);
      }
    }

    lastLegIndexRef.current = currentLegIndex;
  }, [state.currentMatch?.currentLegIndex]);

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
  const [gameSettings, setGameSettings] = useState<MatchSettings>({
    startScore: 301,
    legsToWin: 3,
    setsToWin: 1,
    doubleOut: false,
    doubleIn: false,
  });
  const isBotPlayingRef = useRef(false);
  const botTimersRef = useRef<NodeJS.Timeout[]>([]);
  const isNavigatingAwayRef = useRef(false);

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

    // Skip announcement for bots
    const playerInfo = selectedPlayers.find(p => p.id === currentPlayer.playerId);
    if (playerInfo?.isBot) return;

    // Calculate remaining score for current player
    const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
    const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
    const startScore = state.currentMatch.settings.startScore || 501;
    const remaining = startScore - totalScored;

    // Announce "You require X" only if player can checkout (2-170)
    if (remaining >= 2 && remaining <= 170) {
      // Small delay to ensure turn transition is complete
      const timer = setTimeout(() => {
        audioSystem.announceRemaining(remaining, true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [state.currentPlayerIndex, state.currentMatch?.currentLegIndex, selectedPlayers]);

  // Bot auto-play: When it's a bot's turn, automatically generate and play throws
  useEffect(() => {
    console.log('🤖 Bot auto-play check:', {
      hasMatch: !!state.currentMatch,
      status: state.currentMatch?.status,
      isBotPlaying: isBotPlayingRef.current,
      currentPlayerIndex: state.currentPlayerIndex,
      currentLegIndex: state.currentMatch?.currentLegIndex,
    });

    if (!state.currentMatch || state.currentMatch.status !== 'in-progress') {
      console.log('🚫 No match or not in progress');
      return;
    }
    if (isBotPlayingRef.current) {
      console.log('🚫 Bot already playing');
      return; // Prevent multiple concurrent bot plays
    }

    const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
    if (!currentLeg || currentLeg.winner) return;

    const currentMatchPlayer = state.currentMatch.players[state.currentPlayerIndex];
    if (!currentMatchPlayer) return;

    console.log('🤖 Current player:', {
      name: currentMatchPlayer.name,
      isBot: currentMatchPlayer.isBot,
      botLevel: currentMatchPlayer.botLevel,
    });

    // Check if current player is a bot using match player data
    if (!currentMatchPlayer.isBot || !currentMatchPlayer.botLevel) return;

    // Calculate remaining score
    const playerThrows = currentLeg.throws.filter(t => t.playerId === currentMatchPlayer.playerId);
    const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
    const startScore = state.currentMatch.settings.startScore || 501;
    const remaining = startScore - totalScored;

    if (remaining <= 0) return;

    console.log('🎯 Bot is playing!', {
      botName: currentMatchPlayer.name,
      botLevel: currentMatchPlayer.botLevel,
      remaining,
    });

    isBotPlayingRef.current = true;
    let isCancelled = false; // Cancellation flag for cleanup

    // Generate bot turn with delay for visual effect
    const botTurn = generateBotTurn(currentMatchPlayer.botLevel, remaining);
    console.log('🎲 Bot turn generated:', botTurn);
    let dartIndex = 0;

    const playNextDart = () => {
      if (isCancelled) return; // Stop if cancelled

      if (dartIndex >= botTurn.length) {
        // All darts thrown — check if this was a checkout before confirming
        const totalBotScore = botTurn.reduce((sum, d) => sum + d.score, 0);
        const lastBotDart = botTurn[botTurn.length - 1];
        const requireDouble = state.currentMatch?.settings.doubleOut ?? true;
        const botCheckedOut = totalBotScore === remaining && (!requireDouble || lastBotDart?.multiplier === 2);

        const timer1 = setTimeout(() => {
          if (isCancelled) return;
          dispatch({ type: 'CONFIRM_THROW' });
          // Skip NEXT_PLAYER if bot checked out (CONFIRM_THROW already handles leg/match transition)
          if (!botCheckedOut) {
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
        return;
      }

      const dart = botTurn[dartIndex];
      console.log(`🎯 Throwing dart ${dartIndex + 1}:`, dart);
      dispatch({ type: 'ADD_DART', payload: dart });

      // Play dart sound
      audioSystem.playSound('/sounds/OMNI/pop.mp3', false);

      dartIndex++;

      // Check if checkout happened
      const newRemaining = remaining - botTurn.slice(0, dartIndex).reduce((sum, d) => sum + d.score, 0);
      const requireDouble = state.currentMatch?.settings.doubleOut ?? true;
      const isValidCheckout = newRemaining === 0 && (!requireDouble || dart.multiplier === 2);

      if (isValidCheckout) {
        // Checkout! Stop throwing more darts — don't dispatch NEXT_PLAYER
        // (CONFIRM_THROW handles leg/match transition and sets correct player index)
        console.log('🎉 Bot checked out!');
        const timer1 = setTimeout(() => {
          if (isCancelled) return;
          dispatch({ type: 'CONFIRM_THROW' });
          isBotPlayingRef.current = false;
        }, 400);
        botTimersRef.current.push(timer1);
        return;
      }

      // Continue with next dart after delay
      const timer = setTimeout(playNextDart, 600);
      botTimersRef.current.push(timer);
    };

    // Start bot turn after a short delay
    const startDelay = setTimeout(() => {
      if (!isCancelled) playNextDart();
    }, 1000);
    botTimersRef.current.push(startDelay);

    return () => {
      console.log('🧹 Cleaning up bot auto-play effect');
      isCancelled = true; // Cancel all pending operations
      // Clear all timers
      botTimersRef.current.forEach(timer => clearTimeout(timer));
      botTimersRef.current = [];
      isBotPlayingRef.current = false;
    };
  }, [state.currentPlayerIndex, state.currentMatch?.currentLegIndex, state.currentMatch?.status, dispatch]);

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
      // Add a guest player if only one selected
      try {
        const guestPlayer = await addPlayer(`Guest ${Date.now() % 1000}`, '👤');
        finalPlayers = [...selectedPlayers, guestPlayer];
        setSelectedPlayers(finalPlayers);
      } catch (error) {
        console.error('Failed to create guest player:', error);
        alert('Fehler beim Erstellen eines Gastspielers');
        return;
      }
    }

    // Save last players for quick select
    saveLastPlayers(finalPlayers.map(p => p.id));

    // Show spinner wheel to determine starting player
    setPendingGameStart({
      players: finalPlayers,
      settings: gameSettings,
    });
    setShowSetup(false);
    setShowSpinner(true);
  };

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
  
  const handleDartHit = (dart: Dart) => {
    // If a dart is selected for editing, replace it
    if (editingDartIndex !== null) {
      dispatch({ type: 'REPLACE_DART', payload: { index: editingDartIndex, dart } });
      setEditingDartIndex(null);
    } else {
      dispatch({ type: 'ADD_DART', payload: dart });
    }
    // Play a subtle click sound for dart hit feedback
    audioSystem.playSound('/sounds/OMNI/pop.mp3', false);
  };

  // Define handleConfirmThrow with useCallback BEFORE useEffects that use it
  const handleConfirmThrow = React.useCallback(() => {
    const currentScore = calculateThrowScore(state.currentThrow);

    // Check if this will be a checkout or bust BEFORE confirming
    // so we can skip the score announcement if it's going to be a special sound
    const currentPlayer = state.currentMatch?.players[state.currentPlayerIndex];
    const currentLeg = state.currentMatch?.legs[state.currentMatch.currentLegIndex];

    // Track whether this throw wins the leg (checkout) - if so, CONFIRM_THROW
    // already handles the player transition, so we must NOT dispatch NEXT_PLAYER
    let isLegWinningThrow = false;

    if (currentPlayer && currentLeg) {
      const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const startScore = state.currentMatch?.settings.startScore || 501;
      const remaining = startScore - totalScored;
      const newRemaining = remaining - currentScore;

      // Check for checkout and bust
      const requiresDouble = state.currentMatch?.settings.doubleOut || false;
      const lastDart = state.currentThrow[state.currentThrow.length - 1];

      // Don't announce score if it's a valid checkout (will be announced by GameContext)
      const isValidCheckout = newRemaining === 0 &&
                              state.currentThrow.length > 0 &&
                              (!requiresDouble || lastDart?.multiplier === 2);

      // Don't announce score if it's a bust (will be announced by GameContext)
      const willBust = newRemaining < 0 ||
                       newRemaining === 1 ||
                       (newRemaining === 0 && requiresDouble && lastDart?.multiplier !== 2);

      isLegWinningThrow = isValidCheckout;

      // Only announce score if not checkout or bust
      if (!isValidCheckout && !willBust) {
        if (currentScore === 180) {
          setShowConfetti(true);
          audioSystem.announceScore(180);
          setTimeout(() => setShowConfetti(false), 3000);
        } else {
          // Always announce the score (0-180)
          audioSystem.announceScore(currentScore);
        }
      } else if (isValidCheckout) {
        console.log('🎯 Valid checkout - skipping score announcement, GameContext will announce');
        // Still show confetti for 180s even if it's a checkout
        if (currentScore === 180) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        }
      } else if (willBust) {
        console.log('💥 Bust - skipping score announcement, GameContext will announce');
      }

      // Update heatmap for this player with the current darts
      if (state.currentThrow.length > 0) {
        updatePlayerHeatmap(currentPlayer.playerId, state.currentThrow);
      }
    } else {
      // Fallback: just announce the score (but avoid if it might be a checkout/bust)
      // This fallback should rarely be hit, but better safe than sorry
      console.log('⚠️ Fallback score announcement - no currentPlayer/currentLeg');
      if (currentScore === 180) {
        setShowConfetti(true);
        audioSystem.announceScore(180);
        setTimeout(() => setShowConfetti(false), 3000);
      } else if (currentScore > 0) {
        // Only announce if score > 0 (avoid announcing checkout scores)
        audioSystem.announceScore(currentScore);
      }
    }

    dispatch({ type: 'CONFIRM_THROW' });

    // Check throw achievements (180s, checkouts, etc.)
    if (currentPlayer && currentLeg) {
      const playerThrowsForCheckout = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const totalScoredForCheckout = playerThrowsForCheckout.reduce((sum, t) => sum + t.score, 0);
      const startScoreForCheckout = state.currentMatch?.settings.startScore || 501;
      const remainingBeforeThrow = startScoreForCheckout - totalScoredForCheckout;
      const newRemainingAfterThrow = remainingBeforeThrow - currentScore;
      const requiresDoubleForCheckout = state.currentMatch?.settings.doubleOut || false;
      const lastDartForCheckout = state.currentThrow[state.currentThrow.length - 1];
      const isCheckout = newRemainingAfterThrow === 0 && (!requiresDoubleForCheckout || lastDartForCheckout?.multiplier === 2);

      // Build match context for advanced achievement checks
      const previousThrow = playerThrowsForCheckout[playerThrowsForCheckout.length - 1];
      const visitNumber = playerThrowsForCheckout.length + 1;

      // Calculate opponent remaining
      let opponentRemaining: number | undefined;
      const otherPlayers = state.currentMatch?.players.filter(p => p.playerId !== currentPlayer.playerId) || [];
      if (otherPlayers.length > 0) {
        const opponentId = otherPlayers[0].playerId;
        const opponentThrows = currentLeg.throws.filter(t => t.playerId === opponentId);
        const opponentScored = opponentThrows.reduce((sum, t) => sum + t.score, 0);
        opponentRemaining = startScoreForCheckout - opponentScored;
      }

      // Check if player had any busts in this leg
      const hadBustInLeg = playerThrowsForCheckout.some(t => t.isBust);

      checkThrowAchievements(
        currentPlayer.playerId,
        [...state.currentThrow],
        currentScore,
        isCheckout,
        isCheckout ? currentScore : undefined,
        state.currentMatch?.id,
        {
          previousThrowScore: previousThrow?.score,
          visitNumber,
          opponentRemaining,
          hadBustInLeg,
        }
      );
    }

    // Note: "You require X" is now announced when the player's turn STARTS (not after throwing)
    // This is handled in handleNextPlayer()

    // Clear editing state
    setIsEditingThrow(false);
    setEditingDartIndex(null);

    // Auto-advance to next player, but NOT after a checkout/leg-win
    // (CONFIRM_THROW already sets currentPlayerIndex for the new leg)
    if (settings.autoNextPlayer && !isLegWinningThrow) {
      setTimeout(() => {
        dispatch({ type: 'NEXT_PLAYER' });
      }, 1000);
    }
  }, [state.currentThrow, state.currentPlayerIndex, state.currentMatch, settings.autoNextPlayer, dispatch, updatePlayerHeatmap, isEditingThrow]);

  // Auto-confirm after 3rd dart (skip for bots and editing mode)
  useEffect(() => {
    if (state.currentThrow.length === 3) {
      // Skip auto-confirm for bots
      const currentPlayer = state.currentMatch?.players[state.currentPlayerIndex];
      if (currentPlayer?.isBot) {
        console.log('⏭️ Skipping auto-confirm for bot');
        return;
      }

      // Skip auto-confirm when editing a throw
      if (isEditingThrow) return;

      // Auto-confirm after a short delay to show the 3rd dart
      const timer = setTimeout(() => {
        handleConfirmThrow();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.currentThrow.length, isEditingThrow]);

  // Auto-confirm on checkout (when remaining reaches exactly 0)
  useEffect(() => {
    if (!state.currentMatch || state.currentThrow.length === 0) return;

    const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
    const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
    if (!currentPlayer || !currentLeg || currentLeg.winner) return;

    // Skip auto-checkout for bots - they handle their own confirm/next
    if (currentPlayer.isBot) return;

    // Skip auto-checkout when editing a throw
    if (isEditingThrow) return;

    // Calculate remaining score
    const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
    const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
    const startScore = state.currentMatch.settings.startScore || 501;
    const remaining = startScore - totalScored;
    const currentScore = calculateThrowScore(state.currentThrow);
    const newRemaining = remaining - currentScore;

    // Check if this is a valid checkout
    const requiresDouble = state.currentMatch.settings.doubleOut || false;
    const lastDart = state.currentThrow[state.currentThrow.length - 1];
    const isValidCheckout = newRemaining === 0 &&
      (!requiresDouble || lastDart?.multiplier === 2);

    if (isValidCheckout) {
      // Auto-confirm checkout after short delay
      const timer = setTimeout(() => {
        handleConfirmThrow();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [state.currentThrow, isEditingThrow]);

  // Auto-confirm on bust (when player goes below 0 or to 1)
  useEffect(() => {
    if (!state.currentMatch || state.currentThrow.length === 0) return;

    const currentPlayer = state.currentMatch.players[state.currentPlayerIndex];
    const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
    if (!currentPlayer || !currentLeg || currentLeg.winner) return;

    // Skip auto-bust for bots - they handle their own confirm/next
    if (currentPlayer.isBot) return;

    // Skip auto-bust when editing a throw
    if (isEditingThrow) return;

    // Calculate remaining score
    const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
    const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
    const startScore = state.currentMatch.settings.startScore || 501;
    const remaining = startScore - totalScored;
    const currentScore = calculateThrowScore(state.currentThrow);
    const newRemaining = remaining - currentScore;

    // Check if this is a bust
    const requiresDouble = state.currentMatch.settings.doubleOut || false;
    const lastDart = state.currentThrow[state.currentThrow.length - 1];
    const isBust = newRemaining < 0 ||
                   newRemaining === 1 ||
                   (newRemaining === 0 && requiresDouble && lastDart?.multiplier !== 2);

    if (isBust) {
      console.log('💥 Auto-confirming bust:', { remaining, currentScore, newRemaining });
      // Auto-confirm bust after short delay
      const timer = setTimeout(() => {
        handleConfirmThrow();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [state.currentThrow, isEditingThrow]);

  const handleUndoThrow = () => {
    if (!state.currentMatch) return;

    const currentLeg = state.currentMatch.legs[state.currentMatch.currentLegIndex];
    if (currentLeg.throws.length === 0) return;

    // Enter editing mode - darts will be loaded into currentThrow by the reducer
    setIsEditingThrow(true);
    setEditingDartIndex(null);

    dispatch({ type: 'UNDO_THROW' });
  };
  
  const handleRemoveDart = () => {
    dispatch({ type: 'REMOVE_DART' });
  };
  
  const handleClearThrow = () => {
    dispatch({ type: 'CLEAR_THROW' });
  };
  
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
    
    // Pause the match (this saves it to localStorage via GameContext)
    dispatch({ type: 'PAUSE_MATCH' });
    
    console.log('🔙 Match paused, navigating to home...');
    
    // Hard redirect - most reliable method
    window.location.href = '/';
  };

  const handleEndMatch = () => {
    setShowEndConfirm(true);
  };
  
  const confirmEndMatch = () => {
    dispatch({ type: 'END_MATCH' });
    setShowEndConfirm(false);
    // Don't navigate immediately - allow undo
  };
  
  const handleUndoEndMatch = () => {
    dispatch({ type: 'UNDO_END_MATCH' });
  };
  
  if (showSetup) {
    return (
      <div className="min-h-screen p-4 md:p-8 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => {
              forceNewGameRef.current = false;
              isNavigatingAwayRef.current = true;
              window.location.href = '/';
            }}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>
          
          <div className="glass-card rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-3xl font-bold mb-6 text-white">{t('game.game_setup')}</h2>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">{t('game.select_players')}</h3>
                {getLastPlayers().length > 0 && (
                  <button
                    onClick={loadLastPlayers}
                    className="px-3 py-1.5 text-sm bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg border border-primary-500/30 transition-all font-medium flex items-center gap-2"
                  >
                    <RotateCcw size={14} />
                    {t('game.recent_players')}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Show registered players */}
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
                        ? 'border-success-500 bg-success-500/20 shadow-lg'
                        : 'border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                    </div>
                    <div className="text-sm font-medium text-white">{player.name}</div>
                  </button>
                ))}
                {/* Show selected bots */}
                {selectedPlayers.filter(p => p.isBot).map((bot) => (
                  <button
                    key={bot.id}
                    onClick={() => setSelectedPlayers(selectedPlayers.filter(p => p.id !== bot.id))}
                    className="p-3 rounded-lg border-2 border-primary-500 bg-primary-500/20 shadow-lg relative group"
                    title="Klicken zum Entfernen"
                  >
                    <div className="absolute top-1 right-1 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={14} />
                    </div>
                    <div className="flex justify-center mb-1">
                      <PlayerAvatar avatar={bot.avatar} name={bot.name} size="sm" />
                    </div>
                    <div className="text-sm font-medium text-primary-300">{bot.name}</div>
                  </button>
                ))}
                {!showPlayerNameInput && !showBotSelector ? (
                  <>
                    <button
                      onClick={() => setShowPlayerNameInput(true)}
                      className="p-3 rounded-lg border-2 border-dashed border-dark-700 hover:border-dark-600 transition-all"
                    >
                      <div className="text-2xl mb-1">➕</div>
                      <div className="text-sm font-medium text-white">{t('game.add_player')}</div>
                    </button>
                    <button
                      onClick={() => setShowBotSelector(true)}
                      className="p-3 rounded-lg border-2 border-dashed border-primary-700 hover:border-primary-500 transition-all bg-primary-900/20"
                    >
                      <div className="text-2xl mb-1">🤖</div>
                      <div className="text-sm font-medium text-primary-400">{t('game.add_bot')}</div>
                    </button>
                  </>
                ) : showBotSelector ? (
                  <div className="p-4 rounded-lg border-2 border-primary-500 bg-primary-500/20 col-span-2 md:col-span-3">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium flex items-center gap-2">
                          <Bot size={18} className="text-primary-400" />
                          Bot-Gegner wählen
                        </span>
                        <button
                          onClick={() => setShowBotSelector(false)}
                          className="text-gray-400 hover:text-white"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <p className="text-xs text-gray-400">
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
                                const createdBot = await addPlayer(bot.name, bot.avatar || '🤖', bot.isBot, bot.botLevel, bot.id);
                                setSelectedPlayers([...selectedPlayers, createdBot]);
                              } catch (error) {
                                console.error('Failed to create bot player:', error);
                              }

                              setShowBotSelector(false);
                            }}
                            className="p-3 rounded-lg bg-dark-700 hover:bg-dark-600 border-2 border-transparent hover:border-primary-500 transition-all text-center"
                          >
                            <div className="text-3xl mb-2">{config.icon}</div>
                            <div className="text-sm font-semibold text-white">{config.nameDE}</div>
                            <div className="text-xs text-gray-400 mt-1">{config.descriptionDE}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border-2 border-success-500 bg-success-500/20">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          {newPlayerAvatar ? (
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{newPlayerAvatar}</span>
                              <button
                                onClick={() => setNewPlayerAvatar(undefined)}
                                className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-all"
                              >
                                Entfernen
                              </button>
                            </div>
                          ) : (
                            <div className="text-dark-400 text-sm">Kein Emoji ausgewählt</div>
                          )}
                        </div>
                        <button
                          onClick={() => setShowEmojiPicker(true)}
                          className="px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2"
                        >
                          <Smile size={16} />
                          Emoji
                        </button>
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
                        className="w-full px-2 py-1 rounded border border-dark-700 bg-dark-800 text-white placeholder-dark-500"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
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
                          className="flex-1 py-1 px-2 bg-success-500 hover:bg-success-600 text-white rounded text-sm disabled:bg-dark-700 disabled:cursor-not-allowed transition-all"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setShowPlayerNameInput(false);
                            setNewPlayerName('');
                              setNewPlayerAvatar(undefined);
                          }}
                          className="flex-1 py-1 px-2 bg-dark-700 hover:bg-dark-600 text-white rounded text-sm transition-all"
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
                <label className="block text-sm font-medium mb-2 text-white">
                  {t('game.starting_score')}
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
                <label className="block text-sm font-medium mb-2 text-white">
                  {t('game.legs_to_win')}
                </label>
                <select
                  value={gameSettings.legsToWin}
                  onChange={(e) => setGameSettings({ ...gameSettings, legsToWin: parseInt(e.target.value) })}
                  className="w-full p-2 rounded-lg border border-gray-300/30 bg-white/10 backdrop-blur-sm text-white"
                >
                  <option value={1}>{t('game.first_to')} 1</option>
                  <option value={2}>{t('game.first_to')} 2</option>
                  <option value={3}>{t('game.first_to')} 3</option>
                  <option value={5}>{t('game.first_to')} 5</option>
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
                <span className="text-gray-200">{t('game.double_out')}</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={gameSettings.doubleIn}
                  onChange={(e) => setGameSettings({ ...gameSettings, doubleIn: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-gray-200">{t('game.double_in')}</span>
              </label>
            </div>

            <button
              onClick={handleStartGame}
              disabled={selectedPlayers.length === 0}
              className="w-full py-3 px-6 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {t('game.start_game')}
            </button>
          </div>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">No active game</p>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }
  
  // Check if match is completed - show winner screen
  if (state.currentMatch.status === 'completed' && state.currentMatch.winner) {
    const currentMatch = state.currentMatch;
    const winner = currentMatch.players.find(p => p.playerId === currentMatch.winner);
    const loser = currentMatch.players.find(p => p.playerId !== currentMatch.winner);
    
    return (
      <div className="min-h-screen p-4 gradient-mesh flex items-center justify-center">
        <div className="fixed inset-0 pointer-events-none z-0">
          <Confetti recycle={true} numberOfPieces={200} gravity={0.15} />
        </div>
        <div className="max-w-4xl w-full relative z-10">
          <div className="glass-card-gold p-12 text-center">
            <div className="mb-8">
              <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-4 animate-bounce">
                🏆
              </h1>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-2">
                {winner?.name} gewinnt!
              </h2>
              <p className="text-2xl text-dark-300">
                {winner?.legsWon} - {loser?.legsWon}
              </p>
            </div>
            
            {/* Winner Stats */}
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="glass-card p-4">
                <div className="text-dark-400 text-sm mb-1">Average</div>
                <div className="text-3xl font-bold text-white">
                  {winner?.matchAverage.toFixed(2)}
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="text-dark-400 text-sm mb-1">Highest Score</div>
                <div className="text-3xl font-bold text-white">
                  {winner?.matchHighestScore}
                </div>
              </div>
              <div className="glass-card p-4">
                <div className="text-dark-400 text-sm mb-1">180s</div>
                <div className="text-3xl font-bold text-white">
                  {winner?.match180s}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  dispatch({ type: 'START_MATCH', payload: {
                    players: currentMatch.players.map(mp => 
                      players.find(p => p.id === mp.playerId)!
                    ),
                    settings: currentMatch.settings,
                    gameType: currentMatch.type
                  }});
                }}
                className="px-8 py-4 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
              >
                🔄 Rematch
              </button>
              <button
                onClick={() => navigate('/stats')}
                className="px-8 py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
              >
                📊 Statistiken
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-8 py-4 bg-gradient-to-r from-dark-600 to-dark-700 hover:from-dark-700 hover:to-dark-800 text-white rounded-xl font-bold text-lg transition-all shadow-lg"
              >
                🏠 Hauptmenü
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const currentPlayer = state.currentMatch!.players[state.currentPlayerIndex];
  const currentLeg = state.currentMatch!.legs[state.currentMatch!.currentLegIndex];
  const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer!.playerId);
  const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
  const currentThrowScore = calculateThrowScore(state.currentThrow);
  const remaining = (state.currentMatch.settings.startScore || 501) - totalScored - currentThrowScore;
  
  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} gravity={0.3} />}
      
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBackToMenu}
            className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowBugReportModal(true)}
              className="glass-card p-3 rounded-lg hover:glass-card-hover text-white transition-all"
              title="Bug melden"
            >
              <AlertTriangle size={20} />
            </button>

            <button
              onClick={handleUndoThrow}
              className="glass-card p-3 rounded-lg hover:glass-card-hover text-white transition-all"
              title="Letzten Wurf rückgängig machen"
            >
              <RotateCcw size={20} />
            </button>

            <button
              onClick={handleEndMatch}
              className="p-3 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all"
              title="Match beenden"
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
              <div className="w-full max-w-lg space-y-3">
                <Dartboard
                  onDartHit={handleDartHit}
                  highlightedSegments={state.checkoutSuggestion || []}
                  size={480}
                />
                {/* Miss Button */}
                <button
                  onClick={() => handleDartHit({ segment: 0, multiplier: 0, score: 0 })}
                  disabled={state.currentThrow.length >= 3}
                  className="w-full py-3 bg-dark-800 hover:bg-dark-700 disabled:bg-dark-900 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all border-2 border-dark-600 hover:border-dark-500 disabled:border-dark-800 flex items-center justify-center gap-2"
                >
                  <X size={20} />
                  Miss / No Score
                </button>
              </div>
            )}
            
            {state.checkoutSuggestion && (
              <CheckoutSuggestion
                suggestion={state.checkoutSuggestion}
                alternatives={getCheckoutAlternatives(remaining, 3 - state.currentThrow.length, state.currentMatch?.settings.doubleOut ?? true)}
                remaining={remaining}
              />
            )}
            
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
            />
          </div>
          
          {/* Stats Section - Collapsible */}
          <div className="lg:col-span-1">
            {settings.showStatsDuringGame && (
              <div>
                <button
                  onClick={() => setShowMatchStats(!showMatchStats)}
                  className="w-full glass-card rounded-xl p-4 flex items-center justify-between hover:glass-card-hover transition-all"
                >
                  <h3 className="text-lg font-bold text-white">Match Statistics</h3>
                  {showMatchStats ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>
                
                {showMatchStats && (
                  <div className="glass-card rounded-xl shadow-lg p-6 mt-2 animate-fade-in">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Average:</span>
                        <span className="font-semibold text-white">{currentPlayer!.matchAverage.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Highest Score:</span>
                        <span className="font-semibold text-white">{currentPlayer!.matchHighestScore}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">180s:</span>
                        <span className="font-semibold text-white">{currentPlayer!.match180s}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">140+:</span>
                        <span className="font-semibold text-white">{currentPlayer!.match140Plus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">100+:</span>
                        <span className="font-semibold text-white">{currentPlayer!.match100Plus}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Checkout %:</span>
                        <span className="font-semibold text-white">
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
            className="w-full glass-card rounded-xl p-4 flex items-center justify-between hover:glass-card-hover transition-all"
          >
            <h3 className="text-lg font-bold text-white">Wurf-Verlauf</h3>
            {showThrowHistory ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>

          {showThrowHistory && (
            <div className="glass-card rounded-xl p-6 mt-2 animate-fade-in">
              {/* Leg/Match Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setStatsView('leg')}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    statsView === 'leg' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  Aktuelles Leg
                </button>
                <button
                  onClick={() => setStatsView('match')}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    statsView === 'match' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
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
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                      <span>{player.name}</span>
                      <span className="text-sm text-gray-400">
                        ({playerThrows.length} {playerThrows.length === 1 ? 'Wurf' : 'Würfe'})
                      </span>
                    </h4>

                    {playerThrows.length === 0 ? (
                      <p className="text-gray-400 text-sm italic">Noch keine Würfe</p>
                    ) : (
                      <div className="space-y-2">
                        {playerThrows.map((throwData, index) => (
                          <div
                            key={throwData.id}
                            className="bg-dark-800/50 rounded-lg p-3 border border-dark-600"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-gray-400 text-sm">
                                Wurf #{index + 1}
                              </span>
                              <div className="flex items-center gap-3">
                                {throwData.isBust && (
                                  <span className="text-red-400 text-xs font-bold bg-red-500/20 px-2 py-1 rounded">
                                    BUST
                                  </span>
                                )}
                                <span className={`font-bold text-lg ${
                                  throwData.isBust
                                    ? 'text-red-400 line-through'
                                    : throwData.score >= 140
                                      ? 'text-orange-400'
                                      : throwData.score >= 100
                                        ? 'text-blue-400'
                                        : 'text-white'
                                }`}>
                                  {throwData.score}
                                </span>
                                <span className="text-gray-400 text-sm">
                                  → {throwData.remaining}
                                </span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              {throwData.darts.map((dart, dartIndex) => (
                                <div
                                  key={dartIndex}
                                  className={`flex-1 text-center py-2 rounded ${
                                    dart.multiplier === 3
                                      ? 'bg-green-500/20 text-green-400'
                                      : dart.multiplier === 2
                                        ? 'bg-red-500/20 text-red-400'
                                        : dart.score === 0
                                          ? 'bg-gray-700/50 text-gray-500'
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
            className="w-full glass-card rounded-xl p-4 flex items-center justify-between hover:glass-card-hover transition-all"
          >
            <h3 className="text-lg font-bold text-white">Wurf-Statistik (Chart)</h3>
            {showThrowChart ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>

          {showThrowChart && (() => {
            const chartThrows = statsView === 'leg'
              ? currentLeg.throws
              : state.currentMatch.legs.flatMap(l => l.throws);
            return (
            <div className="glass-card rounded-xl p-6 mt-2 animate-fade-in">
              {/* Leg/Match Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setStatsView('leg')}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    statsView === 'leg' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  Aktuelles Leg
                </button>
                <button
                  onClick={() => setStatsView('match')}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    statsView === 'match' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  Gesamtes Spiel
                </button>
              </div>
              {/* Score Chart */}
              <div className="mb-8">
                <h4 className="text-white font-bold mb-4">Geworfene Punkte pro Aufnahme</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={(() => {
                    // Build chart data
                    const maxThrows = Math.max(
                      ...state.currentMatch.players.map(p =>
                        chartThrows.filter(t => t.playerId === p.playerId).length
                      )
                    );

                    const chartData = [];
                    for (let i = 0; i < maxThrows; i++) {
                      const dataPoint: any = { throwNumber: i + 1 };

                      state.currentMatch.players.forEach(player => {
                        const playerThrows = chartThrows.filter(t => t.playerId === player.playerId);
                        const throwData = playerThrows[i];
                        dataPoint[player.name] = throwData ? throwData.score : null;
                      });

                      chartData.push(dataPoint);
                    }

                    return chartData;
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="throwNumber"
                      stroke="#9ca3af"
                      label={{ value: 'Aufnahme', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      label={{ value: 'Punkte', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    {state.currentMatch.players.map((player, index) => {
                      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
                      return (
                        <Line
                          key={player.playerId}
                          type="monotone"
                          dataKey={player.name}
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Remaining Chart */}
              <div>
                <h4 className="text-white font-bold mb-4">Verbleibende Punkte</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={(() => {
                    // Build remaining chart data
                    const maxThrows = Math.max(
                      ...state.currentMatch.players.map(p =>
                        chartThrows.filter(t => t.playerId === p.playerId).length
                      )
                    );

                    const chartData = [];
                    for (let i = 0; i < maxThrows; i++) {
                      const dataPoint: any = { throwNumber: i + 1 };

                      state.currentMatch.players.forEach(player => {
                        const playerThrows = chartThrows.filter(t => t.playerId === player.playerId);
                        const throwData = playerThrows[i];
                        dataPoint[player.name] = throwData ? throwData.remaining : null;
                      });

                      chartData.push(dataPoint);
                    }

                    return chartData;
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="throwNumber"
                      stroke="#9ca3af"
                      label={{ value: 'Aufnahme', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      label={{ value: 'Verbleibend', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                      reversed
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Legend />
                    {state.currentMatch.players.map((player, index) => {
                      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
                      return (
                        <Line
                          key={player.playerId}
                          type="monotone"
                          dataKey={player.name}
                          stroke={colors[index % colors.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            );
          })()}
        </div>

        {/* Live Heatmap - Collapsable */}
        <div className="mt-6">
          <button
            onClick={() => setShowLiveHeatmap(!showLiveHeatmap)}
            className="w-full glass-card rounded-xl p-4 flex items-center justify-between hover:glass-card-hover transition-all"
          >
            <div className="flex items-center gap-3">
              <Flame size={24} className="text-orange-400" />
              <h3 className="text-lg font-bold text-white">Live-Heatmap (aktuelles Spiel)</h3>
            </div>
            {showLiveHeatmap ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </button>

          {showLiveHeatmap && (
            <div className="glass-card rounded-xl p-6 mt-2 animate-fade-in">
              {/* Leg/Match Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setHeatmapView('leg')}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    heatmapView === 'leg' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  Aktuelles Leg
                </button>
                <button
                  onClick={() => setHeatmapView('match')}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    heatmapView === 'match' ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  Gesamtes Spiel
                </button>
              </div>
              {/* Player Selector */}
              {state.currentMatch.players.length > 1 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-dark-300 mb-2">Spieler auswählen</label>
                  <div className="flex flex-wrap gap-2">
                    {state.currentMatch.players.map(player => (
                      <button
                        key={player.playerId}
                        onClick={() => setSelectedHeatmapPlayer(
                          selectedHeatmapPlayer === player.playerId ? null : player.playerId
                        )}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                          selectedHeatmapPlayer === player.playerId || (!selectedHeatmapPlayer && state.currentMatch!.players[0].playerId === player.playerId)
                            ? 'bg-primary-500 text-white'
                            : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
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
                      <Flame size={48} className="mx-auto mb-4 text-dark-600" />
                      <p className="text-dark-400 text-lg">Noch keine Wurf-Daten für {playerName}</p>
                      <p className="text-dark-500 text-sm mt-2">Die Heatmap wird mit jedem Wurf aktualisiert</p>
                    </div>
                  );
                }

                return (
                  <div>
                    <div className="text-center mb-4">
                      <span className="text-lg font-bold text-white">{playerName}</span>
                      <span className="text-dark-400 ml-2">({playerHeatmap.totalDarts} Darts)</span>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
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
            <div className="text-3xl md:text-4xl font-bold text-white mb-4">
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
                        : 'bg-dark-600'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Progress text */}
            <div className="text-xl text-gray-400">
              {legWonAnimation.legsWon} / {legWonAnimation.legsTotal} Legs
            </div>

            {/* Next leg indicator */}
            <div className="mt-6 text-lg text-primary-400 animate-pulse">
              Nächstes Leg startet...
            </div>
          </div>
        </div>
      )}

      {/* Back to Menu Confirmation Dialog */}
      {showBackConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="glass-card rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Match verlassen?</h3>
            <p className="text-gray-300 mb-2">
              <strong className="text-primary-400">Pausieren & Verlassen:</strong> Dein Match wird gespeichert und kann jederzeit aus dem Hauptmenü fortgesetzt werden.
            </p>
            <p className="text-gray-300 mb-6">
              <strong className="text-gray-400">Abbrechen:</strong> Zurück zum laufenden Spiel.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBackConfirm(false);
                }}
                className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-semibold transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={() => {
                  confirmBackToMenu();
                }}
                className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition-all"
              >
                Pausieren & Verlassen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Match Confirmation Dialog */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">❌ Match beenden?</h3>
            <p className="text-gray-300 mb-6">
              Das Match wird als abgebrochen markiert. Du kannst es später rückgängig machen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-semibold transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmEndMatch}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-all"
              >
                Match beenden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Undo End Match Button - Show when match is completed */}
      {state.currentMatch?.status === 'completed' && !state.currentMatch.winner && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={handleUndoEndMatch}
            className="glass-card p-4 rounded-xl hover:glass-card-hover text-white transition-all flex items-center gap-2 shadow-lg"
            title="Match-Ende rückgängig machen"
          >
            <RotateCcw size={20} />
            <span className="font-semibold">Rückgängig</span>
          </button>
        </div>
      )}

      {/* Bug Report Modal */}
      {showBugReportModal && (
        <BugReportModal
          onClose={() => setShowBugReportModal(false)}
          currentRoute={window.location.pathname}
        />
      )}

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <EmojiPicker
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