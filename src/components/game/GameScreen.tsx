import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Pause, Play, X } from 'lucide-react';
import Confetti from 'react-confetti';
import { useGame } from '../../context/GameContext';
import { usePlayer } from '../../context/PlayerContext';
import { useSettings } from '../../context/SettingsContext';
import { useTenant } from '../../context/TenantContext';
import { useGameAchievements } from '../../hooks/useGameAchievements';
import { useAchievementHints } from '../../hooks/useAchievementHints';
import Dartboard from '../dartboard/Dartboard';
import ScoreInput from './ScoreInput';
import PlayerScore from './PlayerScore';
import CheckoutSuggestion from '../dartboard/CheckoutSuggestion';
import AchievementHint from '../achievements/AchievementHint';
import { Dart, Player, GameType, MatchSettings } from '../../types/index';
import { calculateThrowScore } from '../../utils/scoring';
import { PersonalBests, createEmptyPersonalBests, updatePersonalBests } from '../../types/personalBests';
import audioSystem from '../../utils/audio';

const GameScreen: React.FC = () => {
  const navigate = useNavigate();
  const { state, dispatch } = useGame();
  const { players, addPlayer, updatePlayerHeatmap } = usePlayer();
  const { settings } = useSettings();
  const { storage } = useTenant();
  const { checkMatchAchievements, checkLegAchievements } = useGameAchievements();
  
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

  // Track processed matches to avoid duplicate achievement checks
  const [processedMatchIds, setProcessedMatchIds] = useState<Set<string>>(new Set());
  
  // Confirmation dialogs
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

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

        // Save updated personal bests
        storage.set('personalBests', personalBestsData);
        console.log('✅ Personal Bests updated for all players');
      }
    }
  }, [state.currentMatch?.status, state.currentMatch?.winner, state.currentMatch?.id, checkMatchAchievements, checkLegAchievements, processedMatchIds, storage]);
  const [showSetup, setShowSetup] = useState(!state.currentMatch);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [showPlayerNameInput, setShowPlayerNameInput] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAvatar, setNewPlayerAvatar] = useState('🎯');
  
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
  
  useEffect(() => {
    if (!state.currentMatch && showSetup === false) {
      setShowSetup(true);
    }
  }, [state.currentMatch]);
  
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
    
    dispatch({
      type: 'START_MATCH',
      payload: {
        players: finalPlayers,
        settings: gameSettings,
        gameType: 'x01' as GameType,
      },
    });
    setShowSetup(false);
  };
  
  const handleDartHit = (dart: Dart) => {
    dispatch({ type: 'ADD_DART', payload: dart });
    // Play a subtle click sound for dart hit feedback
    audioSystem.playSound('/sounds/OMNI/pop.mp3', false);
  };
  
  // Auto-confirm after 3rd dart
  useEffect(() => {
    if (state.currentThrow.length === 3) {
      // Auto-confirm after a short delay to show the 3rd dart
      const timer = setTimeout(() => {
        handleConfirmThrow();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [state.currentThrow.length]);
  
  const handleConfirmThrow = () => {
    const currentScore = calculateThrowScore(state.currentThrow);
    
    // Check if this will be a checkout or bust BEFORE confirming
    // so we can skip the score announcement if it's going to be a special sound
    const currentPlayer = state.currentMatch?.players[state.currentPlayerIndex];
    const currentLeg = state.currentMatch?.legs[state.currentMatch.currentLegIndex];
    
    if (currentPlayer && currentLeg) {
      const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const startScore = state.currentMatch?.settings.startScore || 501;
      const remaining = startScore - totalScored;
      const newRemaining = remaining - currentScore;
      
      // Don't announce score if it's a checkout (will be announced by GameContext)
      const isCheckout = newRemaining === 0 && state.currentThrow.length > 0;
      
      // Don't announce score if it's a bust (will be announced by GameContext)
      const requiresDouble = state.currentMatch?.settings.doubleOut || false;
      const lastDart = state.currentThrow[state.currentThrow.length - 1];
      const willBust = newRemaining < 0 || 
                       newRemaining === 1 || 
                       (newRemaining === 0 && requiresDouble && lastDart?.multiplier !== 2);
      
      // Only announce score if not checkout or bust
      if (!isCheckout && !willBust) {
        if (currentScore === 180) {
          setShowConfetti(true);
          audioSystem.announceScore(180);
          setTimeout(() => setShowConfetti(false), 3000);
        } else {
          // Always announce the score (0-180)
          audioSystem.announceScore(currentScore);
        }
      } else if (currentScore === 180) {
        // Still show confetti for 180s even if it's a checkout
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      // Update heatmap for this player with the current darts
      if (state.currentThrow.length > 0) {
        updatePlayerHeatmap(currentPlayer.playerId, state.currentThrow);
      }
    } else {
      // Fallback: just announce the score
      if (currentScore === 180) {
        setShowConfetti(true);
        audioSystem.announceScore(180);
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        audioSystem.announceScore(currentScore);
      }
    }
    
    dispatch({ type: 'CONFIRM_THROW' });
    
    // Announce remaining score after the throw (with delay for score announcement)
    if (currentPlayer && currentLeg) {
      const playerThrows = currentLeg.throws.filter(t => t.playerId === currentPlayer.playerId);
      const totalScored = playerThrows.reduce((sum, t) => sum + t.score, 0);
      const startScore = state.currentMatch?.settings.startScore || 501;
      const remaining = startScore - totalScored;
      const newRemaining = remaining - currentScore;
      
      // Only announce if in checkout range and not bust/checkout
      if (newRemaining > 0 && newRemaining <= 170) {
        setTimeout(() => {
          audioSystem.announceRemaining(newRemaining, true);
        }, 1500); // Delay to let score announcement finish
      }
    }
    
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
  
  const handleBackToMenu = () => {
    if (state.currentMatch?.status === 'in-progress') {
      setShowBackConfirm(true);
    } else {
      navigate('/');
    }
  };

  const confirmBackToMenu = () => {
    dispatch({ type: 'PAUSE_MATCH' });
    setShowBackConfirm(false);
    navigate('/');
  };

  const handleEndMatch = () => {
    setShowEndConfirm(true);
  };
  
  const confirmEndMatch = () => {
    dispatch({ type: 'END_MATCH' });
    setShowEndConfirm(false);
    navigate('/');
  };
  
  if (showSetup) {
    return (
      <div className="min-h-screen p-4 md:p-8 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            Back to Menu
          </button>
          
          <div className="glass-card rounded-xl shadow-lg p-6 md:p-8">
            <h2 className="text-3xl font-bold mb-6 text-white">Game Setup</h2>
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Select Players</h3>
                {getLastPlayers().length > 0 && (
                  <button
                    onClick={loadLastPlayers}
                    className="px-3 py-1.5 text-sm bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-lg border border-primary-500/30 transition-all font-medium flex items-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Letzte Spieler
                  </button>
                )}
              </div>
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
                        ? 'border-success-500 bg-success-500/20 shadow-lg'
                        : 'border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">{player.avatar}</div>
                    <div className="text-sm font-medium text-white">{player.name}</div>
                  </button>
                ))}
                {!showPlayerNameInput ? (
                  <button
                    onClick={() => setShowPlayerNameInput(true)}
                    className="p-3 rounded-lg border-2 border-dashed border-dark-700 hover:border-dark-600 transition-all"
                  >
                    <div className="text-2xl mb-1">➕</div>
                    <div className="text-sm font-medium text-white">Add Player</div>
                  </button>
                ) : (
                  <div className="p-3 rounded-lg border-2 border-success-500 bg-success-500/20">
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        {['🎯', '🏆', '👑', '🔥', '⭐', '💪', '🎪', '🦅'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => setNewPlayerAvatar(emoji)}
                            className={`text-2xl p-1 rounded ${newPlayerAvatar === emoji ? 'bg-success-500 text-white' : 'hover:bg-dark-700'}`}
                          >
                            {emoji}
                          </button>
                        ))}
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
                              setNewPlayerAvatar('🎯');
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
                                setNewPlayerAvatar('🎯');
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
                            setNewPlayerAvatar('🎯');
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
                <label className="block text-sm font-medium mb-2 text-white">
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
            Zurück zum Menü
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={handleUndoThrow}
              className="glass-card p-3 rounded-lg hover:glass-card-hover text-white transition-all"
              title="Letzten Wurf rückgängig machen"
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
              className="glass-card p-3 rounded-lg hover:glass-card-hover text-white transition-all"
              title={state.currentMatch?.status === 'paused' ? 'Fortsetzen' : 'Pausieren'}
            >
              {state.currentMatch?.status === 'paused' ? <Play size={20} /> : <Pause size={20} />}
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
              <div className="w-full max-w-sm space-y-3">
                <Dartboard
                  onDartHit={handleDartHit}
                  highlightedSegments={state.checkoutSuggestion || []}
                  size={320}
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

      {/* Back to Menu Confirmation Dialog */}
      {showBackConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">⏸️ Match pausieren?</h3>
            <p className="text-gray-300 mb-6">
              Das Match wird gespeichert und kann später fortgesetzt werden.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBackConfirm(false)}
                className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl font-semibold transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={confirmBackToMenu}
                className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-semibold transition-all"
              >
                Pausieren
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
              Das Match wird als abgebrochen markiert und kann nicht fortgesetzt werden.
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
    </div>
  );
};

export default GameScreen;