import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Target, TrendingUp, Award, Calendar, Zap, Star, Flame, Trash2, AlertTriangle, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlayer } from '../../context/PlayerContext';
import { useAchievements } from '../../context/AchievementContext';
import { useTenant } from '../../context/TenantContext';
import { api } from '../../services/api';
import { PersonalBests, createEmptyPersonalBests } from '../../types/personalBests';
import { LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DartboardHeatmapBlur } from '../dartboard/DartboardHeatmapBlur';
import { calculateAccuracyStats } from '../../utils/heatmap';
import { formatDate } from '../../utils/dateUtils';
import { ACHIEVEMENTS } from '../../types/achievements';
import PlayerAvatar from './PlayerAvatar';

const PlayerProfile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { playerId } = useParams<{ playerId: string }>();
  const { players, getPlayerHeatmap, refreshPlayers } = usePlayer();
  const { getPlayerProgress, getUnlockedAchievements, resetPlayerAchievements } = useAchievements();
  const { storage } = useTenant();

  const player = useMemo(() => {
    return players.find(p => p.id === playerId);
  }, [players, playerId]);

  const achievements = useMemo(() => {
    if (!playerId) return [];
    return getUnlockedAchievements(playerId);
  }, [playerId, getUnlockedAchievements]);

  const achievementProgress = useMemo(() => {
    if (!playerId) return null;
    return getPlayerProgress(playerId);
  }, [playerId, getPlayerProgress]);

  // Convert player stats to PersonalBests format
  const personalBests = useMemo((): PersonalBests => {
    if (!player) return createEmptyPersonalBests(playerId || '');
    
    return {
      playerId: player.id,
      bestAverage: {
        value: player.stats.bestAverage || 0,
        date: new Date(),
        gameId: ''
      },
      highestScore: {
        value: 180, // Max possible score (will be tracked separately in future)
        date: new Date(),
        gameId: ''
      },
      bestCheckoutRate: {
        value: player.stats.checkoutPercentage || 0,
        date: new Date(),
        gameId: ''
      },
      highestCheckout: {
        value: player.stats.highestCheckout || 0,
        date: new Date(),
        gameId: ''
      },
      most180s: {
        value: player.stats.total180s || 0,
        date: new Date(),
        gameId: ''
      },
      mostLegsWon: {
        value: player.stats.totalLegsWon || 0,
        date: new Date(),
        gameId: ''
      },
      longestWinningStreak: {
        value: 0, // TODO: Calculate from matches
        startDate: new Date(),
        endDate: new Date()
      },
      shortestLeg: {
        darts: player.stats.bestLeg || 999,
        date: new Date(),
        gameId: ''
      },
      totalGamesPlayed: player.stats.gamesPlayed || 0,
      totalWins: player.stats.gamesWon || 0,
      totalLosses: (player.stats.gamesPlayed - player.stats.gamesWon) || 0,
      totalLegsWon: player.stats.totalLegsWon || 0,
      totalLegsLost: (player.stats.totalLegsPlayed - player.stats.totalLegsWon) || 0,
      total180s: player.stats.total180s || 0,
      totalCheckouts: 0, // TODO: Track separately
      firstGameDate: undefined,
      lastGameDate: undefined
    };
  }, [player, playerId]);

  const recentMatches = useMemo((): any[] => {
    // TODO: Load matches from API
    // For now, return empty array as matches are not yet loaded from backend
    return [];
  }, [playerId]);

  // Performance chart data
  const performanceData = useMemo(() => {
    if (recentMatches.length === 0) return [];
    
    return recentMatches.map((match, index) => {
      const playerData = match.players?.find((p: any) => p.playerId === playerId);
      return {
        game: `#${recentMatches.length - index}`,
        average: playerData?.matchAverage || 0,
        checkoutRate: playerData?.checkoutAttempts > 0
          ? (playerData.checkoutsHit / playerData.checkoutAttempts) * 100
          : 0,
      };
    }).reverse();
  }, [recentMatches, playerId]);

  // Radar chart data - use player.stats directly
  const radarData = useMemo(() => {
    if (!player) return [];
    
    const stats = player.stats;
    return [
      { skill: 'Average', value: Math.min((stats.averageOverall / 80) * 100, 100), max: 100 },
      { skill: 'Checkout', value: stats.checkoutPercentage || 0, max: 100 },
      { skill: '180s', value: Math.min((stats.total180s / 20) * 100, 100), max: 100 },
      { skill: 'Consistency', value: stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0, max: 100 },
      { skill: 'Achievements', value: achievementProgress ? (achievementProgress.unlockedAchievements.length / ACHIEVEMENTS.length) * 100 : 0, max: 100 },
    ];
  }, [player, achievementProgress]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    if (!playerId) return null;
    return getPlayerHeatmap(playerId);
  }, [playerId, getPlayerHeatmap]);

  // Accuracy stats
  const accuracyStats = useMemo(() => {
    if (!heatmapData) return null;
    return calculateAccuracyStats(heatmapData);
  }, [heatmapData]);

  // Reset stats state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleResetStats = async () => {
    if (!playerId) return;
    setResetting(true);
    try {
      await api.players.resetStats(playerId);
      resetPlayerAchievements(playerId);
      await refreshPlayers();
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Failed to reset stats:', error);
    } finally {
      setResetting(false);
    }
  };

  if (!player || !playerId) {
    return (
      <div className="min-h-screen p-4 md:p-8 gradient-mesh">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/players')}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>
          <div className="glass-card p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Spieler nicht gefunden</h2>
          </div>
        </div>
      </div>
    );
  }

  const winRate = personalBests.totalGamesPlayed > 0
    ? (personalBests.totalWins / personalBests.totalGamesPlayed) * 100
    : 0;

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/players')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        {/* Player Info Card */}
        <div className="glass-card p-6 md:p-8 mb-6">
          <div className="flex items-start gap-6">
            <PlayerAvatar avatar={player.avatar} name={player.name} size="xl" showBadge={true} />
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{player.name}</h1>
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-2 text-primary-400">
                  <Trophy size={18} />
                  <span className="font-semibold">{personalBests.totalWins} Siege</span>
                </div>
                <div className="flex items-center gap-2 text-accent-400">
                  <Star size={18} />
                  <span className="font-semibold">{achievementProgress?.totalPoints || 0} Punkte</span>
                </div>
                <div className="flex items-center gap-2 text-success-400">
                  <Award size={18} />
                  <span className="font-semibold">{achievements.length}/{ACHIEVEMENTS.length} Achievements</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="text-xs text-dark-400 mb-1">Spiele</div>
                  <div className="text-xl font-bold text-white">{personalBests.totalGamesPlayed}</div>
                </div>
                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="text-xs text-dark-400 mb-1">Siegrate</div>
                  <div className="text-xl font-bold text-success-400">{winRate.toFixed(1)}%</div>
                </div>
                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="text-xs text-dark-400 mb-1">Best Avg</div>
                  <div className="text-xl font-bold text-primary-400">
                    {personalBests.bestAverage.value.toFixed(2)}
                  </div>
                </div>
                <div className="bg-dark-900 rounded-lg p-3">
                  <div className="text-xs text-dark-400 mb-1">Total 180s</div>
                  <div className="text-xl font-bold text-accent-400">{personalBests.total180s}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Bests */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="text-amber-400" size={24} />
            Personal Bests
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-dark-900 rounded-lg p-4 border-2 border-amber-500/30">
              <div className="text-amber-400 text-sm mb-1">🎯 Höchster Score</div>
              <div className="text-2xl font-bold text-white">{personalBests.highestScore.value}</div>
              <div className="text-xs text-dark-500 mt-1">
                {formatDate(personalBests.highestScore.date)}
              </div>
            </div>
            <div className="bg-dark-900 rounded-lg p-4 border-2 border-primary-500/30">
              <div className="text-primary-400 text-sm mb-1">📊 Bester Average</div>
              <div className="text-2xl font-bold text-white">
                {personalBests.bestAverage.value.toFixed(2)}
              </div>
              <div className="text-xs text-dark-500 mt-1">
                {formatDate(personalBests.bestAverage.date)}
              </div>
            </div>
            <div className="bg-dark-900 rounded-lg p-4 border-2 border-accent-500/30">
              <div className="text-accent-400 text-sm mb-1">🔥 Meiste 180s</div>
              <div className="text-2xl font-bold text-white">{personalBests.most180s.value}</div>
              <div className="text-xs text-dark-500 mt-1">
                {formatDate(personalBests.most180s.date)}
              </div>
            </div>
            <div className="bg-dark-900 rounded-lg p-4 border-2 border-success-500/30">
              <div className="text-success-400 text-sm mb-1">🎯 Höchster Checkout</div>
              <div className="text-2xl font-bold text-white">{personalBests.highestCheckout.value}</div>
              <div className="text-xs text-dark-500 mt-1">
                {personalBests.highestCheckout.value > 0
                  ? formatDate(personalBests.highestCheckout.date)
                  : '-'}
              </div>
            </div>
            <div className="bg-dark-900 rounded-lg p-4 border-2 border-primary-500/30">
              <div className="text-primary-400 text-sm mb-1">✅ Beste Checkout-Quote</div>
              <div className="text-2xl font-bold text-white">
                {personalBests.bestCheckoutRate.value.toFixed(1)}%
              </div>
              <div className="text-xs text-dark-500 mt-1">
                {personalBests.bestCheckoutRate.value > 0
                  ? formatDate(personalBests.bestCheckoutRate.date)
                  : '-'}
              </div>
            </div>
            <div className="bg-dark-900 rounded-lg p-4 border-2 border-amber-500/30">
              <div className="text-amber-400 text-sm mb-1">⚡ Kürzestes Leg</div>
              <div className="text-2xl font-bold text-white">
                {personalBests.shortestLeg.darts < 999 ? `${personalBests.shortestLeg.darts} Darts` : '-'}
              </div>
              <div className="text-xs text-dark-500 mt-1">
                {personalBests.shortestLeg.darts < 999
                  ? formatDate(personalBests.shortestLeg.date)
                  : '-'}
              </div>
            </div>
            <div className="bg-dark-900 rounded-lg p-4 border-2 border-success-500/30">
              <div className="text-success-400 text-sm mb-1">🏆 Längste Siegesserie</div>
              <div className="text-2xl font-bold text-white">{personalBests.longestWinningStreak.value}</div>
              <div className="text-xs text-dark-500 mt-1">
                {personalBests.longestWinningStreak.value > 0 ? 'Spiele' : '-'}
              </div>
            </div>
            <div className="bg-dark-900 rounded-lg p-4 border-2 border-accent-500/30">
              <div className="text-accent-400 text-sm mb-1">🎯 Meiste Legs gewonnen</div>
              <div className="text-2xl font-bold text-white">{personalBests.mostLegsWon.value}</div>
              <div className="text-xs text-dark-500 mt-1">
                {personalBests.mostLegsWon.value > 0
                  ? formatDate(personalBests.mostLegsWon.date)
                  : '-'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Performance Chart */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Performance Entwicklung
            </h3>
            {performanceData.length > 0 ? (
              <div className="bg-dark-900 rounded-lg p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="game" stroke="#737373" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#737373" style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #404040',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="average" stroke="#0ea5e9" strokeWidth={2} name="Average" />
                    <Line
                      type="monotone"
                      dataKey="checkoutRate"
                      stroke="#22c55e"
                      strokeWidth={2}
                      name="Checkout %"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center text-dark-400 py-8">Noch keine Matches gespielt</div>
            )}
          </div>

          {/* Skills Radar */}
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Target size={20} />
              Skill Profile
            </h3>
            <div className="bg-dark-900 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#404040" />
                  <PolarAngleAxis dataKey="skill" stroke="#737373" style={{ fontSize: '12px' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#404040" />
                  <Radar
                    name="Skills"
                    dataKey="value"
                    stroke="#0ea5e9"
                    fill="#0ea5e9"
                    fillOpacity={0.5}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #404040',
                      borderRadius: '8px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Heatmap Section - ALWAYS SHOW */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Flame className="text-primary-400" size={24} />
            🎯 Wurf-Heatmap
          </h2>
          
          {heatmapData && heatmapData.totalDarts > 0 ? (
            <>
              {/* Accuracy Stats */}
              {accuracyStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-dark-900 rounded-lg p-3 text-center">
                    <div className="text-sm text-dark-400 mb-1">Miss Rate</div>
                    <div className="text-xl font-bold text-red-400">
                      {accuracyStats.missRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-3 text-center">
                    <div className="text-sm text-dark-400 mb-1">Triple Rate</div>
                    <div className="text-xl font-bold text-success-400">
                      {accuracyStats.tripleRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-3 text-center">
                    <div className="text-sm text-dark-400 mb-1">Double Rate</div>
                    <div className="text-xl font-bold text-primary-400">
                      {accuracyStats.doubleRate.toFixed(1)}%
                    </div>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-3 text-center">
                    <div className="text-sm text-dark-400 mb-1">Lieblings-Feld</div>
                    <div className="text-xl font-bold text-amber-400">
                      {accuracyStats.favoriteSegment || '-'}
                    </div>
                  </div>
                  <div className="bg-dark-900 rounded-lg p-3 text-center">
                    <div className="text-sm text-dark-400 mb-1">Total Darts</div>
                    <div className="text-xl font-bold text-white">
                      {heatmapData.totalDarts}
                    </div>
                  </div>
                </div>
              )}

              <DartboardHeatmapBlur heatmapData={heatmapData} size={500} />
            </>
          ) : (
            <div className="bg-dark-900 rounded-lg p-8 text-center border-2 border-dashed border-dark-700">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-white mb-2">Noch keine Wurf-Daten</h3>
              <p className="text-dark-300 mb-4">
                Spiele ein Match, um deine Wurf-Heatmap zu sehen!
              </p>
              <p className="text-dark-400 text-sm">
                Die Heatmap zeigt dir, wo du am häufigsten triffst:
              </p>
              <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span className="text-dark-300">Hot-Zones (oft getroffen)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                  <span className="text-dark-300">Cold-Zones (selten getroffen)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Achievements */}
        {achievements.length > 0 && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Award className="text-amber-400" size={24} />
              Neueste Achievements ({achievements.length}/{ACHIEVEMENTS.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {achievements.slice(0, 10).map((achievement) => (
                <div
                  key={achievement.id}
                  className="bg-dark-900 rounded-lg p-3 text-center hover:bg-dark-800 transition-colors"
                >
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <div className="text-sm font-semibold text-white mb-1">{achievement.name}</div>
                  <div className="text-xs text-amber-400">+{achievement.points}</div>
                </div>
              ))}
            </div>
            {achievements.length > 10 && (
              <button
                onClick={() => navigate('/achievements')}
                className="mt-4 w-full py-2 text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                Alle {achievements.length} Achievements anzeigen →
              </button>
            )}
          </div>
        )}

        {/* Career Timeline */}
        {personalBests.firstGameDate && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar size={24} />
              Karriere
            </h2>
            <div className="flex items-center justify-between text-dark-300">
              <div>
                <div className="text-sm text-dark-500">Erstes Spiel</div>
                <div className="text-lg font-semibold text-white">
                  {formatDate(personalBests.firstGameDate, { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <div className="flex-1 mx-4 h-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full" />
              <div className="text-right">
                <div className="text-sm text-dark-500">Letztes Spiel</div>
                <div className="text-lg font-semibold text-white">
                  {personalBests.lastGameDate
                    ? formatDate(personalBests.lastGameDate, { year: 'numeric', month: 'long', day: 'numeric' })
                    : '-'}
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 md:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{personalBests.totalGamesPlayed}</div>
                <div className="text-xs text-dark-400 mt-1">Spiele</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success-400">{personalBests.totalWins}</div>
                <div className="text-xs text-dark-400 mt-1">Siege</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-dark-400">{personalBests.totalLosses}</div>
                <div className="text-xs text-dark-400 mt-1">Niederlagen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-400">{personalBests.totalLegsWon}</div>
                <div className="text-xs text-dark-400 mt-1">Legs Gewonnen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-400">{personalBests.total180s}</div>
                <div className="text-xs text-dark-400 mt-1">180s</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{personalBests.totalCheckouts}</div>
                <div className="text-xs text-dark-400 mt-1">Checkouts</div>
              </div>
            </div>
          </div>
        )}

        {/* Reset Stats */}
        <div className="glass-card p-6 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle size={20} />
                {t('players.reset_stats')}
              </h3>
              <p className="text-sm text-dark-400 mt-1">
                {t('players.reset_stats_confirm_text', { name: player.name })}
              </p>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="ml-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg font-semibold transition-all flex items-center gap-2 flex-shrink-0"
            >
              <Trash2 size={18} />
              {t('players.reset_stats')}
            </button>
          </div>
        </div>

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowResetConfirm(false)}>
            <div className="glass-card p-6 rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-red-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">{t('players.reset_stats_confirm_title')}</h3>
              </div>
              <p className="text-dark-300 mb-6">
                {t('players.reset_stats_confirm_text', { name: player.name })}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetting}
                  className="flex-1 px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleResetStats}
                  disabled={resetting}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {resetting ? (
                    <Loader className="animate-spin" size={18} />
                  ) : (
                    <Trash2 size={18} />
                  )}
                  {resetting ? t('common.loading') : t('players.reset_stats')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerProfile;
