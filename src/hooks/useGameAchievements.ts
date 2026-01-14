import { useCallback } from 'react';
import { useAchievements } from '../context/AchievementContext';
import { Match, Leg } from '../types/index';

/**
 * Custom hook for checking and unlocking achievements during gameplay
 */
export const useGameAchievements = () => {
  const { checkAchievement, unlockAchievement } = useAchievements();

  // Check achievements after a match ends
  const checkMatchAchievements = useCallback((
    match: Match,
    _winnerId: string,
    isPlayerWinner: (playerId: string) => boolean
  ) => {
    match.players.forEach((player) => {
      const playerId = player.playerId;

      // Games played - assume 1 game per match for now
      // This should be tracked in player profile across multiple matches
      checkAchievement(playerId, 'games_played', 1, match.id);

      // Match average
      if (player.matchAverage) {
        checkAchievement(playerId, 'match_average', player.matchAverage, match.id);
      }

      // 180s
      if (player.match180s && player.match180s > 0) {
        checkAchievement(playerId, 'score_180', player.match180s, match.id);
      }

      // Checkout percentage
      if (player.checkoutAttempts && player.checkoutAttempts >= 10) {
        const checkoutPercentage = (player.checkoutsHit / player.checkoutAttempts) * 100;
        checkAchievement(playerId, 'checkout_percentage', checkoutPercentage, match.id);
      }

      // Perfect checkout (any checkout without bust)
      if (player.checkoutsHit && player.checkoutsHit > 0) {
        checkAchievement(playerId, 'perfect_checkout', player.checkoutsHit, match.id);
      }

      // Check for winning streak
      if (isPlayerWinner(playerId)) {
        // This would need to be tracked across multiple matches
        // For now, we'll just mark that they won
        checkAchievement(playerId, 'wins', 1, match.id);
      }
    });
  }, [checkAchievement]);

  // Check achievements after a leg ends
  const checkLegAchievements = useCallback((
    leg: Leg,
    match: Match,
    winnerId: string
  ) => {
    const winnerThrows = leg.throws.filter(t => t.playerId === winnerId);
    const totalDarts = winnerThrows.length * 3; // Each throw = 3 darts

    // Check for 9-darter (only for 501 games)
    if (match.settings.startScore === 501 && totalDarts === 9) {
      unlockAchievement(winnerId, 'nine_darter', match.id);
    }

    // Check for no-bust leg
    const hadBust = winnerThrows.some(t => t.isBust);
    if (!hadBust && totalDarts > 0) {
      checkAchievement(winnerId, 'leg_no_bust', 1, match.id);
    }

    // Check for specific leg dart counts
    checkAchievement(winnerId, 'leg_darts', totalDarts, match.id);
  }, [checkAchievement, unlockAchievement]);

  // Check achievements for specific throws/scores
  const checkThrowAchievements = useCallback((
    playerId: string,
    score: number,
    isCheckout: boolean,
    checkoutValue?: number,
    gameId?: string
  ) => {
    // Check for 180
    if (score === 180) {
      checkAchievement(playerId, 'score_180', 1, gameId);
    }

    // Check for specific checkout values
    if (isCheckout && checkoutValue) {
      // Big Fish (170 checkout)
      if (checkoutValue === 170) {
        checkAchievement(playerId, 'checkout_value', 170, gameId);
      }

      // Bullseye checkout (assuming 50 for double bull)
      if (checkoutValue === 50) {
        checkAchievement(playerId, 'checkout_bullseye', 1, gameId);
      }
    }
  }, [checkAchievement]);

  // Check training achievements
  const checkTrainingAchievements = useCallback((
    playerId: string,
    _mode: string,
    completed: boolean
  ) => {
    if (completed) {
      // Increment training completed count
      checkAchievement(playerId, 'training_completed', 1);
    }
  }, [checkAchievement]);

  // Check if player has completed all training modes
  const checkAllTrainingModesAchievement = useCallback((
    playerId: string,
    completedModes: string[]
  ) => {
    const allModes = ['doubles', 'triples', 'around-the-clock', 'checkout', 'bobs-27', 'score'];
    const completedAllModes = allModes.every(mode => completedModes.includes(mode));

    if (completedAllModes) {
      checkAchievement(playerId, 'training_all_modes', 6);
    }
  }, [checkAchievement]);

  return {
    checkMatchAchievements,
    checkLegAchievements,
    checkThrowAchievements,
    checkTrainingAchievements,
    checkAllTrainingModesAchievement,
  };
};
