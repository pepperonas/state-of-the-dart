import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, TrendingUp, Target, Zap, Award, Medal, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '../../context/PlayerContext';
import { useAchievements } from '../../context/AchievementContext';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../services/api';
import { PersonalBests, createEmptyPersonalBests } from '../../types/personalBests';
import { ACHIEVEMENTS } from '../../types/achievements';

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
        return <Medal size={24} className="text-gray-400" />;
      case 3:
        return <Medal size={24} className="text-amber-600" />;
      default:
        return <div className="text-lg font-bold text-dark-500">#{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'border-amber-400 bg-amber-500/10';
      case 2:
        return 'border-gray-400 bg-gray-500/10';
      case 3:
        return 'border-amber-600 bg-amber-600/10';
      default:
        return 'border-dark-700 bg-dark-900/50';
    }
  };

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <div className="glass-card p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={32} className="text-amber-400" />
            <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          </div>

          {/* Category Selection */}
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  category === cat.id
                    ? `bg-${cat.color}-500 text-white shadow-lg scale-105`
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                {cat.icon}
                <span>{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Leaderboard List */}
          {sortedData.length === 0 ? (
            <div className="text-center py-12">
              <Trophy size={64} className="mx-auto text-dark-600 mb-4" />
              <p className="text-white text-lg font-semibold">Noch keine Daten</p>
              <p className="text-dark-400 text-sm mt-2">
                Spiele einige Matches, um im Leaderboard zu erscheinen!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedData.map((player, index) => {
                const rank = index + 1;
                return (
                  <div
                    key={player.id}
                    onClick={() => navigate(`/players/${player.id}`)}
                    className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all cursor-pointer hover:scale-[1.02] ${getRankColor(
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
                        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
                          {player.avatar}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-lg">{player.name}</h3>
                          <p className="text-sm text-dark-400">
                            {player.gamesPlayed} {player.gamesPlayed === 1 ? 'Spiel' : 'Spiele'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Value */}
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{getValue(player)}</div>
                      <div className="text-xs text-dark-400 mt-1">
                        {categories.find((c) => c.id === category)?.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stats Summary */}
          {sortedData.length > 0 && (
            <div className="mt-8 pt-6 border-t border-dark-700">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{sortedData.length}</div>
                  <div className="text-xs text-dark-400 mt-1">Aktive Spieler</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-400">
                    {(sortedData.reduce((sum, p) => sum + p.gamesPlayed, 0) / sortedData.length).toFixed(0)}
                  </div>
                  <div className="text-xs text-dark-400 mt-1">Ø Spiele</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {sortedData.reduce((sum, p) => sum + p.total180s, 0)}
                  </div>
                  <div className="text-xs text-dark-400 mt-1">Total 180s</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-400">
                    {sortedData.reduce((sum, p) => sum + p.achievementsCount, 0)}
                  </div>
                  <div className="text-xs text-dark-400 mt-1">Total Achievements</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
