import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Target, Award, TrendingUp, Flame, Calendar,
  ArrowRight, Loader, Play, Users, Dumbbell, ArrowLeft, Crown, Clock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { usePlayer } from '../../context/PlayerContext';
import { api } from '../../services/api';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { Match } from '../../types';
import MatchDetailModal from './MatchDetailModal';

interface RecentActivity {
  id: string;
  type: 'match' | 'achievement' | 'training';
  title: string;
  description: string;
  timestamp: number;
  icon: string;
}

interface QuickStats {
  totalMatches: number;
  totalWins: number;
  winRate: number;
  currentStreak: number;
  averageScore: number;
  total180s: number;
}

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, trialDaysLeft, hasActiveSubscription } = useAuth();
  const { storage } = useTenant();
  const { players } = usePlayer();
  
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [mainPlayerId, setMainPlayerId] = useState<string | null>(null);
  const [mainPlayerLoaded, setMainPlayerLoaded] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [stats, setStats] = useState<QuickStats>({
    totalMatches: 0,
    totalWins: 0,
    winRate: 0,
    currentStreak: 0,
    averageScore: 0,
    total180s: 0,
  });

  useEffect(() => {
    const loadMainPlayer = async () => {
      try {
        const response = await api.auth.getMainPlayer();
        setMainPlayerId(response.mainPlayerId);
      } catch (error) {
        console.error('Failed to load main player:', error);
      } finally {
        setMainPlayerLoaded(true);
      }
    };
    loadMainPlayer();
  }, []);

  useEffect(() => {
    if (mainPlayerLoaded) {
      loadDashboardData();
    }
  }, [mainPlayerLoaded, mainPlayerId]);

  const loadDashboardData = async () => {
    setLoading(true);

    try {
      // Load matches from API (Database-First!)
      const matches = await api.matches.getAll();
      const allCompletedMatches = matches.filter((m: any) => m.status === 'completed');
      console.log('✅ Dashboard: Matches loaded from API:', matches.length);

      // Filter matches for main player (for stats calculation only)
      let completedMatches = allCompletedMatches;
      if (mainPlayerId) {
        completedMatches = allCompletedMatches.filter((m: any) =>
          m.players?.some((p: any) => p.playerId === mainPlayerId)
        );
        console.log(`📊 Dashboard: Filtered to ${completedMatches.length} matches for main player`);
      }

      // Calculate stats
      const totalMatches = completedMatches.length;
      let totalWins = 0;
      let total180s = 0;
      let totalScore = 0;
      let totalThrows = 0;

      completedMatches.forEach((match: any) => {
        // Count wins for main player or all matches if no main player
        if (mainPlayerId) {
          if (match.winner === mainPlayerId) {
            totalWins++;
          }
          // Only count stats for the main player
          const mainPlayer = match.players?.find((p: any) => p.playerId === mainPlayerId);
          if (mainPlayer) {
            total180s += mainPlayer.match180s || 0;
            totalScore += (mainPlayer.matchAverage || 0) * (mainPlayer.dartsThrown || 0);
            totalThrows += mainPlayer.dartsThrown || 0;
          }
        } else {
          // Fallback: aggregate all players' stats
          if (match.winner) {
            totalWins++;
          }
          match.players?.forEach((player: any) => {
            total180s += player.match180s || 0;
            totalScore += (player.matchAverage || 0) * (player.dartsThrown || 0);
            totalThrows += player.dartsThrown || 0;
          });
        }
      });

      const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
      const averageScore = totalThrows > 0 ? totalScore / totalThrows : 0;

      // Calculate streak (simplified) for main player
      let currentStreak = 0;
      for (let i = completedMatches.length - 1; i >= 0; i--) {
        const match = completedMatches[i] as any;
        if (mainPlayerId) {
          if (match.winner === mainPlayerId) {
            currentStreak++;
          } else {
            break;
          }
        } else {
          // Fallback
          if (match.winner) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      setStats({
        totalMatches,
        totalWins,
        winRate,
        currentStreak,
        averageScore,
        total180s,
      });

      // Load recent activities (use ALL matches, not filtered by main player)
      const recentActivities: RecentActivity[] = [];

      // Add recent matches (last 5)
      allCompletedMatches
        .slice(-5)
        .reverse()
        .forEach((match: any) => {
          // API returns snake_case fields
          const gameType = match.game_type || match.gameType || '501';
          const completedAt = match.completed_at || match.completedAt;
          recentActivities.push({
            id: match.id,
            type: 'match',
            title: match.winner ? 'Spiel gewonnen!' : 'Spiel beendet',
            description: `${gameType} - ${formatDateTime(completedAt)}`,
            timestamp: completedAt,
            icon: match.winner ? '🏆' : '🎯',
          });
        });

      // Sort by timestamp
      recentActivities.sort((a, b) => b.timestamp - a.timestamp);
      setActivities(recentActivities.slice(0, 10));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchClick = async (matchId: string) => {
    setLoadingMatch(true);
    try {
      // Load full match with legs and throws
      const match = await api.matches.getById(matchId);
      setSelectedMatch(match);
    } catch (error) {
      console.error('Failed to load match:', error);
    } finally {
      setLoadingMatch(false);
    }
  };

  const quickActions = [
    {
      title: 'Quick Game',
      icon: Play,
      gradient: 'from-primary-500 to-primary-600',
      onClick: () => navigate('/game'),
    },
    {
      title: 'Training',
      icon: Dumbbell,
      gradient: 'from-accent-500 to-accent-600',
      onClick: () => navigate('/training'),
    },
    {
      title: 'Players',
      icon: Users,
      gradient: 'from-success-500 to-success-600',
      onClick: () => navigate('/players'),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <Loader className="animate-spin text-primary-400" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Willkommen zurück, {user?.name}! 👋
          </h1>
          <p className="text-dark-300">
            {hasActiveSubscription ? (
              user?.subscriptionStatus === 'lifetime' ? (
                <span className="flex items-center gap-2">
                  <Trophy className="text-amber-400" size={18} />
                  <span>Lifetime Member</span>
                </span>
              ) : (
                'Premium Member'
              )
            ) : (
              <span>
                🎁 Noch <strong className="text-primary-400">{trialDaysLeft} Tage</strong> Trial
              </span>
            )}
          </p>
          {mainPlayerId && (
            <p className="text-sm text-dark-400 mt-1 flex items-center gap-1">
              <Crown size={16} className="text-amber-400" />
              Statistiken für: <strong className="text-white">{players.find(p => p.id === mainPlayerId)?.name || 'Unbekannt'}</strong>
            </p>
          )}
        </div>

        {/* Trial Banner */}
        {user?.subscriptionStatus === 'trial' && trialDaysLeft > 0 && (
          <div className="mb-8 glass-card p-4 rounded-xl bg-gradient-to-r from-primary-900/30 to-accent-900/30 border border-primary-500/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <Clock size={24} className="text-primary-400" />
                </div>
                <div>
                  <p className="font-bold text-white">
                    Premium-Trial: Noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'}
                  </p>
                  <p className="text-sm text-dark-300">
                    Genieße alle Premium-Features während deiner Testphase
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <Crown size={20} />
                Jetzt upgraden
              </button>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="glass-card p-4 rounded-xl">
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-2xl font-bold text-white">{stats.totalMatches}</p>
            <p className="text-sm text-dark-400">Matches</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="text-3xl mb-2">🏆</div>
            <p className="text-2xl font-bold text-white">{stats.totalWins}</p>
            <p className="text-sm text-dark-400">Siege</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="text-3xl mb-2">📊</div>
            <p className="text-2xl font-bold text-white">{stats.winRate.toFixed(0)}%</p>
            <p className="text-sm text-dark-400">Win Rate</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="text-3xl mb-2">🔥</div>
            <p className="text-2xl font-bold text-white">{stats.currentStreak}</p>
            <p className="text-sm text-dark-400">Streak</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="text-3xl mb-2">📈</div>
            <p className="text-2xl font-bold text-white">{stats.averageScore.toFixed(1)}</p>
            <p className="text-sm text-dark-400">Average</p>
          </div>

          <div className="glass-card p-4 rounded-xl">
            <div className="text-3xl mb-2">⚡</div>
            <p className="text-2xl font-bold text-white">{stats.total180s}</p>
            <p className="text-sm text-dark-400">180s</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 rounded-xl">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Calendar size={24} />
                Letzte Aktivitäten
              </h2>

              {activities.length === 0 ? (
                <div className="text-center py-12 text-dark-400">
                  <Target size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Noch keine Aktivitäten</p>
                  <p className="text-sm mt-2">Starte dein erstes Spiel!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-center gap-4 p-4 bg-dark-800 rounded-lg hover:bg-dark-700 transition-all cursor-pointer"
                      onClick={() => {
                        if (activity.type === 'match') {
                          handleMatchClick(activity.id);
                        }
                      }}
                    >
                      <div className="text-3xl">{activity.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold truncate">
                          {activity.title}
                        </p>
                        <p className="text-sm text-dark-400 truncate">
                          {activity.description}
                        </p>
                      </div>
                      <ArrowRight className="text-dark-500" size={20} />
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => navigate('/stats')}
                className="w-full mt-4 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <TrendingUp size={20} />
                Alle Statistiken anzeigen
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="glass-card p-6 rounded-xl mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
              <div className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.onClick}
                      className={`w-full py-4 bg-gradient-to-r ${action.gradient} hover:opacity-90 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg`}
                    >
                      <Icon size={20} />
                      {action.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Motivation Card */}
            <div className="glass-card p-6 rounded-xl bg-gradient-to-br from-primary-500/10 to-accent-500/10 border border-primary-500/30">
              <div className="text-center">
                <div className="text-5xl mb-3">🎯</div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {stats.currentStreak > 0 ? (
                    <>Du bist on fire! 🔥</>
                  ) : stats.totalMatches === 0 ? (
                    <>Let's get started!</>
                  ) : (
                    <>Keep going!</>
                  )}
                </h3>
                <p className="text-dark-300 text-sm">
                  {stats.currentStreak > 0
                    ? `${stats.currentStreak} Siege in Folge!`
                    : stats.totalMatches === 0
                    ? 'Spiele dein erstes Match!'
                    : 'Die nächste Serie wartet!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Match Detail Modal */}
        {selectedMatch && (
          <MatchDetailModal
            match={selectedMatch}
            onClose={() => setSelectedMatch(null)}
          />
        )}

        {/* Loading Overlay for Match */}
        {loadingMatch && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <Loader className="animate-spin text-primary-400" size={48} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
