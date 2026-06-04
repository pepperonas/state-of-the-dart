import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, TrendingUp, Target, Calendar, Filter, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TrainingSession, TrainingType } from '../../types';
import { usePlayer } from '../../context/PlayerContext';
import { useTenant } from '../../context/TenantContext';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../services/api';
import { toDateOrNow, formatDateTime, formatDateShort } from '../../utils/dateUtils';
import { BackButton, Button, Card } from '../common';

const TrainingStats: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { currentPlayer, setCurrentPlayer, players } = usePlayer();
  const { storage } = useTenant();
  
  const [selectedType, setSelectedType] = useState<TrainingType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'accuracy'>('date');
  const [allSessions, setAllSessions] = useState<TrainingSession[]>([]);

  // Load training sessions from API (Database-First!)
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const sessions = await api.training.getAll();
        const formattedSessions = sessions.map((s: any) => ({
          ...s,
          startedAt: toDateOrNow(s.startedAt),
          completedAt: s.completedAt ? toDateOrNow(s.completedAt) : undefined
        }));
        setAllSessions(formattedSessions);
        console.log('✅ Training sessions loaded from API:', sessions.length);
      } catch (error) {
        console.error('❌ Failed to load training sessions:', error);
        setAllSessions([]);
      }
    };
    
    loadSessions();
  }, []);

  // Filter sessions by player
  const playerSessions = useMemo(() => {
    if (!currentPlayer) return allSessions;
    return allSessions.filter(s => s.playerId === currentPlayer.id);
  }, [allSessions, currentPlayer]);

  // Filter by type
  const filteredSessions = useMemo(() => {
    if (selectedType === 'all') return playerSessions;
    return playerSessions.filter(s => s.type === selectedType);
  }, [playerSessions, selectedType]);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return b.startedAt.getTime() - a.startedAt.getTime();
        case 'score':
          return (b.score || 0) - (a.score || 0);
        case 'accuracy':
          return (b.hitRate || 0) - (a.hitRate || 0);
        default:
          return 0;
      }
    });
  }, [filteredSessions, sortBy]);

  // Performance over time chart
  const performanceData = useMemo(() => {
    return sortedSessions
      .slice(0, 20)
      .reverse()
      .map((session, index) => ({
        session: `#${index + 1}`,
        score: session.score || 0,
        accuracy: session.hitRate || 0,
        date: formatDateShort(session.startedAt)
      }));
  }, [sortedSessions]);

  // Training type distribution
  const typeDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    playerSessions.forEach(s => {
      counts[s.type] = (counts[s.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: formatTrainingType(type as TrainingType),
      value: count
    }));
  }, [playerSessions]);

  // Summary stats
  const stats = useMemo(() => {
    const sessions = filteredSessions;
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averageScore: 0,
        averageAccuracy: 0,
        totalDarts: 0,
        totalTime: 0,
        personalBests: 0,
        bestSession: null as TrainingSession | null
      };
    }

    return {
      totalSessions: sessions.length,
      averageScore: sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length,
      averageAccuracy: sessions.reduce((sum, s) => sum + (s.hitRate || 0), 0) / sessions.length,
      totalDarts: sessions.reduce((sum, s) => sum + (s.totalDarts || 0), 0),
      totalTime: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      personalBests: sessions.filter(s => s.personalBest).length,
      bestSession: sessions.sort((a, b) => (b.score || 0) - (a.score || 0))[0]
    };
  }, [filteredSessions]);

  const formatTrainingType = (type: TrainingType): string => {
    const labels: Record<TrainingType, string> = {
      'doubles': 'Doubles',
      'triples': 'Triples',
      'singles': 'Singles',
      'around-the-clock': 'Around the Clock',
      'checkout-121': 'Checkout 121',
      'bobs-27': "Bob's 27",
      'score-training': 'Score Training',
      'catch-40': 'Catch 40',
      'halve-it': 'Halve It'
    };
    return labels[type] || type;
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#a855f7', '#ec4899', '#ef4444'];

  if (!currentPlayer) {
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <BackButton onClick={() => navigate('/training')} />

          <Card variant="elevated" className="p-8">
            <h2 className="m3-headline-small text-on-surface mb-4 text-center">Training Statistiken</h2>
            <p className="m3-body-large text-on-surface-variant mb-6 text-center">Bitte wähle einen Spieler aus, um Trainingsstatistiken anzuzeigen.</p>

            {players.length === 0 ? (
              <div className="text-center">
                <p className="m3-body-medium text-on-surface-variant mb-4">Noch keine Spieler vorhanden.</p>
                <Button variant="filled" onClick={() => navigate('/players')}>
                  Spieler erstellen
                </Button>
              </div>
            ) : (
              <div className="max-w-md mx-auto">
                <label className="block m3-label-large text-on-surface mb-2">Spieler auswählen:</label>
                <select
                  onChange={(e) => {
                    const player = players.find(p => p.id === e.target.value);
                    setCurrentPlayer(player || null);
                  }}
                  className="w-full px-4 py-3 bg-surface-container-high text-on-surface rounded-m3-md border border-outline-variant focus:border-primary outline-none text-lg"
                  defaultValue=""
                >
                  <option value="" disabled>Wähle einen Spieler...</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.avatar} {player.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <BackButton onClick={() => navigate('/training')} />
          <h1 className="m3-headline-small text-on-surface flex items-center gap-2">
            <BarChart size={32} />
            Training Statistiken
          </h1>
          <div className="w-24" /> {/* Spacer for alignment */}
        </div>

        {/* Filters */}
        <Card variant="filled" className="p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Player Selector */}
            <div className="flex items-center gap-2">
              <span className="m3-label-large text-on-surface">Spieler:</span>
              <select
                value={currentPlayer?.id || ''}
                onChange={(e) => {
                  const player = players.find(p => p.id === e.target.value);
                  setCurrentPlayer(player || null);
                }}
                className="px-4 py-2 bg-surface-container-high text-on-surface rounded-m3-md border border-outline-variant focus:border-primary outline-none"
              >
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.avatar} {player.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={20} className="text-primary" />
              <span className="m3-label-large text-on-surface">Filter:</span>
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as TrainingType | 'all')}
              className="px-4 py-2 bg-surface-container-high text-on-surface rounded-m3-md border border-outline-variant focus:border-primary outline-none"
            >
              <option value="all">Alle Modi</option>
              <option value="doubles">Doubles</option>
              <option value="triples">Triples</option>
              <option value="around-the-clock">Around the Clock</option>
              <option value="checkout-121">Checkout 121</option>
              <option value="bobs-27">Bob's 27</option>
              <option value="score-training">Score Training</option>
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <span className="m3-label-large text-on-surface">Sortieren:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'accuracy')}
                className="px-4 py-2 bg-surface-container-high text-on-surface rounded-m3-md border border-outline-variant focus:border-primary outline-none"
              >
                <option value="date">Datum</option>
                <option value="score">Score</option>
                <option value="accuracy">Genauigkeit</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card variant="filled" className="p-4 text-center">
            <div className="m3-headline-small text-on-surface">{stats.totalSessions}</div>
            <div className="m3-label-large text-on-surface-variant">Sessions</div>
          </Card>
          <Card variant="filled" className="p-4 text-center">
            <div className="m3-headline-small text-success">{stats.averageScore.toFixed(0)}</div>
            <div className="m3-label-large text-on-surface-variant">Ø Score</div>
          </Card>
          <Card variant="filled" className="p-4 text-center">
            <div className="m3-headline-small text-primary">{stats.averageAccuracy.toFixed(1)}%</div>
            <div className="m3-label-large text-on-surface-variant">Ø Genauigkeit</div>
          </Card>
          <Card variant="filled" className="p-4 text-center">
            <div className="m3-headline-small text-tertiary">{stats.personalBests}</div>
            <div className="m3-label-large text-on-surface-variant">Personal Bests</div>
          </Card>
        </div>

        {performanceData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Performance Chart */}
            <Card variant="filled" className="p-6">
              <h3 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Performance Verlauf
              </h3>
              <div className="bg-surface-container-low rounded-m3-md p-4">
                <div className="h-[180px] sm:h-[250px]"><ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #404040',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={2} name="Score" />
                    <Line type="monotone" dataKey="accuracy" stroke="#0ea5e9" strokeWidth={2} name="Genauigkeit %" />
                  </LineChart>
                </ResponsiveContainer></div>
              </div>
            </Card>

            {/* Training Type Distribution */}
            {typeDistribution.length > 0 && (
              <Card variant="filled" className="p-6">
                <h3 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
                  <Target size={20} />
                  Training Modi Verteilung
                </h3>
                <div className="bg-surface-container-low rounded-m3-md p-4">
                  <div className="h-[180px] sm:h-[250px]"><ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0a0a0a',
                          border: '1px solid #404040',
                          borderRadius: '8px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer></div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Session History */}
        <Card variant="filled" className="p-6">
          <h3 className="m3-title-large text-on-surface mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Session Historie
          </h3>

          {sortedSessions.length === 0 ? (
            <div className="text-center py-12">
              <Target size={64} className="mx-auto mb-4 text-on-surface-variant" />
              <p className="m3-body-large text-on-surface-variant">Noch keine Training Sessions</p>
              <div className="mt-4">
                <Button variant="filled" onClick={() => navigate('/training')}>
                  Training starten
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {sortedSessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-m3-md border-2 transition-all ${
                    session.personalBest
                      ? 'bg-tertiary-container/40 border-tertiary'
                      : 'bg-surface-container-low border-outline-variant'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {session.personalBest && (
                        <Trophy size={20} className="text-tertiary" />
                      )}
                      <div>
                        <div className="m3-title-medium text-on-surface flex items-center gap-2">
                          {formatTrainingType(session.type)}
                          {session.personalBest && (
                            <span className="m3-label-medium px-2 py-0.5 bg-tertiary-container text-on-tertiary-container rounded-m3-full">
                              PB
                            </span>
                          )}
                        </div>
                        <div className="m3-label-medium text-on-surface-variant">
                          {formatDateTime(session.startedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="m3-title-large text-success">{session.score || 0}</div>
                      <div className="m3-label-medium text-on-surface-variant">Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-surface-container-high rounded-m3-sm p-2">
                      <div className="m3-title-medium text-on-surface">{session.totalAttempts || 0}</div>
                      <div className="m3-label-medium text-on-surface-variant">Versuche</div>
                    </div>
                    <div className="bg-surface-container-high rounded-m3-sm p-2">
                      <div className="m3-title-medium text-success">{session.totalHits || 0}</div>
                      <div className="m3-label-medium text-on-surface-variant">Treffer</div>
                    </div>
                    <div className="bg-surface-container-high rounded-m3-sm p-2">
                      <div className="m3-title-medium text-primary">{(session.hitRate || 0).toFixed(1)}%</div>
                      <div className="m3-label-medium text-on-surface-variant">Genauigkeit</div>
                    </div>
                    <div className="bg-surface-container-high rounded-m3-sm p-2">
                      <div className="m3-title-medium text-tertiary">
                        {session.duration ? formatDuration(session.duration) : '-'}
                      </div>
                      <div className="m3-label-medium text-on-surface-variant">Zeit</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TrainingStats;
