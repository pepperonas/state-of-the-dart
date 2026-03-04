import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Lock, Star, Award, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAchievements } from '../../context/AchievementContext';
import { usePlayer } from '../../context/PlayerContext';
import {
  Achievement,
  AchievementCategory,
  AchievementScope,
  getTierColor,
  getRarityColor,
  getAchievementScope,
  getScopeColor,
  ACHIEVEMENTS,
} from '../../types/achievements';
import { formatDate } from '../../utils/dateUtils';
import logger from '../../utils/logger';

const AchievementsScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { players } = usePlayer();
  const {
    getPlayerProgress,
    getUnlockedAchievements,
    getLockedAchievements,
    isAchievementUnlocked,
  } = useAchievements();

  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(
    players.length > 0 ? players[0].id : ''
  );
  const [filterCategory, setFilterCategory] = useState<AchievementCategory | 'all'>('all');
  const [filterScope, setFilterScope] = useState<AchievementScope | 'all'>('all');
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false);

  const playerProgress = useMemo(() => {
    if (!selectedPlayerId) return null;
    const progress = getPlayerProgress(selectedPlayerId);
    logger.debug('[AchievementsScreen] Player progress', {
      playerId: selectedPlayerId,
      unlockedCount: progress.unlockedAchievements.length,
      totalPoints: progress.totalPoints,
    });
    return progress;
  }, [selectedPlayerId, getPlayerProgress]);

  const selectedPlayer = useMemo(() => {
    return players.find(p => p.id === selectedPlayerId);
  }, [players, selectedPlayerId]);

  const unlockedAchievements = useMemo(() => {
    if (!selectedPlayerId) return [];
    return getUnlockedAchievements(selectedPlayerId);
  }, [selectedPlayerId, getUnlockedAchievements]);

  const lockedAchievements = useMemo(() => {
    if (!selectedPlayerId) return [];
    return getLockedAchievements(selectedPlayerId);
  }, [selectedPlayerId, getLockedAchievements]);

  const filteredAchievements = useMemo(() => {
    let achievements = showOnlyUnlocked ? unlockedAchievements : ACHIEVEMENTS;

    if (filterCategory !== 'all') {
      achievements = achievements.filter(a => a.category === filterCategory);
    }

    if (filterScope !== 'all') {
      achievements = achievements.filter(a => getAchievementScope(a) === filterScope);
    }

    return achievements;
  }, [showOnlyUnlocked, unlockedAchievements, filterCategory, filterScope]);

  const categories: Array<AchievementCategory | 'all'> = [
    'all',
    'first_steps',
    'scoring',
    'checkout',
    'training',
    'consistency',
    'special',
    'master',
    'fail',
  ];

  const scopes: Array<AchievementScope | 'all'> = [
    'all', 'round', 'leg', 'match', 'career', 'training', 'event', 'meta',
  ];

  const completionPercentage = useMemo(() => {
    if (ACHIEVEMENTS.length === 0) return 0;
    return Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100);
  }, [unlockedAchievements]);

  const renderAchievementCard = (achievement: Achievement) => {
    const unlocked = isAchievementUnlocked(selectedPlayerId, achievement.id);
    const progress = playerProgress?.progress[achievement.id];
    const isHidden = achievement.hidden && !unlocked;

    return (
      <div
        key={achievement.id}
        className={`glass-card p-4 transition-all hover:scale-105 ${
          unlocked ? 'border-2 border-primary-500' : 'opacity-75'
        }`}
      >
        {/* Achievement Icon & Name */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`text-4xl flex-shrink-0 ${unlocked ? '' : 'grayscale opacity-50'}`}
            title={achievement.tier}
          >
            {isHidden ? '❓' : achievement.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-lg flex items-center gap-2 truncate">
              <span className="truncate">{isHidden ? '???' : achievement.name}</span>
              {unlocked && <Award size={16} className="text-primary-400 flex-shrink-0" />}
            </h3>
            <p className="text-sm text-dark-400 mt-1 line-clamp-2">
              {isHidden ? t('achievements.hidden_achievement') : achievement.description}
            </p>
          </div>
        </div>

        {/* Progress Bar (if not unlocked and has progress) */}
        {!unlocked && progress && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-dark-400 mb-1">
              <span>{t('achievements.progress')}</span>
              <span>
                {progress.current}/{progress.target}
              </span>
            </div>
            <div className="w-full bg-dark-800 rounded-full h-2">
              <div
                className="bg-primary-500 h-2 rounded-full transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Achievement Meta Info */}
        <div className="flex items-center justify-between text-xs flex-wrap gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="px-2 py-1 rounded font-semibold"
              style={{
                backgroundColor: getTierColor(achievement.tier) + '33',
                color: getTierColor(achievement.tier),
              }}
            >
              {achievement.tier.toUpperCase()}
            </span>
            {achievement.rarity && (
              <span
                className="px-2 py-1 rounded font-semibold"
                style={{
                  backgroundColor: getRarityColor(achievement.rarity) + '33',
                  color: getRarityColor(achievement.rarity),
                }}
              >
                {achievement.rarity.toUpperCase()}
              </span>
            )}
            {(() => {
              const scope = getAchievementScope(achievement);
              const scopeColor = getScopeColor(scope);
              return (
                <span
                  className="px-2 py-1 rounded font-semibold"
                  style={{
                    backgroundColor: scopeColor + '33',
                    color: scopeColor,
                  }}
                >
                  {t(`achievements.scope_${scope}`)}
                </span>
              );
            })()}
          </div>
          <div className="flex items-center gap-1 text-accent-400 font-bold">
            <Star size={14} />
            {achievement.points}
          </div>
        </div>

        {/* Unlocked Badge */}
        {unlocked && (
          <div className="mt-3 pt-3 border-t border-dark-700">
            <div className="flex items-center justify-between text-xs text-dark-400">
              <span className="flex items-center gap-1">
                <Trophy size={12} className="text-primary-400" />
                {t('achievements.unlocked')}
              </span>
              <span>
                {formatDate(
                  playerProgress?.unlockedAchievements.find(u => u.achievementId === achievement.id)
                    ?.unlockedAt
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (players.length === 0) {
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            {t('common.back')}
          </button>

          <div className="glass-card p-8 text-center">
            <Trophy size={64} className="mx-auto mb-4 text-dark-600" />
            <h2 className="text-2xl font-bold text-white mb-2">{t('achievements.no_players')}</h2>
            <p className="text-dark-400">
              {t('achievements.create_players_first')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={32} className="text-primary-400" />
            <h1 className="text-3xl font-bold text-white">{t('achievements.achievements')}</h1>
          </div>

          {/* Player Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-dark-300 mb-2">{t('achievements.player')}</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              className="w-full px-4 py-3 bg-dark-800 border border-dark-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stats Overview */}
          {selectedPlayer && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-900 rounded-lg p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary-400">
                  {unlockedAchievements.length}
                </div>
                <div className="text-sm text-dark-400 mt-1">{t('achievements.unlocked')}</div>
              </div>
              <div className="bg-dark-900 rounded-lg p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-dark-400">
                  {lockedAchievements.length}
                </div>
                <div className="text-sm text-dark-400 mt-1">{t('achievements.locked')}</div>
              </div>
              <div className="bg-dark-900 rounded-lg p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-accent-400">
                  {playerProgress?.totalPoints || 0}
                </div>
                <div className="text-sm text-dark-400 mt-1">{t('achievements.points')}</div>
              </div>
              <div className="bg-dark-900 rounded-lg p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-success-400">{completionPercentage}%</div>
                <div className="text-sm text-dark-400 mt-1">{t('achievements.completed')}</div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm text-dark-400 mb-2">
              <span>{t('achievements.total_progress')}</span>
              <span>
                {unlockedAchievements.length}/{ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="w-full bg-dark-800 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 text-white">
            <Filter size={20} />
            <span className="font-semibold">{t('achievements.filter')}</span>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filterCategory === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                {cat === 'all' ? t('achievements.all') : t(`achievements.category_${cat}`)}
              </button>
            ))}
          </div>

          {/* Scope Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {scopes.map((scope) => {
              const isActive = filterScope === scope;
              const color = scope === 'all' ? undefined : getScopeColor(scope);
              return (
                <button
                  key={scope}
                  onClick={() => setFilterScope(scope)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? scope === 'all'
                        ? 'bg-primary-500 text-white'
                        : 'text-white'
                      : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                  }`}
                  style={isActive && color ? { backgroundColor: color + '40', color } : undefined}
                >
                  {t(`achievements.scope_${scope}`)}
                </button>
              );
            })}
          </div>

          {/* Show Only Unlocked Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyUnlocked}
              onChange={(e) => setShowOnlyUnlocked(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-dark-300">{t('achievements.show_unlocked_only')}</span>
          </label>
        </div>

        {/* Achievements Grid */}
        {filteredAchievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement) => renderAchievementCard(achievement))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <Lock size={48} className="mx-auto mb-4 text-dark-600" />
            <p className="text-dark-400">
              {t('achievements.no_achievements_in_category')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AchievementsScreen;
