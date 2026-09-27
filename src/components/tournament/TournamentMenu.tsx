import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, Calendar, Star, Play, Plus, Minus, Trash2, Settings, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '../../context/PlayerContext';
import { Player, Tournament, TournamentSettings, TournamentParticipant, TournamentMatch } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import { v4 as uuidv4 } from 'uuid';
import { celebrate as confetti } from '../../utils/celebration';
import { Button, Card, TextField, Chip, IconButton, BackButton, LoadingIndicator, ErrorState, useFeedback } from '../common';
import { useTournaments } from '../../hooks/useTournaments';
import { staggerChild } from '../../utils/motion';
import { BYE, advanceWinner, buildKnockoutBracket, fromStoredTournament, isPlayable, knockoutChampion, recordResult, roundRobinChampion, tournamentProgress, type StoredTournament, type TournamentScores } from '../../utils/tournament';

type TournamentType = 'knockout' | 'round-robin';

const TournamentMenu: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players } = usePlayer();
  
  const [showCreate, setShowCreate] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [tournamentType, setTournamentType] = useState<TournamentType>('knockout');
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [legsToWin, setLegsToWin] = useState(3);
  
  // Active tournament state
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matchScores, setMatchScores] = useState<Record<string, { p1: number; p2: number }>>({});

  // Stored in the database since 0.16.0 — a reload used to lose the bracket.
  const { list: savedTournaments, loading: listLoading, error: listError, reload, save, remove } = useTournaments();
  const { notify, confirm } = useFeedback();
  const scoresDirty = useRef(false);

  const persist = useCallback(async (tour: Tournament, scores: TournamentScores) => {
    scoresDirty.current = false;
    if (!(await save(tour, scores))) notify(t('tournament_menu.save_failed'));
  }, [save, notify, t]);

  // Legs entered for a match are saved shortly after the last tap, so a
  // half-played match survives a reload too.
  useEffect(() => {
    if (!activeTournament || !scoresDirty.current) return;
    const timer = setTimeout(() => { void persist(activeTournament, matchScores); }, 600);
    return () => clearTimeout(timer);
  }, [matchScores, activeTournament, persist]);

  const openTournament = (stored: StoredTournament) => {
    const { tournament, scores } = fromStoredTournament(stored);
    scoresDirty.current = false;
    setActiveTournament(tournament);
    setMatchScores(scores);
    setCurrentMatchIndex(0);
  };

  const leaveTournament = () => {
    if (activeTournament && scoresDirty.current) void persist(activeTournament, matchScores);
    setActiveTournament(null);
  };

  const handleDeleteTournament = async (stored: StoredTournament) => {
    const ok = await confirm({
      title: t('tournament_menu.delete_confirm', { name: stored.name }),
      danger: true,
      confirmLabel: t('common.delete'),
    });
    if (ok && !(await remove(stored.id))) notify(t('tournament_menu.delete_failed'));
  };

  const tournamentTypes = [
    {
      id: 'knockout' as TournamentType,
      title: t('tournament_menu.knockout'),
      icon: Trophy,
      description: t('tournament_menu.knockout_desc'),
      minPlayers: 4,
      maxPlayers: 16,
    },
    {
      id: 'round-robin' as TournamentType,
      title: t('tournament_menu.round_robin'),
      icon: Users,
      description: t('tournament_menu.round_robin_desc'),
      minPlayers: 3,
      maxPlayers: 8,
    },
  ];

  const selectedType = tournamentTypes.find(t => t.id === tournamentType);
  const canStart = tournamentName.trim() && 
    selectedPlayers.length >= (selectedType?.minPlayers || 2) &&
    selectedPlayers.length <= (selectedType?.maxPlayers || 16);

  const generateKnockoutBracket = (participants: TournamentParticipant[]): TournamentMatch[] =>
    // Random seeding, then a proper power-of-two bracket with byes.
    buildKnockoutBracket([...participants].sort(() => Math.random() - 0.5).map(p => p.id));

  const generateRoundRobinMatches = (participants: TournamentParticipant[]): TournamentMatch[] => {
    const matches: TournamentMatch[] = [];
    const n = participants.length;
    
    // Generate all pairings
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        matches.push({
          id: uuidv4(),
          round: 1, // All in same "round" for round robin
          participant1Id: participants[i].id,
          participant2Id: participants[j].id,
        });
      }
    }
    
    // Shuffle for variety
    return matches.sort(() => Math.random() - 0.5);
  };

  const handleCreateTournament = () => {
    if (!canStart) return;
    
    const participants: TournamentParticipant[] = selectedPlayers.map((p, idx) => ({
      id: uuidv4(),
      playerId: p.id,
      seed: idx + 1,
      wins: 0,
      losses: 0,
      legsFor: 0,
      legsAgainst: 0,
    }));
    
    const matches = tournamentType === 'knockout' 
      ? generateKnockoutBracket(participants)
      : generateRoundRobinMatches(participants);
    
    const tournament: Tournament = {
      id: uuidv4(),
      name: tournamentName,
      type: tournamentType,
      participants,
      matches,
      settings: {
        gameType: 'x01',
        matchSettings: {
          startScore: 501,
          legsToWin,
          doubleOut: true,
        },
        bestOf: legsToWin * 2 - 1,
      },
      status: 'in-progress',
      currentRound: 1,
      createdAt: new Date(),
      startedAt: new Date(),
    };
    
    setActiveTournament(tournament);
    setCurrentMatchIndex(0);
    setMatchScores({});
    setShowCreate(false);
    void persist(tournament, {});
  };

  const getParticipantName = (participantId: string) => {
    if (!activeTournament) return '';
    if (participantId === BYE) return t('tournament.bye');
    const participant = activeTournament.participants.find(p => p.id === participantId);
    if (!participant) return t('tournament_menu.tbd');
    const player = players.find(p => p.id === participant.playerId);
    return player?.name || t('tournament_menu.unknown');
  };

  const getParticipantPlayer = (participantId: string) => {
    if (!activeTournament) return null;
    const participant = activeTournament.participants.find(p => p.id === participantId);
    if (!participant) return null;
    return players.find(p => p.id === participant.playerId);
  };

  const currentMatch = useMemo(() => {
    if (!activeTournament) return null;
    return activeTournament.matches.filter(isPlayable)[currentMatchIndex] || null;
  }, [activeTournament, currentMatchIndex]);

  // The tournament's own setting — the create-form control stays editable
  // while a tournament runs and must not change its rules midway.
  const tournamentLegsToWin = activeTournament?.settings.matchSettings.legsToWin ?? legsToWin;

  const handleScoreChange = (matchId: string, player: 'p1' | 'p2', delta: number) => {
    scoresDirty.current = true;
    setMatchScores(prev => {
      const current = prev[matchId] || { p1: 0, p2: 0 };
      const newScore = Math.max(0, Math.min(tournamentLegsToWin, current[player] + delta));
      return {
        ...prev,
        [matchId]: { ...current, [player]: newScore }
      };
    });
  };

  const handleConfirmMatch = () => {
    if (!currentMatch || !activeTournament) return;

    const scores = matchScores[currentMatch.id] || { p1: 0, p2: 0 };
    if (scores.p1 !== tournamentLegsToWin && scores.p2 !== tournamentLegsToWin) return;

    const p1Won = scores.p1 === tournamentLegsToWin;
    const winnerId = p1Won ? currentMatch.participant1Id : currentMatch.participant2Id;
    const loserId = p1Won ? currentMatch.participant2Id : currentMatch.participant1Id;
    const winnerLegs = p1Won ? scores.p1 : scores.p2;
    const loserLegs = p1Won ? scores.p2 : scores.p1;

    const updatedMatches = activeTournament.type === 'knockout'
      ? advanceWinner(activeTournament.matches, currentMatch.id, winnerId)
      : activeTournament.matches.map(m => (m.id === currentMatch.id ? { ...m, winner: winnerId, completed: new Date() } : m));
    const updatedParticipants = recordResult(activeTournament.participants, winnerId, loserId, winnerLegs, loserLegs);
    const isComplete = !updatedMatches.some(isPlayable);

    const next: Tournament = {
      ...activeTournament,
      matches: updatedMatches,
      participants: updatedParticipants,
      status: isComplete ? 'completed' : 'in-progress',
      completedAt: isComplete ? new Date() : undefined,
    };
    setActiveTournament(next);
    void persist(next, matchScores);

    if (isComplete) {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }

    setCurrentMatchIndex(0);
  };

  const getTournamentWinner = () => {
    if (!activeTournament || activeTournament.status !== 'completed') return null;
    return activeTournament.type === 'knockout'
      ? knockoutChampion(activeTournament.matches)
      : roundRobinChampion(activeTournament.participants);
  };

  // Tournament in progress view
  if (activeTournament) {
    const winner = getTournamentWinner();
    const winnerPlayer = winner ? getParticipantPlayer(winner) : null;
    
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          <BackButton onClick={leaveTournament} label={t('tournament_menu.to_overview')} />

          <Card variant="elevated" className="p-6 mb-6 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="m3-title-large text-on-surface">{activeTournament.name}</h2>
                <p className="m3-body-medium text-on-surface-variant">
                  {t('tournament_menu.subtitle', {
                    mode: activeTournament.type === 'knockout' ? t('tournament_menu.knockout') : t('tournament_menu.round_robin'),
                    count: tournamentLegsToWin * 2 - 1,
                  })}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-m3-full m3-label-large ${
                activeTournament.status === 'completed'
                  ? 'bg-success-container text-on-success-container'
                  : 'bg-primary-container text-on-primary-container'
              }`}>
                {activeTournament.status === 'completed' ? t('tournament_menu.status_completed') : t('tournament_menu.status_running')}
              </div>
            </div>

            {/* Winner Banner */}
            {activeTournament.status === 'completed' && winnerPlayer && (
              <div className="bg-tertiary-container text-on-tertiary-container rounded-m3-lg p-6 mb-6 border border-outline-variant">
                <div className="flex items-center gap-4">
                  <Trophy className="w-12 h-12 text-tertiary" />
                  <div>
                    <p className="m3-label-large">{t('tournament_menu.champion')}</p>
                    <div className="flex items-center gap-3">
                      <PlayerAvatar avatar={winnerPlayer.avatar} name={winnerPlayer.name} size="lg" />
                      <span className="m3-title-large">{winnerPlayer.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standings */}
            <h3 className="m3-title-medium text-on-surface mb-3">{t('tournament_menu.standings')}</h3>
            <div className="bg-surface-container rounded-m3-md overflow-hidden mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left p-3 m3-label-large text-on-surface-variant">#</th>
                    <th className="text-left p-3 m3-label-large text-on-surface-variant">{t('tournament_menu.player')}</th>
                    <th className="text-center p-3 m3-label-large text-on-surface-variant" title={t('tournament_menu.wins')}>{t('tournament_menu.wins_short')}</th>
                    <th className="text-center p-3 m3-label-large text-on-surface-variant" title={t('tournament_menu.losses')}>{t('tournament_menu.losses_short')}</th>
                    <th className="text-center p-3 m3-label-large text-on-surface-variant">{t('tournament_menu.legs')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...activeTournament.participants]
                    .sort((a, b) => b.wins - a.wins || (b.legsFor - b.legsAgainst) - (a.legsFor - a.legsAgainst))
                    .map((p, idx) => {
                      const player = players.find(pl => pl.id === p.playerId);
                      return (
                        <tr key={p.id} className="border-b border-outline-variant last:border-0">
                          <td className="p-3 text-on-surface font-bold">
                            {idx === 0 ?'': idx === 1 ?'': idx === 2 ?'': idx + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <PlayerAvatar avatar={player?.avatar || ''} name={player?.name || ''} size="sm" />
                              <span className="text-on-surface">{player?.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-success font-semibold">{p.wins}</td>
                          <td className="p-3 text-center text-error font-semibold">{p.losses}</td>
                          <td className="p-3 text-center text-on-surface-variant">{p.legsFor}:{p.legsAgainst}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Current Match */}
            {currentMatch && activeTournament.status !== 'completed' && (
              <div className="bg-surface-container rounded-m3-lg p-6">
                <h3 className="m3-title-medium text-on-surface mb-4 text-center">{t('tournament_menu.current_match')}</h3>

                <div className="flex items-center justify-center gap-8 mb-6">
                  {/* Player 1 */}
                  <div className="text-center">
                    <PlayerAvatar
                      avatar={getParticipantPlayer(currentMatch.participant1Id)?.avatar || ''}
                      name={getParticipantName(currentMatch.participant1Id)}
                      size="xl"
                    />
                    <p className="text-on-surface font-semibold mt-2">{getParticipantName(currentMatch.participant1Id)}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <IconButton variant="tonal" label={t('tournament_menu.leg_minus', { name: getParticipantName(currentMatch.participant1Id) })} onClick={() => handleScoreChange(currentMatch.id, 'p1', -1)}>
                        <Minus size={20} />
                      </IconButton>
                      <span className="text-4xl font-bold text-on-surface w-16 text-center">
                        {matchScores[currentMatch.id]?.p1 || 0}
                      </span>
                      <IconButton variant="filled" label={t('tournament_menu.leg_plus', { name: getParticipantName(currentMatch.participant1Id) })} onClick={() => handleScoreChange(currentMatch.id, 'p1', 1)}>
                        <Plus size={20} />
                      </IconButton>
                    </div>
                  </div>

                  <div className="text-4xl font-bold text-on-surface-variant">vs</div>

                  {/* Player 2 */}
                  <div className="text-center">
                    <PlayerAvatar
                      avatar={getParticipantPlayer(currentMatch.participant2Id)?.avatar || ''}
                      name={getParticipantName(currentMatch.participant2Id)}
                      size="xl"
                    />
                    <p className="text-on-surface font-semibold mt-2">{getParticipantName(currentMatch.participant2Id)}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <IconButton variant="tonal" label={t('tournament_menu.leg_minus', { name: getParticipantName(currentMatch.participant2Id) })} onClick={() => handleScoreChange(currentMatch.id, 'p2', -1)}>
                        <Minus size={20} />
                      </IconButton>
                      <span className="text-4xl font-bold text-on-surface w-16 text-center">
                        {matchScores[currentMatch.id]?.p2 || 0}
                      </span>
                      <IconButton variant="filled" label={t('tournament_menu.leg_plus', { name: getParticipantName(currentMatch.participant2Id) })} onClick={() => handleScoreChange(currentMatch.id, 'p2', 1)}>
                        <Plus size={20} />
                      </IconButton>
                    </div>
                  </div>
                </div>

                <p className="text-center m3-body-medium text-on-surface-variant mb-4">{t('tournament_menu.first_to', { count: tournamentLegsToWin })}</p>

                <Button
                  variant="success"
                  fullWidth
                  size="lg"
                  onClick={handleConfirmMatch}
                  disabled={(matchScores[currentMatch.id]?.p1 || 0) !== tournamentLegsToWin && (matchScores[currentMatch.id]?.p2 || 0) !== tournamentLegsToWin}
                >
                  {t('tournament_menu.confirm_match')}
                </Button>
              </div>
            )}

            {/* Match History */}
            <div className="mt-6">
              <h3 className="m3-title-medium text-on-surface mb-3">{t('tournament_menu.played_matches')}</h3>
              <div className="space-y-2">
                {activeTournament.matches.filter(m => m.winner).map(match => (
                  <div key={match.id} className="bg-surface-container rounded-m3-md p-3 flex items-center justify-between border border-outline-variant">
                    <div className="flex items-center gap-2">
                      <span className={match.winner === match.participant1Id ? 'text-success font-bold' : 'text-on-surface-variant'}>
                        {getParticipantName(match.participant1Id)}
                      </span>
                      <span className="text-on-surface-variant">vs</span>
                      <span className={match.winner === match.participant2Id ? 'text-success font-bold' : 'text-on-surface-variant'}>
                        {getParticipantName(match.participant2Id)}
                      </span>
                    </div>
                    <Trophy size={16} className="text-tertiary" />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Create tournament view
  if (showCreate) {
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          <BackButton onClick={() => setShowCreate(false)} />

          <Card variant="elevated" className="p-6 mt-6">
            <h2 className="m3-title-large text-on-surface mb-6">{t('tournament_menu.create')}</h2>

            {/* Tournament Name */}
            <div className="mb-6">
              <TextField
                label={t('tournament_menu.name')}
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder={t('tournament_menu.name_placeholder')}
              />
            </div>

            {/* Tournament Type */}
            <div className="mb-6">
              <label className="block m3-label-large text-on-surface-variant mb-2">{t('tournament_menu.mode')}</label>
              <div className="grid grid-cols-2 gap-3">
                {tournamentTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <Card
                      key={type.id}
                      variant={tournamentType === type.id ? 'filled' : 'outlined'}
                      interactive
                      selected={tournamentType === type.id}
                      onClick={() => setTournamentType(type.id)}
                      className="p-4 text-left"
                    >
                      <Icon size={24} className="text-primary mb-2" />
                      <p className="text-on-surface font-medium">{type.title}</p>
                      <p className="m3-body-small text-on-surface-variant">{type.description}</p>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Legs to Win */}
            <div className="mb-6">
              <label className="block m3-label-large text-on-surface-variant mb-2">{t('tournament_menu.legs_to_win')}</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(num => (
                  <Chip
                    key={num}
                    selected={legsToWin === num}
                    onClick={() => setLegsToWin(num)}
                    className="flex-1 justify-center"
                  >
                    {num}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Player Selection */}
            <div className="mb-6">
              <label className="block m3-label-large text-on-surface-variant mb-2">
                {t('tournament_menu.players_count', { count: selectedPlayers.length, max: selectedType?.maxPlayers || 8 })}
              </label>
              <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {players.filter(p => !p.isBot).map((player, index) => {
                  const isSelected = !!selectedPlayers.find(p => p.id === player.id);
                  return (
                    <motion.div key={player.id} {...staggerChild(Math.min(index, 10))}>
                    <Card
                      variant={isSelected ? 'filled' : 'outlined'}
                      interactive
                      selected={isSelected}
                      onClick={() => {
                        if (selectedPlayers.find(p => p.id === player.id)) {
                          setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
                        } else if (selectedPlayers.length < (selectedType?.maxPlayers || 8)) {
                          setSelectedPlayers(prev => [...prev, player]);
                        }
                      }}
                      className="p-3 text-center"
                    >
                      <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                      <p className="text-on-surface m3-body-small mt-1 truncate">{player.name}</p>
                    </Card>
                    </motion.div>
                  );
                })}
              </div>
              {selectedPlayers.length < (selectedType?.minPlayers || 2) && (
                <p className="text-tertiary m3-body-small mt-2">
                  {t('tournament_menu.min_players', { count: selectedType?.minPlayers || 2 })}
                </p>
              )}
            </div>

            {/* Start Button */}
            <Button
              variant="filled"
              fullWidth
              size="lg"
              icon={<Play size={24} />}
              onClick={handleCreateTournament}
              disabled={!canStart}
            >
              {t('tournament_menu.start')}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  // Main menu view
  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        <BackButton onClick={() => navigate('/')} />

        <Card variant="elevated" className="p-6 md:p-8 mt-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-m3-lg bg-tertiary-container shadow-m3-1">
              <Trophy size={32} className="text-on-tertiary-container" />
            </div>
            <div>
              <h1 className="m3-headline-medium text-on-surface">{t('tournament_menu.title')}</h1>
              <p className="m3-body-medium text-on-surface-variant">{t('tournament_menu.subtitle_menu')}</p>
            </div>
          </div>

          {/* Create Tournament Button */}
          <Button
            variant="filled"
            fullWidth
            size="lg"
            icon={<Plus size={28} />}
            onClick={() => setShowCreate(true)}
            className="mb-8"
          >
            {t('tournament_menu.create')}
          </Button>

          <SavedTournaments
            items={savedTournaments}
            loading={listLoading}
            error={listError}
            onRetry={reload}
            onOpen={openTournament}
            onDelete={handleDeleteTournament}
            winnerName={(stored) => {
              const { tournament } = fromStoredTournament(stored);
              const champion = tournament.type === 'knockout' ? knockoutChampion(tournament.matches) : roundRobinChampion(tournament.participants);
              const participant = tournament.participants.find(p => p.id === champion);
              return players.find(p => p.id === participant?.playerId)?.name;
            }}
          />

          <h3 className="m3-title-medium text-on-surface mb-4">{t('tournament_menu.available_modes')}</h3>

          <div className="space-y-4">
            {tournamentTypes.map((type, index) => {
              const Icon = type.icon;
              return (
                <motion.div key={type.id} {...staggerChild(index)}>
                <Card
                  variant="outlined"
                  interactive
                  onClick={() => {
                    setTournamentType(type.id);
                    setShowCreate(true);
                  }}
                  className="p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary-container rounded-m3-md">
                      <Icon size={24} className="text-on-primary-container" />
                    </div>
                    <div className="flex-1">
                      <h3 className="m3-title-small text-on-surface mb-1">{type.title}</h3>
                      <p className="m3-body-small text-on-surface-variant mb-2">{type.description}</p>
                      <p className="m3-label-medium text-primary">{t('tournament_menu.player_range', { min: type.minPlayers, max: type.maxPlayers })}</p>
                    </div>
                    <ChevronRight className="text-on-surface-variant" />
                  </div>
                </Card>
                </motion.div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

interface SavedTournamentsProps {
  items: StoredTournament[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onOpen: (t: StoredTournament) => void;
  onDelete: (t: StoredTournament) => void;
  winnerName: (t: StoredTournament) => string | undefined;
}

/** Running and finished tournaments from the database. */
const SavedTournaments: React.FC<SavedTournamentsProps> = ({ items, loading, error, onRetry, onOpen, onDelete, winnerName }) => {
  const { t, i18n } = useTranslation();
  if (loading) return <div className="py-6 flex justify-center"><LoadingIndicator /></div>;
  if (error) return <ErrorState message={t('tournament_menu.load_failed')} onRetry={onRetry} className="mb-8" />;
  if (items.length === 0) return null;

  const running = items.filter(x => x.status !== 'completed');
  const finished = items.filter(x => x.status === 'completed');
  const row = (x: StoredTournament) => {
    const { played, total } = tournamentProgress(x);
    const done = x.status === 'completed';
    const champion = done ? winnerName(x) : undefined;
    return (
      <li key={x.id}>
        <Card variant="filled" className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="m3-title-small text-on-surface truncate">{x.name}</h4>
            <p className="m3-body-small text-on-surface-variant">
              {x.type === 'knockout' ? t('tournament_menu.knockout') : t('tournament_menu.round_robin')}
              {' · '}
              {done && champion
                ? t('tournament_menu.won_by', { name: champion })
                : t('tournament_menu.progress', { played, total })}
              {' · '}
              {new Date(x.createdAt).toLocaleDateString(i18n.language)}
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button variant={done ? 'tonal' : 'filled'} size="sm" icon={done ? <Trophy size={18} /> : <Play size={18} />} onClick={() => onOpen(x)}>
              {done ? t('tournament_menu.open') : t('tournament_menu.resume')}
            </Button>
            <IconButton label={t('tournament_menu.delete', { name: x.name })} onClick={() => onDelete(x)} className="text-error">
              <Trash2 size={18} />
            </IconButton>
          </div>
        </Card>
      </li>
    );
  };

  return (
    <div className="mb-8 space-y-6">
      {running.length > 0 && (
        <section aria-labelledby="tournaments-running">
          <h3 id="tournaments-running" className="m3-title-medium text-on-surface mb-3">{t('tournament_menu.running_title')}</h3>
          <ul className="space-y-3">{running.map(row)}</ul>
        </section>
      )}
      {finished.length > 0 && (
        <section aria-labelledby="tournaments-finished">
          <h3 id="tournaments-finished" className="m3-title-medium text-on-surface mb-3">{t('tournament_menu.finished_title')}</h3>
          <ul className="space-y-3">{finished.map(row)}</ul>
        </section>
      )}
    </div>
  );
};

export default TournamentMenu;
