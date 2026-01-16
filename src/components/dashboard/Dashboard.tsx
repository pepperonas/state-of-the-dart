import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Target, Award, TrendingUp, Flame, Calendar,
  ArrowRight, Loader, Play, Users, Dumbbell, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

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
  const navigate = useNavigate();
  const { user, trialDaysLeft, hasActiveSubscription } = useAuth();
  const { storage } = useTenant();
  
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [stats, setStats] = useState<QuickStats>({
    totalMatches: 0,
    totalWins: 0,
    winRate: 0,
    currentStreak: 0,
    averageScore: 0,
    total180s: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, [storage]);

  const loadDashboardData = () => {
    if (!storage) {
      setLoading(false);
      return;
    }

    try {
      // Load matches
      const matches = storage.get('matches', []);
      const completedMatches = matches.filter((m: any) => m.status === 'completed');
      
      // Calculate stats
      const totalMatches = completedMatches.length;
      let totalWins = 0;
      let total180s = 0;
      let totalScore = 0;
      let totalThrows = 0;

      completedMatches.forEach((match: any) => {
        if (match.winner) {
          totalWins++;
        }
        
        match.players?.forEach((player: any) => {
          total180s += player.match180s || 0;
          totalScore += (player.matchAverage || 0) * (player.dartsThrown || 0);
          totalThrows += player.dartsThrown || 0;
        });
      });

      const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;
      const averageScore = totalThrows > 0 ? totalScore / totalThrows : 0;

      // Calculate streak (simplified)
      let currentStreak = 0;
      for (let i = completedMatches.length - 1; i >= 0; i--) {
        const match = completedMatches[i] as any;
        if (match.winner) {
          currentStreak++;
        } else {
          break;
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

      // Load recent activities
      const recentActivities: RecentActivity[] = [];

      // Add recent matches (last 5)
      completedMatches
        .slice(-5)
        .reverse()
        .forEach((match: any) => {
          recentActivities.push({
            id: match.id,
            type: 'match',
            title: match.winner ? 'Spiel gewonnen!' : 'Spiel beendet',
            description: `${match.gameType} - ${new Date(match.completedAt).toLocaleDateString()}`,
            timestamp: match.completedAt,
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
          className="mb-6 flex items-center gap-2 text-white hover:text-primary-400 transition-colors group"
        >
          <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Zurück zum Hauptmenü</span>
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
        </div>

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
                          navigate('/stats');
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
      </div>
    </div>
  );
};

export default Dashboard;
