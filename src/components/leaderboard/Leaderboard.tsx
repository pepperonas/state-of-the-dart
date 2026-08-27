import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, Target, Zap, Award, Medal, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { playerTier } from '../../utils/playerOrder';
import { usePlayer } from '../../context/PlayerContext';
import { useAchievements } from '../../context/AchievementContext';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../services/api';
import { PersonalBests, createEmptyPersonalBests } from '../../types/personalBests';
import { ACHIEVEMENTS } from '../../types/achievements';
import { BackButton, Card, Chip, PageShell } from '../common';
import { motion } from 'framer-motion';
import { staggerChild } from '../../utils/motion';
import { Icon, iconForEmoji } from '../icons';

type LeaderboardCategory = 
  | 'average'
  | 'wins'
  | 'winRate'
  | '180s'
  | 'checkoutRate'
  | 'achievements'
  | 'totalPoints';

const Leaderboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players } = usePlayer();
  const { getAllPlayerProgress } = useAchievements();
  const { storage } = useTenant();
  const [category, setCategory] = useState<LeaderboardCategory>('average');

  const [allPersonalBests, setAllPersonalBests] = useState<Record<string, PersonalBests>>({});

  // Load personal bests from API (primary) with localStorage fallback
  useEffect(() => {
    // Load localStorage cache for instant UI
    if (storage) {
      const cached = storage.get<Record<string, PersonalBests>>('personalBests', {});
      if (Object.keys(cached).length > 0) {
        setAllPersonalBests(cached);
      }
    }

    // Fetch from API for each player
    const loadFromAPI = async () => {
      const result: Record<string, PersonalBests> = {};
      for (const player of players) {
        try {
          const response = await api.players.getPersonalBests(player.id);
          if (response?.data && Object.keys(response.data).length > 0) {
            result[player.id] = response.data;
          }
        } catch {
          // Fallback to localStorage for this player
        }
      }
      if (Object.keys(result).length > 0) {
        setAllPersonalBests(prev => ({ ...prev, ...result }));
      }
    };
    if (players.length > 0) {
      loadFromAPI();
    }
  }, [players, storage]);

  const achievementProgress = useMemo(() => {
    return getAllPlayerProgress();
  }, [getAllPlayerProgress]);

  const categories: Array<{
    id: LeaderboardCategory;
    name: string;
    icon: React.ReactNode;
    color: string;
  }> = [
    { id: 'average', name: 'Best Average', icon: <TrendingUp size={18} />, color: 'primary' },
    { id: 'wins', name: 'Most Wins', icon: <Trophy size={18} />, color: 'success' },
    { id: 'winRate', name: 'Win Rate', icon: <Target size={18} />, color: 'accent' },
    { id: '180s', name: 'Most 180s', icon: <Zap size={18} />, color: 'amber' },
    { id: 'checkoutRate', name: 'Checkout Rate', icon: <Target size={18} />, color: 'primary' },
    { id: 'achievements', name: 'Achievements', icon: <Award size={18} />, color: 'accent' },
    { id: 'totalPoints', name: 'Total Points', icon: <Crown size={18} />, color: 'amber' },
  ];

  const leaderboardData = useMemo(() => {
    return players.map((player) => {
      const pb = allPersonalBests[player.id] || createEmptyPersonalBests(player.id);
      const achievements = achievementProgress[player.id];
      const winRate = pb.totalGamesPlayed > 0 ? (pb.totalWins / pb.totalGamesPlayed) * 100 : 0;

      return {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
        tier: playerTier(player),
        average: pb.bestAverage.value,
        wins: pb.totalWins,
        winRate,
        total180s: pb.total180s,
        checkoutRate: pb.bestCheckoutRate.value,
        achievementsCount: achievements?.unlockedAchievements.length || 0,
        totalPoints: achievements?.totalPoints || 0,
        gamesPlayed: pb.totalGamesPlayed,
      };
    }).filter(p => p.gamesPlayed > 0); // Only show players with at least 1 game
  }, [players, allPersonalBests, achievementProgress]);

  const sortedData = useMemo(() => {
    const sorted = [...leaderboardData].sort((a, b) => {
      // Real accounts rank above bots and generated test profiles regardless of
      // the metric — a bot out-averaging the people who own the board reads as a
      // bug, not a result. Inside each group the chosen metric still decides.
      if (a.tier !== b.tier) return a.tier - b.tier;
      switch (category) {
        case 'average':
          return b.average - a.average;
        case 'wins':
          return b.wins - a.wins;
        case 'winRate':
          return b.winRate - a.winRate;
        case '180s':
          return b.total180s - a.total180s;
        case 'checkoutRate':
          return b.checkoutRate - a.checkoutRate;
        case 'achievements':
          return b.achievementsCount - a.achievementsCount;
        case 'totalPoints':
          return b.totalPoints - a.totalPoints;
        default:
          return 0;
      }
    });
    return sorted;
  }, [leaderboardData, category]);

  const getValue = (player: typeof leaderboardData[0]) => {
    switch (category) {
      case 'average':
        return player.average.toFixed(2);
      case 'wins':
        return player.wins.toString();
      case 'winRate':
        return `${player.winRate.toFixed(1)}%`;
      case '180s':
        return player.total180s.toString();
      case 'checkoutRate':
        return `${player.checkoutRate.toFixed(1)}%`;
      case 'achievements':
        return `${player.achievementsCount}/${ACHIEVEMENTS.length}`;
      case 'totalPoints':
        return player.totalPoints.toString();
      default:
        return '-';
    }
  };

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy size={24} className="text-amber-400" />;
      case 2:
        return <Medal size={24} className="text-gray-300" />;
      case 3:
        return <Medal size={24} className="text-orange-500" />;
      default:
        return <div className="text-lg font-bold text-on-surface-variant">#{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'border-amber-400 bg-amber-500/10';
      case 2:
        return 'border-gray-300 bg-gray-400/10';
      case 3:
        return 'border-orange-500 bg-orange-500/10';
      default:
        return 'border-outline-variant bg-surface-container';
    }
  };

  return (
    <PageShell
      width="md"
      back={false}
    >
        {/* Header */}
        <BackButton onClick={() => navigate('/')} />

        <Card variant="elevated" className="p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={32} className="text-amber-400" />
            <h1 className="m3-headline-medium text-on-surface">Leaderboard</h1>
          </div>

          {/* Category Selection */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                selected={category === cat.id}
                icon={cat.icon}
                onClick={() => setCategory(cat.id)}
              >
                {cat.name}
              </Chip>
            ))}
          </div>

          {/* Leaderboard List */}
          {sortedData.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={64} className="mx-auto text-on-surface-variant mb-4" />
              <p className="m3-title-medium text-on-surface">Noch keine Daten</p>
              <p className="m3-body-medium text-on-surface-variant mt-2">
                Spiele einige Matches, um im Leaderboard zu erscheinen!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedData.map((player, index) => {
                const rank = index + 1;
                return (
                  <motion.div
                    key={player.id}
                    {...staggerChild(Math.min(index, 12))}
                    onClick={() => navigate(`/players/${player.id}`)}
                    className={`flex items-center justify-between p-4 border-2 rounded-m3-lg transition-all cursor-pointer hover:scale-[1.02] ${getRankColor(
                      rank
                    )}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="flex-shrink-0 w-12 flex justify-center">
                        {getMedalIcon(rank)}
                      </div>

                      {/* Avatar & Name */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center text-2xl shadow-m3-1">
                          <Icon name={iconForEmoji(player.avatar)} size={22} />
                        </div>
                        <div>
                          <h3 className="m3-title-medium text-on-surface">{player.name}</h3>
                          <p className="m3-body-medium text-on-surface-variant">
                            {player.gamesPlayed} {player.gamesPlayed === 1 ? 'Spiel' : 'Spiele'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Value */}
                    <div className="text-right">
                      <div className="m3-title-large text-on-surface">{getValue(player)}</div>
                      <div className="m3-label-large text-on-surface-variant mt-1">
                        {categories.find((c) => c.id === category)?.name}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Stats Summary */}
          {sortedData.length > 0 && (
            <div className="mt-8 pt-6 border-t border-outline-variant">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="m3-title-large text-on-surface">{sortedData.length}</div>
                  <div className="m3-label-large text-on-surface-variant mt-1">Aktive Spieler</div>
                </div>
                <div className="text-center">
                  <div className="m3-title-large text-primary">
                    {(sortedData.reduce((sum, p) => sum + p.gamesPlayed, 0) / sortedData.length).toFixed(0)}
                  </div>
                  <div className="m3-label-large text-on-surface-variant mt-1">Ø Spiele</div>
                </div>
                <div className="text-center">
                  <div className="m3-title-large text-amber-400">
                    {sortedData.reduce((sum, p) => sum + p.total180s, 0)}
                  </div>
                  <div className="m3-label-large text-on-surface-variant mt-1">Total 180s</div>
                </div>
                <div className="text-center">
                  <div className="m3-title-large text-tertiary">
                    {sortedData.reduce((sum, p) => sum + p.achievementsCount, 0)}
                  </div>
                  <div className="m3-label-large text-on-surface-variant mt-1">Total Achievements</div>
                </div>
              </div>
            </div>
          )}
        </Card>
        </PageShell>
  );
};

export default Leaderboard;
