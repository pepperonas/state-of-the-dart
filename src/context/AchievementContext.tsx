import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useTenant } from './TenantContext';
import { TenantStorage } from '../utils/storage';
import { api } from '../services/api';
import {
  Achievement,
  AchievementCategory,
  UnlockedAchievement,
  PlayerAchievementProgress,
  AchievementNotification,
  ACHIEVEMENTS,
  getAchievementById,
} from '../types/achievements';
import logger from '../utils/logger';

// Cumulative metrics that should use increment mode
const CUMULATIVE_METRICS = new Set([
  'games_played', 'wins', 'score_180', 'training_completed', 'checkouts',
  'triples_hit', 'doubles_hit', 'singles_hit', 'bullseye_hit', 'outer_bull_hit',
  'single_bull_hit', 'triple_20_hit', 'triple_19_hit', 'triple_18_hit', 'triple_17_hit',
  'score_100_plus', 'score_60_plus', 'score_80_plus', 'score_150_plus',
  'perfect_checkout', 'checkout_d20', 'checkout_d16', 'checkout_d12', 'checkout_d18', 'checkout_d1',
  'checkout_bullseye', 'weekend_games', 'late_night_games', 'early_morning_wins',
  'lunch_games', 'bot_wins', 'human_wins', 'missed_board', 'whitewash_wins',
  'unique_checkout_values', 'unique_opponents', 'legs_under_15_darts',
  'decider_wins', 'weekend_training', 'training_morning', 'training_around_clock',
]);

export type CheckMode = 'absolute' | 'increment';

