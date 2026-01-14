import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTenant } from './TenantContext';
import { TenantStorage } from '../utils/storage';
import {
  Achievement,
  UnlockedAchievement,
  PlayerAchievementProgress,
  AchievementNotification,
  ACHIEVEMENTS,
  getAchievementById,
} from '../types/achievements';

interface AchievementContextType {
  getPlayerProgress: (playerId: string) => PlayerAchievementProgress;
  checkAchievement: (playerId: string, metric: string, value: number, gameId?: string) => void;
  unlockAchievement: (playerId: string, achievementId: string, gameId?: string) => void;
  isAchievementUnlocked: (playerId: string, achievementId: string) => boolean;
  getUnlockedAchievements: (playerId: string) => Achievement[];
  getLockedAchievements: (playerId: string) => Achievement[];
  getAllPlayerProgress: () => Record<string, PlayerAchievementProgress>;
  notification: AchievementNotification | null;
  clearNotification: () => void;
  resetPlayerAchievements: (playerId: string) => void;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

interface AchievementProviderProps {
  children: ReactNode;
}

export const AchievementProvider: React.FC<AchievementProviderProps> = ({ children }) => {
  const { currentTenant } = useTenant();
  const [notification, setNotification] = useState<AchievementNotification | null>(null);
  const [progressCache, setProgressCache] = useState<Record<string, PlayerAchievementProgress>>({});

  const STORAGE_KEY = 'achievements';

  // Load all player progress from storage
  useEffect(() => {
    if (currentTenant) {
      const storage = new TenantStorage(currentTenant.id);
      const saved = storage.get<Record<string, PlayerAchievementProgress>>(STORAGE_KEY, {});
      setProgressCache(saved);
    }
  }, [currentTenant]);

  // Save progress to storage
  const saveProgress = useCallback((progress: Record<string, PlayerAchievementProgress>) => {
    if (currentTenant) {
      const storage = new TenantStorage(currentTenant.id);
      storage.set(STORAGE_KEY, progress);
      setProgressCache(progress);
    }
  }, [currentTenant]);

  // Get player progress
  const getPlayerProgress = useCallback((playerId: string): PlayerAchievementProgress => {
    if (progressCache[playerId]) {
      return progressCache[playerId];
    }

    // Initialize new player progress
    const newProgress: PlayerAchievementProgress = {
      playerId,
      unlockedAchievements: [],
      progress: {},
      totalPoints: 0,
    };

    return newProgress;
  }, [progressCache]);

  // Get all player progress
  const getAllPlayerProgress = useCallback((): Record<string, PlayerAchievementProgress> => {
    return progressCache;
  }, [progressCache]);

  // Check if achievement is unlocked
  const isAchievementUnlocked = useCallback((playerId: string, achievementId: string): boolean => {
    const progress = getPlayerProgress(playerId);
    return progress.unlockedAchievements.some(u => u.achievementId === achievementId);
  }, [getPlayerProgress]);

  // Get unlocked achievements
  const getUnlockedAchievements = useCallback((playerId: string): Achievement[] => {
    const progress = getPlayerProgress(playerId);
    return progress.unlockedAchievements
      .map(u => getAchievementById(u.achievementId))
      .filter(a => a !== undefined) as Achievement[];
  }, [getPlayerProgress]);

  // Get locked achievements (not unlocked yet)
  const getLockedAchievements = useCallback((playerId: string): Achievement[] => {
    const unlocked = getUnlockedAchievements(playerId);
    const unlockedIds = new Set(unlocked.map(a => a.id));
    return ACHIEVEMENTS.filter(a => !unlockedIds.has(a.id));
  }, [getUnlockedAchievements]);

  // Unlock an achievement
  const unlockAchievement = useCallback((playerId: string, achievementId: string, gameId?: string) => {
    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      console.warn(`Achievement ${achievementId} not found`);
      return;
    }

    // Check if already unlocked
    if (isAchievementUnlocked(playerId, achievementId)) {
      return;
    }

    const progress = getPlayerProgress(playerId);
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

    const newProgressCache = {
      ...progressCache,
      [playerId]: updatedProgress,
    };

    saveProgress(newProgressCache);

    // Show notification
    setNotification({
      achievement,
      playerId,
      timestamp: new Date(),
    });

    // Auto-clear notification after 5 seconds
    setTimeout(() => {
      setNotification(null);
    }, 5000);

    console.log(`🏆 Achievement unlocked: ${achievement.name} for player ${playerId}`);
  }, [progressCache, getPlayerProgress, isAchievementUnlocked, saveProgress]);

  // Check achievements based on metrics
  const checkAchievement = useCallback((playerId: string, metric: string, value: number, gameId?: string) => {
    // Find relevant achievements for this metric
    const relevantAchievements = ACHIEVEMENTS.filter(a => a.requirement.metric === metric);

    relevantAchievements.forEach(achievement => {
      // Skip if already unlocked
      if (isAchievementUnlocked(playerId, achievement.id)) {
        return;
      }

      const { type, target } = achievement.requirement;
      let shouldUnlock = false;

      switch (type) {
        case 'count':
        case 'streak':
          // For count/streak, check if value meets or exceeds target
          shouldUnlock = value >= target;
          break;

        case 'value':
          // For value, check if value meets or exceeds target
          shouldUnlock = value >= target;
          break;

        case 'special':
          // Special achievements have custom logic
          shouldUnlock = value >= target;
          break;

        default:
          break;
      }

      if (shouldUnlock) {
        unlockAchievement(playerId, achievement.id, gameId);
      } else {
        // Update progress
        const progress = getPlayerProgress(playerId);
        const updatedProgress = {
          ...progress,
          progress: {
            ...progress.progress,
            [achievement.id]: {
              current: value,
              target,
              percentage: Math.min((value / target) * 100, 100),
            },
          },
        };

        const newProgressCache = {
          ...progressCache,
          [playerId]: updatedProgress,
        };

        saveProgress(newProgressCache);
      }
    });
  }, [progressCache, isAchievementUnlocked, unlockAchievement, getPlayerProgress, saveProgress]);

  // Clear notification
  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Reset player achievements (for testing or data management)
  const resetPlayerAchievements = useCallback((playerId: string) => {
    const newProgressCache = { ...progressCache };
    delete newProgressCache[playerId];
    saveProgress(newProgressCache);
  }, [progressCache, saveProgress]);

  const value: AchievementContextType = {
    getPlayerProgress,
    checkAchievement,
    unlockAchievement,
    isAchievementUnlocked,
    getUnlockedAchievements,
    getLockedAchievements,
    getAllPlayerProgress,
    notification,
    clearNotification,
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
