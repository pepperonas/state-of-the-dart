import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useTenant } from './TenantContext';
import { TenantStorage } from '../utils/storage';
import { api } from '../services/api';
import {
  Achievement,
  UnlockedAchievement,
  PlayerAchievementProgress,
  AchievementNotification,
  ACHIEVEMENTS,
  getAchievementById,
} from '../types/achievements';
import logger from '../utils/logger';

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
  // Use a ref to track loading state to prevent race conditions
  const loadingPlayersRef = React.useRef<Set<string>>(new Set());
  const loadedPlayersRef = React.useRef<Set<string>>(new Set());

  // Load all player progress from localStorage on mount
  useEffect(() => {
    if (currentTenant) {
      const storage = new TenantStorage(currentTenant.id);
      const saved = storage.get<Record<string, PlayerAchievementProgress>>(STORAGE_KEY, {});
      setProgressCache(saved);
    }
  }, [currentTenant]);

  // Load player achievements from API
  const loadPlayerAchievementsFromAPI = useCallback(async (playerId: string) => {
    // Check refs immediately to prevent duplicate calls (refs update synchronously)
    if (loadedPlayersRef.current.has(playerId) || loadingPlayersRef.current.has(playerId)) {
      return; // Already loaded or loading
    }

    // Mark as loading IMMEDIATELY (before async operation)
    loadingPlayersRef.current.add(playerId);

    try {
      logger.apiEvent(`Loading achievements for player ${playerId} from API...`);
      
      // Get current localStorage data first (to merge, not overwrite)
      const currentProgress = progressCache[playerId];
      const currentUnlockedIds = new Set(currentProgress?.unlockedAchievements.map(u => u.achievementId) || []);
      
      const apiAchievements = await api.achievements.getByPlayer(playerId);
      logger.debug(`API returned ${apiAchievements?.length || 0} achievements for player ${playerId}`, apiAchievements);

      if (apiAchievements && Array.isArray(apiAchievements)) {
        // Convert API format to PlayerAchievementProgress format
        const apiUnlockedAchievements: UnlockedAchievement[] = apiAchievements.map((a: any) => {
          const achievementId = a.achievement_id || a.achievementId;
          const unlockedAt = a.unlocked_at || a.unlockedAt;
          logger.debug(`Converting achievement: ${achievementId}, unlocked_at: ${unlockedAt}`);
          return {
            achievementId,
            unlockedAt: unlockedAt ? new Date(unlockedAt) : new Date(),
            playerId: a.player_id || a.playerId || playerId,
            gameId: a.game_id || a.gameId,
          };
        });
        logger.debug(`Converted ${apiUnlockedAchievements.length} achievements`);

        // Merge API achievements with localStorage achievements (prefer newer unlock date)
        const mergedAchievements: UnlockedAchievement[] = [...apiUnlockedAchievements];
        
        // Add localStorage achievements that are not in API
        if (currentProgress?.unlockedAchievements) {
          currentProgress.unlockedAchievements.forEach(localAchievement => {
            const existsInAPI = apiUnlockedAchievements.some(
              api => api.achievementId === localAchievement.achievementId
            );
            if (!existsInAPI) {
              mergedAchievements.push(localAchievement);
            } else {
              // Use the newer unlock date
              const apiAchievement = apiUnlockedAchievements.find(
                api => api.achievementId === localAchievement.achievementId
              );
              if (apiAchievement && localAchievement.unlockedAt > apiAchievement.unlockedAt) {
                const index = mergedAchievements.findIndex(
                  a => a.achievementId === localAchievement.achievementId
                );
                if (index >= 0) {
                  mergedAchievements[index] = localAchievement;
                }
              }
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

        // Update cache
        const newProgressCache = {
          ...progressCache,
          [playerId]: playerProgress,
        };

        setProgressCache(newProgressCache);

        // Save to localStorage
        if (currentTenant) {
          const storage = new TenantStorage(currentTenant.id);
          storage.set(STORAGE_KEY, newProgressCache);
        }

        // Mark as loaded (ref for immediate sync check)
        loadedPlayersRef.current.add(playerId);
        loadingPlayersRef.current.delete(playerId);
        logger.success(`Achievements loaded for player ${playerId} (${mergedAchievements.length} unlocked)`);
      }
    } catch (error) {
      logger.warn(`Failed to load achievements from API for player ${playerId}:`, error);
      // Mark as loaded anyway to prevent retry loops on errors
      loadedPlayersRef.current.add(playerId);
      loadingPlayersRef.current.delete(playerId);
      // Continue with localStorage data (offline mode)
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
    // Trigger API load if not loaded yet (async, doesn't block)
    // Use refs to check - they update synchronously to prevent race conditions
    if (!loadedPlayersRef.current.has(playerId) && !loadingPlayersRef.current.has(playerId) && playerId) {
      loadPlayerAchievementsFromAPI(playerId);
    }

    if (progressCache[playerId]) {
      return progressCache[playerId];
    }

    // Initialize new player progress (will be replaced when API loads)
    const newProgress: PlayerAchievementProgress = {
      playerId,
      unlockedAchievements: [],
      progress: {},
      totalPoints: 0,
    };

    return newProgress;
  }, [progressCache, loadPlayerAchievementsFromAPI]);

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
  const unlockAchievement = useCallback(async (playerId: string, achievementId: string, gameId?: string) => {
    const achievement = getAchievementById(achievementId);
    if (!achievement) {
      logger.warn(`Achievement ${achievementId} not found`);
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

    // Save to localStorage immediately
    saveProgress(newProgressCache);

    // Sync to API in background
    try {
      await api.achievements.unlock(playerId, achievementId);
      logger.achievementEvent(`Achievement synced to API: ${achievement.name}`);
    } catch (error) {
      logger.error('Failed to sync achievement to API:', error);
      // Continue anyway - localStorage has the data
    }

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

    logger.achievementEvent(`Achievement unlocked: ${achievement.name} for player ${playerId}`);
  }, [progressCache, getPlayerProgress, isAchievementUnlocked, saveProgress]);

  // Check achievements based on metrics
  const checkAchievement = useCallback(async (playerId: string, metric: string, value: number, gameId?: string) => {
    // Find relevant achievements for this metric
    const relevantAchievements = ACHIEVEMENTS.filter(a => a.requirement.metric === metric);
    let progressUpdated = false;
    const progressUpdates: Record<string, any> = {};

    for (const achievement of relevantAchievements) {
      // Skip if already unlocked
      if (isAchievementUnlocked(playerId, achievement.id)) {
        continue;
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
        await unlockAchievement(playerId, achievement.id, gameId);
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
        progressUpdated = true;
        progressUpdates[achievement.id] = {
          current: value,
          target,
          percentage: Math.min((value / target) * 100, 100),
        };
      }
    }

    // Sync progress updates to API in background
    if (progressUpdated && Object.keys(progressUpdates).length > 0) {
      try {
        await api.achievements.updateProgress(playerId, progressUpdates);
        logger.debug('Achievement progress synced to API');
      } catch (error) {
        logger.error('Failed to sync achievement progress to API:', error);
        // Continue anyway - localStorage has the data
      }
    }
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
