import React, { useState, useEffect, useRef, useMemo, useDeferredValue, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, X, Bot, ChevronDown, AlertTriangle, Smile, Flame, UserMinus, Volume2, VolumeX, BarChart3, Tv, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
const ThrowChart = lazy(() => import('./ThrowChart'));
import { useGame, MIN_MATCH_PLAYERS, redoTarget } from '../../context/GameContext';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings } from '../../context/SettingsContext';
import { useTenant } from '../../context/TenantContext';
import { useGameAchievements } from '../../hooks/useGameAchievements';
import { useAchievementHints } from '../../hooks/useAchievementHints';
import Dartboard from '../dartboard/Dartboard';
import { DartboardHeatmap } from '../dartboard/DartboardHeatmap';
import { heatmapFromThrows, exactShare } from '../../utils/heatmap';
import { ExactShareNote } from '../dartboard/ExactShareNote';
import { setCelebrationMoment } from '../../utils/celebrationMoment';
import { legRanks } from '../../utils/legRanks';
import ScoreInput from './ScoreInput';
import GameAnnouncer from './GameAnnouncer';
import ScoreStrip from './ScoreStrip';
import CheckoutSuggestion from '../dartboard/CheckoutSuggestion';
import AchievementHint from '../achievements/AchievementHint';
import SpinnerWheel from './SpinnerWheel';
import BugReportModal from '../bugReport/BugReportModal';
import PlayerAvatar from '../player/PlayerAvatar';
import AvatarPicker from '../player/AvatarPicker';
import { Dart, Player, GameType, MatchSettings, Throw, HeatmapData, MatchPlayer } from '../../types/index';
import { calculateThrowScore } from '../../utils/scoring';
import { evaluateVisit, rulesOf } from '../../utils/visit';
import { inRuleOf, outRuleOf, ruleSettings, maxFinish, ruleTags, type CheckRule } from '../../utils/checkRules';
import ScoreboardPublisher from './ScoreboardPublisher';
import { readScoreboard, type ScoreboardData } from '../../utils/scoreboard';
import { Handoff, HANDOFF_MS, LEG_WON_MS } from '../../utils/handoff';
import { useWindowClass } from '../../hooks/useWindowClass';
import HeroMoment, { type HeroMomentState } from './HeroMoment';
import { feedbackLevel, personalBestHits, type Baseline, type PersonalBestHit } from '../../utils/feedback';
import { burst, originOf } from '../../utils/celebration';
import { shapePolygon } from '../../utils/shapes';
import Spotlight, { type SpotPlayer } from './Spotlight';
import EditVisitDialog, { type EditVisitTab } from './EditVisitDialog';
import { editVisit } from '../../utils/editVisit';
import { likelyDecompositions } from '../../utils/decompose';
import { lastVisits, dartsInLeg } from '../../utils/arena';
import { haptic } from '../../utils/haptics';
import { useWakeLock } from '../../hooks/useWakeLock';
import { getCheckoutAlternatives } from '../../data/checkoutTable';
import { PersonalBests, createEmptyPersonalBests, updatePersonalBests } from '../../types/personalBests';
import audioSystem from '../../utils/audio';
import { api } from '../../services/api';
import { createAdaptiveBotPlayer, getAdaptiveBotConfigs, generateBotTurn, AdaptiveBotCategory } from '../../utils/botLogic';
import BackButton from '../common/BackButton';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useHandover } from '../../hooks/useHandover';
import { Button, IconButton, Card, Dialog, Select, Switch, Snackbar, SegmentedButton, LoadingIndicator, useFeedback } from '../common';
import { loadLastGameSettings, saveLastGameSettings, rotateForRematch, standings, findReusableGuest, GUEST_NAME } from '../../utils/matchSetup';
const MatchDetailModal = lazy(() => import('../dashboard/MatchDetailModal'));
import { springSpatialDefault, springSpatialFast, effectsDefault } from '../../utils/motion';
import { Icon, iconForEmoji } from '../icons';

/**
 * Renders `render()` only when `depsKey` changes. With deferred values in the
 * key, the subtree re-renders in React's low-priority pass after an urgent
 * update (the turn change) instead of inside it.
 */
const DeferredSection = React.memo(
  ({ render }: { render: () => React.ReactNode; depsKey: string }) => <>{render()}</>,
  (a, b) => a.depsKey === b.depsKey,
);

/** The insight cards (stats, visit history, chart, heatmap). */
type InsightTab = 'stats' | 'history' | 'chart' | 'heatmap';

