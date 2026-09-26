import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { getLockedAchievements } = useAchievements();

  // ⚠️ Depend on the NUMBERS, never on the object. Callers build
  // `currentMatchData` inline on every render; the previous version keyed a
  // useCallback on it and pushed the result through setState in an effect —
  // new object → new callback → effect → setState → render → new object, the
  // "Maximum update depth exceeded" loop in GameScreen. Derived data does not
  // belong in state at all, so this is a plain memo now.
  const matchAverage = currentMatchData?.matchAverage;
  const score180s = currentMatchData?.score180s;
  const checkoutRate = currentMatchData?.checkoutRate;
  const currentWinStreak = currentMatchData?.currentWinStreak;

  return useMemo((): AchievementHint[] => {
    const data = { matchAverage, score180s, checkoutRate, currentWinStreak };
    if (!playerId) return [];

    const lockedAchievements = getLockedAchievements(playerId);
    const newHints: AchievementHint[] = [];

    lockedAchievements.forEach((achievement: Achievement) => {
      switch (achievement.id) {
        case 'high_roller': {
          const currentAvg = data.matchAverage || 0;
          if (currentAvg >= 55 && currentAvg < 60) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentAvg,
              target: 60,
              message: t('achievements.hint_average', { remaining: (60 - currentAvg).toFixed(1) }),
            });
          }
          break;
        }

        case 'pro_scorer': {
          const currentAvg = data.matchAverage || 0;
          if (currentAvg >= 75 && currentAvg < 80) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentAvg,
              target: 80,
              message: t('achievements.hint_average', { remaining: (80 - currentAvg).toFixed(1) }),
            });
          }
          break;
        }

        case 'world_class': {
          const currentAvg = data.matchAverage || 0;
          if (currentAvg >= 95 && currentAvg < 100) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentAvg,
              target: 100,
              message: t('achievements.hint_average', { remaining: (100 - currentAvg).toFixed(1) }),
            });
          }
          break;
        }

        case 'max_out': {
          const current180s = data.score180s || 0;
          if (current180s >= 7 && current180s < 10) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: current180s,
              target: 10,
              message: t('achievements.hint_180s', { remaining: 10 - current180s }),
            });
          }
          break;
        }

        case 'checkout_king': {
          const currentRate = data.checkoutRate || 0;
          if (currentRate >= 45 && currentRate < 50) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentRate,
              target: 50,
              message: t('achievements.hint_checkout', { remaining: (50 - currentRate).toFixed(1) }),
            });
          }
          break;
        }

        case 'winning_streak': {
          const currentStreak = data.currentWinStreak || 0;
          if (currentStreak >= 3 && currentStreak < 5) {
            newHints.push({
              achievementId: achievement.id,
              achievementName: achievement.name,
              achievementIcon: achievement.icon,
              progress: currentStreak,
              target: 5,
              message: t('achievements.hint_winstreak', { remaining: 5 - currentStreak }),
            });
          }
          break;
        }

        default:
          break;
      }
    });

    return newHints;
  }, [playerId, matchAverage, score180s, checkoutRate, currentWinStreak, getLockedAchievements, t]);
};
