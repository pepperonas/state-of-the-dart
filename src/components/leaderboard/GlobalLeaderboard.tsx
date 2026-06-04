import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, Target, Award, Loader, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { BackButton, Card, Chip, Button, IconButton } from '../common';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { staggerChild } from '../../utils/motion';

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
    if (rank === 2) return 'text-gray-300';
    if (rank === 3) return 'text-orange-500';
    return 'text-on-surface-variant';
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
        <BackButton
          onClick={() => navigate(isAuthenticated ? '/' : '/login')}
          label={isAuthenticated ? 'Zurück' : 'Zum Login'}
        />

        <div className="text-center mb-8">
          <h1 className="m3-headline-medium md:m3-headline-large text-on-surface mb-2">
            🏆 Global Leaderboard
          </h1>
          <p className="m3-title-medium text-on-surface-variant">
            Die besten Spieler weltweit
          </p>
        </div>

        {/* Metric Selector */}
        <Card variant="elevated" className="p-4 mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {metrics.map((m) => {
              const Icon = m.icon;
              return (
                <Chip
                  key={m.id}
                  selected={metric === m.id}
                  icon={<Icon size={18} />}
                  onClick={() => setMetric(m.id)}
                >
                  <span className="hidden sm:inline">{m.name}</span>
                  <span className="sm:hidden">{m.id === '180s' ? '180s' : m.name.split(' ')[0]}</span>
                </Chip>
              );
            })}
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-primary" size={48} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card variant="elevated" className="p-8 text-center">
            <p className="text-error-400 mb-4">{error}</p>
            <Button
              variant="filled"
              icon={<RefreshCw size={20} />}
              onClick={loadLeaderboard}
              className="mx-auto"
            >
              Erneut versuchen
            </Button>
          </Card>
        )}

        {/* Leaderboard */}
        {!loading && !error && data && (
          <Card variant="elevated" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="m3-title-large text-on-surface flex items-center gap-2">
                {currentMetric && <currentMetric.icon size={24} />}
                {currentMetric?.name}
              </h2>
              <IconButton label="Aktualisieren" onClick={loadLeaderboard}>
                <RefreshCw size={20} />
              </IconButton>
            </div>

            {data.entries.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                <p>Noch keine Einträge</p>
                <p className="m3-body-medium mt-2">Sei der Erste auf der Rangliste!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.entries.map((entry, index) => (
                  <motion.div
                    key={entry.playerId}
                    {...staggerChild(Math.min(index, 12))}
                    className={`flex items-center gap-4 p-4 rounded-m3-md transition-all ${
                      entry.rank <= 3
                        ? 'bg-primary-container text-on-primary-container border border-outline-variant'
                        : 'bg-surface-container hover:bg-surface-container-high'
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
                        <p className="m3-title-medium text-on-surface truncate">
                          {entry.playerName}
                        </p>
                        <p className="m3-body-medium text-on-surface-variant truncate flex items-center gap-1">
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
                      <p className="m3-title-large text-on-surface">
                        {metric === 'average' ? entry.value.toFixed(2) : entry.value}
                        {currentMetric?.suffix}
                      </p>
                      <p className="m3-body-medium text-on-surface-variant">
                        {entry.gamesPlayed} Spiele
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {data.total > 0 && (
              <div className="mt-6 text-center m3-body-medium text-on-surface-variant">
                {data.total} {data.total === 1 ? 'Eintrag' : 'Einträge'}
              </div>
            )}
          </Card>
        )}

        {/* Call to Action */}
        {!isAuthenticated && (
          <Card variant="elevated" className="mt-8 p-8 text-center">
            <h3 className="m3-title-large text-on-surface mb-4">
              Möchtest du auf der Rangliste erscheinen?
            </h3>
            <p className="m3-body-large text-on-surface-variant mb-6">
              Registriere dich kostenlos und starte deine 30-Tage-Testversion!
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="success" onClick={() => navigate('/register')}>
                Jetzt registrieren
              </Button>
              <Button variant="tonal" onClick={() => navigate('/login')}>
                Anmelden
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GlobalLeaderboard;
