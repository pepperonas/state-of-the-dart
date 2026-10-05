import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, BarChart, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { Dart, TrainingType, TrainingSession, TrainingResult } from '../../types';
import Dartboard from '../dartboard/Dartboard';
import audioSystem from '../../utils/audio';
import { useSettings } from '../../context/SettingsContext';
import { usePlayer } from '../../context/PlayerContext';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../services/api';
import { useGameAchievements } from '../../hooks/useGameAchievements';
import BackButton from '../common/BackButton';
import { Button, Card, AnimatedNumber } from '../common';
import { Icon, iconForEmoji } from '../icons';
import { advanceThroughSequence, bobs27Round, BOBS_27_ROUNDS, BOBS_27_BULL } from '../../utils/training';
import { useWakeLock } from '../../hooks/useWakeLock';
import { haptic } from '../../utils/haptics';

interface TrainingState {
  currentTarget: number;
  currentTargetMultiplier?: number;
  score: number;
  attempts: number;
  hits: number;
  round: number;
  totalRounds: number;
  completed: boolean;
}

const TrainingScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mode } = useParams<{ mode: TrainingType }>();
  const { settings } = useSettings();
  const { players, currentPlayer, setCurrentPlayer, updatePlayerHeatmap } = usePlayer();
  const { storage } = useTenant();
  const { checkTrainingAchievements, checkCalendarAchievements } = useGameAchievements();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(currentPlayer?.id || null);
  const [currentThrow, setCurrentThrow] = useState<Dart[]>([]);
  const [trainingState, setTrainingState] = useState<TrainingState>({
    currentTarget: 1,
    currentTargetMultiplier: 2, // for doubles
    score: 0,
    attempts: 0,
    hits: 0,
    round: 1,
    totalRounds: 20,
    completed: false,
  });

  // Training Session Tracking
  const sessionRef = useRef<TrainingSession | null>(null);
  const sessionStartTimeRef = useRef<Date | null>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    audioSystem.setEnabled(settings.soundVolume > 0);
    audioSystem.setVolume(settings.soundVolume);
  }, [settings.soundVolume]);

  useEffect(() => {
    // Initialize training based on mode
    initializeTraining();
    initializeSession();
  }, [mode]);

  useEffect(() => {
    // When no currentPlayer exists at mount, the [mode] effect ran and bailed
    // (initializeSession returns early). Once the user picks a player on the
    // in-screen selection view, (re)initialize the session — otherwise
    // sessionRef stays null and the entire session (results, heatmap, training
    // achievements) is silently never saved.
    if (currentPlayer && mode && !sessionRef.current) {
      initializeSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, mode]);

  const initializeSession = () => {
    if (!currentPlayer || !mode) return;

    const session: TrainingSession = {
      id: uuidv4(),
      type: mode,
      playerId: currentPlayer.id,
      results: [],
      settings: {},
      startedAt: new Date(),
      totalDarts: 0,
      totalHits: 0,
      totalAttempts: 0,
      hitRate: 0,
      averageScore: 0,
      highestScore: 0,
    };

    sessionRef.current = session;
    sessionStartTimeRef.current = new Date();
  };

  // Stable identity: it only reads refs. Recreated every render, it sat in
  // handleConfirmThrow's deps and restarted the auto-confirm timer each render.
  const saveSession = React.useCallback(async () => {
    if (!sessionRef.current) return;

    const session = sessionRef.current;
    
    // Calculate final stats
    const duration = sessionStartTimeRef.current 
      ? Math.floor((new Date().getTime() - sessionStartTimeRef.current.getTime()) / 1000)
      : 0;

    session.completedAt = new Date();
    session.duration = duration;
    session.hitRate = session.totalAttempts && session.totalAttempts > 0 
      ? (session.totalHits! / session.totalAttempts) * 100 
      : 0;

    try {
      // Get existing sessions from API (Database-First!)
      const existingSessions = await api.training.getAll();
      
      // Check if this is a personal best for this training mode
      const previousBest = existingSessions
        .filter((s: TrainingSession) => s.type === session.type && s.playerId === session.playerId)
        .sort((a: TrainingSession, b: TrainingSession) => (b.score || 0) - (a.score || 0))[0];
      
      if (!previousBest || (session.score && session.score > (previousBest.score || 0))) {
        session.personalBest = true;
      }

      // Save session to API
      await api.training.create(session);
      console.log('✅ Training session saved to API');
    } catch (error) {
      console.error('❌ Failed to save training session:', error);
    }

    sessionRef.current = null;
  }, []);

  const initializeTraining = () => {
    switch (mode) {
      case 'doubles':
        setTrainingState({
          currentTarget: 1,
          currentTargetMultiplier: 2,
          score: 0,
          attempts: 0,
          hits: 0,
          round: 1,
          totalRounds: 20,
          completed: false,
        });
        break;
      case 'triples':
        setTrainingState({
          currentTarget: 20,
          currentTargetMultiplier: 3,
          score: 0,
          attempts: 0,
          hits: 0,
          round: 1,
          totalRounds: 20,
          completed: false,
        });
        break;
      case 'around-the-clock':
        setTrainingState({
          currentTarget: 1,
          currentTargetMultiplier: 1,
          score: 0,
          attempts: 0,
          hits: 0,
          round: 1,
          totalRounds: 20,
          completed: false,
        });
        break;
      case 'checkout-121':
        setTrainingState({
          currentTarget: 121,
          score: 121,
          attempts: 0,
          hits: 0,
          round: 1,
          totalRounds: 10,
          completed: false,
        });
        break;
      case 'bobs-27':
        setTrainingState({
          currentTarget: 1,
          score: 27,
          attempts: 0,
          hits: 0,
          round: 1,
          totalRounds: BOBS_27_ROUNDS,
          completed: false,
        });
        break;
      case 'score-training':
        setTrainingState({
          currentTarget: 60,
          score: 0,
          attempts: 0,
          hits: 0,
          round: 1,
          totalRounds: 20,
          completed: false,
        });
        break;
    }
  };

  const getTrainingTitle = () => {
    switch (mode) {
      case 'doubles': return t('training_screen.title_doubles');
      case 'triples': return t('training_screen.title_triples');
      case 'around-the-clock': return t('training_screen.title_atc');
      case 'checkout-121': return t('training_screen.title_checkout');
      case 'bobs-27': return t('training_screen.title_bobs27');
      case 'score-training': return t('training_screen.title_score');
      default: return t('training_screen.title_default');
    }
  };

  const getTrainingDescription = () => {
    switch (mode) {
      case 'doubles':
        return t('training_screen.desc_doubles', { target: trainingState.currentTarget, done: trainingState.currentTarget - 1, total: 20 });
      case 'triples':
        return t('training_screen.desc_triples', { target: trainingState.currentTarget, done: 20 - trainingState.currentTarget, total: 20 });
      case 'around-the-clock':
        return t('training_screen.desc_atc', { target: trainingState.currentTarget, done: trainingState.currentTarget - 1, total: 20 });
      case 'checkout-121':
        return t('training_screen.desc_checkout', { remaining: trainingState.score });
      case 'bobs-27':
        return t('training_screen.desc_bobs27', { score: trainingState.score, target: trainingState.currentTarget === BOBS_27_BULL ? 'Bull' : `D${trainingState.currentTarget}` });
      case 'score-training':
        return t('training_screen.desc_score', { target: trainingState.currentTarget });
      default:
        return '';
    }
  };

  const getProgressInfo = () => {
    switch (mode) {
      case 'doubles':
      case 'triples':
      case 'around-the-clock':
        return t('training_screen.attempt_of', { current: trainingState.attempts, total: trainingState.totalRounds });
      case 'bobs-27':
      case 'score-training':
        return t('training_screen.round_of', { current: trainingState.round, total: trainingState.totalRounds });
      case 'checkout-121':
        return t('training_screen.attempt_of', { current: trainingState.attempts, total: trainingState.totalRounds });
      default:
        return t('training_screen.round_of', { current: trainingState.round, total: trainingState.totalRounds });
    }
  };

  // Keep the screen on while training.
  useWakeLock(!trainingState.completed);

  const handleDartHit = (dart: Dart) => {
    if (trainingState.completed || currentThrow.length >= 3) return;
    haptic('dart', settings.vibrationEnabled);

    setCurrentThrow(prev => [...prev, dart]);
    audioSystem.playSound('/sounds/OMNI/pop.mp3');
  };

  // Define handleConfirmThrow with useCallback BEFORE useEffect that uses it
  const handleConfirmThrow = React.useCallback(() => {
    if (currentThrow.length === 0) return;

    const throwScore = currentThrow.reduce((sum, dart) => sum + dart.score, 0);
    let isHit = false;
    let clockCompleted = false; // around the clock: went all the way to 20
    let newState = { ...trainingState };

    // Increment attempts for all modes
    newState.attempts++;

    switch (mode) {
      case 'doubles': {
        const step = advanceThroughSequence(currentThrow, trainingState.currentTarget, { multiplier: 2, last: 20, step: 1 });
        isHit = step.hits > 0;
        if (isHit) {
          newState.hits++;
          newState.score += step.points;
          newState.currentTarget = step.target;
          audioSystem.announceScore(step.points);
        }
        if (step.completed) {
          newState.completed = true;
          clockCompleted = true;
          audioSystem.playSound('/sounds/effects/get_ready.mp3', true);
        } else if (newState.attempts >= newState.totalRounds) {
          newState.completed = true;
        }
        break;
      }
      case 'triples': {
        const step = advanceThroughSequence(currentThrow, trainingState.currentTarget, { multiplier: 3, last: 1, step: -1 });
        isHit = step.hits > 0;
        if (isHit) {
          newState.hits++;
          newState.score += step.points;
          newState.currentTarget = step.target;
          audioSystem.announceScore(step.points);
        }
        if (step.completed) {
          newState.completed = true;
          audioSystem.playSound('/sounds/effects/get_ready.mp3', true);
        } else if (newState.attempts >= newState.totalRounds) {
          newState.completed = true;
        }
        break;
      }
      case 'around-the-clock': {
        const step = advanceThroughSequence(currentThrow, trainingState.currentTarget, { last: 20, step: 1 });
        isHit = step.hits > 0;
        if (isHit) {
          newState.hits++;
          newState.score += step.points;
          newState.currentTarget = step.target;
          audioSystem.announceScore(step.points);
        }
        if (step.completed) {
          newState.completed = true;
          audioSystem.playSound('/sounds/effects/get_ready.mp3', true);
        } else if (newState.attempts >= newState.totalRounds) {
          newState.completed = true;
        }
        break;
      }
      case 'checkout-121': {
        // Checkout practice - need to hit exactly the remaining score
        const lastDart = currentThrow[currentThrow.length - 1];
        
        if (throwScore === trainingState.score && lastDart.multiplier === 2) {
          // Successful checkout!
          isHit = true;
          newState.hits++;
          newState.score = 0;
          audioSystem.announceCheckout(trainingState.score, 'match');
          newState.completed = true;
        } else if (throwScore < trainingState.score) {
          // Valid score, reduce remaining
          newState.score -= throwScore;
          audioSystem.announceScore(throwScore);
        } else {
          // Bust!
          audioSystem.announceBust();
        }
        
        // Check if max attempts reached without completing
        if (newState.attempts >= newState.totalRounds && !newState.completed) {
          newState.completed = true;
        }
        break;
      }

      case 'bobs-27': {
        const round = bobs27Round(trainingState.score, trainingState.currentTarget, currentThrow);
        isHit = round.hits > 0;
        if (isHit) {
          newState.hits++;
          audioSystem.playSound('/sounds/OMNI/pop-success.mp3');
        } else {
          audioSystem.playSound('/sounds/caller/0.mp3');
        }
        newState.score = Math.max(0, round.score);
        newState.currentTarget = round.nextTarget;
        newState.round++;
        if (round.completed) {
          newState.completed = true;
          audioSystem.playSound(round.busted ? '/sounds/OMNI/woosh.mp3' : '/sounds/effects/get_ready.mp3', !round.busted);
        }
        break;
      }
      case 'score-training': {
        // Score training: try to score 60+ per throw
        isHit = throwScore >= trainingState.currentTarget;
        
        if (isHit) {
          newState.hits++;
          audioSystem.playSound('/sounds/OMNI/pop-success.mp3');
        }
        
        newState.score += throwScore;
        audioSystem.announceScore(throwScore);
        newState.round++;
        
        // Complete after totalRounds throws
        if (newState.round > newState.totalRounds) {
          newState.completed = true;
          audioSystem.playSound('/sounds/effects/get_ready.mp3', true);
        }
        break;
      }
    }

    // Update session stats
    if (sessionRef.current && currentPlayer) {
      const session = sessionRef.current;
      
      // Add result
      const result: TrainingResult = {
        targetSegment: trainingState.currentTarget,
        targetMultiplier: trainingState.currentTargetMultiplier,
        dartsThrown: currentThrow,
        hit: isHit,
        timestamp: new Date(),
        score: throwScore,
      };
      session.results.push(result);
      
      // Update stats
      session.totalDarts = (session.totalDarts || 0) + currentThrow.length;
      session.totalHits = newState.hits;
      session.totalAttempts = newState.attempts;
      session.score = newState.score;
      session.averageScore = session.totalAttempts > 0 
        ? session.results.reduce((sum, r) => sum + (r.score || 0), 0) / session.totalAttempts
        : 0;
      session.highestScore = Math.max(session.highestScore || 0, throwScore);
      
      // Update heatmap
      updatePlayerHeatmap(currentPlayer.id, currentThrow);
      
      // Save session if completed (non-blocking)
      if (newState.completed) {
        saveSession().catch(err => console.error('Failed to save session:', err));

        // Check training achievements
        if (currentPlayer && mode) {
          checkTrainingAchievements(currentPlayer.id, {
            mode,
            completed: true,
            hitRate: newState.attempts > 0 ? (newState.hits / newState.attempts) * 100 : 0,
            score: newState.score,
            averageScore: sessionRef.current?.averageScore,
            highestScore: sessionRef.current?.highestScore,
            totalDarts: sessionRef.current?.totalDarts,
            totalHits: newState.hits,
            totalAttempts: newState.attempts,
            allNumbersHit: clockCompleted,
            duration: sessionStartTimeRef.current
              ? Math.floor((new Date().getTime() - sessionStartTimeRef.current.getTime()) / 1000)
              : undefined,
          });

          // Check calendar achievements (async, non-blocking)
          checkCalendarAchievements(currentPlayer.id);
        }
      }
    }

    setTrainingState(newState);
    setCurrentThrow([]);
  }, [currentThrow, trainingState, mode, sessionRef, currentPlayer, updatePlayerHeatmap, saveSession]);

  // Auto-confirm after 3rd dart in training mode
  useEffect(() => {
    if (currentThrow.length === 3 && !trainingState.completed) {
      const timer = setTimeout(() => {
        handleConfirmThrow();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentThrow.length, trainingState.completed, handleConfirmThrow]);

  const handleClearThrow = () => {
    setCurrentThrow([]);
  };

  const handleRemoveDart = () => {
    setCurrentThrow(prev => prev.slice(0, -1));
  };

  const handleRestart = () => {
    initializeTraining();
    initializeSession();
    setCurrentThrow([]);
  };

  const accuracy = trainingState.attempts > 0 
    ? Math.round((trainingState.hits / trainingState.attempts) * 100) 
    : 0;

  // Player Selection Screen
  if (!selectedPlayerId || !currentPlayer) {
    const realPlayers = players.filter(p => !p.isBot);
    
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <div className="max-w-6xl mx-auto m3-view">
          <BackButton onClick={() => navigate('/training')} />

          <Card variant="elevated" className="p-8">
            <h2 className="m3-headline-small text-on-surface mb-2">
              {t('training_screen.who_trains')}
            </h2>
            <p className="text-on-surface-variant mb-6">
              {t('training_screen.who_trains_hint')}
            </p>

            {realPlayers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-on-surface-variant mb-4">{t('training_screen.no_players')}</p>
                <Button variant="filled" onClick={() => navigate('/players')}>
                  {t('training_screen.create_player')}
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {realPlayers.map((player) => (
                  <Card
                    key={player.id}
                    variant="filled"
                    interactive
                    onClick={() => {
                      setCurrentPlayer(player);
                      setSelectedPlayerId(player.id);
                    }}
                    className="p-4 text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {player.avatar?.startsWith('http') ? (
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-outline-variant group-hover:ring-[var(--m3-primary)]"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold ring-2 ring-outline-variant group-hover:ring-[var(--m3-primary)]">
                          {player.avatar
                            ? <Icon name={iconForEmoji(player.avatar)} size={34} />
                            : <span className="m3-headline-small">{player.name.charAt(0).toUpperCase()}</span>}
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="m3-title-large text-on-surface group-hover:text-primary transition-colors">
                          {player.name}
                        </h3>
                        <p className="m3-body-medium text-on-surface-variant">
                          {t('training_screen.player_average', { value: player.stats?.averageOverall?.toFixed(1) || '0.0' })}
                        </p>
                      </div>
                      <ArrowRight className="text-on-surface-variant group-hover:text-primary transition-colors" size={24} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-6xl mx-auto m3-view">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <BackButton onClick={() => navigate('/training')} inline />
          <h1 className="m3-headline-small text-on-surface">{getTrainingTitle()}</h1>
          <Button variant="filled" onClick={handleRestart}>
            {t('training_screen.restart')}
          </Button>
        </div>

        {/* Training Info */}
        <Card variant="elevated" className="p-4 mb-4">
          <div className="flex items-center justify-between text-on-surface">
            <div className="flex-1">
              <p className="m3-title-large">{getTrainingDescription()}</p>
              <p className="m3-body-medium text-on-surface-variant">
                {getProgressInfo()}
              </p>
            </div>
            <div className="text-right">
              <AnimatedNumber
                value={trainingState.score}
                className="block m3-headline-small m3-emphasized text-success"
              />
              <p className="m3-body-medium text-on-surface-variant">{t('training_screen.points')}</p>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 m3-stagger-fast">
          <Card variant="elevated" className="p-2 sm:p-4 text-center">
            <AnimatedNumber
              value={trainingState.attempts}
              className="block m3-headline-small m3-emphasized text-on-surface"
            />
            <p className="m3-body-small sm:text-sm text-on-surface-variant">{t('training_screen.attempts')}</p>
          </Card>
          <Card variant="elevated" className="p-2 sm:p-4 text-center">
            <AnimatedNumber
              value={trainingState.hits}
              className="block m3-headline-small m3-emphasized text-success"
            />
            <p className="m3-body-small sm:text-sm text-on-surface-variant">{t('training.hits')}</p>
          </Card>
          <Card variant="elevated" className="p-2 sm:p-4 text-center">
            <p className="m3-headline-small m3-emphasized text-primary">
              <AnimatedNumber value={accuracy} />%
            </p>
            <p className="m3-body-small sm:text-sm text-on-surface-variant">{t('training.accuracy')}</p>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Dartboard */}
          <Card variant="elevated" className="p-6 space-y-4">
            <Dartboard
              onDartHit={handleDartHit}
              interactive={!trainingState.completed}
            />
            {/* Miss Button */}
            <Button
              variant="outlined"
              fullWidth
              icon={<X size={20} />}
              onClick={() => handleDartHit({ segment: 0, multiplier: 0, score: 0 })}
              disabled={currentThrow.length >= 3 || trainingState.completed}
            >
              {t('training_screen.miss_no_score')}
            </Button>
          </Card>

          {/* Controls */}
          <div className="space-y-4">
            {/* Current Throw */}
            <Card variant="elevated" className="p-6">
              <h3 className="m3-title-medium text-on-surface mb-4">{t('training_screen.current_visit')}</h3>
              <div className="flex gap-2 mb-4">
                {currentThrow.map((dart, index) => (
                  <div
                    key={index}
                    className="flex-1 h-16 bg-primary text-on-primary rounded-m3-md flex items-center justify-center m3-title-large m3-emphasized shadow-m3-1"
                  >
                    {dart.score}
                  </div>
                ))}
                {[...Array(3 - currentThrow.length)].map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="flex-1 h-16 bg-surface-container rounded-m3-md border-2 border-dashed border-outline-variant"
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="success"
                  fullWidth
                  icon={<Check size={20} />}
                  onClick={handleConfirmThrow}
                  disabled={currentThrow.length === 0 || trainingState.completed}
                >
                  {t('common.confirm')}
                </Button>
                <Button
                  variant="tonal"
                  onClick={handleRemoveDart}
                  disabled={currentThrow.length === 0 || trainingState.completed}
                >
                  {t('common.back')}
                </Button>
                <Button
                  variant="danger"
                  icon={<X size={20} />}
                  onClick={handleClearThrow}
                  disabled={currentThrow.length === 0 || trainingState.completed}
                />
              </div>
            </Card>

            {/* Completion Message */}
            {trainingState.completed && (
              <Card variant="elevated" className="p-6 border-2 border-[var(--m3-primary)]">
                <h3 className="m3-headline-small text-on-surface mb-4 text-center">
                  {t('training_screen.completed')}
                </h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center bg-surface-container-high rounded-m3-md p-3">
                    <p className="m3-headline-small text-on-surface">{trainingState.score}</p>
                    <p className="m3-body-small text-on-surface-variant">{t('training_screen.final_score')}</p>
                  </div>
                  <div className="text-center bg-surface-container-high rounded-m3-md p-3">
                    <p className="m3-headline-small text-success">{trainingState.hits}</p>
                    <p className="m3-body-small text-on-surface-variant">{t('training.hits')}</p>
                  </div>
                  <div className="text-center bg-surface-container-high rounded-m3-md p-3">
                    <p className="m3-headline-small text-primary">{accuracy}%</p>
                    <p className="m3-body-small text-on-surface-variant">{t('training.accuracy')}</p>
                  </div>
                </div>
                <div className="m3-body-medium text-on-surface-variant mb-4 text-center">
                  {t('training_screen.hits_in_attempts', { hits: trainingState.hits, count: trainingState.attempts })}
                  {mode === 'doubles' && trainingState.currentTarget === 20 && trainingState.hits === 20 && (
                    <p className="text-success font-bold mt-2">{t('training_screen.perfect_doubles')}</p>
                  )}
                  {mode === 'triples' && trainingState.currentTarget === 1 && trainingState.hits === 20 && (
                    <p className="text-success font-bold mt-2">{t('training_screen.perfect_triples')}</p>
                  )}
                  {mode === 'around-the-clock' && trainingState.currentTarget === 20 && trainingState.hits === 20 && (
                    <p className="text-success font-bold mt-2">{t('training_screen.perfect_atc')}</p>
                  )}
                  {mode === 'checkout-121' && trainingState.score === 0 && (
                    <p className="text-success font-bold mt-2">{t('training_screen.checkout_success')}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="success" fullWidth onClick={handleRestart}>
                    {t('training_screen.try_again')}
                  </Button>
                  <Button variant="tonal" fullWidth onClick={() => navigate('/training')}>
                    {t('common.back')}
                  </Button>
                </div>
              </Card>
            )}

            {/* Instructions */}
            <Card variant="elevated" className="p-6">
              <h3 className="m3-title-medium text-on-surface mb-2">{t('training_screen.instructions')}</h3>
              <div className="m3-body-medium text-on-surface-variant space-y-1">
                {mode === 'doubles' && (
                  <>
                    <p>• {t('training_screen.inst_doubles_1')}</p>
                    <p>• {t('training_screen.inst_doubles_2')}</p>
                    <p>• {t('training_screen.inst_doubles_3')}</p>
                  </>
                )}
                {mode === 'triples' && (
                  <>
                    <p>• {t('training_screen.inst_triples_1')}</p>
                    <p>• {t('training_screen.inst_triples_2')}</p>
                    <p>• {t('training_screen.inst_triples_3')}</p>
                  </>
                )}
                {mode === 'around-the-clock' && (
                  <>
                    <p>• {t('training_screen.inst_atc_1')}</p>
                    <p>• {t('training_screen.inst_atc_2')}</p>
                    <p>• {t('training_screen.inst_atc_3')}</p>
                  </>
                )}
                {mode === 'checkout-121' && (
                  <>
                    <p>• {t('training_screen.inst_checkout_1')}</p>
                    <p>• {t('training_screen.inst_checkout_2')}</p>
                    <p>• {t('training_screen.inst_checkout_3')}</p>
                  </>
                )}
                {mode === 'bobs-27' && (
                  <>
                    <p>• {t('training_screen.inst_bobs27_1')}</p>
                    <p>• {t('training_screen.inst_bobs27_2')}</p>
                    <p>• {t('training_screen.inst_bobs27_3')}</p>
                    <p>• {t('training_screen.inst_bobs27_4')}</p>
                    <p>• {t('training_screen.inst_bobs27_5')}</p>
                  </>
                )}
                {mode === 'score-training' && (
                  <>
                    <p>• {t('training_screen.inst_score_1')}</p>
                    <p>• {t('training_screen.inst_score_2')}</p>
                    <p>• {t('training_screen.inst_score_3')}</p>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingScreen;
