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
import { motion } from 'framer-motion';
import { BackButton, Button, Card, AnimatedNumber } from '../common';
import { staggerChild } from '../../utils/motion';

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
      // Request more matches to ensure we get all relevant ones
      const matches = await api.matches.getAll({ limit: '200', offset: '0' });
      const allCompletedMatches = matches.filter((m: any) => m.status === 'completed');
      console.log('✅ Dashboard: Matches loaded from API:', matches.length, 'Completed:', allCompletedMatches.length);

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

      // Load recent activities (only matches where main player participated)
      const recentActivities: RecentActivity[] = [];

      // Filter matches for main player (same as stats)
      const matchesForActivities = mainPlayerId 
        ? allCompletedMatches.filter((m: any) =>
            m.players?.some((p: any) => p.playerId === mainPlayerId)
          )
        : allCompletedMatches;

      // Add recent matches (last 5) - sorted by completedAt descending
      const sortedMatches = [...matchesForActivities].sort((a: any, b: any) => {
        const aTime = a.completedAt || a.completed_at || 0;
        const bTime = b.completedAt || b.completed_at || 0;
        return bTime - aTime;
      });

      sortedMatches
        .slice(0, 5)
        .forEach((match: any) => {
          // API returns 'type' field (from game_type in DB)
          // For x01 games, show the actual start score (301, 501, etc.) from settings
          let gameType = match.type || match.game_type || match.gameType || '501';
          if (gameType === 'x01' && match.settings?.startScore) {
            gameType = match.settings.startScore.toString();
          }
          const completedAt = match.completedAt || match.completed_at;
          
          // Get all player names in the match
          const matchPlayers = match.players || [];
          const playerNames = matchPlayers
            .map((p: any) => p.name || 'Unbekannt')
            .filter((name: string) => name !== 'Unbekannt')
            .join(' vs ');
          
          // Get winner player name
          const winnerPlayer = matchPlayers.find((p: any) => p.playerId === match.winner);
          const winnerName = winnerPlayer?.name || 'Unbekannt';
          
          // Determine title based on main player
          let title = 'Match gespielt';
          let icon = '🎯';
          
          if (match.winner) {
            if (mainPlayerId && match.winner === mainPlayerId) {
              title = 'Spiel gewonnen!';
              icon = '🏆';
            } else if (mainPlayerId) {
              // Main player lost - show who won
              title = `${winnerName} gewonnen`;
              icon = '🏆';
            } else {
              // No main player - show winner
              title = `${winnerName} gewonnen`;
              icon = '🏆';
            }
          }
          
          // Description: Show game type and players
          const description = playerNames 
            ? `${gameType} - ${playerNames} - ${formatDateTime(completedAt)}`
            : `${gameType} - ${formatDateTime(completedAt)}`;
          
          recentActivities.push({
            id: match.id,
            type: 'match',
            title,
            description,
            timestamp: completedAt,
            icon,
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
    // Prevent multiple simultaneous requests for the same match
    if (loadingMatch || (selectedMatch && selectedMatch.id === matchId)) {
      return;
    }
    
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
      <div className="min-h-dvh flex items-center justify-center gradient-mesh">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <BackButton onClick={() => navigate('/')} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="m3-headline-medium font-bold text-on-surface mb-2">
            Willkommen zurück, {user?.name}! 👋
          </h1>
          <p className="text-on-surface-variant">
            {hasActiveSubscription ? (
              user?.subscriptionStatus === 'lifetime' ? (
                <span className="flex items-center gap-2">
                  <Trophy className="text-tertiary" size={18} />
                  <span>Lifetime Member</span>
                </span>
              ) : (
                'Premium Member'
              )
            ) : (
              <span>
                🎁 Noch <strong className="text-primary">{trialDaysLeft} Tage</strong> Trial
              </span>
            )}
          </p>
          {mainPlayerId && (
            <p className="m3-body-small text-on-surface-variant mt-1 flex items-center gap-1">
              <Crown size={16} className="text-tertiary" />
              Statistiken für: <strong className="text-on-surface">{players.find(p => p.id === mainPlayerId)?.name || 'Unbekannt'}</strong>
            </p>
          )}
        </div>

        {/* Trial Banner */}
        {user?.subscriptionStatus === 'trial' && trialDaysLeft > 0 && (
          <Card variant="filled" className="mb-8 p-4 bg-primary-container text-on-primary-container">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-m3-full bg-surface-container-highest flex items-center justify-center">
                  <Clock size={24} className="text-primary" />
                </div>
                <div>
                  <p className="m3-title-medium font-bold text-on-primary-container">
                    Premium-Trial: Noch {trialDaysLeft} {trialDaysLeft === 1 ? 'Tag' : 'Tage'}
                  </p>
                  <p className="m3-body-small text-on-primary-container">
                    Genieße alle Premium-Features während deiner Testphase
                  </p>
                </div>
              </div>
              <Button
                variant="filled"
                onClick={() => navigate('/pricing')}
                icon={<Crown size={20} />}
                className="w-full sm:w-auto"
              >
                Jetzt upgraden
              </Button>
            </div>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <motion.div {...staggerChild(0)}>
            <Card variant="elevated" className="p-4">
              <div className="text-3xl mb-2">🎯</div>
              <p className="m3-headline-small font-bold text-on-surface"><AnimatedNumber value={stats.totalMatches} /></p>
              <p className="m3-body-small text-on-surface-variant">Matches</p>
            </Card>
          </motion.div>

          <motion.div {...staggerChild(1)}>
            <Card variant="elevated" className="p-4">
              <div className="text-3xl mb-2">🏆</div>
              <p className="m3-headline-small font-bold text-on-surface"><AnimatedNumber value={stats.totalWins} /></p>
              <p className="m3-body-small text-on-surface-variant">Siege</p>
            </Card>
          </motion.div>

          <motion.div {...staggerChild(2)}>
            <Card variant="elevated" className="p-4">
              <div className="text-3xl mb-2">📊</div>
              <p className="m3-headline-small font-bold text-on-surface"><AnimatedNumber value={stats.winRate} />%</p>
              <p className="m3-body-small text-on-surface-variant">Win Rate</p>
            </Card>
          </motion.div>

          <motion.div {...staggerChild(3)}>
            <Card variant="elevated" className="p-4">
              <div className="text-3xl mb-2">🔥</div>
              <p className="m3-headline-small font-bold text-on-surface"><AnimatedNumber value={stats.currentStreak} /></p>
              <p className="m3-body-small text-on-surface-variant">Streak</p>
            </Card>
          </motion.div>

          <motion.div {...staggerChild(4)}>
            <Card variant="elevated" className="p-4">
              <div className="text-3xl mb-2">📈</div>
              <p className="m3-headline-small font-bold text-on-surface"><AnimatedNumber value={stats.averageScore} decimals={1} /></p>
              <p className="m3-body-small text-on-surface-variant">Average</p>
            </Card>
          </motion.div>

          <motion.div {...staggerChild(5)}>
            <Card variant="elevated" className="p-4">
              <div className="text-3xl mb-2">⚡</div>
              <p className="m3-headline-small font-bold text-on-surface"><AnimatedNumber value={stats.total180s} /></p>
              <p className="m3-body-small text-on-surface-variant">180s</p>
            </Card>
          </motion.div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <Card variant="elevated" className="p-6">
              <h2 className="m3-title-large font-bold text-on-surface mb-6 flex items-center gap-2">
                <Calendar size={24} />
                Letzte Aktivitäten
              </h2>

              {activities.length === 0 ? (
                <div className="text-center py-12 text-on-surface-variant">
                  <Target size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Noch keine Aktivitäten</p>
                  <p className="m3-body-small mt-2">Starte dein erstes Spiel!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((activity) => (
                    <Card
                      variant="filled"
                      interactive
                      key={activity.id}
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => {
                        if (activity.type === 'match') {
                          handleMatchClick(activity.id);
                        }
                      }}
                    >
                      <div className="text-3xl">{activity.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-on-surface font-semibold truncate">
                          {activity.title}
                        </p>
                        <p className="m3-body-small text-on-surface-variant truncate">
                          {activity.description}
                        </p>
                      </div>
                      <ArrowRight className="text-on-surface-variant" size={20} />
                    </Card>
                  ))}
                </div>
              )}

              <Button
                variant="tonal"
                fullWidth
                onClick={() => navigate('/stats')}
                icon={<TrendingUp size={20} />}
                className="mt-4"
              >
                Alle Statistiken anzeigen
              </Button>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card variant="elevated" className="p-6 mb-6">
              <h2 className="m3-title-large font-bold text-on-surface mb-4">Quick Actions</h2>
              <div className="space-y-3">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant={index === 0 ? 'filled' : index === 1 ? 'accent' : 'success'}
                      fullWidth
                      size="lg"
                      onClick={action.onClick}
                      icon={<Icon size={20} />}
                    >
                      {action.title}
                    </Button>
                  );
                })}
              </div>
            </Card>

            {/* Motivation Card */}
            <Card variant="filled" className="p-6 bg-primary-container text-on-primary-container">
              <div className="text-center">
                <div className="text-5xl mb-3">🎯</div>
                <h3 className="m3-title-medium font-bold text-on-primary-container mb-2">
                  {stats.currentStreak > 0 ? (
                    <>Du bist on fire! 🔥</>
                  ) : stats.totalMatches === 0 ? (
                    <>Let's get started!</>
                  ) : (
                    <>Keep going!</>
                  )}
                </h3>
                <p className="text-on-primary-container m3-body-small">
                  {stats.currentStreak > 0
                    ? `${stats.currentStreak} Siege in Folge!`
                    : stats.totalMatches === 0
                    ? 'Spiele dein erstes Match!'
                    : 'Die nächste Serie wartet!'}
                </p>
              </div>
            </Card>
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
            <Loader className="animate-spin text-primary" size={48} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
