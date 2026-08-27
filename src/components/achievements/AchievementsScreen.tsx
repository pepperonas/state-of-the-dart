import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Lock, Star, Award, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { staggerChild } from '../../utils/motion';
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
import { BackButton, Card, Chip, Select } from '../common';
import { Icon, iconForEmoji } from '../icons';

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


  if (players.length === 0) {
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
        <div className="max-w-6xl mx-auto m3-view">
          <BackButton onClick={() => navigate('/')} />
          <h1 className="m3-headline-medium text-on-surface mb-6">{t('achievements.achievements')}</h1>

          <Card variant="filled" className="p-8 text-center">
            <Trophy size={64} className="mx-auto mb-4 text-on-surface-variant" />
            <h2 className="m3-headline-small text-on-surface mb-2">{t('achievements.no_players')}</h2>
            <p className="m3-body-medium text-on-surface-variant">
              {t('achievements.create_players_first')}
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <BackButton onClick={() => navigate('/')} />

        <Card variant="elevated" className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={32} className="text-primary" />
            <h1 className="m3-headline-medium text-on-surface">{t('achievements.achievements')}</h1>
          </div>

          {/* Player Selection */}
          <div className="mb-6">
            <label className="block m3-label-large text-on-surface-variant mb-2">{t('achievements.player')}</label>
            <Select<string>
              value={selectedPlayerId}
              onChange={setSelectedPlayerId}
              size="lg"
              aria-label={t('achievements.select_player', 'Spieler')}
              options={players.map((player) => ({ value: player.id, label: player.name }))}
            />
          </div>

          {/* Stats Overview */}
          {selectedPlayer && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-surface-container-low rounded-m3-md p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {unlockedAchievements.length}
                </div>
                <div className="m3-label-medium text-on-surface-variant mt-1">{t('achievements.unlocked')}</div>
              </div>
              <div className="bg-surface-container-low rounded-m3-md p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-on-surface-variant">
                  {lockedAchievements.length}
                </div>
                <div className="m3-label-medium text-on-surface-variant mt-1">{t('achievements.locked')}</div>
              </div>
              <div className="bg-surface-container-low rounded-m3-md p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-tertiary">
                  {playerProgress?.totalPoints || 0}
                </div>
                <div className="m3-label-medium text-on-surface-variant mt-1">{t('achievements.points')}</div>
              </div>
              <div className="bg-surface-container-low rounded-m3-md p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-success">{completionPercentage}%</div>
                <div className="m3-label-medium text-on-surface-variant mt-1">{t('achievements.completed')}</div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between m3-label-medium text-on-surface-variant mb-2">
              <span>{t('achievements.total_progress')}</span>
              <span>
                {unlockedAchievements.length}/{ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-m3-full h-3">
              <div
                className="bg-primary h-3 rounded-m3-full m3-progress-bar"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Filters */}
        <Card variant="filled" className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-3 text-on-surface">
            <Filter size={20} />
            <span className="m3-title-small">{t('achievements.filter')}</span>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat, i) => (
              <motion.div key={cat} {...staggerChild(Math.min(i, 8))}>
                <Chip
                  selected={filterCategory === cat}
                  onClick={() => setFilterCategory(cat)}
                >
                  {cat === 'all' ? t('achievements.all') : t(`achievements.category_${cat}`)}
                </Chip>
              </motion.div>
            ))}
          </div>

          {/* Scope Filter */}
          <div className="flex flex-wrap gap-2 mb-4">
            {scopes.map((scope, i) => {
              const isActive = filterScope === scope;
              const color = scope === 'all' ? undefined : getScopeColor(scope);
              return (
                <motion.div key={scope} {...staggerChild(Math.min(i, 8))}>
                  <Chip
                    selected={isActive}
                    onClick={() => setFilterScope(scope)}
                    style={isActive && color ? { backgroundColor: color + '40', color, borderColor: color } : undefined}
                  >
                    {t(`achievements.scope_${scope}`)}
                  </Chip>
                </motion.div>
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
            <span className="m3-body-medium text-on-surface-variant">{t('achievements.show_unlocked_only')}</span>
          </label>
        </Card>

        {/* Achievements Grid */}
        {filteredAchievements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAchievements.map((achievement, index) => (
              <motion.div key={achievement.id} {...staggerChild(Math.min(index, 10))}>
                <AchievementCard
                  achievement={achievement}
                  unlocked={isAchievementUnlocked(selectedPlayerId, achievement.id)}
                  progress={playerProgress?.progress[achievement.id]}
                  unlockedAt={
                    playerProgress?.unlockedAchievements.find(u => u.achievementId === achievement.id)?.unlockedAt
                  }
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <Card variant="filled" className="p-8 text-center">
            <Lock size={48} className="mx-auto mb-4 text-on-surface-variant" />
            <p className="m3-body-medium text-on-surface-variant">
              {t('achievements.no_achievements_in_category')}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

interface AchievementCardProps {
  achievement: Achievement;
  unlocked: boolean;
  progress: { current: number; target: number; percentage: number } | undefined;
  unlockedAt: Date | string | undefined;
}

const AchievementCard = React.memo<AchievementCardProps>(({ achievement, unlocked, progress, unlockedAt }) => {
  const { t } = useTranslation();
  const isHidden = achievement.hidden && !unlocked;
  const scope = getAchievementScope(achievement);
  const scopeColor = getScopeColor(scope);

  return (
    <Card
      variant={unlocked ? 'elevated' : 'filled'}
      className={`p-4 transition-all hover:scale-105 ${
        unlocked ? 'border-2 border-primary' : 'opacity-75'
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`text-4xl flex-shrink-0 ${unlocked ? '' : 'grayscale opacity-50'}`}
          title={achievement.tier}
        >
          <Icon name={isHidden ? 'question' : iconForEmoji(achievement.icon)} size={30} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="m3-title-medium text-on-surface flex items-center gap-2 truncate">
            <span className="truncate">{isHidden ? '???' : achievement.name}</span>
            {unlocked && <Award size={16} className="text-primary flex-shrink-0" />}
          </h3>
          <p className="m3-body-medium text-on-surface-variant mt-1 line-clamp-2">
            {isHidden ? t('achievements.hidden_achievement') : achievement.description}
          </p>
        </div>
      </div>

      {!unlocked && progress && (
        <div className="mb-3">
          <div className="flex justify-between m3-label-medium text-on-surface-variant mb-1">
            <span>{t('achievements.progress')}</span>
            <span>
              {progress.current}/{progress.target}
            </span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-m3-full h-2">
            <div
              className="bg-primary h-2 rounded-m3-full m3-progress-bar"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      )}

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
          <span
            className="px-2 py-1 rounded font-semibold"
            style={{
              backgroundColor: scopeColor + '33',
              color: scopeColor,
            }}
          >
            {t(`achievements.scope_${scope}`)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-tertiary font-bold">
          <Star size={14} />
          {achievement.points}
        </div>
      </div>

      {unlocked && (
        <div className="mt-3 pt-3 border-t border-outline-variant">
          <div className="flex items-center justify-between m3-label-medium text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Trophy size={12} className="text-primary" />
              {t('achievements.unlocked')}
            </span>
            <span>{formatDate(unlockedAt)}</span>
          </div>
        </div>
      )}
    </Card>
  );
});

export default AchievementsScreen;