interface AchievementContextType {
  getPlayerProgress: (playerId: string) => PlayerAchievementProgress;
  checkAchievement: (playerId: string, metric: string, value: number, gameId?: string, options?: { mode?: CheckMode }) => void;
  unlockAchievement: (playerId: string, achievementId: string, gameId?: string) => void;
  isAchievementUnlocked: (playerId: string, achievementId: string) => boolean;
  getUnlockedAchievements: (playerId: string) => Achievement[];
  getLockedAchievements: (playerId: string) => Achievement[];
  getAllPlayerProgress: () => Record<string, PlayerAchievementProgress>;
  notificationQueue: AchievementNotification[];
  currentNotification: AchievementNotification | null;
  dismissNotification: () => void;
  resetPlayerAchievements: (playerId: string) => void;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

interface AchievementProviderProps {
  children: ReactNode;
}

export const AchievementProvider: React.FC<AchievementProviderProps> = ({ children }) => {
  const { currentTenant } = useTenant();
  const [progressCache, setProgressCache] = useState<Record<string, PlayerAchievementProgress>>({});
  const [notificationQueue, setNotificationQueue] = useState<AchievementNotification[]>([]);
  const [currentNotification, setCurrentNotification] = useState<AchievementNotification | null>(null);

  // Ref to avoid stale closures - always has the latest progressCache
  const progressCacheRef = useRef<Record<string, PlayerAchievementProgress>>({});

  // Meta-achievement recursion guard
  const isCheckingMetaRef = useRef(false);

  const STORAGE_KEY = 'achievements';
  const loadingPlayersRef = useRef<Set<string>>(new Set());
  const loadedPlayersRef = useRef<Set<string>>(new Set());

  // Keep ref in sync with state
  useEffect(() => {
    progressCacheRef.current = progressCache;
  }, [progressCache]);

  // Notification queue consumer: show next notification when current is dismissed
  useEffect(() => {
    if (!currentNotification && notificationQueue.length > 0) {
      const [next, ...rest] = notificationQueue;
      setCurrentNotification(next);
      setNotificationQueue(rest);
    }
  }, [currentNotification, notificationQueue]);

  // Load all player progress from localStorage on mount
  useEffect(() => {
    if (currentTenant) {
      const storage = new TenantStorage(currentTenant.id);
      const saved = storage.get<Record<string, PlayerAchievementProgress>>(STORAGE_KEY, {});
      setProgressCache(saved);
      progressCacheRef.current = saved;
    }
  }, [currentTenant]);

  // Load player achievements from API
  const loadPlayerAchievementsFromAPI = useCallback(async (playerId: string) => {
    if (loadedPlayersRef.current.has(playerId) || loadingPlayersRef.current.has(playerId)) {
      return;
    }
    loadingPlayersRef.current.add(playerId);

    try {
      logger.apiEvent(`Loading achievements for player ${playerId} from API...`);
      const currentProgress = progressCacheRef.current[playerId];

      const apiAchievements = await api.achievements.getByPlayer(playerId);
      logger.debug(`API returned ${apiAchievements?.length || 0} achievements for player ${playerId}`);

      if (apiAchievements && Array.isArray(apiAchievements)) {
        const apiUnlockedAchievements: UnlockedAchievement[] = apiAchievements.map((a: any) => ({
          achievementId: a.achievement_id || a.achievementId,
          unlockedAt: (a.unlocked_at || a.unlockedAt) ? new Date(a.unlocked_at || a.unlockedAt) : new Date(),
          playerId: a.player_id || a.playerId || playerId,
          gameId: a.game_id || a.gameId,
        }));

        // Merge API achievements with localStorage achievements
        const mergedAchievements: UnlockedAchievement[] = [...apiUnlockedAchievements];
        if (currentProgress?.unlockedAchievements) {
          currentProgress.unlockedAchievements.forEach(localAchievement => {
            const apiMatch = apiUnlockedAchievements.find(
              a => a.achievementId === localAchievement.achievementId
            );
            if (!apiMatch) {
              mergedAchievements.push(localAchievement);
            } else if (localAchievement.unlockedAt > apiMatch.unlockedAt) {
              const index = mergedAchievements.findIndex(
                a => a.achievementId === localAchievement.achievementId
              );
              if (index >= 0) mergedAchievements[index] = localAchievement;
            }
          });
        }

        const totalPoints = mergedAchievements.reduce((sum, ua) => {
          const achievement = getAchievementById(ua.achievementId);
          return sum + (achievement?.points || 0);
        }, 0);

        const playerProgress: PlayerAchievementProgress = {
          playerId,
          unlockedAchievements: mergedAchievements,
          progress: currentProgress?.progress || {},
          totalPoints,
        };

        // Use functional update to avoid stale closure
        setProgressCache(prev => {
          const updated = { ...prev, [playerId]: playerProgress };
          progressCacheRef.current = updated;
          if (currentTenant) {
            const storage = new TenantStorage(currentTenant.id);
            storage.set(STORAGE_KEY, updated);
          }
          return updated;
        });

        loadedPlayersRef.current.add(playerId);
        loadingPlayersRef.current.delete(playerId);
        logger.success(`Achievements loaded for player ${playerId} (${mergedAchievements.length} unlocked)`);
      }
    } catch (error) {
      logger.warn(`Failed to load achievements from API for player ${playerId}:`, error);
      loadedPlayersRef.current.add(playerId);
      loadingPlayersRef.current.delete(playerId);
    }
  }, [currentTenant]);

  // Save progress using functional update to avoid stale closures
  const saveProgressForPlayer = useCallback((playerId: string, updatedPlayerProgress: PlayerAchievementProgress) => {
    if (!currentTenant) return;
    setProgressCache(prev => {
      const updated = { ...prev, [playerId]: updatedPlayerProgress };
      progressCacheRef.current = updated;
      const storage = new TenantStorage(currentTenant.id);
      storage.set(STORAGE_KEY, updated);
      return updated;
    });
  }, [currentTenant]);

  // Get player progress - reads from ref to always be current
  const getPlayerProgress = useCallback((playerId: string): PlayerAchievementProgress => {
    if (!loadedPlayersRef.current.has(playerId) && !loadingPlayersRef.current.has(playerId) && playerId) {
      loadPlayerAchievementsFromAPI(playerId);
    }

    const cached = progressCacheRef.current[playerId];
    if (cached) return cached;

    return {
      playerId,
      unlockedAchievements: [],
      progress: {},
      totalPoints: 0,
    };
  }, [loadPlayerAchievementsFromAPI]);

  // Get all player progress
  const getAllPlayerProgress = useCallback((): Record<string, PlayerAchievementProgress> => {
    return progressCacheRef.current;
  }, []);

  // Check if achievement is unlocked - reads from ref
  const isAchievementUnlocked = useCallback((playerId: string, achievementId: string): boolean => {
    const progress = progressCacheRef.current[playerId];
    if (!progress) return false;
    return progress.unlockedAchievements.some(u => u.achievementId === achievementId);
  }, []);

  // Get unlocked achievements
  const getUnlockedAchievements = useCallback((playerId: string): Achievement[] => {
    const progress = getPlayerProgress(playerId);
    return progress.unlockedAchievements
      .map(u => getAchievementById(u.achievementId))
      .filter((a): a is Achievement => a !== undefined);
  }, [getPlayerProgress]);

  // Get locked achievements
  const getLockedAchievements = useCallback((playerId: string): Achievement[] => {
    const unlocked = getUnlockedAchievements(playerId);
    const unlockedIds = new Set(unlocked.map(a => a.id));
    return ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id));
  }, [getUnlockedAchievements]);

  // Queue a notification instead of overwriting
  const queueNotification = useCallback((notification: AchievementNotification) => {
    setNotificationQueue(prev => [...prev, notification]);
  }, []);

  // Check meta-achievements (achievement points, unlock count, etc.)
  const checkMetaAchievements = useCallback((playerId: string) => {
    if (isCheckingMetaRef.current) return;
    isCheckingMetaRef.current = true;

    try {
      const progress = progressCacheRef.current[playerId];
      if (!progress) return;

      const totalPoints = progress.totalPoints;
      const unlockedCount = progress.unlockedAchievements.length;

      // Check achievement_points achievements
      const pointsAchievements = ACHIEVEMENTS.filter(a => a.requirement.metric === 'achievement_points');
      for (const achievement of pointsAchievements) {
        const currentProg = progressCacheRef.current[playerId];
        if (currentProg?.unlockedAchievements.some(u => u.achievementId === achievement.id)) continue;
        if (currentProg.totalPoints >= achievement.requirement.target) {
          const unlockedAchievement: UnlockedAchievement = {
            achievementId: achievement.id,
            unlockedAt: new Date(),
            playerId,
          };
          const updatedProgress: PlayerAchievementProgress = {
            ...currentProg,
            unlockedAchievements: [...currentProg.unlockedAchievements, unlockedAchievement],
            totalPoints: currentProg.totalPoints + achievement.points,
            lastUnlocked: unlockedAchievement,
          };
          progressCacheRef.current = { ...progressCacheRef.current, [playerId]: updatedProgress };
          saveProgressForPlayer(playerId, updatedProgress);
          queueNotification({ achievement, playerId, timestamp: new Date(), unlockedCount: updatedProgress.unlockedAchievements.length });
          api.achievements.unlock(playerId, achievement.id).catch(() => {});
          logger.achievementEvent(`Meta achievement unlocked: ${achievement.name}`);
        }
      }

      // Check achievements_unlocked achievements
      const unlockCountAchievements = ACHIEVEMENTS.filter(a => a.requirement.metric === 'achievements_unlocked');
      for (const achievement of unlockCountAchievements) {
        const currentProg = progressCacheRef.current[playerId];
        if (currentProg?.unlockedAchievements.some(u => u.achievementId === achievement.id)) continue;
        if (currentProg.unlockedAchievements.length >= achievement.requirement.target) {
          const unlockedAchievement: UnlockedAchievement = {
            achievementId: achievement.id,
            unlockedAt: new Date(),
            playerId,
          };
          const updatedProgress: PlayerAchievementProgress = {
            ...currentProg,
            unlockedAchievements: [...currentProg.unlockedAchievements, unlockedAchievement],
            totalPoints: currentProg.totalPoints + achievement.points,
            lastUnlocked: unlockedAchievement,
          };
          progressCacheRef.current = { ...progressCacheRef.current, [playerId]: updatedProgress };
          saveProgressForPlayer(playerId, updatedProgress);
          queueNotification({ achievement, playerId, timestamp: new Date(), unlockedCount: updatedProgress.unlockedAchievements.length });
          api.achievements.unlock(playerId, achievement.id).catch(() => {});
          logger.achievementEvent(`Meta achievement unlocked: ${achievement.name}`);
        }
      }

      // Check gold_all_categories
      const goldAllCat = ACHIEVEMENTS.find(a => a.requirement.metric === 'gold_all_categories');
      if (goldAllCat && !progressCacheRef.current[playerId]?.unlockedAchievements.some(u => u.achievementId === goldAllCat.id)) {
        const categories: AchievementCategory[] = ['first_steps', 'scoring', 'checkout', 'training', 'consistency', 'special', 'master'];
        const goldTiers = new Set(['gold', 'platinum', 'diamond']);
        const unlockedIds = new Set(progressCacheRef.current[playerId]?.unlockedAchievements.map(u => u.achievementId) || []);
        const hasGoldInAll = categories.every(cat => {
          return ACHIEVEMENTS.some(a =>
            a.category === cat && goldTiers.has(a.tier) && unlockedIds.has(a.id)
          );
        });
        if (hasGoldInAll) {
          const unlockedAchievement: UnlockedAchievement = {
            achievementId: goldAllCat.id,
            unlockedAt: new Date(),
            playerId,
          };
          const currentProg = progressCacheRef.current[playerId];
          const updatedProgress: PlayerAchievementProgress = {
            ...currentProg,
            unlockedAchievements: [...currentProg.unlockedAchievements, unlockedAchievement],
            totalPoints: currentProg.totalPoints + goldAllCat.points,
            lastUnlocked: unlockedAchievement,
          };
          progressCacheRef.current = { ...progressCacheRef.current, [playerId]: updatedProgress };
          saveProgressForPlayer(playerId, updatedProgress);
          queueNotification({ achievement: goldAllCat, playerId, timestamp: new Date(), unlockedCount: updatedProgress.unlockedAchievements.length });
          api.achievements.unlock(playerId, goldAllCat.id).catch(() => {});
          logger.achievementEvent(`Meta achievement unlocked: ${goldAllCat.name}`);
        }
      }
    } finally {
      isCheckingMetaRef.current = false;
    }
  }, [saveProgressForPlayer, queueNotification]);

  // Unlock an achievement
  const unlockAchievement = useCallback((playerId: string, achievementId: string, gameId?: string) => {
    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      logger.warn(`Achievement ${achievementId} not found`);
      return;
    }

    // Check if already unlocked using ref (always current)
    if (isAchievementUnlocked(playerId, achievementId)) {
      return;
    }

    const progress = progressCacheRef.current[playerId] || {
      playerId,
      unlockedAchievements: [],
      progress: {},
      totalPoints: 0,
    };

    const unlockedAchievement: UnlockedAchievement = {
      achievementId,
      unlockedAt: new Date(),
      playerId,
      gameId,
    };

    const updatedProgress: PlayerAchievementProgress = {
      ...progress,
      unlockedAchievements: [...progress.unlockedAchievements, unlockedAchievement],
      totalPoints: progress.totalPoints + achievement.points,
      lastUnlocked: unlockedAchievement,
    };

    // Update ref SYNCHRONOUSLY so subsequent calls in the same tick see this unlock
    progressCacheRef.current = { ...progressCacheRef.current, [playerId]: updatedProgress };

    // Persist to state + localStorage
    saveProgressForPlayer(playerId, updatedProgress);

    // Sync to API in background
    api.achievements.unlock(playerId, achievementId).then(() => {
      logger.achievementEvent(`Achievement synced to API: ${achievement.name}`);
    }).catch(error => {
      logger.error('Failed to sync achievement to API:', error);
    });

    // Queue notification with snapshot of current unlocked count
    queueNotification({
      achievement,
      playerId,
      timestamp: new Date(),
      unlockedCount: updatedProgress.unlockedAchievements.length,
    });

    logger.achievementEvent(`Achievement unlocked: ${achievement.name} for player ${playerId}`);

    // Check meta-achievements after unlock
    checkMetaAchievements(playerId);
  }, [isAchievementUnlocked, saveProgressForPlayer, queueNotification, checkMetaAchievements]);

  // Check achievements based on metrics
  const checkAchievement = useCallback((
    playerId: string,
    metric: string,
    value: number,
    gameId?: string,
    options?: { mode?: CheckMode }
  ) => {
    const mode = options?.mode ?? (CUMULATIVE_METRICS.has(metric) ? 'increment' : 'absolute');

    const relevantAchievements = ACHIEVEMENTS.filter(a => a.requirement.metric === metric);
    const progressUpdates: Record<string, { current: number; target: number; percentage: number }> = {};

    for (const achievement of relevantAchievements) {
      if (isAchievementUnlocked(playerId, achievement.id)) {
        continue;
      }

      const { target } = achievement.requirement;

      // Calculate effective value
      let effectiveValue = value;
      if (mode === 'increment') {
        const playerProgress = progressCacheRef.current[playerId];
        const existing = playerProgress?.progress[achievement.id]?.current || 0;
        effectiveValue = existing + value;
      }

      // Special handling for metrics where lower is better (e.g. game_time_max, leg_darts)
      const isLowerBetter = metric === 'game_time_max' || metric === 'leg_darts' ||
                            metric === 'leg_301_darts' || metric === 'checkout_darts_max' ||
                            metric === 'avg_darts_per_leg_max';
      const shouldUnlock = isLowerBetter
        ? (effectiveValue <= target && effectiveValue > 0)
        : (effectiveValue >= target);

      if (shouldUnlock) {
        unlockAchievement(playerId, achievement.id, gameId);
      } else {
        // Update progress tracking
        const progressValue = isLowerBetter ? value : effectiveValue;
        const progressPercentage = isLowerBetter
          ? Math.min(((target - Math.max(0, progressValue - target)) / target) * 100, 100)
          : Math.min((effectiveValue / target) * 100, 100);

        const playerProgress = progressCacheRef.current[playerId] || {
          playerId,
          unlockedAchievements: [],
          progress: {},
          totalPoints: 0,
        };

        const updatedPlayerProgress: PlayerAchievementProgress = {
          ...playerProgress,
          progress: {
            ...playerProgress.progress,
            [achievement.id]: {
              current: effectiveValue,
              target,
              percentage: Math.max(0, progressPercentage),
            },
          },
        };

        saveProgressForPlayer(playerId, updatedPlayerProgress);
        progressUpdates[achievement.id] = {
          current: effectiveValue,
          target,
          percentage: Math.max(0, progressPercentage),
        };
      }
    }

    // Sync progress updates to API in background (transform to API format)
    if (Object.keys(progressUpdates).length > 0) {
      const apiPayload: Record<string, { progress: number; completed: boolean }> = {};
      for (const [id, prog] of Object.entries(progressUpdates)) {
        apiPayload[id] = { progress: prog.percentage, completed: false };
      }
      api.achievements.updateProgress(playerId, apiPayload).catch(error => {
        logger.error('Failed to sync achievement progress to API:', error);
      });
    }
  }, [isAchievementUnlocked, unlockAchievement, saveProgressForPlayer]);

  // Dismiss current notification (advances queue)
  const dismissNotification = useCallback(() => {
    setCurrentNotification(null);
  }, []);

  // Reset player achievements
  const resetPlayerAchievements = useCallback((playerId: string) => {
    setProgressCache(prev => {
      const updated = { ...prev };
      delete updated[playerId];
      progressCacheRef.current = updated;
      if (currentTenant) {
        const storage = new TenantStorage(currentTenant.id);
        storage.set(STORAGE_KEY, updated);
      }
      return updated;
    });
  }, [currentTenant]);

  const value: AchievementContextType = {
    getPlayerProgress,
    checkAchievement,
    unlockAchievement,
    isAchievementUnlocked,
    getUnlockedAchievements,
    getLockedAchievements,
    getAllPlayerProgress,
    notificationQueue,
    currentNotification,
    dismissNotification,
    resetPlayerAchievements,
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
};

export const useAchievements = (): AchievementContextType => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
};
