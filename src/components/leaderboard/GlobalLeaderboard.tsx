import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, TrendingUp, Target, Award, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { BackButton, Card, Chip, Button, IconButton, PageShell } from '../common';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { staggerChild } from '../../utils/motion';
import { Icon } from '../icons';
import LoadingIndicator from '../common/LoadingIndicator';

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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [metric, setMetric] = useState<string>('average');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const metrics = [
    { id: 'average', name: t('global_leaderboard.metric_average'), short: t('global_leaderboard.metric_average_short'), icon: TrendingUp, format: (v: number) => v.toFixed(2) },
    { id: 'wins', name: t('global_leaderboard.metric_wins'), short: t('global_leaderboard.metric_wins_short'), icon: Trophy, format: (v: number) => t('global_leaderboard.value_wins', { count: v }) },
    { id: '180s', name: t('global_leaderboard.metric_180s'), short: '180s', icon: Target, format: (v: number) => `${v} × 180` },
    { id: 'checkouts', name: t('global_leaderboard.metric_checkout'), short: t('global_leaderboard.metric_checkout_short'), icon: Award, format: (v: number) => String(v) },
    { id: 'best_leg', name: t('global_leaderboard.metric_best_leg'), short: t('global_leaderboard.metric_best_leg_short'), icon: Award, format: (v: number) => t('global_leaderboard.value_darts', { count: v }) },
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
        throw new Error(t('global_leaderboard.load_failed'));
      }

      const data = await response.json();
      setData(data);
    } catch (err: any) {
      setError(err.message || t('global_leaderboard.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-[var(--m3-medal-gold)]';
    if (rank === 2) return 'text-[var(--m3-medal-silver)]';
    if (rank === 3) return 'text-[var(--m3-medal-bronze)]';
    return 'text-on-surface-variant';
  };

  /** The podium gets a medal, tinted by place; everyone else gets their number. */
  const getRankBadge = (rank: number) => {
    const tint = rank === 1 ? 'text-tertiary' : rank === 2 ? 'text-on-surface-variant' : 'text-primary';
    if (rank <= 3) {
      return <Icon name="medal" size={24} className={tint} label={t('global_leaderboard.rank', { rank })} />;
    }
    return <span>{`#${rank}`}</span>;
  };

  const currentMetric = metrics.find((m) => m.id === metric);

  return (
    <PageShell
      width="lg"
      back={false}
    >
        {/* Header */}
        <BackButton
          onClick={() => navigate(isAuthenticated ? '/' : '/login')}
          label={isAuthenticated ? t('common.back') : t('global_leaderboard.to_login')}
        />

        <div className="text-center mb-8">
          <h1 className="m3-headline-medium text-on-surface mb-2">
            {t('global_leaderboard.title')}
          </h1>
          <p className="m3-title-medium text-on-surface-variant">
            {t('global_leaderboard.subtitle')}
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
                  <span className="sm:hidden">{m.short}</span>
                </Chip>
              );
            })}
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <LoadingIndicator size={48} />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card variant="elevated" className="p-8 text-center">
            <p className="text-error mb-4">{error}</p>
            <Button
              variant="filled"
              icon={<RefreshCw size={20} />}
              onClick={loadLeaderboard}
              className="mx-auto"
            >
              {t('common.retry')}
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
              <IconButton label={t('global_leaderboard.refresh')} onClick={loadLeaderboard}>
                <RefreshCw size={20} />
              </IconButton>
            </div>

            {data.entries.length === 0 ? (
              <div className="text-center py-12 text-on-surface-variant">
                <Trophy size={48} className="mx-auto mb-4 opacity-50" />
                <p>{t('global_leaderboard.empty')}</p>
                <p className="m3-body-medium mt-2">{t('global_leaderboard.empty_hint')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.entries.map((entry, index) => (
                  <motion.div
                    key={entry.playerId}
                    {...staggerChild(Math.min(index, 12))}
                    className={`flex items-center gap-4 p-4 rounded-m3-md transition ${
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
                        {currentMetric ? currentMetric.format(entry.value) : entry.value}
                      </p>
                      <p className="m3-body-medium text-on-surface-variant">
                        {t('global_leaderboard.games', { count: entry.gamesPlayed })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {data.total > 0 && (
              <div className="mt-6 text-center m3-body-medium text-on-surface-variant">
                {t('global_leaderboard.entries', { count: data.total })}
              </div>
            )}
          </Card>
        )}

        {/* Call to Action */}
        {!isAuthenticated && (
          <Card variant="elevated" className="mt-8 p-8 text-center">
            <h3 className="m3-title-large text-on-surface mb-4">
              {t('global_leaderboard.cta_title')}
            </h3>
            <p className="m3-body-large text-on-surface-variant mb-6">
              {t('global_leaderboard.cta_text')}
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="success" onClick={() => navigate('/register')}>
                {t('global_leaderboard.register')}
              </Button>
              <Button variant="tonal" onClick={() => navigate('/login')}>
                {t('global_leaderboard.login')}
              </Button>
            </div>
          </Card>
        )}
        </PageShell>
  );
};

export default GlobalLeaderboard;
