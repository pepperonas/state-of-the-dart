import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, Target, Award, ArrowLeft, Loader, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface LeaderboardEntry {
  playerId: string;
  playerName: string;
  playerAvatar: string;
  userName: string;
  userAvatar: string;
  value: number;
  rank: number;
  gamesPlayed: number;
}

interface LeaderboardData {
  metric: string;
  entries: LeaderboardEntry[];
  total: number;
}

const GlobalLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [metric, setMetric] = useState<string>('average');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const metrics = [
    { id: 'average', name: 'Best Average', icon: TrendingUp, suffix: '' },
    { id: 'wins', name: 'Most Wins', icon: Trophy, suffix: ' Siege' },
    { id: '180s', name: 'Most 180s', icon: Target, suffix: ' × 180' },
    { id: 'checkouts', name: 'Highest Checkout', icon: Award, suffix: '' },
    { id: 'best_leg', name: 'Best Leg', icon: Award, suffix: ' Darts' },
  ];

  useEffect(() => {
    loadLeaderboard();
  }, [metric]);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/leaderboard?metric=${metric}&limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to load leaderboard');
      }

      const data = await response.json();
      setData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-amber-400';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-orange-500';
    return 'text-dark-400';
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const currentMetric = metrics.find((m) => m.id === metric);

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(isAuthenticated ? '/' : '/login')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {isAuthenticated ? 'Zurück' : 'Zum Login'}
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🏆 Global Leaderboard
          </h1>
          <p className="text-xl text-dark-300">
            Die besten Spieler weltweit
          </p>
        </div>

        {/* Metric Selector */}
        <div className="glass-card p-4 rounded-xl mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setMetric(m.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                    metric === m.id
                      ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg'
                      : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                  }`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{m.name}</span>
                  <span className="sm:hidden">{m.id === '180s' ? '180s' : m.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-primary-400" size={48} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-card p-8 rounded-xl text-center">
            <p className="text-error-400 mb-4">{error}</p>
            <button
              onClick={loadLeaderboard}
              className="px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 mx-auto transition-all"
            >
              <RefreshCw size={20} />
              Erneut versuchen
            </button>
          </div>
        )}

        {/* Leaderboard */}
        {!loading && !error && data && (
          <div className="glass-card p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                {currentMetric && <currentMetric.icon size={24} />}
                {currentMetric?.name}
              </h2>
              <button
                onClick={loadLeaderboard}
                className="p-2 hover:bg-dark-800 rounded-lg transition-colors text-primary-400 hover:text-primary-300"
                title="Aktualisieren"
              >
                <RefreshCw size={20} />
              </button>
            </div>

            {data.entries.length === 0 ? (
              <div className="text-center py-12 text-dark-400">
                <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                <p>Noch keine Einträge</p>
                <p className="text-sm mt-2">Sei der Erste auf der Rangliste!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.entries.map((entry) => (
                  <div
                    key={entry.playerId}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                      entry.rank <= 3
                        ? 'bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/30'
                        : 'bg-dark-800 hover:bg-dark-700'
                    }`}
                  >
                    {/* Rank */}
                    <div className={`text-2xl font-bold w-16 text-center ${getRankColor(entry.rank)}`}>
                      {getRankBadge(entry.rank)}
                    </div>

                    {/* Player Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-3xl">{entry.playerAvatar}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">
                          {entry.playerName}
                        </p>
                        <p className="text-sm text-dark-400 truncate flex items-center gap-1">
                          {entry.userAvatar?.startsWith('http') ? (
                            <img
                              src={entry.userAvatar}
                              alt={entry.userName}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">{entry.userAvatar}</span>
                          )}
                          {entry.userName}
                        </p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-white">
                        {metric === 'average' ? entry.value.toFixed(2) : entry.value}
                        {currentMetric?.suffix}
                      </p>
                      <p className="text-sm text-dark-400">
                        {entry.gamesPlayed} Spiele
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.total > 0 && (
              <div className="mt-6 text-center text-sm text-dark-400">
                {data.total} {data.total === 1 ? 'Eintrag' : 'Einträge'}
              </div>
            )}
          </div>
        )}

        {/* Call to Action */}
        {!isAuthenticated && (
          <div className="mt-8 glass-card p-8 rounded-xl text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Möchtest du auf der Rangliste erscheinen?
            </h3>
            <p className="text-dark-300 mb-6">
              Registriere dich kostenlos und starte deine 30-Tage-Testversion!
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-3 bg-gradient-to-r from-success-500 to-success-600 hover:from-success-600 hover:to-success-700 text-white rounded-lg font-bold transition-all"
              >
                Jetzt registrieren
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-semibold transition-all"
              >
                Anmelden
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalLeaderboard;
