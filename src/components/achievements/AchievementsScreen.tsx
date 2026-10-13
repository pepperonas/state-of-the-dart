import { shapePolygon, TIER_SHAPE } from '../../utils/shapes';
import React, { useState, useMemo } from 'react';
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
  getAchievementScope,
  ACHIEVEMENTS,
} from '../../types/achievements';
import { formatDate } from '../../utils/dateUtils';
import logger from '../../utils/logger';
import { Card, Chip, PageShell, Select, Switch } from '../common';
import { Icon, iconForEmoji } from '../icons';
import { readableTextOn } from '../../utils/color';
import { achievementName, achievementDescription } from '../../utils/achievementText';

const AchievementsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { players } = usePlayer();
  const {
    getPlayerProgress,
    getUnlockedAchievements,
    getLockedAchievements,
    isAchievementUnlocked,
  } = useAchievements();

  // The picked id only counts while that player exists; otherwise the first
  // player is shown. Taking players[0] as the initial state left the picker
  // empty, because the list is still loading on the first render (0.36.0).
  const [pickedPlayerId, setSelectedPlayerId] = useState<string>('');
  const selectedPlayerId = players.some(p => p.id === pickedPlayerId)
    ? pickedPlayerId
    : players[0]?.id ?? '';
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
      <PageShell title={t('achievements.achievements')} back={false}>

          <Card variant="filled" className="p-8 text-center">
            <Trophy size={64} className="mx-auto mb-4 text-on-surface-variant" />
            <h2 className="m3-headline-small text-on-surface mb-2">{t('achievements.no_players')}</h2>
            <p className="m3-body-medium text-on-surface-variant">
              {t('achievements.create_players_first')}
            </p>
          </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title={t('achievements.achievements')} back={false}>
        <Card variant="elevated" className="p-6 mb-6">

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
              <span data-testid="achievements-total">
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

        {/* Filters — 0.39.0: one row of categories; area and "unlocked only"
            sit beside it as a dropdown and a switch instead of a second row of
            nine chips and a checkbox inside a box. */}
        <div className="mb-6 space-y-3" data-testid="achievement-filters">
          <div role="group" aria-label={t('achievements.filter')} className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {categories.map(cat => (
              <Chip
                key={cat}
                selected={filterCategory === cat}
                onClick={() => setFilterCategory(cat)}
                className="shrink-0 whitespace-nowrap"
              >
                {cat === 'all' ? t('achievements.all') : t(`achievements.category_${cat}`)}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-on-surface-variant" aria-hidden="true" />
              <Select<AchievementScope | 'all'>
                value={filterScope}
                onChange={setFilterScope}
                size="sm"
                inline
                aria-label={t('achievements.scope_filter')}
                options={scopes.map(scope => ({ value: scope, label: t(`achievements.scope_${scope}`) }))}
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer min-h-12">
              <Switch checked={showOnlyUnlocked} onChange={setShowOnlyUnlocked} label={t('achievements.show_unlocked_only')} />
              <span className="m3-body-medium text-on-surface-variant" aria-hidden="true">{t('achievements.show_unlocked_only')}</span>
            </label>
          </div>
        </div>

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
    </PageShell>
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

  return (
    <Card
      variant={unlocked ? 'elevated' : 'filled'}
      // Locked cards are not dimmed as a whole — that pushed the description
      // below AA (3.99:1 in the light theme). Only the icon goes grey.
      className={`p-4 transition hover:scale-105 ${
        unlocked ? 'border-2 border-primary' : ''
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        {/* The outline tells the tier at a glance (circle → cookie → sunny →
            clover → gem); computed M3 Expressive shapes, utils/shapes.ts. */}
        {/* 0.39.0: the tier is the shape AND its colour once unlocked — the
            "BRONZE" chip said it a third time. */}
        <div
          className={`w-12 h-12 flex-shrink-0 flex items-center justify-center ${
            unlocked ? '' : 'bg-[color-mix(in_srgb,var(--m3-on-surface)_12%,transparent)] text-on-surface-variant'
          }`}
          style={{
            clipPath: shapePolygon(TIER_SHAPE[achievement.tier]),
            ...(unlocked ? { backgroundColor: getTierColor(achievement.tier), color: readableTextOn(getTierColor(achievement.tier)) } : {}),
          }}
          title={t(`achievement_toast.tier_${achievement.tier}`)}
          data-shape={TIER_SHAPE[achievement.tier]}
          data-testid="achievement-badge"
        >
          <Icon name={isHidden ? 'question' : iconForEmoji(achievement.icon)} size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="m3-title-medium text-on-surface flex items-center gap-2 truncate">
            <span className="truncate">{isHidden ? '???' : achievementName(achievement, t)}</span>
            {unlocked && <Award size={16} className="text-primary flex-shrink-0" />}
          </h3>
          <p className="m3-body-medium text-on-surface-variant mt-1 line-clamp-2">
            {isHidden ? t('achievements.hidden_achievement') : achievementDescription(achievement, t)}
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
        {/* Tier in words (the shape is not enough for a screen reader) and
            rarity as one quiet chip. The area lives in the filter only. */}
        <div className="flex items-center gap-2 flex-wrap m3-label-medium text-on-surface-variant" data-testid="achievement-meta">
          <span>{t(`achievement_toast.tier_${achievement.tier}`)}</span>
          {achievement.rarity && (
            <span className="px-2 py-0.5 rounded-m3-full border border-outline-variant">
              {t(`achievements.rarity_${achievement.rarity}`)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-m3-full bg-tertiary-container text-on-tertiary-container m3-label-medium">
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
