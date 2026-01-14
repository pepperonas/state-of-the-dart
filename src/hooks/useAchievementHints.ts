import { useEffect, useState, useCallback } from 'react';
import { useAchievements } from '../context/AchievementContext';
import { Achievement } from '../types/achievements';

export interface AchievementHint {
  achievementId: string;
  achievementName: string;
  achievementIcon: string;
  progress: number;
  target: number;
  message: string;
}

export const useAchievementHints = (playerId: string | null, currentMatchData?: {
  matchAverage?: number;
  score180s?: number;
  checkoutRate?: number;
  currentWinStreak?: number;
}) => {
  const { getLockedAchievements } = useAchievements();
  const [hints, setHints] = useState<AchievementHint[]>([]);

  const checkForHints = useCallback(() => {
    if (!playerId) return [];

    const lockedAchievements = getLockedAchievements(playerId);
    const newHints: AchievementHint[] = [];

    // Check each locked achievement for near-completion
    lockedAchievements.forEach((achievement: Achievement) => {

      // Check different achievement types
      switch (achievement.id) {
        case 'highRoller': {
          const currentAvg = currentMatchData?.matchAverage || 0;
          if (currentAvg >= 55 && currentAvg < 60) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentAvg,
              target: 60,
              message: `Nur noch ${(60 - currentAvg).toFixed(1)} Average bis zum Achievement!`,
            });
          }
          break;
        }

        case 'proScorer': {
          const currentAvg = currentMatchData?.matchAverage || 0;
          if (currentAvg >= 75 && currentAvg < 80) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentAvg,
              target: 80,
              message: `Nur noch ${(80 - currentAvg).toFixed(1)} Average bis zum Achievement!`,
            });
          }
          break;
        }

        case 'worldClass': {
          const currentAvg = currentMatchData?.matchAverage || 0;
          if (currentAvg >= 95 && currentAvg < 100) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentAvg,
              target: 100,
              message: `Nur noch ${(100 - currentAvg).toFixed(1)} Average bis zum Achievement!`,
            });
          }
          break;
        }

        case 'maxOut': {
          const current180s = currentMatchData?.score180s || 0;
          if (current180s >= 7 && current180s < 10) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: current180s,
              target: 10,
              message: `Noch ${10 - current180s} 180er bis zum Achievement!`,
            });
          }
          break;
        }

        case 'checkoutKing': {
          const currentRate = currentMatchData?.checkoutRate || 0;
          if (currentRate >= 45 && currentRate < 50) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentRate,
              target: 50,
              message: `Nur noch ${(50 - currentRate).toFixed(1)}% Checkout-Quote bis zum Achievement!`,
            });
          }
          break;
        }

        case 'winStreak': {
          const currentStreak = currentMatchData?.currentWinStreak || 0;
          if (currentStreak >= 3 && currentStreak < 5) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentStreak,
              target: 5,
              message: `Noch ${5 - currentStreak} Siege in Folge bis zum Achievement!`,
            });
          }
          break;
        }

        default:
          break;
      }
    });

    return newHints;
  }, [playerId, currentMatchData, getLockedAchievements]);

  useEffect(() => {
    const newHints = checkForHints();
    setHints(newHints);
  }, [checkForHints]);

  return hints;
};
