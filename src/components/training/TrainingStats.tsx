import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart, TrendingUp, Target, Calendar, Filter, Trophy } from 'lucide-react';
import { TrainingSession, TrainingType } from '../../types';
import { usePlayer } from '../../context/PlayerContext';
import { useTenant } from '../../context/TenantContext';
import { LineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '../../services/api';

const TrainingStats: React.FC = () => {
  const navigate = useNavigate();
  const { currentPlayer } = usePlayer();
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
          startedAt: new Date(s.startedAt),
          completedAt: s.completedAt ? new Date(s.completedAt) : undefined
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
        date: session.startedAt.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
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
      <div className="min-h-screen p-4 md:p-8 gradient-mesh">
        <div className="max-w-6xl mx-auto">
          <div className="glass-card p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Kein Spieler ausgewählt</h2>
            <p className="text-dark-400 mb-4">Bitte wähle einen Spieler aus, um Trainingsstatistiken anzuzeigen.</p>
            <button
              onClick={() => navigate('/players')}
              className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-all"
            >
              Spieler auswählen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/training')}
            className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            Zurück
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <BarChart size={32} />
            Training Statistiken
          </h1>
          <div className="w-24" /> {/* Spacer for alignment */}
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-primary-400" />
              <span className="text-white font-medium">Filter:</span>
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as TrainingType | 'all')}
              className="px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-600 focus:border-primary-500 outline-none"
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
              <span className="text-white font-medium">Sortieren:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'score' | 'accuracy')}
                className="px-4 py-2 bg-dark-800 text-white rounded-lg border border-dark-600 focus:border-primary-500 outline-none"
              >
                <option value="date">Datum</option>
                <option value="score">Score</option>
                <option value="accuracy">Genauigkeit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats.totalSessions}</div>
            <div className="text-sm text-dark-400">Sessions</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-success-400">{stats.averageScore.toFixed(0)}</div>
            <div className="text-sm text-dark-400">Ø Score</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-primary-400">{stats.averageAccuracy.toFixed(1)}%</div>
            <div className="text-sm text-dark-400">Ø Genauigkeit</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">{stats.personalBests}</div>
            <div className="text-sm text-dark-400">Personal Bests</div>
          </div>
        </div>

        {performanceData.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Performance Chart */}
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Performance Verlauf
              </h3>
              <div className="bg-dark-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={250}>
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
                </ResponsiveContainer>
              </div>
            </div>

            {/* Training Type Distribution */}
            {typeDistribution.length > 0 && (
              <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target size={20} />
                  Training Modi Verteilung
                </h3>
                <div className="bg-dark-900 rounded-lg p-4">
                  <ResponsiveContainer width="100%" height={250}>
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
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session History */}
        <div className="glass-card p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Session Historie
          </h3>
          
          {sortedSessions.length === 0 ? (
            <div className="text-center py-12">
              <Target size={64} className="mx-auto mb-4 text-dark-600" />
              <p className="text-dark-400 text-lg">Noch keine Training Sessions</p>
              <button
                onClick={() => navigate('/training')}
                className="mt-4 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold transition-all"
              >
                Training starten
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {sortedSessions.map((session, index) => (
                <div
                  key={session.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    session.personalBest
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-dark-900/50 border-dark-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {session.personalBest && (
                        <Trophy size={20} className="text-amber-400" />
                      )}
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          {formatTrainingType(session.type)}
                          {session.personalBest && (
                            <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full">
                              PB
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-dark-400">
                          {session.startedAt.toLocaleString('de-DE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-success-400">{session.score || 0}</div>
                      <div className="text-xs text-dark-400">Score</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="bg-dark-800 rounded p-2">
                      <div className="text-sm font-bold text-white">{session.totalAttempts || 0}</div>
                      <div className="text-xs text-dark-400">Versuche</div>
                    </div>
                    <div className="bg-dark-800 rounded p-2">
                      <div className="text-sm font-bold text-success-400">{session.totalHits || 0}</div>
                      <div className="text-xs text-dark-400">Treffer</div>
                    </div>
                    <div className="bg-dark-800 rounded p-2">
                      <div className="text-sm font-bold text-primary-400">{(session.hitRate || 0).toFixed(1)}%</div>
                      <div className="text-xs text-dark-400">Genauigkeit</div>
                    </div>
                    <div className="bg-dark-800 rounded p-2">
                      <div className="text-sm font-bold text-amber-400">
                        {session.duration ? formatDuration(session.duration) : '-'}
                      </div>
                      <div className="text-xs text-dark-400">Zeit</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingStats;