const GameScreen: React.FC = () => {
  const { notify } = useFeedback();
  const windowClass = useWindowClass();
  // Phones and tablets in portrait: stats, history and the board open in a sheet.
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsTab, setInsightsTab] = useState<InsightTab>('stats');
  // The heatmap is only computed while it is on screen: always in the
  // multi-pane layouts, on phones while its tab is open in the sheet.
  const heatmapVisible = windowClass.panes > 1 || (insightsOpen && insightsTab === 'heatmap');
  const { t, i18n } = useTranslation();
  const isGerman = (i18n.language || 'de').startsWith('de');
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
  // across renders and the spotlight's React.memo keeps working).
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
    /** A set-winning leg: the reducer has already reset legsWon to 0. */
    setWon?: { setNumber: number; setsWon: number; setsTotal: number };
    /** The leg in numbers: darts used, average, the checkout. */
    recap?: { darts: number; avg: number; checkout: number };
    /** A new personal best leg. */
    best?: PersonalBestHit | null;
    /** A 100+ checkout: the hero moment of the leg. */
    big?: boolean;
  } | null>(null);
  const legWonOpen = !!legWonAnimation?.show;
  // Any tap or key closes it — it used to swallow every tap for five seconds.
  // A layout effect, so the listener is in place before the overlay is painted.
  React.useLayoutEffect(() => {
    if (!legWonOpen) return;
    const close = (e: Event) => {
      // Enter/Space only close it — they must not go on to commit a 0 visit.
      if (e instanceof KeyboardEvent && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      // The tap that closes the overlay must not go on to press whatever lies
      // beneath it (a numpad key): swallow the click that follows.
      if (e.type === 'pointerdown') {
        const swallow = (c: Event) => { c.preventDefault(); c.stopPropagation(); };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, true), 600);
      }
      setLegWonAnimation(null);
    };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', close, true);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('keydown', close, true);
    };
  }, [legWonOpen]);
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

    const legsTotal = match.settings.legsToWin || 3;
    const setsTotal = match.settings.setsToWin || 1;
    // The leg in numbers, from the winner's visits in it.
    const winnerVisits = completedLeg.throws.filter(t => t.playerId === winnerPlayer.playerId);
    const legDarts = dartsInLeg(completedLeg.throws, winnerPlayer.playerId);
    const legScored = winnerVisits.reduce((n, t) => n + t.score, 0);
    const checkoutScore = winnerVisits[winnerVisits.length - 1]?.score ?? 0;
    const best = winnerPlayer.isBot ? null : personalBestHits(baselineFor(winnerPlayer.playerId), {
      score: 0, legWonInDarts: legDarts, startScore: match.settings.startScore || 501,
    })[0] ?? null;
    if (best) raiseBaseline(winnerPlayer.playerId, [best]);
    // legsWon resets when a set is won, so a set-winning leg reads 0 here.
    const setWasWon = setsTotal > 1 && winnerPlayer.legsWon === 0;
    setLegWonAnimation({
      show: true,
      winnerName: winnerPlayer.name,
      winnerAvatar: fullPlayer?.avatar,
      winnerId: winnerPlayer.playerId,
      legNumber: currentLegIndex, // 1-indexed number of the leg just won
      legsWon: setWasWon ? legsTotal : winnerPlayer.legsWon,
      legsTotal,
      setWon: setWasWon
        ? {
            setNumber: match.players.reduce((n, p) => n + p.setsWon, 0),
            setsWon: winnerPlayer.setsWon,
            setsTotal,
          }
        : undefined,
      recap: legDarts > 0 ? { darts: legDarts, avg: (legScored / legDarts) * 3, checkout: checkoutScore } : undefined,
      best,
      big: checkoutScore >= 100,
    });
    burst('radial', { x: 0.5, y: 0.4 });
    haptic('leg', settings.vibrationEnabled);

    const timer = setTimeout(() => setLegWonAnimation(null), LEG_WON_MS);
    return () => clearTimeout(timer);
  }, [state.currentMatch?.currentLegIndex, state.currentMatch?.id]);

  // End of a leg or match: achievements unlocked now go centre stage.
  const celebrating = !!legWonAnimation?.show || (state.currentMatch?.status === 'completed' && !!state.currentMatch?.winner);
  useEffect(() => {
    setCelebrationMoment(celebrating);
  }, [celebrating]);
  useEffect(() => () => setCelebrationMoment(false), []);

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
  // Stage 3 of the feedback ladder (a 180, a new best visit).
  const [heroMoment, setHeroMoment] = useState<HeroMomentState | null>(null);
  const clearHeroMoment = React.useCallback(() => setHeroMoment(null), []);
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
  // With "auto next player" off, a confirmed visit waits for an explicit
  // "next player". There used to be no such control at all, so the game hung.
  const [awaitingNextPlayer, setAwaitingNextPlayer] = useState(false);
  // The visit that was just handed over, shown briefly above the input.
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  useEffect(() => {
    if (!handoff) return;
    const timer = setTimeout(() => setHandoff(null), HANDOFF_MS);
    return () => clearTimeout(timer);
  }, [handoff]);
  // Any turn change (bot, undo, new leg) ends the wait.
  useEffect(() => { setAwaitingNextPlayer(false); }, [state.currentPlayerIndex, state.currentMatch?.currentLegIndex]);
  // Stable: the hint's auto-close timer restarts whenever this changes.
  const dismissHint = React.useCallback((achievementId: string) => {
    setDismissedHints(prev => new Set(prev).add(achievementId));
  }, []);
  const handleNextPlayer = React.useCallback(() => {
    setAwaitingNextPlayer(false);
    dispatch({ type: 'NEXT_PLAYER' });
  }, [dispatch]);

  /** What the given darts do for the player at the oche — see utils/visit. */
  const evaluateCurrent = (darts: Dart[]) => {
    const match = state.currentMatch;
    const player = match?.players[state.currentPlayerIndex];
    const leg = match?.legs[match.currentLegIndex];
    if (!match || !player || !leg) return null;
    return evaluateVisit(rulesOf(match.settings), leg.throws, player.playerId, darts);
  };

  // The busting dart buzzes the moment it lands (it used to wait for the
  // auto-confirm 800 ms later).
  const liveBust = !!evaluateCurrent(state.currentThrow)?.bust;
  useEffect(() => {
    if (liveBust) haptic('bust', settings.vibrationEnabled);
  }, [liveBust]);

  // Calculate total throws count for dependency tracking
  const totalThrowsCount = state.currentMatch?.legs.reduce(
    (total, leg) => total + (leg.throws?.length || 0), 0
  ) || 0;
  // The relay turn change (0.34.0): after a visit the thrower stays the hero
  // card a moment, so the score lands where it was thrown. Display only — the
  // real current player drives input, bots, announcements and aria-current.
  const reduceMotion = useReducedMotion();
  const shownPlayerIndex = useHandover(
    state.currentPlayerIndex,
    totalThrowsCount,
    state.currentMatch?.currentLegIndex ?? 0,
    !reduceMotion,
  );
  // The insight cards (table, chart, heatmap, history) follow a visit at low
  // priority: rendering them in the same commit as the turn change cost
  // 100+ ms long tasks right in the middle of the card morph.
  // A corrected visit changes darts and scores, not the count — the cards
  // follow a revision of the visits instead of the count alone.
  const visitRevision = useMemo(() => (state.currentMatch?.legs ?? [])
    .flatMap(leg => leg.throws ?? [])
    .map(v => `${v.id}:${v.score}:${v.darts.map(d => `${d.segment}x${d.multiplier}${d.estimated ? '~' : ''}`).join(',')}`)
    .join('|'), [state.currentMatch?.legs]);
  const deferredThrows = useDeferredValue(visitRevision);
  const deferredPlayerIndex = useDeferredValue(state.currentPlayerIndex);

  // Personal-best baselines per player for live "new best" chips, read once
  // per match and raised as records fall (so one record is not shown twice).
  const pbRef = useRef<{ matchId?: string; byPlayer: Record<string, Baseline> }>({ byPlayer: {} });
  const baselineFor = (playerId: string): Baseline => {
    const matchId = state.currentMatch?.id;
    if (pbRef.current.matchId !== matchId) {
      const saved = storage?.get<Record<string, PersonalBests>>('personalBests', {}) ?? {};
      pbRef.current = {
        matchId,
        byPlayer: Object.fromEntries(Object.entries(saved).map(([id, b]) => [id, {
          highestScore: b?.highestScore?.value ?? 0,
          shortestLeg: b?.shortestLeg?.darts ?? 0,
        }])),
      };
    }
    return pbRef.current.byPlayer[playerId] ?? { highestScore: 0, shortestLeg: 0 };
  };
  const raiseBaseline = (playerId: string, hits: PersonalBestHit[]) => {
    const b = { ...baselineFor(playerId) };
    for (const h of hits) {
      if (h.kind === 'visit') b.highestScore = h.value;
      else b.shortestLeg = h.value;
    }
    pbRef.current.byPlayer[playerId] = b;
  };

  // The feedback ladder, driven by the newest booked visit — the same for
  // humans and bots, and an undo (fewer visits) fires nothing. Checkouts end a
  // leg: the leg overlay celebrates those.
  const seenThrowsRef = useRef<{ matchId?: string; count: number }>({ matchId: state.currentMatch?.id, count: totalThrowsCount });
  useEffect(() => {
    const m = state.currentMatch;
    if (!m) return;
    const prev = seenThrowsRef.current;
    seenThrowsRef.current = { matchId: m.id, count: totalThrowsCount };
    if (prev.matchId !== m.id || totalThrowsCount <= prev.count) return;
    const all = m.legs.flatMap(l => l.throws);
    const visit = all[all.length - 1];
    if (!visit) return;
    const checkout = !visit.isBust && visit.remaining === 0;
    if (checkout) return;
    const level = feedbackLevel({ score: visit.score, bust: !!visit.isBust, checkout });
    const thrower = m.players.find(p => p.playerId === visit.playerId);
    if (!thrower) return;
    const hits = thrower.isBot ? [] : personalBestHits(baselineFor(thrower.playerId), {
      score: visit.isBust ? 0 : visit.score, legWonInDarts: null, startScore: m.settings.startScore || 501,
    });
    if (hits.length) raiseBaseline(thrower.playerId, hits);
    const card = document.querySelector(`[data-testid="player-card-${CSS.escape(thrower.name)}"]`);
    if (level === 3 || hits.length) {
      setHeroMoment({ key: Date.now(), value: visit.score, kind: '180', name: thrower.name, bests: hits });
      burst('hero');
      haptic('hero', settings.vibrationEnabled);
    } else if (level === 2) {
      burst('spark', originOf(card));
      haptic('ton', settings.vibrationEnabled);
    }
  }, [totalThrowsCount, state.currentMatch?.id]);

  // The match is won: a short burst sequence (finite — the old confetti looped forever).
  const celebratedMatchRef = useRef<string | null>(null);
  useEffect(() => {
    const m = state.currentMatch;
    if (!m || m.status !== 'completed' || !m.winner || celebratedMatchRef.current === m.id) return;
    celebratedMatchRef.current = m.id;
    burst('match');
    haptic('match', settings.vibrationEnabled);
  }, [state.currentMatch?.status, state.currentMatch?.id]);

  // Calculate live heatmap data from current match throws
  const liveHeatmapData = useMemo((): Record<string, HeatmapData & { share: { exact: number; total: number } }> => {
    // Only while the section is open — it used to rebuild after every visit.
    if (!state.currentMatch || !heatmapVisible) return {};

    const heatmaps: Record<string, HeatmapData & { share: { exact: number; total: number } }> = {};

    // Collect throws based on view mode
    const allThrows: Throw[] = heatmapView === 'leg'
      ? (state.currentMatch.legs[state.currentMatch.currentLegIndex]?.throws || [])
      : state.currentMatch.legs.flatMap(leg => leg.throws || []);
    
    state.currentMatch.players.forEach(player => {
      heatmaps[player.playerId] = { ...heatmapFromThrows(allThrows, player.playerId), share: exactShare(allThrows, player.playerId) };
    });

    return heatmaps;
    // deferredThrows, not the legs: recomputed in the low-priority pass.
  }, [deferredThrows, state.currentMatch?.id, state.currentMatch?.players.length, heatmapView, heatmapVisible]);

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
    if (legWonOpen) return; // the bot starts the new leg once the overlay is gone

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
          }, 500);
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
  }, [state.currentPlayerIndex, currentTurnPlayerId, state.currentMatch?.currentLegIndex, state.currentMatch?.status, legWonOpen, dispatch]);

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
        notify(t('players.error_create'));
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

  const handleReplaceDart = React.useCallback(
    (index: number, dart: Dart) => dispatch({ type: 'REPLACE_DART', payload: { index, dart } }),
    [dispatch],
  );

  /** A numpad total: its darts land together, with one sound and one haptic. */
  const handleDartsHit = React.useCallback((darts: Dart[]) => {
    darts.forEach(dart => dispatch({ type: 'ADD_DART', payload: dart }));
    if (darts.length === 0) return;
    audioSystem.playSound('/sounds/OMNI/pop.mp3', false);
    haptic('dart', settings.vibrationEnabled);
  }, [dispatch, settings.vibrationEnabled]);

  // Define handleConfirmThrow with useCallback BEFORE useEffects that use it
  /** Confirms a visit made of `darts` (the current throw, or a numpad total that
   *  is being added in the same dispatch batch). */
  const confirmVisit = React.useCallback((darts: Dart[], typedTotal = false) => {
    const currentScore = calculateThrowScore(darts);
    const currentPlayer = state.currentMatch?.players[state.currentPlayerIndex];
    const currentLeg = state.currentMatch?.legs[state.currentMatch.currentLegIndex];
    const visit = evaluateCurrent(darts);

    // A checkout is announced by GameContext, a bust too — only plain scores here.
    if (visit && !visit.checkout && !visit.bust) {
      audioSystem.announceScore(visit.score);
    }

    // A bust entered dart by dart already buzzed when the busting dart landed;
    // a typed total that busts is only known now.
    haptic(visit?.checkout ? 'checkout' : visit?.bust ? (typedTotal ? 'bust' : 'confirm') : 'confirm', settings.vibrationEnabled);
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
        [...darts],
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

    // The turn passes at once — never after a checkout (CONFIRM_THROW already
    // starts the next leg). It used to pass one second later, and a visit typed
    // inside that second was booked to the previous player.
    if (!visit?.checkout) {
      if (currentPlayer && visit) {
        setHandoff({
          key: Date.now(),
          name: currentPlayer.name,
          score: visit.bust ? 0 : visit.score,
          remaining: visit.bust ? visit.previousRemaining : visit.newRemaining,
          bust: visit.bust,
        });
      }
      if (settings.autoNextPlayer) dispatch({ type: 'NEXT_PLAYER' });
      else setAwaitingNextPlayer(true);
    }
  }, [state.currentPlayerIndex, state.currentMatch, settings.autoNextPlayer, settings.vibrationEnabled, dispatch]);

  const handleConfirmThrow = React.useCallback(
    () => confirmVisit(state.currentThrow),
    [confirmVisit, state.currentThrow],
  );

  /** Numpad total + Enter: add the darts and confirm in one go, so the next
   *  key already belongs to the next player. */
  const handleCommitDarts = React.useCallback((darts: Dart[]) => {
    darts.forEach(dart => dispatch({ type: 'ADD_DART', payload: dart }));
    confirmVisit([...state.currentThrow, ...darts], true);
  }, [confirmVisit, dispatch, state.currentThrow]);

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
    setAwaitingNextPlayer(false);
    setHandoff(null);
    haptic('undo', settings.vibrationEnabled);
    // Enter editing mode - darts will be loaded into currentThrow by the reducer
    setIsEditingThrow(true);
    setEditingDartIndex(null);
    dispatch({ type: 'UNDO_THROW', payload: { skipBots: true } });
  };

  // Taken back one visit too many: book it again (0.35.0). Undo keeps what it
  // took back; the button names the visit that would return.
  const nextRedo = redoTarget(state);
  const redoInfo = useMemo(() => {
    if (!nextRedo || !state.currentMatch) return null;
    return {
      playerName: state.currentMatch.players.find(p => p.playerId === nextRedo.playerId)?.name ?? '?',
      score: nextRedo.score,
      isBust: nextRedo.isBust,
    };
  }, [nextRedo, state.currentMatch]);

  const handleRedoThrow = () => {
    if (!nextRedo) return;
    setAwaitingNextPlayer(false);
    setHandoff(null);
    haptic('undo', settings.vibrationEnabled);
    setIsEditingThrow(false);
    setEditingDartIndex(null);
    dispatch({ type: 'REDO_THROW' });
  };

  // A taken-back typed visit corrected as a sum: swap its darts, then book it.
  const handleReplaceVisit = React.useCallback((darts: Dart[]) => {
    dispatch({ type: 'CLEAR_THROW' });
    darts.forEach(dart => dispatch({ type: 'ADD_DART', payload: dart }));
    confirmVisit(darts, true);
  }, [confirmVisit, dispatch]);

  // Correcting any booked visit (dialog, chips). The check runs first so a
  // refused correction can say why; the reducer applies the same rule.
  const [editTarget, setEditTarget] = useState<{ throwId: string; tab: EditVisitTab } | null>(null);
  const handleEditVisit = React.useCallback((throwId: string) => setEditTarget({ throwId, tab: 'sum' }), []);
  const applyVisitEdit = React.useCallback((throwId: string, darts: Dart[]): string | null => {
    const match = state.currentMatch;
    if (!match) return t('correction.error_not_found');
    const result = editVisit(match, throwId, darts);
    if (!result.ok) return t(`correction.error_${result.reason}`);
    dispatch({ type: 'EDIT_THROW', payload: { throwId, darts } });
    haptic('undo', settings.vibrationEnabled);
    return null;
  }, [state.currentMatch, dispatch, t, settings.vibrationEnabled]);

  // "How was it thrown?" — the newest visit, if it was a typed total of a person.
  const visitChips = useMemo(() => {
    const match = state.currentMatch;
    if (!match || match.status !== 'in-progress') return null;
    const history = match.legs.slice(0, match.currentLegIndex + 1).flatMap(l => l.throws);
    const last = history[history.length - 1];
    if (!last || last.isBust || last.score <= 0 || last.darts.length === 0 || !last.darts.every(d => d.estimated)) return null;
    if (players.find(p => p.id === last.playerId)?.isBot) return null;
    const options = likelyDecompositions(last.score, { isCheckout: last.remaining === 0, outRule: outRuleOf(match.settings) });
    if (options.length === 0) return null;
    return {
      visitId: last.id,
      playerName: match.players.find(p => p.playerId === last.playerId)?.name ?? '',
      score: last.score,
      options,
    };
  }, [state.currentMatch, players]);

  // Stable identity: hero card and rows are memoized, an inline arrow would re-render them.
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
                    aria-pressed={!!selectedPlayers.find(p => p.id === player.id)}
                    onClick={() => {
                      if (selectedPlayers.find(p => p.id === player.id)) {
                        setSelectedPlayers(selectedPlayers.filter(p => p.id !== player.id));
                      } else {
                        setSelectedPlayers([...selectedPlayers, player]);
                      }
                    }}
                    className={`p-3 rounded-m3-lg border-2 transition-colors ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'border-[var(--m3-primary)] bg-primary-container shadow-m3-1'
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
                    className="p-3 rounded-m3-lg border-2 border-[var(--m3-primary)] bg-primary-container shadow-m3-1 relative group"
                    title={t('game_screen.click_to_remove')}
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
                      className="p-3 rounded-m3-lg border-2 border-dashed border-outline-variant hover:border-outline transition"
                    >
                      <div className="mb-1 flex justify-center"><Icon name="plus" size={24} /></div>
                      <div className="m3-label-large text-on-surface">{t('game.add_player')}</div>
                    </button>
                    <button
                      onClick={() => setShowBotSelector(true)}
                      className="p-3 rounded-m3-lg border-2 border-dashed border-outline hover:border-[var(--m3-primary)] transition bg-primary-container/40"
                    >
                      <div className="mb-1 flex justify-center"><Icon name="robot" size={24} /></div>
                      <div className="m3-label-large text-primary">{t('game.add_bot')}</div>
                    </button>
                  </>
                ) : showBotSelector ? (
                  <div className="p-4 rounded-m3-lg border-2 border-[var(--m3-primary)] bg-primary-container/40 col-span-2 md:col-span-3">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-on-surface m3-title-small flex items-center gap-2">
                          <Bot size={18} className="text-primary" />
                          {t('game_screen.choose_bot')}
                        </span>
                        <button
                          onClick={() => setShowBotSelector(false)}
                          className="text-on-surface-variant hover:text-on-surface"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      <p className="m3-body-small text-on-surface-variant">
                        {t('game_screen.bot_adaptive_hint')}
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
                            className="p-3 rounded-m3-lg bg-surface-container-high hover:bg-surface-container-highest border-2 border-transparent hover:border-[var(--m3-primary)] transition text-center"
                          >
                            <div className="mb-2 flex justify-center"><Icon name={iconForEmoji(config.icon)} size={30} /></div>
                            <div className="m3-label-large text-on-surface">{isGerman ? config.nameDE : config.name}</div>
                            <div className="m3-body-small text-on-surface-variant mt-1">{isGerman ? config.descriptionDE : config.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-m3-lg border-2 border-[var(--m3-primary)] bg-primary-container">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          {newPlayerAvatar ? (
                            <div className="flex items-center gap-2">
                              <PlayerAvatar avatar={newPlayerAvatar} name={newPlayerName || '?'} size="md" />
                              <button
                                onClick={() => setNewPlayerAvatar(undefined)}
                                className="m3-label-medium px-2 py-1 bg-error-container hover:bg-error-container/80 text-on-error-container rounded-m3-sm transition"
                              >
                                {t('game_screen.remove')}
                              </button>
                            </div>
                          ) : (
                            <div className="text-on-surface-variant m3-body-medium">{t('game_screen.no_emoji')}</div>
                          )}
                        </div>
                        <Button
                          variant="filled"
                          size="sm"
                          onClick={() => setShowEmojiPicker(true)}
                          icon={<Smile size={16} />}
                        >
                          {t('game_screen.emoji')}
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
                              notify(t('players.error_create'));
                            }
                          }
                        }}
                        placeholder={t('game_screen.player_name_placeholder')}
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
                                notify(t('players.error_create'));
                              }
                            }
                          }}
                          disabled={!newPlayerName.trim()}
                        >
                          {t('game_screen.add')}
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
                          {t('common.cancel')}
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
              {/* Check-in / check-out: single, double or triple (utils/checkRules). */}
              {([
                ['in', 'game.check_in', 'game.check_in_hint', inRuleOf(gameSettings)],
                ['out', 'game.check_out', 'game.check_out_hint', outRuleOf(gameSettings)],
              ] as const).map(([side, label, hint, value]) => (
                <div key={side}>
                  <div className="flex items-baseline justify-between gap-3 mb-1.5">
                    <span className="text-on-surface">{t(label)}</span>
                    <span className="m3-body-small text-on-surface-variant">{t(hint)}</span>
                  </div>
                  <SegmentedButton<CheckRule>
                    label={t(label)}
                    value={value}
                    onChange={(rule) => setGameSettings({
                      ...gameSettings,
                      ...(side === 'in'
                        ? ruleSettings(rule, outRuleOf(gameSettings))
                        : ruleSettings(inRuleOf(gameSettings), rule)),
                    })}
                    options={[
                      { value: 'single', label: t('game.rule_single') },
                      { value: 'double', label: t('game.rule_double') },
                      { value: 'triple', label: t('game.rule_triple') },
                    ]}
                  />
                </div>
              ))}
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
          <p className="m3-title-large text-on-surface-variant mb-4">{t('game_screen.no_active_game')}</p>
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
    // The TV scoreboard keeps the last picture of the match and adds the winner.
    const lastBoard = readScoreboard();
    const finalBoard: ScoreboardData | null = lastBoard?.matchId === currentMatch.id ? {
      ...(({ v: _v, updatedAt: _u, ...rest }) => rest)(lastBoard),
      status: 'completed',
      winnerName: winner.name,
      throwTotal: 0,
      throwDarts: 0,
      checkoutRoute: null,
      players: lastBoard.players.map(p => {
        const mp = currentMatch.players.find(x => x.playerId === p.id);
        return mp ? { ...p, legsWon: mp.legsWon, setsWon: mp.setsWon, average: mp.matchAverage } : p;
      }),
    } : null;

    return (
      <div className="min-h-dvh p-4 gradient-mesh flex items-center justify-center">
        {finalBoard && <ScoreboardPublisher data={finalBoard} />}
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
              <h2 className="m3-display-small m3-emphasized text-on-surface mb-2">
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
  // What the scoreboard shows: the visit as the rules count it. A bust keeps the
  // old score (it used to read negative until the auto-confirm), and double-in
  // counts nothing before the first double.
  const liveVisit = evaluateCurrent(state.currentThrow);
  const shownRemaining = liveVisit ? liveVisit.newRemaining : remaining;
  const remainingOf = (index: number) => {
    if (index === state.currentPlayerIndex) return shownRemaining;
    const player = state.currentMatch!.players[index];
    const scored = currentLeg.throws.filter(t => t.playerId === player.playerId).reduce((sum, t) => sum + t.score, 0);
    return (state.currentMatch!.settings.startScore || 501) - scored;
  };
  const showSets = (state.currentMatch.settings.setsToWin || 1) > 1;
  // Place in the leg per player (confirmed visits only, so it does not
  // flicker while darts are being entered).
  const ranks = legRanks(
    state.currentMatch.players.map(p => p.playerId),
    currentLeg.throws,
    state.currentMatch.settings.startScore || 501,
  );
  const stripPlayers = state.currentMatch.players.map((p, i) => ({
    playerId: p.playerId,
    name: p.name,
    remaining: remainingOf(i),
    legsWon: p.legsWon,
    setsWon: p.setsWon,
    isActive: i === state.currentPlayerIndex,
    rank: ranks.get(p.playerId) ?? null,
  }));
  const outRule = outRuleOf(state.currentMatch.settings);
  const spotPlayers: SpotPlayer[] = state.currentMatch.players.map((p, i) => ({
    player: p,
    avatar: players.find(x => x.id === p.playerId)?.avatar,
    remaining: remainingOf(i),
    rank: ranks.get(p.playerId) ?? null,
    average: p.matchAverage,
    legsWon: p.legsWon,
    setsWon: p.setsWon,
    dartsInLeg: dartsInLeg(currentLeg.throws, p.playerId),
    visits: lastVisits(currentLeg.throws, p.playerId, 5),
  }));
  const scoreboardData: ScoreboardData = {
    matchId: state.currentMatch.id,
    startScore: state.currentMatch.settings.startScore || 501,
    status: state.currentMatch.status === 'paused' ? 'paused' : 'in-progress',
    players: spotPlayers.map(sp => ({
      id: sp.player.playerId,
      name: sp.player.name,
      avatar: sp.avatar,
      remaining: sp.remaining,
      rank: sp.rank,
      average: sp.average,
      legsWon: sp.legsWon,
      setsWon: sp.setsWon,
      dartsInLeg: sp.dartsInLeg,
      visits: sp.visits,
    })),
    activeIndex: state.currentPlayerIndex,
    legsToWin: state.currentMatch.settings.legsToWin || 3,
    showSets,
    setsToWin: state.currentMatch.settings.setsToWin || 1,
    rules: ruleTags(state.currentMatch.settings).map(r => r.short).join(' '),
    checkoutRoute: settings.showCheckoutHints ? state.checkoutSuggestion ?? null : null,
    throwTotal: currentThrowScore,
    throwDarts: state.currentThrow.length,
    winnerName: null,
  };
  // M3 window size classes decide the layout: one pane with the input docked
  // at the bottom (phone, tablet portrait), two panes from 840 px, three from
  // 1200 px with a context pane (board, stats). A phone held sideways keeps
  // its compact strip layout.
  const { width: widthClass, compactHeight, panes } = windowClass;
  const usesSheet = panes === 1;
  const spotlight = (
    <Spotlight
      players={spotPlayers}
      activeIndex={Math.min(shownPlayerIndex, spotPlayers.length - 1)}
      currentId={state.currentMatch.players[state.currentPlayerIndex]?.playerId}
      showSets={showSets}
      legsToWin={state.currentMatch.settings.legsToWin || 3}
      // The route belongs to the player at the oche — not to the thrower the
      // hero card still shows for a moment after the visit.
      checkoutRoute={settings.showCheckoutHints && shownPlayerIndex === state.currentPlayerIndex ? state.checkoutSuggestion : null}
      checkoutMax={maxFinish(outRule)}
      size={widthClass === 'compact' ? 'compact' : widthClass === 'xl' ? 'large' : 'regular'}
      flames={widthClass !== 'compact'}
      rowsFirst={panes === 1}
      rowColumns={widthClass === 'xl' && spotPlayers.length >= 5 ? 2 : 1}
      onRemove={canRemovePlayers ? handleRequestRemovePlayer : undefined}
      removeLabel={t('game.remove_player')}
      onEditVisit={handleEditVisit}
    />
  );
  const scoreInput = (
    <ScoreInput
      currentThrow={state.currentThrow}
      onAddDart={handleDartHit}
      onRemoveDart={handleRemoveDart}
      onClearThrow={handleClearThrow}
      onConfirm={handleConfirmThrow}
      onReplaceDart={handleReplaceDart}
      editingDartIndex={editingDartIndex}
      onSetEditingDartIndex={setEditingDartIndex}
      isEditingThrow={isEditingThrow}
      remaining={remaining}
      outRule={outRuleOf(state.currentMatch.settings)}
      isCheckout={isEarlyCheckout}
      onUndoThrow={handleUndoThrow}
      lastThrow={lastThrowInfo}
      onRedoThrow={handleRedoThrow}
      nextThrow={redoInfo}
      onAddDarts={handleDartsHit}
      onCommitDarts={handleCommitDarts}
      handoff={handoff}
      awaitingNextPlayer={awaitingNextPlayer ? state.currentMatch.players[(state.currentPlayerIndex + 1) % state.currentMatch.players.length]?.name ?? null : null}
      onNextPlayer={handleNextPlayer}
      bust={!!liveVisit?.bust}
      previewRemaining={liveVisit ? liveVisit.newRemaining : null}
      dense={windowClass.width === 'compact' && !windowClass.compactHeight}
      onReplaceVisit={handleReplaceVisit}
      chips={visitChips && {
        ...visitChips,
        onPick: (darts: Dart[]) => {
          const problem = applyVisitEdit(visitChips.visitId, darts);
          if (problem) notify(problem);
        },
        onOther: () => setEditTarget({ throwId: visitChips.visitId, tab: 'darts' }),
      }}
    />
  );
  const alternatives = panes > 1 && settings.showCheckoutHints && state.checkoutSuggestion && outRule === 'double' ? (
    <CheckoutSuggestion
      hidePrimary
      suggestion={state.checkoutSuggestion}
      alternatives={getCheckoutAlternatives(remaining, 3 - state.currentThrow.length, true)}
      remaining={remaining}
    />
  ) : null;
  const boardHelper = settings.showDartboardHelper ? (
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
        {t('game_screen.miss_no_score')}
      </Button>
    </div>

  ) : null;
  const chartThrows = statsView === 'leg'
    ? currentLeg.throws
    : state.currentMatch.legs.flatMap(l => l.throws);
  // Every player side by side — the old panel showed only the player up.
  const statRows: { label: string; value: (p: MatchPlayer) => string }[] = [
    { label: t('game_screen.stat_average'), value: p => p.matchAverage.toFixed(2) },
    { label: t('game_screen.stat_highest'), value: p => String(p.matchHighestScore) },
    { label: '180', value: p => String(p.match180s) },
    { label: '140+', value: p => String(p.match140Plus) },
    { label: '100+', value: p => String(p.match100Plus) },
    { label: t('game_screen.stat_checkout'), value: p => `${p.checkoutAttempts > 0 ? ((p.checkoutsHit / p.checkoutAttempts) * 100).toFixed(1) : '0.0'}%` },
    { label: t('game.legs'), value: p => String(p.legsWon) },
  ];
  const statsTable = (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full m3-body-medium tabular-nums border-separate border-spacing-x-1 border-spacing-y-0.5">
        <thead>
          <tr>
            <th scope="col" className="sr-only">{t('game_screen.match_statistics')}</th>
            {state.currentMatch.players.map((p, i) => (
              <th
                key={p.playerId}
                scope="col"
                className={`px-2 py-1.5 rounded-t-m3-sm m3-label-large text-right truncate max-w-[8rem] ${
                  i === state.currentPlayerIndex ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'
                }`}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {statRows.map(row => (
            <tr key={row.label}>
              <th scope="row" className="text-left font-normal text-on-surface-variant pr-2 py-1 whitespace-nowrap">{row.label}</th>
              {state.currentMatch!.players.map((p, i) => (
                <td
                  key={p.playerId}
                  className={`px-2 py-1 text-right font-semibold text-on-surface ${
                    i === state.currentPlayerIndex ? 'bg-[color-mix(in_srgb,var(--m3-primary-container)_45%,transparent)]' : ''
                  }`}
                >
                  {row.value(p)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  const historyBody = (
    <div className="max-h-[32rem] overflow-y-auto pr-1">
      {/* Leg/Match Toggle */}
      <SegmentedButton<'leg' | 'match'>
        className="mb-4"
        label={t('game.stats_scope')}
        value={statsView}
        onChange={setStatsView}
        options={[
          { value: 'leg', label: t('game.current_leg') },
          { value: 'match', label: t('game.whole_match') },
        ]}
      />
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
                {t('game_screen.visit_count', { count: playerThrows.length })}
              </span>
            </h4>

            {playerThrows.length === 0 ? (
              <p className="text-on-surface-variant text-sm italic">{t('game_screen.no_visits')}</p>
            ) : (
              <div className="space-y-2">
                {playerThrows.map((throwData, index) => (
                  <div
                    key={throwData.id}
                    className="bg-surface-container rounded-m3-lg p-3 border border-outline-variant"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-on-surface-variant text-sm">
                        {t('game_screen.visit_number', { n: index + 1 })}
                      </span>
                      <div className="flex items-center gap-3">
                        {throwData.isBust && (
                          <span className="text-on-error-container text-xs font-bold bg-error-container px-2 py-1 rounded-m3-sm">
                            {t('game_screen.bust')}
                          </span>
                        )}
                        <span className={`font-bold text-lg ${
                          throwData.isBust
                            ? 'text-error line-through'
                            : throwData.score >= 140
                              ? 'text-tertiary'
                              : throwData.score >= 100
                                ? 'text-primary'
                                : 'text-on-surface'
                        }`}>
                          {throwData.score}
                        </span>
                        <span className="text-on-surface-variant text-sm">
                          → {throwData.remaining}
                        </span>
                        <IconButton
                          label={t('correction.edit_visit', { score: throwData.isBust ? t('game.bust') : throwData.score })}
                          onClick={() => handleEditVisit(throwData.id)}
                          data-testid="history-edit"
                        >
                          <Pencil size={16} />
                        </IconButton>
                      </div>
                    </div>

                    {/* A typed total has no known beds: say so instead of showing invented darts. */}
                    {throwData.darts.length > 0 && throwData.darts.every(d => d.estimated) ? (
                      <div className="text-center py-2 rounded-m3-sm bg-surface-container-highest text-on-surface-variant text-xs font-semibold" data-testid="history-typed">
                        {t('correction.typed')}
                      </div>
                    ) : (
                    <div className="flex gap-2">
                      {throwData.darts.map((dart, dartIndex) => (
                        <div
                          key={dartIndex}
                          className={`flex-1 text-center py-2 rounded-m3-sm ${
                            dart.multiplier === 3
                              ? 'bg-success-container text-on-success-container'
                              : dart.multiplier === 2
                                ? 'bg-error-container text-on-error-container'
                                : dart.score === 0
                                  ? 'bg-surface-container-highest text-on-surface-variant'
                                  : 'bg-primary-container text-on-primary-container'
                          }`}
                        >
                          <span className="text-xs font-semibold">
                            {dart.score === 0
                              ? t('game.miss')
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
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
  const chartBody = (
    <>
      {/* Leg/Match Toggle */}
      <SegmentedButton<'leg' | 'match'>
        className="mb-4"
        label={t('game.stats_scope')}
        value={statsView}
        onChange={setStatsView}
        options={[
          { value: 'leg', label: t('game.current_leg') },
          { value: 'match', label: t('game.whole_match') },
        ]}
      />
      <Suspense fallback={<div className="h-[600px] flex items-center justify-center"><LoadingIndicator /></div>}>
        <ThrowChart players={state.currentMatch.players} chartThrows={chartThrows} />
      </Suspense>
    </>
  );
  const heatmapBody = (
    <>
      {/* Leg/Match Toggle */}
      <SegmentedButton
        className="mb-4"
        label={t('game_screen.live_heatmap')}
        value={heatmapView}
        onChange={setHeatmapView}
        options={[
          { value: 'leg', label: t('game.current_leg') },
          { value: 'match', label: t('game.whole_match') },
        ]}
      />
      {/* Player Selector */}
      {state.currentMatch.players.length > 1 && (
        <div className="mb-6">
          <label className="block m3-label-large text-on-surface-variant mb-2">{t('game.select_players')}</label>
          <div className="flex flex-wrap gap-2">
            {state.currentMatch.players.map(player => (
              <button
                key={player.playerId}
                onClick={() => setSelectedHeatmapPlayer(
                  selectedHeatmapPlayer === player.playerId ? null : player.playerId
                )}
                className={`px-4 py-2 rounded-m3-lg font-medium transition flex items-center gap-2 ${
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
              <p className="text-on-surface-variant text-lg">{t('game_screen.no_heatmap_data', { name: playerName })}</p>
              {/* Typed totals only: say why the board stays empty and how to fill it. */}
              <p className="text-on-surface-variant text-sm mt-2" data-testid={playerHeatmap && playerHeatmap.share.total > 0 ? 'heatmap-only-typed' : undefined}>
                {playerHeatmap && playerHeatmap.share.total > 0
                  ? `${t('heatmap.only_typed')} ${t('heatmap.exact_hint')}`
                  : t('game_screen.heatmap_hint')}
              </p>
            </div>
          );
        }

        return (
          <div>
            <div className="text-center mb-4">
              <span className="text-lg font-bold text-on-surface">{playerName}</span>
              <span className="text-on-surface-variant ml-2">{t('game_screen.darts_count', { count: playerHeatmap.totalDarts })}</span>
            </div>
            <DartboardHeatmap heatmapData={playerHeatmap} maxWidth={460} compact />
            <div className="mt-3"><ExactShareNote {...playerHeatmap.share} /></div>
          </div>
        );
      })()}
    </>
  );
  const card = (id: InsightTab, title: string, icon: React.ReactNode, content: React.ReactNode) => (
    <motion.section
      key={id}
      data-testid={`insight-${id}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSpatialDefault}
      className="m3-card m3-elevated rounded-m3-lg p-4 md:p-5 min-w-0"
    >
      <h3 className="m3-title-medium text-on-surface mb-3 flex items-center gap-2">{icon}{title}</h3>
      {content}
    </motion.section>
  );
  const insightCards: Record<InsightTab, React.ReactNode> = {
    stats: settings.showStatsDuringGame ? card('stats', t('game_screen.match_statistics'), <BarChart3 size={20} className="text-primary" aria-hidden="true" />, statsTable) : null,
    history: card('history', t('game_screen.throw_history'), <RotateCcw size={20} className="text-primary" aria-hidden="true" />, historyBody),
    chart: card('chart', t('game_screen.throw_chart'), <BarChart3 size={20} className="text-tertiary" aria-hidden="true" />, chartBody),
    heatmap: card('heatmap', t('game_screen.live_heatmap'), <Flame size={20} className="text-tertiary" aria-hidden="true" />, heatmapBody),
  };
  // Desktop: two columns of open cards under the play area — numbers on the
  // left, pictures on the right.
  const insights = (
    <section data-testid="insights-grid" aria-label={t('game_screen.insights')} className="grid gap-6 md:grid-cols-2 items-start">
      <div className="space-y-6 min-w-0">
        {insightCards.stats}
        {insightCards.history}
      </div>
      <div className="space-y-6 min-w-0">
        {insightCards.heatmap}
        {insightCards.chart}
      </div>
    </section>
  );
  // Phones: one card at a time behind tabs, inside the sheet.
  const insightTabs = (
    <div className="space-y-4">
      <SegmentedButton<InsightTab>
        label={t('game_screen.insights')}
        size="sm"
        value={insightsTab}
        onChange={setInsightsTab}
        options={[
          { value: 'stats', label: t('game_screen.tab_stats') },
          { value: 'history', label: t('game_screen.tab_history') },
          { value: 'chart', label: t('game_screen.tab_chart') },
          { value: 'heatmap', label: t('game_screen.tab_heatmap') },
        ]}
      />
      {insightCards[insightsTab] ?? insightCards.history}
    </div>
  );
  const containerWidth = widthClass === 'xl' ? 'max-w-[2400px]' : widthClass === 'large' ? 'max-w-[1600px]' : 'max-w-7xl';

  return (
    <div data-game-screen className={`min-h-dvh p-4 md:p-6 phoneland:p-2 gradient-mesh overflow-x-hidden ${usesSheet && !compactHeight ? 'flex flex-col' : ''}`}>
      <GameAnnouncer match={state.currentMatch} />
      {(() => {
        if (!editTarget || !state.currentMatch) return null;
        const target = state.currentMatch.legs.flatMap(l => l.throws).find(v => v.id === editTarget.throwId);
        if (!target) return null;
        return (
          <EditVisitDialog
            key={`${target.id}-${editTarget.tab}`}
            open
            onClose={() => setEditTarget(null)}
            playerName={state.currentMatch.players.find(p => p.playerId === target.playerId)?.name ?? ''}
            visitNumber={target.visitNumber}
            score={target.score}
            darts={target.darts}
            remainingBefore={target.isBust ? target.remaining : target.remaining + target.score}
            outRule={outRuleOf(state.currentMatch.settings)}
            initialTab={editTarget.tab}
            onSave={darts => applyVisitEdit(target.id, darts)}
          />
        );
      })()}
      <HeroMoment moment={heroMoment} onDone={clearHeroMoment} />
      <ScoreboardPublisher data={scoreboardData} />

      <div className={`${containerWidth} w-full mx-auto ${usesSheet && !compactHeight ? 'flex-1 flex flex-col' : ''}`} data-panes={panes}>
        <div className="flex items-center justify-between mb-3 lg:mb-4 phoneland:mb-1">
          <BackButton onClick={handleBackToMenu} inline />
          
          <div className="flex gap-2">
            {/* Phones and tablets in portrait: stats, history and the board live in a sheet. */}
            {usesSheet && (
              <IconButton
                variant="tonal"
                label={t('game_screen.insights')}
                onClick={() => setInsightsOpen(true)}
              >
                <BarChart3 size={20} />
              </IconButton>
            )}
            {/* A second screen (TV, beamer): the score as a display-only page. */}
            {!usesSheet && (
              <IconButton
                variant="tonal"
                label={t('scoreboard.open')}
                onClick={() => window.open('/scoreboard', 'sotd-scoreboard')}
              >
                <Tv size={20} />
              </IconButton>
            )}
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
              label={t('bug_button.label')}
              onClick={() => setShowBugReportModal(true)}
            >
              <AlertTriangle size={20} />
            </IconButton>

            <IconButton
              variant="filled"
              label={t('game.end_match')}
              onClick={handleEndMatch}
              style={{ backgroundColor: 'var(--m3-error)', color: 'var(--m3-on-error)' }}
            >
              <X size={20} />
            </IconButton>
          </div>
        </div>
        

        {compactHeight ? (
          <>
            {/* Phone on its side: the score strip and the input, nothing else. */}
            <ScoreStrip
              className="sticky top-0 z-20 -mx-2 px-2 py-1 mb-2 bg-[color-mix(in_srgb,var(--m3-surface)_92%,transparent)] backdrop-blur"
              showSets={showSets}
              legsToWin={state.currentMatch.settings.legsToWin || 3}
              players={stripPlayers}
            />
            {scoreInput}
          </>
        ) : panes === 1 ? (
          <>
            {spotlight}
            {/* The input docks at the bottom — in reach of the thumb. */}
            <div
              data-testid="input-dock"
              className="mt-auto sticky bottom-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] flex justify-center bg-[color-mix(in_srgb,var(--m3-surface)_92%,transparent)] backdrop-blur"
            >
              {scoreInput}
            </div>
          </>
        ) : panes === 2 ? (
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
            <div className="space-y-4 min-w-0">
              {spotlight}
            </div>
            <div className="space-y-4 min-w-0 sticky top-4 flex flex-col items-center">
              {scoreInput}
              {alternatives}
              {boardHelper}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(22.5rem,27.5rem)_minmax(0,1fr)] gap-6 items-start">
            <div className="min-w-0">{spotlight}</div>
            <div className="space-y-4 min-w-0 flex flex-col items-center">
              {scoreInput}
              {alternatives}
            </div>
            {/* Context pane: the board, above the fold. */}
            <div data-testid="context-pane" className="min-w-0">
              {boardHelper}
            </div>
          </div>
        )}
        {/* Under the play area: the insight cards in two columns. */}
        {panes > 1 && (
          <div className="mt-6">
            <DeferredSection
              depsKey={[
                state.currentMatch.id, deferredThrows, deferredPlayerIndex, statsView, heatmapView,
                selectedHeatmapPlayer ?? '', settings.showStatsDuringGame, i18n.language, state.currentMatch.currentLegIndex,
              ].join('|')}
              render={() => insights}
            />
          </div>
        )}
      </div>

      {/* Phones and tablets in portrait: stats, history, heatmap and the board. */}
      {usesSheet && (
        <Dialog
          variant="sheet"
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          title={t('game_screen.insights')}
        >
          <div className="space-y-4">
            {boardHelper}
            {insightTabs}
          </div>
        </Dialog>
      )}

      {/* Achievement Hints */}
      {hints.length > 0 && (
        <AchievementHint
          hints={hints}
          onDismiss={dismissHint}
        />
      )}

      {/* Leg Won Animation Overlay — any tap or key closes it (window listener
          above). It stays mounted through its exit fade, so the closing tap
          lands on the scrim and not on a numpad key underneath. */}
      <AnimatePresence>
      {legWonAnimation?.show && (
        <motion.div
          key="leg-won"
          data-testid="leg-won"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={effectsDefault}
          className="fixed inset-0 bg-[color-mix(in_srgb,var(--m3-scrim)_80%,transparent)] flex items-center justify-center z-50"
        >
          <div className="text-center animate-scale-in">
            {/* Winner avatar on a shape that morphs circle → sunny (a 100+
                checkout gets the soft burst). */}
            <div className="relative mb-4 flex justify-center">
              <motion.div
                aria-hidden="true"
                className="absolute w-36 h-36 bg-tertiary-container"
                initial={{ clipPath: shapePolygon('circle', 144), scale: 0.4, rotate: -40 }}
                animate={{ clipPath: shapePolygon(legWonAnimation.big ? 'burst' : 'sunny', 144), scale: 1, rotate: 0 }}
                transition={springSpatialDefault}
                style={{ top: '50%', left: '50%', x: '-50%', y: '-50%' }}
              />
              <motion.div
                className="relative"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={springSpatialDefault}
              >
                <PlayerAvatar
                  avatar={legWonAnimation.winnerAvatar}
                  name={legWonAnimation.winnerName}
                  size="xl"
                />
              </motion.div>
            </div>

            {/* LEG / SET text with glow */}
            <div className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 mb-2"
                 style={{ textShadow: '0 0 40px rgba(245, 158, 11, 0.5)' }}>
              {legWonAnimation.setWon
                ? t('game_screen.set_number', { n: legWonAnimation.setWon.setNumber })
                : t('game_screen.leg_number', { n: legWonAnimation.legNumber })}
            </div>

            {/* Winner name */}
            <div className="text-3xl md:text-4xl font-bold text-on-surface mb-4">
              {legWonAnimation.winnerName}
            </div>

            {/* Score indicator: sets after a set, legs otherwise */}
            {(() => {
              const won = legWonAnimation.setWon ? legWonAnimation.setWon.setsWon : legWonAnimation.legsWon;
              const total = legWonAnimation.setWon ? legWonAnimation.setWon.setsTotal : legWonAnimation.legsTotal;
              return (
                <>
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="flex gap-2">
                      {[...Array(total)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-full transition ${
                            i < won
                              ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/50'
                              : 'bg-surface-container-highest'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-xl text-on-surface-variant">
                    {legWonAnimation.setWon
                      ? t('game_screen.sets_progress', { won, total })
                      : t('game_screen.legs_progress', { won, total })}
                  </div>
                </>
              );
            })()}

            {legWonAnimation.recap && (
              <div data-testid="leg-recap" className="mt-4 m3-title-medium text-on-surface tabular-nums">
                {t('game_screen.leg_recap', {
                  darts: legWonAnimation.recap.darts,
                  avg: legWonAnimation.recap.avg.toFixed(1),
                  checkout: legWonAnimation.recap.checkout,
                })}
              </div>
            )}
            {legWonAnimation.best && (
              <motion.div
                data-testid="pb-chip"
                initial={{ y: 12, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ ...springSpatialDefault, delay: 0.3 }}
                className="inline-block mt-3 px-4 py-1.5 rounded-m3-full bg-primary text-on-primary m3-label-large"
              >
                {t('game_screen.pb_leg', { value: legWonAnimation.best.value })}
              </motion.div>
            )}

            {/* Next leg indicator */}
            <div className="mt-6 m3-title-medium text-primary">
              {legWonAnimation.setWon ? t('game_screen.next_set_starting') : t('game_screen.next_leg_starting')}
            </div>
            <div className="mt-2 m3-body-medium text-on-surface-variant">
              {t('game_screen.tap_to_continue')}
            </div>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

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