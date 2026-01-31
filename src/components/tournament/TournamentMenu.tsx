import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Users, Calendar, Star, Play, Plus, Trash2, Settings, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '../../context/PlayerContext';
import { Player, Tournament, TournamentSettings, TournamentParticipant, TournamentMatch } from '../../types/index';
import PlayerAvatar from '../player/PlayerAvatar';
import { v4 as uuidv4 } from 'uuid';
import confetti from 'canvas-confetti';

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

  const tournamentTypes = [
    {
      id: 'knockout' as TournamentType,
      title: 'Knockout',
      icon: Trophy,
      description: 'Single Elimination - Verlierer fliegt raus',
      minPlayers: 4,
      maxPlayers: 16,
    },
    {
      id: 'round-robin' as TournamentType,
      title: 'Round Robin',
      icon: Users,
      description: 'Jeder spielt gegen jeden',
      minPlayers: 3,
      maxPlayers: 8,
    },
  ];

  const selectedType = tournamentTypes.find(t => t.id === tournamentType);
  const canStart = tournamentName.trim() && 
    selectedPlayers.length >= (selectedType?.minPlayers || 2) &&
    selectedPlayers.length <= (selectedType?.maxPlayers || 16);

  const generateKnockoutBracket = (participants: TournamentParticipant[]): TournamentMatch[] => {
    const matches: TournamentMatch[] = [];
    const numPlayers = participants.length;
    
    // Shuffle participants for random seeding
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    
    // Generate first round matches
    for (let i = 0; i < numPlayers; i += 2) {
      matches.push({
        id: uuidv4(),
        round: 1,
        participant1Id: shuffled[i].id,
        participant2Id: shuffled[i + 1]?.id || 'BYE',
      });
    }
    
    // Generate subsequent rounds (empty slots)
    let roundMatches = Math.floor(numPlayers / 4);
    let round = 2;
    while (roundMatches >= 1) {
      for (let i = 0; i < roundMatches; i++) {
        matches.push({
          id: uuidv4(),
          round,
          participant1Id: '',
          participant2Id: '',
        });
      }
      roundMatches = Math.floor(roundMatches / 2);
      round++;
    }
    
    // Add final if needed
    if (numPlayers > 2) {
      matches.push({
        id: uuidv4(),
        round,
        participant1Id: '',
        participant2Id: '',
      });
    }
    
    return matches;
  };

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
  };

  const getParticipantName = (participantId: string) => {
    if (!activeTournament) return '';
    const participant = activeTournament.participants.find(p => p.id === participantId);
    if (!participant) return 'TBD';
    const player = players.find(p => p.id === participant.playerId);
    return player?.name || 'Unknown';
  };

  const getParticipantPlayer = (participantId: string) => {
    if (!activeTournament) return null;
    const participant = activeTournament.participants.find(p => p.id === participantId);
    if (!participant) return null;
    return players.find(p => p.id === participant.playerId);
  };

  const currentMatch = useMemo(() => {
    if (!activeTournament) return null;
    const pendingMatches = activeTournament.matches.filter(m => !m.winner && m.participant1Id && m.participant2Id);
    return pendingMatches[currentMatchIndex] || null;
  }, [activeTournament, currentMatchIndex]);

  const handleScoreChange = (matchId: string, player: 'p1' | 'p2', delta: number) => {
    setMatchScores(prev => {
      const current = prev[matchId] || { p1: 0, p2: 0 };
      const newScore = Math.max(0, Math.min(legsToWin, current[player] + delta));
      return {
        ...prev,
        [matchId]: { ...current, [player]: newScore }
      };
    });
  };

  const handleConfirmMatch = () => {
    if (!currentMatch || !activeTournament) return;
    
    const scores = matchScores[currentMatch.id] || { p1: 0, p2: 0 };
    if (scores.p1 !== legsToWin && scores.p2 !== legsToWin) return;
    
    const winnerId = scores.p1 === legsToWin ? currentMatch.participant1Id : currentMatch.participant2Id;
    const loserId = scores.p1 === legsToWin ? currentMatch.participant2Id : currentMatch.participant1Id;
    
    // Update match
    const updatedMatches = activeTournament.matches.map(m => {
      if (m.id === currentMatch.id) {
        return { ...m, winner: winnerId, completed: new Date() };
      }
      return m;
    });
    
    // Update participants stats
    const updatedParticipants = activeTournament.participants.map(p => {
      if (p.id === winnerId) {
        return { ...p, wins: p.wins + 1, legsFor: p.legsFor + scores.p1, legsAgainst: p.legsAgainst + scores.p2 };
      }
      if (p.id === loserId) {
        return { ...p, losses: p.losses + 1, legsFor: p.legsFor + scores.p2, legsAgainst: p.legsAgainst + scores.p1 };
      }
      return p;
    });
    
    // For knockout: advance winner to next round
    if (activeTournament.type === 'knockout') {
      const currentRound = currentMatch.round;
      const nextRoundMatches = updatedMatches.filter(m => m.round === currentRound + 1);
      
      // Find empty slot in next round
      for (const nextMatch of nextRoundMatches) {
        if (!nextMatch.participant1Id) {
          nextMatch.participant1Id = winnerId;
          break;
        } else if (!nextMatch.participant2Id) {
          nextMatch.participant2Id = winnerId;
          break;
        }
      }
    }
    
    // Check if tournament is complete
    const remainingMatches = updatedMatches.filter(m => !m.winner && m.participant1Id && m.participant2Id);
    const isComplete = remainingMatches.length === 0;
    
    setActiveTournament({
      ...activeTournament,
      matches: updatedMatches,
      participants: updatedParticipants,
      status: isComplete ? 'completed' : 'in-progress',
      completedAt: isComplete ? new Date() : undefined,
    });
    
    if (isComplete) {
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }
    
    setCurrentMatchIndex(0);
  };

  const getTournamentWinner = () => {
    if (!activeTournament || activeTournament.status !== 'completed') return null;
    
    if (activeTournament.type === 'knockout') {
      const finalMatch = activeTournament.matches.find(m => m.winner && 
        !activeTournament.matches.some(nm => nm.participant1Id === m.winner || nm.participant2Id === m.winner && nm.round > m.round));
      return finalMatch?.winner;
    } else {
      // Round robin: most wins
      const sorted = [...activeTournament.participants].sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.legsFor - b.legsAgainst) - (a.legsFor - a.legsAgainst);
      });
      return sorted[0]?.id;
    }
  };

  // Tournament in progress view
  if (activeTournament) {
    const winner = getTournamentWinner();
    const winnerPlayer = winner ? getParticipantPlayer(winner) : null;
    
    return (
      <div className="min-h-screen p-4 md:p-8 gradient-mesh">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setActiveTournament(null)}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            Turnier beenden
          </button>

          <div className="glass-card rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white">{activeTournament.name}</h2>
                <p className="text-gray-400">
                  {activeTournament.type === 'knockout' ? 'Knockout' : 'Round Robin'} • 
                  Best of {legsToWin * 2 - 1}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeTournament.status === 'completed' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-primary-500/20 text-primary-400'
              }`}>
                {activeTournament.status === 'completed' ? '✅ Beendet' : '🎯 Läuft'}
              </div>
            </div>

            {/* Winner Banner */}
            {activeTournament.status === 'completed' && winnerPlayer && (
              <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-6 mb-6 border border-yellow-500/30">
                <div className="flex items-center gap-4">
                  <Trophy className="w-12 h-12 text-yellow-400" />
                  <div>
                    <p className="text-yellow-400 font-medium">Turniersieger</p>
                    <div className="flex items-center gap-3">
                      <PlayerAvatar avatar={winnerPlayer.avatar} name={winnerPlayer.name} size="lg" />
                      <span className="text-2xl font-bold text-white">{winnerPlayer.name}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Standings */}
            <h3 className="text-lg font-semibold text-white mb-3">Tabelle</h3>
            <div className="bg-dark-800 rounded-lg overflow-hidden mb-6">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left p-3 text-gray-400">#</th>
                    <th className="text-left p-3 text-gray-400">Spieler</th>
                    <th className="text-center p-3 text-gray-400">S</th>
                    <th className="text-center p-3 text-gray-400">N</th>
                    <th className="text-center p-3 text-gray-400">Legs</th>
                  </tr>
                </thead>
                <tbody>
                  {[...activeTournament.participants]
                    .sort((a, b) => b.wins - a.wins || (b.legsFor - b.legsAgainst) - (a.legsFor - a.legsAgainst))
                    .map((p, idx) => {
                      const player = players.find(pl => pl.id === p.playerId);
                      return (
                        <tr key={p.id} className="border-b border-dark-700 last:border-0">
                          <td className="p-3 text-white font-bold">
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <PlayerAvatar avatar={player?.avatar || ''} name={player?.name || ''} size="sm" />
                              <span className="text-white">{player?.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-green-400 font-semibold">{p.wins}</td>
                          <td className="p-3 text-center text-red-400 font-semibold">{p.losses}</td>
                          <td className="p-3 text-center text-gray-300">{p.legsFor}:{p.legsAgainst}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Current Match */}
            {currentMatch && activeTournament.status !== 'completed' && (
              <div className="bg-dark-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 text-center">Aktuelles Match</h3>
                
                <div className="flex items-center justify-center gap-8 mb-6">
                  {/* Player 1 */}
                  <div className="text-center">
                    <PlayerAvatar 
                      avatar={getParticipantPlayer(currentMatch.participant1Id)?.avatar || ''} 
                      name={getParticipantName(currentMatch.participant1Id)} 
                      size="xl" 
                    />
                    <p className="text-white font-semibold mt-2">{getParticipantName(currentMatch.participant1Id)}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <button
                        onClick={() => handleScoreChange(currentMatch.id, 'p1', -1)}
                        className="w-10 h-10 rounded-full bg-dark-700 hover:bg-dark-600 text-white text-xl"
                      >
                        -
                      </button>
                      <span className="text-4xl font-bold text-white w-16 text-center">
                        {matchScores[currentMatch.id]?.p1 || 0}
                      </span>
                      <button
                        onClick={() => handleScoreChange(currentMatch.id, 'p1', 1)}
                        className="w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-xl"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-4xl font-bold text-gray-500">vs</div>

                  {/* Player 2 */}
                  <div className="text-center">
                    <PlayerAvatar 
                      avatar={getParticipantPlayer(currentMatch.participant2Id)?.avatar || ''} 
                      name={getParticipantName(currentMatch.participant2Id)} 
                      size="xl" 
                    />
                    <p className="text-white font-semibold mt-2">{getParticipantName(currentMatch.participant2Id)}</p>
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <button
                        onClick={() => handleScoreChange(currentMatch.id, 'p2', -1)}
                        className="w-10 h-10 rounded-full bg-dark-700 hover:bg-dark-600 text-white text-xl"
                      >
                        -
                      </button>
                      <span className="text-4xl font-bold text-white w-16 text-center">
                        {matchScores[currentMatch.id]?.p2 || 0}
                      </span>
                      <button
                        onClick={() => handleScoreChange(currentMatch.id, 'p2', 1)}
                        className="w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-xl"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-center text-gray-400 mb-4">First to {legsToWin} Legs</p>

                <button
                  onClick={handleConfirmMatch}
                  disabled={(matchScores[currentMatch.id]?.p1 || 0) !== legsToWin && (matchScores[currentMatch.id]?.p2 || 0) !== legsToWin}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    (matchScores[currentMatch.id]?.p1 || 0) === legsToWin || (matchScores[currentMatch.id]?.p2 || 0) === legsToWin
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700'
                      : 'bg-dark-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Match bestätigen
                </button>
              </div>
            )}

            {/* Match History */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Gespielte Matches</h3>
              <div className="space-y-2">
                {activeTournament.matches.filter(m => m.winner).map(match => (
                  <div key={match.id} className="bg-dark-800 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={match.winner === match.participant1Id ? 'text-green-400 font-bold' : 'text-gray-400'}>
                        {getParticipantName(match.participant1Id)}
                      </span>
                      <span className="text-gray-500">vs</span>
                      <span className={match.winner === match.participant2Id ? 'text-green-400 font-bold' : 'text-gray-400'}>
                        {getParticipantName(match.participant2Id)}
                      </span>
                    </div>
                    <Trophy size={16} className="text-yellow-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create tournament view
  if (showCreate) {
    return (
      <div className="min-h-screen p-4 md:p-8 gradient-mesh">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setShowCreate(false)}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>

          <div className="glass-card rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Neues Turnier erstellen</h2>

            {/* Tournament Name */}
            <div className="mb-6">
              <label className="block text-gray-400 mb-2">Turniername</label>
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder="z.B. Freitagsturnier"
                className="w-full px-4 py-3 rounded-xl bg-dark-800 border border-dark-600 text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none"
              />
            </div>

            {/* Tournament Type */}
            <div className="mb-6">
              <label className="block text-gray-400 mb-2">Turnier-Modus</label>
              <div className="grid grid-cols-2 gap-3">
                {tournamentTypes.map(type => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setTournamentType(type.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        tournamentType === type.id
                          ? 'border-primary-500 bg-primary-500/20'
                          : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                      }`}
                    >
                      <Icon size={24} className="text-primary-400 mb-2" />
                      <p className="text-white font-medium">{type.title}</p>
                      <p className="text-gray-500 text-sm">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legs to Win */}
            <div className="mb-6">
              <label className="block text-gray-400 mb-2">Legs zum Gewinnen</label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setLegsToWin(num)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      legsToWin === num
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-800 text-gray-400 hover:bg-dark-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Player Selection */}
            <div className="mb-6">
              <label className="block text-gray-400 mb-2">
                Spieler ({selectedPlayers.length}/{selectedType?.maxPlayers || 8})
              </label>
              <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {players.filter(p => !p.isBot).map(player => (
                  <button
                    key={player.id}
                    onClick={() => {
                      if (selectedPlayers.find(p => p.id === player.id)) {
                        setSelectedPlayers(prev => prev.filter(p => p.id !== player.id));
                      } else if (selectedPlayers.length < (selectedType?.maxPlayers || 8)) {
                        setSelectedPlayers(prev => [...prev, player]);
                      }
                    }}
                    className={`p-3 rounded-xl border-2 transition-all ${
                      selectedPlayers.find(p => p.id === player.id)
                        ? 'border-primary-500 bg-primary-500/20'
                        : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                    }`}
                  >
                    <PlayerAvatar avatar={player.avatar} name={player.name} size="sm" />
                    <p className="text-white text-sm mt-1 truncate">{player.name}</p>
                  </button>
                ))}
              </div>
              {selectedPlayers.length < (selectedType?.minPlayers || 2) && (
                <p className="text-amber-400 text-sm mt-2">
                  Mindestens {selectedType?.minPlayers || 2} Spieler benötigt
                </p>
              )}
            </div>

            {/* Start Button */}
            <button
              onClick={handleCreateTournament}
              disabled={!canStart}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                canStart
                  ? 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:from-primary-600 hover:to-accent-600'
                  : 'bg-dark-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Play size={24} />
              Turnier starten
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main menu view
  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <div className="glass-card rounded-xl shadow-lg p-6 md:p-8 border border-white/5">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg">
              <Trophy size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white">Turniere</h2>
              <p className="text-dark-400">Organisiere Dart-Wettbewerbe</p>
            </div>
          </div>

          {/* Create Tournament Button */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full mb-8 py-6 rounded-xl bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold text-lg flex items-center justify-center gap-3 transition-all"
          >
            <Plus size={28} />
            Neues Turnier erstellen
          </button>

          <h3 className="text-lg font-semibold text-white mb-4">Verfügbare Modi</h3>

          <div className="space-y-4">
            {tournamentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.title}
                  className="border border-dark-700 rounded-lg p-4 bg-dark-900/30 hover:bg-dark-800/50 transition-all cursor-pointer"
                  onClick={() => {
                    setTournamentType(type.id);
                    setShowCreate(true);
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg">
                      <Icon size={24} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white mb-1">{type.title}</h3>
                      <p className="text-sm text-dark-400 mb-2">{type.description}</p>
                      <p className="text-xs text-primary-400">{type.minPlayers}-{type.maxPlayers} Spieler</p>
                    </div>
                    <ChevronRight className="text-gray-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentMenu;
