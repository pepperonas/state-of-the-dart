import { useCallback, useRef } from 'react';
import { useAchievements } from '../context/AchievementContext';
import { Match, Leg, Dart } from '../types/index';

interface MatchContext {
  previousThrowScore?: number;
  visitNumber?: number;
  opponentRemaining?: number;
}

/**
 * Custom hook for checking and unlocking achievements during gameplay.
 * Covers throw-level, leg-level, match-level, calendar/time, and pattern checks.
 */
export const useGameAchievements = () => {
  const { checkAchievement, unlockAchievement } = useAchievements();

  // Track consecutive 180 count for streak detection
  const consecutive180CountRef = useRef<Record<string, number>>({});

  // ==================== THROW-LEVEL CHECKS ====================
  const checkThrowAchievements = useCallback((
    playerId: string,
    darts: Dart[],
    score: number,
    isCheckout: boolean,
    checkoutValue?: number,
    gameId?: string,
    matchContext?: MatchContext
  ) => {
    // --- Score-based checks ---
    if (score === 180) {
      checkAchievement(playerId, 'score_180', 1, gameId);

      // Consecutive 180 detection
      const prev = consecutive180CountRef.current[playerId] || 0;
      consecutive180CountRef.current[playerId] = prev + 1;
      if (consecutive180CountRef.current[playerId] >= 2) {
        checkAchievement(playerId, 'consecutive_180', 1, gameId);
      }
    } else {
      consecutive180CountRef.current[playerId] = 0;
    }

    // Exact score achievements
    const exactScoreTargets = [26, 41, 45, 60, 77, 85, 99, 100, 126, 140, 141, 160, 171];
    if (exactScoreTargets.includes(score)) {
      checkAchievement(playerId, 'exact_score', score, gameId);
    }

    // Score threshold increments
    if (score >= 60) checkAchievement(playerId, 'score_60_plus', 1, gameId);
    if (score >= 80) checkAchievement(playerId, 'score_80_plus', 1, gameId);
    if (score >= 100) checkAchievement(playerId, 'score_100_plus', 1, gameId);
    if (score >= 150) checkAchievement(playerId, 'score_150_plus', 1, gameId);

    // Low score
    if (score < 10 && darts.length > 0) {
      checkAchievement(playerId, 'visit_under_10', 1, gameId);
    }

    // --- Dart-Segment Analysis ---
    for (const dart of darts) {
      if (dart.multiplier === 0 || dart.segment === 0) {
        checkAchievement(playerId, 'missed_board', 1, gameId);
      } else if (dart.multiplier === 1) {
        checkAchievement(playerId, 'singles_hit', 1, gameId);
      } else if (dart.multiplier === 2) {
        checkAchievement(playerId, 'doubles_hit', 1, gameId);
        // Specific bull checks
        if (dart.segment === 50 || dart.bed === 'bull') {
          checkAchievement(playerId, 'bullseye_hit', 1, gameId);
        }
      } else if (dart.multiplier === 3) {
        checkAchievement(playerId, 'triples_hit', 1, gameId);
        // Specific triple segments
        if (dart.segment === 20) checkAchievement(playerId, 'triple_20_hit', 1, gameId);
        if (dart.segment === 19) checkAchievement(playerId, 'triple_19_hit', 1, gameId);
        if (dart.segment === 18) checkAchievement(playerId, 'triple_18_hit', 1, gameId);
        if (dart.segment === 17) checkAchievement(playerId, 'triple_17_hit', 1, gameId);
      }

      // Outer bull / single bull
      if (dart.segment === 25 || dart.bed === 'outer-bull') {
        checkAchievement(playerId, 'outer_bull_hit', 1, gameId);
        checkAchievement(playerId, 'single_bull_hit', 1, gameId);
      }
    }

    // --- Visit Pattern Detection (3 darts) ---
    if (darts.length === 3) {
      const segments = darts.map(d => d.segment);
      const multipliers = darts.map(d => d.multiplier);

      // Perfect 180: 3x T20
      if (darts.every(d => d.segment === 20 && d.multiplier === 3)) {
        checkAchievement(playerId, 'perfect_180', 1, gameId);
      }

      // Three triples (not 180)
      if (multipliers.every(m => m === 3) && score !== 180) {
        checkAchievement(playerId, 'three_triples', 1, gameId);
      }

      // Three ones (S1-S1-S1)
      if (darts.every(d => d.segment === 1 && d.multiplier === 1)) {
        checkAchievement(playerId, 'three_ones', 3, gameId);
      }

      // Same segment: all 3 darts same number
      if (segments[0] === segments[1] && segments[1] === segments[2] && segments[0] > 0) {
        checkAchievement(playerId, 'three_same_number', 1, gameId);
        checkAchievement(playerId, 'same_segment', 1, gameId);
      }

      // Robin Hood: all 3 darts same segment AND same multiplier
      if (
        segments[0] === segments[1] && segments[1] === segments[2] &&
        multipliers[0] === multipliers[1] && multipliers[1] === multipliers[2] &&
        segments[0] > 0 && multipliers[0] > 0
      ) {
        checkAchievement(playerId, 'robin_hood', 1, gameId);
      }

      // Shanghai: Single + Double + Triple of same number
      const nonMissed = darts.filter(d => d.multiplier > 0 && d.segment > 0 && d.segment <= 20);
      if (nonMissed.length === 3) {
        const uniqueSegments = new Set(nonMissed.map(d => d.segment));
        if (uniqueSegments.size === 1) {
          const mults = new Set(nonMissed.map(d => d.multiplier));
          if (mults.has(1) && mults.has(2) && mults.has(3)) {
            checkAchievement(playerId, 'shanghai', 1, gameId);
          }
        }
      }

      // Two doubles in visit
      const doubleCount = darts.filter(d => d.multiplier === 2).length;
      if (doubleCount >= 2) {
        checkAchievement(playerId, 'two_doubles_visit', 1, gameId);
      }

      // Triple-Single-Double: exactly one of each
      const hasTriple = darts.some(d => d.multiplier === 3);
      const hasSingle = darts.some(d => d.multiplier === 1);
      const hasDouble = darts.some(d => d.multiplier === 2);
      if (hasTriple && hasSingle && hasDouble) {
        checkAchievement(playerId, 'triple_single_double', 1, gameId);
      }
    }

    // --- Checkout Analysis ---
    if (isCheckout && checkoutValue) {
      checkAchievement(playerId, 'checkouts', 1, gameId);
      checkAchievement(playerId, 'perfect_checkout', 1, gameId);

      // Check all checkout value achievements
      checkAchievement(playerId, 'checkout_value', checkoutValue, gameId);

      // Checkout value minimum thresholds
      if (checkoutValue >= 100) checkAchievement(playerId, 'checkout_value_min', checkoutValue, gameId);

      // Impossible checkouts
      if ([163, 166, 169].includes(checkoutValue)) {
        checkAchievement(playerId, 'impossible_checkout', 1, gameId);
      }

      // Last dart double identification
      const lastDart = darts[darts.length - 1];
      if (lastDart && lastDart.multiplier === 2) {
        if (lastDart.segment === 20) checkAchievement(playerId, 'checkout_d20', 1, gameId);
        if (lastDart.segment === 16) checkAchievement(playerId, 'checkout_d16', 1, gameId);
        if (lastDart.segment === 12) checkAchievement(playerId, 'checkout_d12', 1, gameId);
        if (lastDart.segment === 18) checkAchievement(playerId, 'checkout_d18', 1, gameId);
        if (lastDart.segment === 1) checkAchievement(playerId, 'checkout_d1', 1, gameId);
        // Bullseye checkout (D25 = bull)
        if (lastDart.segment === 50 || lastDart.segment === 25 || lastDart.bed === 'bull') {
          checkAchievement(playerId, 'checkout_bullseye', 1, gameId);
        }
      }

      // One-dart and two-dart checkouts
      const effectiveDarts = darts.filter(d => d.score > 0 || d.multiplier > 0);
      // For checkout, count darts thrown (not just scoring ones)
      const dartsUsedForCheckout = darts.length;
      if (dartsUsedForCheckout === 1 || (darts.length <= 1)) {
        checkAchievement(playerId, 'checkout_one_dart', 1, gameId);
      } else if (dartsUsedForCheckout === 2 || (darts.length <= 2 && effectiveDarts.length <= 2)) {
        checkAchievement(playerId, 'checkout_two_dart', 1, gameId);
      }

      // Unique checkout values tracking
      checkAchievement(playerId, 'unique_checkout_values', 1, gameId);

      // Checkout after 180 (previous throw was 180)
      if (matchContext?.previousThrowScore === 180) {
        checkAchievement(playerId, 'checkout_after_180', 1, gameId);
      }

      // First visit checkout
      if (matchContext?.visitNumber === 1) {
        checkAchievement(playerId, 'first_visit_checkout', 1, gameId);
      }

      // Pressure/clutch checkout (opponent has low remaining)
      if (matchContext?.opponentRemaining !== undefined) {
        if (matchContext.opponentRemaining <= 40 && matchContext.opponentRemaining > 0) {
          checkAchievement(playerId, 'pressure_checkout', 1, gameId);
        }
        if (matchContext.opponentRemaining <= 170 && matchContext.opponentRemaining > 0) {
          checkAchievement(playerId, 'clutch_checkout', 1, gameId);
        }
      }
    }
  }, [checkAchievement]);

  // ==================== LEG-LEVEL CHECKS ====================
  const checkLegAchievements = useCallback((
    leg: Leg,
    match: Match,
    winnerId: string
  ) => {
    const winnerThrows = leg.throws.filter(t => t.playerId === winnerId);
    const totalDarts = winnerThrows.reduce((sum, t) => sum + t.darts.length, 0);

    // 9-darter (501 only)
    if (match.settings.startScore === 501 && totalDarts === 9) {
      unlockAchievement(winnerId, 'nine_darter', match.id);
    }

    // Leg dart count checks (lower is better handled by context)
    checkAchievement(winnerId, 'leg_darts', totalDarts, match.id);

    // 301-specific dart counts
    if (match.settings.startScore === 301) {
      checkAchievement(winnerId, 'leg_301_darts', totalDarts, match.id);
    }

    // Legs under 15 darts
    if (totalDarts <= 15) {
      checkAchievement(winnerId, 'legs_under_15_darts', 1, match.id);
    }

    // No-bust leg
    const hadBust = winnerThrows.some(t => t.isBust);
    if (!hadBust && totalDarts > 0) {
      checkAchievement(winnerId, 'leg_no_bust', 1, match.id);
    }

    // Leg average
    const totalScore = winnerThrows.reduce((sum, t) => sum + t.score, 0);
    if (totalDarts > 0) {
      const legAverage = (totalScore / (totalDarts / 3)) || 0;
      checkAchievement(winnerId, 'leg_average', legAverage, match.id, { mode: 'absolute' });
    }

    // Shutout leg: opponent has 0 completed throws (or extremely high remaining)
    const startScore = match.settings.startScore || 501;
    const otherPlayers = match.players.filter(p => p.playerId !== winnerId);
    for (const opponent of otherPlayers) {
      const opponentThrows = leg.throws.filter(t => t.playerId === opponent.playerId);
      const opponentScored = opponentThrows.reduce((sum, t) => sum + t.score, 0);
      const opponentRemaining = startScore - opponentScored;
      // Shutout: opponent hasn't scored enough to be in checkout range
      if (opponentRemaining > 170) {
        checkAchievement(winnerId, 'shutout_leg', 1, match.id);
      }
    }

    // First visit checkout detection
    if (winnerThrows.length === 1) {
      checkAchievement(winnerId, 'first_visit_checkout', 1, match.id);
    }
  }, [checkAchievement, unlockAchievement]);

  // ==================== MATCH-LEVEL CHECKS ====================
  const checkMatchAchievements = useCallback((
    match: Match,
    _winnerId: string,
    isPlayerWinner: (playerId: string) => boolean
  ) => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday
    const month = now.getMonth() + 1;
    const day = now.getDate();

    match.players.forEach((player) => {
      const playerId = player.playerId;
      const isWinner = isPlayerWinner(playerId);

      // --- Cumulative game counts ---
      checkAchievement(playerId, 'games_played', 1, match.id);

      if (isWinner) {
        checkAchievement(playerId, 'wins', 1, match.id);
      }

      // Match average (absolute)
      if (player.matchAverage) {
        checkAchievement(playerId, 'match_average', player.matchAverage, match.id, { mode: 'absolute' });

        // Exact average (rounded to 100)
        if (Math.round(player.matchAverage) === 100) {
          checkAchievement(playerId, 'exact_average', 100, match.id, { mode: 'absolute' });
        }
      }

      // 180s in match (absolute - how many 180s in THIS match)
      if (player.match180s && player.match180s > 0) {
        // Cumulative 180 count across all matches
        checkAchievement(playerId, 'score_180', player.match180s, match.id);
        // 180s in this specific match (absolute)
        checkAchievement(playerId, 'match_180_count', player.match180s, match.id, { mode: 'absolute' });
      }

      // Checkout percentage (absolute)
      if (player.checkoutAttempts && player.checkoutAttempts >= 10) {
        const checkoutPercentage = (player.checkoutsHit / player.checkoutAttempts) * 100;
        checkAchievement(playerId, 'checkout_percentage', checkoutPercentage, match.id, { mode: 'absolute' });
      }

      // Tons in match (100+ scores)
      if (player.match100Plus && player.match100Plus > 0) {
        checkAchievement(playerId, 'tons_in_match', player.match100Plus, match.id, { mode: 'absolute' });
      }

      // --- Match pattern checks (winner only) ---
      if (isWinner) {
        // Whitewash: opponent has 0 legs
        const totalLegs = match.settings.legsToWin || 3;
        if (totalLegs >= 3) {
          const allOpponents = match.players.filter(p => p.playerId !== playerId);
          const isWhitewash = allOpponents.every(op => op.legsWon === 0);
          if (isWhitewash) {
            checkAchievement(playerId, 'whitewash', 1, match.id, { mode: 'absolute' });
            checkAchievement(playerId, 'whitewash_wins', 1, match.id);
          }
        }

        // Close win: leg difference = 1
        const winnerLegs = player.legsWon;
        const maxOpponentLegs = Math.max(...match.players.filter(p => p.playerId !== playerId).map(p => p.legsWon));
        if (winnerLegs - maxOpponentLegs === 1) {
          checkAchievement(playerId, 'close_win', 1, match.id, { mode: 'absolute' });
        }

        // Decider win: winner won last leg when scores were tied
        if (winnerLegs > 0 && maxOpponentLegs === winnerLegs - 1 && maxOpponentLegs > 0) {
          checkAchievement(playerId, 'decider_wins', 1, match.id);
        }

        // Bot vs Human wins
        const opponents = match.players.filter(p => p.playerId !== playerId);
        const hasBot = opponents.some(p => p.isBot);
        const hasHuman = opponents.some(p => !p.isBot);
        if (hasBot) checkAchievement(playerId, 'bot_wins', 1, match.id);
        if (hasHuman) checkAchievement(playerId, 'human_wins', 1, match.id);
      }

      // Match no bust check
      const playerThrows = match.legs.flatMap(leg => leg.throws.filter(t => t.playerId === playerId));
      const hadAnyBust = playerThrows.some(t => t.isBust);
      if (!hadAnyBust && isWinner && playerThrows.length > 0) {
        checkAchievement(playerId, 'match_no_bust', 1, match.id, { mode: 'absolute' });
      }

      // --- Calendar/Time achievements ---
      // Midnight game (0-1 AM)
      if (hour >= 0 && hour < 1) {
        checkAchievement(playerId, 'game_midnight', 1, match.id, { mode: 'absolute' });
        if (isWinner) {
          checkAchievement(playerId, 'midnight_win', 1, match.id, { mode: 'absolute' });
        }
      }

      // Late night (22-24)
      if (hour >= 22) {
        checkAchievement(playerId, 'late_night_games', 1, match.id);
      }

      // Early morning wins (5-8)
      if (hour >= 5 && hour < 8 && isWinner) {
        checkAchievement(playerId, 'early_morning_wins', 1, match.id);
      }

      // Lunch games (12-14)
      if (hour >= 12 && hour < 14) {
        checkAchievement(playerId, 'lunch_games', 1, match.id);
      }

      // Weekend
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        checkAchievement(playerId, 'weekend_games', 1, match.id);
      }

      // New Year (January 1)
      if (month === 1 && day === 1) {
        checkAchievement(playerId, 'new_year_game', 1, match.id, { mode: 'absolute' });
      }

      // Christmas (Dec 24-26)
      if (month === 12 && day >= 24 && day <= 26) {
        checkAchievement(playerId, 'christmas_game', 1, match.id, { mode: 'absolute' });
      }

      // Halloween (Oct 31)
      if (month === 10 && day === 31) {
        checkAchievement(playerId, 'halloween_game', 1, match.id, { mode: 'absolute' });
      }

      // Valentine's Day win (Feb 14)
      if (month === 2 && day === 14 && isWinner) {
        checkAchievement(playerId, 'valentines_win', 1, match.id, { mode: 'absolute' });
      }

      // --- Game duration ---
      if (match.startedAt && match.completedAt) {
        const startTime = new Date(match.startedAt).getTime();
        const endTime = new Date(match.completedAt).getTime();
        const durationSeconds = Math.round((endTime - startTime) / 1000);

        if (durationSeconds > 0) {
          // Speed demon / speed round (lower is better)
          checkAchievement(playerId, 'game_time_max', durationSeconds, match.id, { mode: 'absolute' });
          // Marathon (higher is better)
          checkAchievement(playerId, 'game_time_min', durationSeconds, match.id, { mode: 'absolute' });
        }
      }

      // --- Unique opponents ---
      const opponents = match.players.filter(p => p.playerId !== playerId);
      for (const _opponent of opponents) {
        checkAchievement(playerId, 'unique_opponents', 1, match.id);
      }
    });
  }, [checkAchievement]);

  // ==================== TRAINING CHECKS ====================
  const checkTrainingAchievements = useCallback((
    playerId: string,
    _mode: string,
    completed: boolean
  ) => {
    if (completed) {
      checkAchievement(playerId, 'training_completed', 1);
    }
  }, [checkAchievement]);

  const checkAllTrainingModesAchievement = useCallback((
    playerId: string,
    completedModes: string[]
  ) => {
    const allModes = ['doubles', 'triples', 'around-the-clock', 'checkout', 'bobs-27', 'score'];
    const completedAllModes = allModes.every(mode => completedModes.includes(mode));

    if (completedAllModes) {
      checkAchievement(playerId, 'training_all_modes', 6, undefined, { mode: 'absolute' });
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
