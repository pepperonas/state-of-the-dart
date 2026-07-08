import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, RotateCcw, Trophy, Target, X, Check } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { usePlayer } from '../../context/PlayerContext';
import { Player, CricketState, Dart } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import { celebrate as confetti } from '../../utils/celebration';
import { saveGameState, loadGameState, clearGameState, STORAGE_KEYS, CricketSavedState } from '../../utils/gameStorage';
import { SpinnerWheel } from './SpinnerWheel';
import { BackButton, Button, IconButton, Card, Dialog } from '../common';

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
  const restoredRef = useRef(false);

  // Spinner wheel for player order
  const [showSpinner, setShowSpinner] = useState(false);
  const [pendingGamePlayers, setPendingGamePlayers] = useState<Player[] | null>(null);

  // Back confirmation dialog
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // Restore saved game on mount
  useEffect(() => {
    if (restoredRef.current) return;
    const saved = loadGameState<CricketSavedState>(STORAGE_KEYS.CRICKET);
    if (!saved) return;
    const validPlayers = saved.selectedPlayers.filter(sp =>
      players.some(p => p.id === sp.id)
    );
    if (validPlayers.length < 2) {
      clearGameState(STORAGE_KEYS.CRICKET);
      return;
    }
    const restoredPlayers = saved.selectedPlayers
      .map(sp => players.find(p => p.id === sp.id))
      .filter((p): p is Player => !!p);
    if (restoredPlayers.length < 2) {
      clearGameState(STORAGE_KEYS.CRICKET);
      return;
    }
    restoredRef.current = true;
    setSelectedPlayers(restoredPlayers);
    // Dispatch START_MATCH to initialize GameContext
    dispatch({
      type: 'START_MATCH',
      payload: {
        players: restoredPlayers,
        settings: {
          cricketMode: 'standard',
          cricketNumbers: CRICKET_NUMBERS,
        },
        gameType: 'cricket',
      },
    });
    setCricketState(saved.cricketState);
    setShowSetup(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize cricket state when match starts (only if not restored)
  useEffect(() => {
    if (restoredRef.current) return;
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

  // Save game state on changes
  useEffect(() => {
    if (showSetup || showWinner || selectedPlayers.length === 0 || Object.keys(cricketState).length === 0) return;
    saveGameState(STORAGE_KEYS.CRICKET, {
      gameType: 'cricket',
      selectedPlayers: selectedPlayers.map(p => ({ id: p.id, name: p.name, avatar: p.avatar })),
      cricketState,
      currentPlayerIndex: state.currentPlayerIndex,
      savedAt: Date.now(),
    });
  }, [showSetup, showWinner, selectedPlayers, cricketState, state.currentPlayerIndex]);

  const currentPlayer = useMemo(() => {
    if (!state.currentMatch) return null;
    return state.currentMatch.players[state.currentPlayerIndex];
  }, [state.currentMatch, state.currentPlayerIndex]);

  const handleStartGame = () => {
    if (selectedPlayers.length < 2) return;

    clearGameState(STORAGE_KEYS.CRICKET);

    // Show spinner to determine starting player
    setPendingGamePlayers([...selectedPlayers]);
    setShowSpinner(true);
  };

  const initGame = (orderedPlayers: Player[]) => {
    setSelectedPlayers(orderedPlayers);

    dispatch({
      type: 'START_MATCH',
      payload: {
        players: orderedPlayers,
        settings: {
          cricketMode: 'standard',
          cricketNumbers: CRICKET_NUMBERS,
        },
        gameType: 'cricket',
      },
    });

    const initialState: CricketState = {};
    orderedPlayers.forEach(player => {
      initialState[player.id] = {
        '20': 0, '19': 0, '18': 0, '17': 0, '16': 0, '15': 0, '25': 0,
        points: 0
      };
    });
    setCricketState(initialState);
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
        clearGameState(STORAGE_KEYS.CRICKET);
        setShowWinner(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        dispatch({ type: 'END_MATCH' });
        // Do NOT advance to the next player: the winner dialog renders
        // `currentPlayer?.name`, and NEXT_PLAYER would increment the index to
        // the loser, announcing the wrong champion.
        setCurrentDarts([]);
        return;
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
    if (marks === 0) return 'text-on-surface-variant/40';
    if (marks < 3) return 'text-yellow-400';
    return 'text-success-400';
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
    clearGameState(STORAGE_KEYS.CRICKET);
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

          <Card variant="elevated" className="rounded-m3-lg p-6">
            <h1 className="m3-headline-medium text-on-surface mb-6 flex items-center gap-3">
              <Target style={{ color: 'var(--m3-primary)' }} />
              Cricket
            </h1>

            <div className="mb-6">
              <h2 className="m3-title-medium text-on-surface mb-3">{t('game.select_players')}</h2>
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
                    className={`p-3 rounded-m3-md transition-all ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'bg-surface-container-high ring-2 ring-[var(--m3-primary)] shadow-m3-1'
                        : 'bg-surface-container border border-outline-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex justify-center mb-1">
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                    </div>
                    <div className="m3-label-large text-on-surface text-center">{player.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-surface-container rounded-m3-md p-4 mb-6">
              <h3 className="m3-title-small text-on-surface mb-2">🎯 Cricket Regeln:</h3>
              <ul className="text-on-surface-variant text-sm space-y-1">
                <li>• Zahlen 15-20 und Bull müssen 3x getroffen werden</li>
                <li>• Triple = 3 Marks, Double = 2 Marks, Single = 1 Mark</li>
                <li>• Nach dem Schließen: Punkte sammeln (solange Gegner offen)</li>
                <li>• Gewinner: Alle Zahlen geschlossen + meiste Punkte</li>
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
                : 'Cricket starten 🎯'
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
      <Dialog
        open={showWinner && !!currentPlayer}
        onClose={() => {
          setShowWinner(false);
          setShowSetup(true);
          setCricketState({});
        }}
        hideClose
        widthClassName="max-w-md"
      >
        <div className="text-center">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
          <h2 className="m3-headline-small text-on-surface mb-2">
            {currentPlayer?.name} gewinnt!
          </h2>
          <p className="text-on-surface-variant mb-6">
            Cricket Match beendet
          </p>
          <Button
            variant="filled"
            size="lg"
            onClick={() => {
              setShowWinner(false);
              setShowSetup(true);
              setCricketState({});
            }}
          >
            Neues Spiel
          </Button>
        </div>
      </Dialog>

      {/* Back Confirmation Dialog */}
      <Dialog
        open={showBackConfirm}
        onClose={() => setShowBackConfirm(false)}
        title={t('resume.pause_title')}
        widthClassName="max-w-sm"
      >
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
      </Dialog>

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <Button
            variant="tonal"
            size="sm"
            icon={<ArrowLeft size={18} />}
            onClick={handleBack}
          >
            {t('common.back')}
          </Button>
          <h1 className="m3-title-large text-on-surface">🎯 Cricket</h1>
          <div className="w-10" />
        </div>
      </div>

      {/* Scoreboard */}
      <div className="max-w-4xl mx-auto">
        <Card variant="elevated" className="rounded-m3-lg p-4 mb-6">
          {/* Cricket Grid */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left text-on-surface-variant p-2 w-20">Zahl</th>
                  {state.currentMatch?.players.map((player, idx) => (
                    <th
                      key={player.playerId}
                      className={`text-center p-2 ${
                        idx === state.currentPlayerIndex
                          ? 'bg-primary-container rounded-t-m3-md'
                          : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <PlayerAvatar
                          avatar={players.find(p => p.id === player.playerId)?.avatar || ''}
                          name={player.name}
                          size="sm"
                        />
                        <span className="text-on-surface font-medium text-sm mt-1">
                          {player.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CRICKET_NUMBERS.map(num => (
                  <tr key={num} className="border-t border-outline-variant">
                    <td className="text-on-surface font-bold p-3 text-lg">
                      {num === 25 ? 'Bull' : num}
                    </td>
                    {state.currentMatch?.players.map((player, idx) => {
                      const marks = cricketState[player.playerId]?.[num.toString()] || 0;
                      return (
                        <td
                          key={player.playerId}
                          className={`text-center p-3 ${
                            idx === state.currentPlayerIndex
                              ? 'bg-primary-container/40'
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
                <tr className="border-t-2 border-[var(--m3-primary)]">
                  <td className="font-bold p-3" style={{ color: 'var(--m3-primary)' }}>Punkte</td>
                  {state.currentMatch?.players.map((player, idx) => (
                    <td
                      key={player.playerId}
                      className={`text-center p-3 ${
                        idx === state.currentPlayerIndex
                          ? 'bg-primary-container/40'
                          : ''
                      }`}
                    >
                      <span className="text-2xl font-bold text-on-surface">
                        {cricketState[player.playerId]?.points || 0}
                      </span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Current Throw Display */}
        <Card variant="elevated" className="rounded-m3-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="m3-title-small text-on-surface">
              {currentPlayer?.name}'s Wurf ({currentDarts.length}/3)
            </h3>
            <IconButton
              variant="tonal"
              label="Undo"
              onClick={handleUndo}
              disabled={currentDarts.length === 0}
            >
              <RotateCcw size={18} />
            </IconButton>
          </div>

          <div className="flex gap-4 mb-4">
            {[0, 1, 2].map(idx => (
              <div
                key={idx}
                className={`flex-1 h-16 rounded-m3-md flex items-center justify-center text-xl font-bold ${
                  currentDarts[idx]
                    ? 'bg-primary-container text-on-primary-container border-2 border-[var(--m3-primary)]'
                    : 'bg-surface-container text-on-surface-variant/40 border-2 border-dashed border-outline-variant'
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

          <Button
            variant="success"
            size="lg"
            fullWidth
            icon={<Check size={24} />}
            onClick={handleConfirmThrow}
            disabled={currentDarts.length === 0}
          >
            Wurf bestätigen
          </Button>
        </Card>

        {/* Cricket Dartboard Input */}
        <Card variant="elevated" className="rounded-m3-lg p-4">
          <h3 className="m3-title-small text-on-surface mb-4 text-center">Treffer eingeben</h3>

          {/* Quick buttons for cricket numbers */}
          <div className="grid grid-cols-4 gap-3">
            {CRICKET_NUMBERS.map(num => (
              <div key={num} className="space-y-2">
                <div className="text-center text-on-surface-variant text-sm font-medium">
                  {num === 25 ? 'Bull' : num}
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="tonal"
                    size="sm"
                    fullWidth
                    onClick={() => handleDartHit(num, 1)}
                    disabled={currentDarts.length >= 3}
                  >
                    S
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    fullWidth
                    onClick={() => handleDartHit(num, 2)}
                    disabled={currentDarts.length >= 3}
                  >
                    D
                  </Button>
                  {num !== 25 && (
                    <Button
                      variant="danger"
                      size="sm"
                      fullWidth
                      onClick={() => handleDartHit(num, 3)}
                      disabled={currentDarts.length >= 3}
                    >
                      T
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Miss button */}
            <div className="space-y-2">
              <div className="text-center text-on-surface-variant text-sm font-medium">Miss</div>
              <button
                onClick={() => handleDartHit(0, 0 as any)}
                disabled={currentDarts.length >= 3}
                className="w-full py-8 rounded-m3-md bg-surface-container hover:bg-surface-container-high text-on-surface-variant font-medium disabled:opacity-50"
              >
                <X size={24} className="mx-auto" />
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CricketGame;
