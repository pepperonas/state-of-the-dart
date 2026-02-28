import { useCallback, useRef } from 'react';
import { useAchievements } from '../context/AchievementContext';
import { Match, Leg, Dart } from '../types/index';
import { api } from '../services/api';
import logger from '../utils/logger';

interface MatchContext {
  previousThrowScore?: number;
  visitNumber?: number;
  opponentRemaining?: number;
  hadBustInLeg?: boolean;
  isBust?: boolean;
  isCheckoutAttempt?: boolean;
}

/**
 * Custom hook for checking and unlocking achievements during gameplay.
 * Covers throw-level, leg-level, match-level, calendar/time, and pattern checks.
 */
export const useGameAchievements = () => {
  const { checkAchievement, checkStreakProgress, unlockAchievement } = useAchievements();

  // Track consecutive 180 count for streak detection
  const consecutive180CountRef = useRef<Record<string, number>>({});

  // Track score-based streaks for streak achievements
  const scoreStreaksRef = useRef<Record<string, { s60: number; s100: number; s45: number }>>({});

  // Track consecutive misses (score 0 visits) for fail achievements
  const consecutiveMissesRef = useRef<Record<string, number>>({});

  // Track unique doubles hit per player (for checkout tracking)
  const uniqueDoublesRef = useRef<Record<string, Set<number>>>({});

  // Track same-double counts per player (segment -> count)
  const sameDoubleRef = useRef<Record<string, Record<number, number>>>({});

  // Track missed checkout streaks per player
  const missedCheckoutStreakRef = useRef<Record<string, number>>({});

  // Track win/loss streaks across matches
  const winStreakRef = useRef<Record<string, number>>({});
  const lossStreakRef = useRef<Record<string, number>>({});

  // Track average streaks across matches (consecutive matches with avg >= threshold)
  const avg40StreakRef = useRef<Record<string, number>>({});
  const avg50StreakRef = useRef<Record<string, number>>({});

  // Track whitewash streak (consecutive whitewash wins)
  const whitewashStreakRef = useRef<Record<string, number>>({});

  // Track game_180 streak (consecutive matches with at least one 180)
  const game180StreakRef = useRef<Record<string, number>>({});

  // Track legs_no_bust streak (consecutive legs won without bust)
  const legsNoBustStreakRef = useRef<Record<string, number>>({});

  // Track leg_checkout streak (consecutive legs where player checked out = won)
  const legCheckoutStreakRef = useRef<Record<string, number>>({});

  // Track unique triples hit (T1-T20) per player
  const uniqueTriplesRef = useRef<Record<string, Set<number>>>({});

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
    const exactScoreTargets = [3, 7, 13, 26, 41, 42, 45, 60, 66, 69, 77, 85, 99, 100, 111, 123, 126, 140, 141, 160, 170, 171];
    if (exactScoreTargets.includes(score)) {
      checkAchievement(playerId, 'exact_score', score, gameId);
    }

    // Score threshold increments (count achievements)
    if (score >= 60) checkAchievement(playerId, 'score_60_plus', 1, gameId);
    if (score >= 80) checkAchievement(playerId, 'score_80_plus', 1, gameId);
    if (score >= 100) checkAchievement(playerId, 'score_100_plus', 1, gameId);
    if (score >= 150) checkAchievement(playerId, 'score_150_plus', 1, gameId);

    // Track consecutive score streaks for streak achievements
    const streaks = scoreStreaksRef.current[playerId] || { s60: 0, s100: 0, s45: 0 };
    if (score >= 60) {
      streaks.s60++;
      checkStreakProgress(playerId, 'score_60_plus', streaks.s60, gameId);
    } else {
      streaks.s60 = 0;
    }
    if (score >= 100) {
      streaks.s100++;
      checkStreakProgress(playerId, 'score_100_plus', streaks.s100, gameId);
    } else {
      streaks.s100 = 0;
    }
    if (score >= 45) {
      streaks.s45++;
      checkStreakProgress(playerId, 'score_45_plus', streaks.s45, gameId);
    } else {
      streaks.s45 = 0;
    }
    scoreStreaksRef.current[playerId] = streaks;

    // Consecutive 60+ for cumulative count tracking
    if (score >= 60) {
      checkAchievement(playerId, 'consecutive_60_plus', 1, gameId);
    }

    // Triple consecutive 180 (3+ in a row)
    if (consecutive180CountRef.current[playerId] >= 3) {
      checkAchievement(playerId, 'triple_consecutive_180', 1, gameId);
    }

    // Consecutive misses tracking (score 0 visits)
    if (score === 0 && darts.length === 3) {
      consecutiveMissesRef.current[playerId] = (consecutiveMissesRef.current[playerId] || 0) + 1;
      checkAchievement(playerId, 'consecutive_misses', consecutiveMissesRef.current[playerId], gameId, { mode: 'absolute' });
    } else {
      consecutiveMissesRef.current[playerId] = 0;
    }

    // Bust after 180 (previous throw was 180 and this visit is a bust)
    if (matchContext?.isBust && matchContext?.previousThrowScore === 180) {
      checkAchievement(playerId, 'bust_after_180', 1, gameId);
    }

    // Low score
    if (score < 10 && darts.length > 0) {
      checkAchievement(playerId, 'visit_under_10', 1, gameId);
      checkAchievement(playerId, 'visit_under_10_fail', 1, gameId);
    }

    // --- Fail: Score patterns ---
    if (score === 1) {
      checkAchievement(playerId, 'single_1_hit', 1, gameId);
    }
    if (score === 3 && darts.length >= 1) {
      checkAchievement(playerId, 'visit_score_3', 1, gameId);
    }
    // Score of 0 (all misses)
    if (score === 0 && darts.length === 3) {
      checkAchievement(playerId, 'three_miss_visit', 1, gameId);
    }
    // Low score after high score
    if (score < 10 && darts.length > 0 && matchContext?.previousThrowScore && matchContext.previousThrowScore >= 100) {
      checkAchievement(playerId, 'crash_after_high', 1, gameId);
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

        // Track unique triples for all_triples achievement (T1-T20)
        if (dart.segment >= 1 && dart.segment <= 20) {
          if (!uniqueTriplesRef.current[playerId]) {
            uniqueTriplesRef.current[playerId] = new Set();
          }
          uniqueTriplesRef.current[playerId].add(dart.segment);
          checkAchievement(playerId, 'all_triples', uniqueTriplesRef.current[playerId].size, gameId, { mode: 'absolute' });
        }
      }

      // Outer bull / single bull
      if (dart.segment === 25 || dart.bed === 'outer-bull') {
        checkAchievement(playerId, 'outer_bull_hit', 1, gameId);
        checkAchievement(playerId, 'single_bull_hit', 1, gameId);
      }
    }

    // --- Fail: First dart miss ---
    if (darts.length > 0 && (darts[0].multiplier === 0 || darts[0].segment === 0)) {
      checkAchievement(playerId, 'visit_starts_with_miss', 1, gameId);
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
        checkAchievement(playerId, 'three_ones', 1, gameId);
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

      // --- Fail: 3-dart pattern checks ---
      // Three ones fail (S1-S1-S1 = 3 points)
      if (darts.every(d => d.segment === 1 && d.multiplier === 1)) {
        checkAchievement(playerId, 'three_ones_fail', 3, gameId);
      }

      // Descending darts (each lower than previous, none miss)
      const dartScores = darts.map(d => d.segment * d.multiplier);
      if (dartScores[0] > dartScores[1] && dartScores[1] > dartScores[2] &&
          darts.every(d => d.multiplier > 0 && d.segment > 0) && dartScores[0] > 0) {
        checkAchievement(playerId, 'descending_darts', 1, gameId);
      }

      // Three different low fields (<5 each)
      if (darts.every(d => d.segment > 0 && d.segment <= 5 && d.multiplier === 1) &&
          new Set(segments).size === 3) {
        checkAchievement(playerId, 'three_different_low', 1, gameId);
      }
    }

    // --- Checkout Analysis ---
    if (isCheckout && checkoutValue) {
      checkAchievement(playerId, 'checkouts', 1, gameId);
      // Perfect checkout: only if no busts occurred in this leg
      if (!matchContext?.hadBustInLeg) {
        checkAchievement(playerId, 'perfect_checkout', 1, gameId);
      }

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

      // Unique doubles tracking: track which double segments have been used for checkout
      const lastDartForDouble = darts[darts.length - 1];
      if (lastDartForDouble && lastDartForDouble.multiplier === 2) {
        const doubleSegment = lastDartForDouble.segment;
        if (!uniqueDoublesRef.current[playerId]) {
          uniqueDoublesRef.current[playerId] = new Set();
        }
        uniqueDoublesRef.current[playerId].add(doubleSegment);
        checkAchievement(playerId, 'unique_doubles', uniqueDoublesRef.current[playerId].size, gameId, { mode: 'absolute' });

        // Same double tracking: how many times the same double has been hit
        if (!sameDoubleRef.current[playerId]) {
          sameDoubleRef.current[playerId] = {};
        }
        sameDoubleRef.current[playerId][doubleSegment] = (sameDoubleRef.current[playerId][doubleSegment] || 0) + 1;
        const maxSameDouble = Math.max(...Object.values(sameDoubleRef.current[playerId]));
        checkAchievement(playerId, 'same_double', maxSameDouble, gameId, { mode: 'absolute' });
      }

      // First dart checkout (checkout with only 1 dart thrown)
      if (darts.length === 1) {
        checkAchievement(playerId, 'first_dart_checkout', 1, gameId, { mode: 'absolute' });
      }

      // Three dart checkout (checkout using all 3 darts, all scoring)
      if (darts.length === 3 && darts.every(d => d.score > 0 || (d.multiplier > 0 && d.segment > 0))) {
        checkAchievement(playerId, 'three_dart_checkout', 1, gameId);
      }

      // Reset missed checkout streak on successful checkout
      missedCheckoutStreakRef.current[playerId] = 0;
    }

    // Missed checkout attempt tracking (not a checkout but was a checkout attempt)
    if (!isCheckout && matchContext?.isCheckoutAttempt) {
      missedCheckoutStreakRef.current[playerId] = (missedCheckoutStreakRef.current[playerId] || 0) + 1;
      const streak = missedCheckoutStreakRef.current[playerId];
      if (streak >= 3) {
        checkAchievement(playerId, 'three_checkout_attempts_no_hit', 1, gameId);
      }
      if (streak >= 5) {
        checkAchievement(playerId, 'five_checkout_attempts_no_hit', 1, gameId);
      }
    } else if (isCheckout) {
      // Already reset above in checkout block
    }
  }, [checkAchievement, checkStreakProgress]);

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

    // 701-specific dart counts
    if (match.settings.startScore === 701) {
      checkAchievement(winnerId, 'leg_701_darts', totalDarts, match.id);
    }

    // Legs under 15 darts
    if (totalDarts <= 15) {
      checkAchievement(winnerId, 'legs_under_15_darts', 1, match.id);
    }

    // No-bust leg
    const hadBust = winnerThrows.some(t => t.isBust);
    if (!hadBust && totalDarts > 0) {
      checkAchievement(winnerId, 'leg_no_bust', 1, match.id);
      // Streak: consecutive legs won without bust
      legsNoBustStreakRef.current[winnerId] = (legsNoBustStreakRef.current[winnerId] || 0) + 1;
      checkStreakProgress(winnerId, 'legs_no_bust', legsNoBustStreakRef.current[winnerId], match.id);
    } else {
      legsNoBustStreakRef.current[winnerId] = 0;
    }

    // Leg checkout streak: consecutive legs won (= checked out)
    legCheckoutStreakRef.current[winnerId] = (legCheckoutStreakRef.current[winnerId] || 0) + 1;
    checkStreakProgress(winnerId, 'leg_checkout', legCheckoutStreakRef.current[winnerId], match.id);
    // Reset checkout streak for losers
    for (const p of match.players) {
      if (p.playerId !== winnerId) {
        legCheckoutStreakRef.current[p.playerId] = 0;
      }
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

    // Mirror score: winner and opponent scored exact same total in this leg
    for (const opponent of otherPlayers) {
      const opponentThrows = leg.throws.filter(t => t.playerId === opponent.playerId);
      const winnerTotalScored = winnerThrows.reduce((sum, t) => sum + t.score, 0);
      const opponentTotalScored = opponentThrows.reduce((sum, t) => sum + t.score, 0);
      if (winnerTotalScored === opponentTotalScored && winnerTotalScored > 0) {
        checkAchievement(winnerId, 'mirror_score', 1, match.id, { mode: 'absolute' });
      }
    }

    // First visit checkout detection
    if (winnerThrows.length === 1) {
      checkAchievement(winnerId, 'first_visit_checkout', 1, match.id);
    }

    // Leg visits minimum (number of visits/throws to win, lower is better)
    checkAchievement(winnerId, 'leg_visits_min', winnerThrows.length, match.id, { mode: 'absolute' });

    // Checkout darts max (darts in the winning throw, lower is better)
    if (winnerThrows.length > 0) {
      const checkoutThrow = winnerThrows[winnerThrows.length - 1];
      checkAchievement(winnerId, 'checkout_darts_max', checkoutThrow.darts.length, match.id, { mode: 'absolute' });
    }

    // Checkout after misses: missed checkout attempts in THIS leg before eventual checkout
    if (winnerThrows.length > 1) {
      const startScore = match.settings.startScore || 501;
      let remaining = startScore;
      let missedCheckoutAttempts = 0;
      for (let i = 0; i < winnerThrows.length - 1; i++) {
        const t = winnerThrows[i];
        if (!t.isBust) {
          if (remaining <= 170 && remaining > 0) {
            missedCheckoutAttempts++;
          }
          remaining -= t.score;
        }
      }
      if (missedCheckoutAttempts > 0) {
        checkAchievement(winnerId, 'checkout_after_misses', missedCheckoutAttempts, match.id, { mode: 'absolute' });
      }
    }

    // Leg comeback points: check if winner was behind at any point and by how much
    {
      const startScore = match.settings.startScore || 501;
      let winnerRemaining = startScore;
      let maxBehind = 0;

      // Build a turn-by-turn picture of the leg
      // Group throws by visit order (interleaved)
      const allPlayers = match.players.map(p => p.playerId);
      const remainings: Record<string, number> = {};
      for (const pid of allPlayers) remainings[pid] = startScore;

      for (const t of leg.throws) {
        if (!t.isBust) {
          remainings[t.playerId] -= t.score;
        }
        if (t.playerId === winnerId) {
          winnerRemaining = remainings[winnerId];
          // Check how far behind the winner is compared to each opponent
          for (const pid of allPlayers) {
            if (pid !== winnerId) {
              const deficit = winnerRemaining - remainings[pid];
              if (deficit > 0) {
                maxBehind = Math.max(maxBehind, deficit);
              }
            }
          }
        }
      }
      if (maxBehind > 0) {
        checkAchievement(winnerId, 'leg_comeback_points', maxBehind, match.id, { mode: 'absolute' });
      }
    }

    // Average darts per leg (computed at match level after each leg completes)
    {
      const completedLegs = match.legs.filter(l => l.winner === winnerId);
      if (completedLegs.length > 0) {
        const totalDartsAllLegs = completedLegs.reduce((sum, l) => {
          const throws = l.throws.filter(t => t.playerId === winnerId);
          return sum + throws.reduce((s, t) => s + t.darts.length, 0);
        }, 0);
        const avgDartsPerLeg = totalDartsAllLegs / completedLegs.length;
        checkAchievement(winnerId, 'avg_darts_per_leg_max', avgDartsPerLeg, match.id, { mode: 'absolute' });
      }
    }

    // --- Fail: Leg-level checks for losers ---
    const losers = match.players.filter(p => p.playerId !== winnerId);
    for (const loser of losers) {
      const loserId = loser.playerId;
      checkAchievement(loserId, 'legs_lost', 1, match.id);

      const loserThrows = leg.throws.filter(t => t.playerId === loserId);

      // Lost leg despite checkout attempt
      const hadCheckoutAttempt = loserThrows.some(t => t.isCheckoutAttempt);
      if (hadCheckoutAttempt) {
        checkAchievement(loserId, 'legs_lost_on_checkout', 1, match.id);
      }

      // Bust count in this leg
      const bustCount = loserThrows.filter(t => t.isBust).length;
      if (bustCount >= 2) {
        checkAchievement(loserId, 'double_bust_leg', 1, match.id);
      }
      if (bustCount >= 3) {
        checkAchievement(loserId, 'triple_bust_leg', 1, match.id);
      }

      // First visit was zero (all misses)
      if (loserThrows.length > 0 && loserThrows[0].score === 0 && loserThrows[0].darts.length === 3) {
        checkAchievement(loserId, 'zero_first_visit', 1, match.id);
      }

      // Worst visit in leg under 5
      const worstVisitScore = Math.min(...loserThrows.filter(t => !t.isBust && t.darts.length > 0).map(t => t.score));
      if (worstVisitScore < 5 && loserThrows.length > 0) {
        checkAchievement(loserId, 'worst_visit_under_5', 1, match.id);
      }

      // Zero visit count in this leg
      const zeroVisits = loserThrows.filter(t => t.score === 0 && t.darts.length === 3).length;
      if (zeroVisits >= 2) {
        checkAchievement(loserId, 'zero_visits_in_match', zeroVisits, match.id, { mode: 'absolute' });
      }

      // Three low visits in a row (<20 each)
      for (let i = 0; i <= loserThrows.length - 3; i++) {
        if (loserThrows[i].score < 20 && loserThrows[i + 1].score < 20 && loserThrows[i + 2].score < 20 &&
            !loserThrows[i].isBust && !loserThrows[i + 1].isBust && !loserThrows[i + 2].isBust) {
          checkAchievement(loserId, 'three_low_visits_row', 1, match.id);
          break;
        }
      }

      // Same low score streak (<20, 3x same)
      for (let i = 0; i <= loserThrows.length - 3; i++) {
        if (loserThrows[i].score === loserThrows[i + 1].score &&
            loserThrows[i + 1].score === loserThrows[i + 2].score &&
            loserThrows[i].score < 20 && loserThrows[i].score > 0 &&
            !loserThrows[i].isBust && !loserThrows[i + 1].isBust && !loserThrows[i + 2].isBust) {
          checkAchievement(loserId, 'same_low_score_streak', 1, match.id);
          break;
        }
      }
    }

    // --- Fail: Bust tracking for all players in this leg ---
    for (const player of match.players) {
      const playerThrows = leg.throws.filter(t => t.playerId === player.playerId);
      for (const t of playerThrows) {
        if (t.isBust) {
          checkAchievement(player.playerId, 'busts', 1, match.id);

          // Bust on checkout attempt
          if (t.isCheckoutAttempt) {
            checkAchievement(player.playerId, 'bust_on_checkout_attempt', 1, match.id);
          }
        }
      }
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
        // Track win streak
        winStreakRef.current[playerId] = (winStreakRef.current[playerId] || 0) + 1;
        lossStreakRef.current[playerId] = 0;
        checkStreakProgress(playerId, 'wins', winStreakRef.current[playerId], match.id);
      } else {
        // Track loss streak
        winStreakRef.current[playerId] = 0;
        lossStreakRef.current[playerId] = (lossStreakRef.current[playerId] || 0) + 1;
        checkStreakProgress(playerId, 'losses', lossStreakRef.current[playerId], match.id);
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
        // NOTE: score_180 is already incremented per-throw in checkThrowAchievements, don't double-count here
        // 180s in this specific match (absolute)
        checkAchievement(playerId, 'match_180_count', player.match180s, match.id, { mode: 'absolute' });
        // game_180 streak: consecutive matches with at least one 180
        game180StreakRef.current[playerId] = (game180StreakRef.current[playerId] || 0) + 1;
        checkStreakProgress(playerId, 'game_180', game180StreakRef.current[playerId], match.id);
      } else {
        game180StreakRef.current[playerId] = 0;
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
            // Whitewash streak: consecutive whitewash wins
            whitewashStreakRef.current[playerId] = (whitewashStreakRef.current[playerId] || 0) + 1;
            checkStreakProgress(playerId, 'whitewash_streak', whitewashStreakRef.current[playerId], match.id);
          } else {
            whitewashStreakRef.current[playerId] = 0;
          }
        } else {
          // Not a multi-leg match, don't count for whitewash streak
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

        // Close wins (cumulative count, different from close_win which is absolute flag)
        const winnerLegsForClose = player.legsWon;
        const maxOpponentLegsForClose = Math.max(...match.players.filter(p => p.playerId !== playerId).map(p => p.legsWon));
        if (winnerLegsForClose - maxOpponentLegsForClose === 1) {
          checkAchievement(playerId, 'close_wins', 1, match.id);
        }

        // Best-of-five wins (legsToWin >= 3)
        const legsToWinForBo5 = match.settings.legsToWin || 3;
        if (legsToWinForBo5 >= 3) {
          checkAchievement(playerId, 'best_of_five_wins', 1, match.id);
        }

        // First leg wins (won the first leg of the match)
        if (match.legs.length > 0 && match.legs[0].winner === playerId) {
          checkAchievement(playerId, 'first_leg_wins', 1, match.id);
          checkStreakProgress(playerId, 'first_leg_wins', (winStreakRef.current[playerId] || 0), match.id);
        }

        // Last leg wins (won the deciding/last leg)
        const lastLeg = match.legs[match.legs.length - 1];
        if (lastLeg && lastLeg.winner === playerId && maxOpponentLegsForClose > 0) {
          checkAchievement(playerId, 'last_leg_wins', 1, match.id);
          checkStreakProgress(playerId, 'last_leg_wins', (winStreakRef.current[playerId] || 0), match.id);
        }

        // Weekend wins
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          checkAchievement(playerId, 'weekend_wins', 1, match.id);
        }

        // Comeback win analysis: did the winner trail in legs at any point?
        {
          let playerLegsWon = 0;
          let opponentMaxLegsWon = 0;
          let trailedAtAnyPoint = false;
          let maxDeficit = 0;

          for (const leg of match.legs) {
            if (leg.winner === playerId) {
              playerLegsWon++;
            } else if (leg.winner) {
              opponentMaxLegsWon++;
            }
            if (opponentMaxLegsWon > playerLegsWon) {
              trailedAtAnyPoint = true;
              maxDeficit = Math.max(maxDeficit, opponentMaxLegsWon - playerLegsWon);
            }
          }

          if (trailedAtAnyPoint) {
            // Comeback win: won after being behind in legs
            checkAchievement(playerId, 'comeback_win', 1, match.id, { mode: 'absolute' });
            checkAchievement(playerId, 'comeback_wins', 1, match.id);
            checkAchievement(playerId, 'comeback_points', maxDeficit, match.id, { mode: 'absolute' });
          }

          // Reverse sweep: 0:2 down, won 3:2 (or equivalent best-of-5+)
          if (maxDeficit >= 2 && playerLegsWon >= 3 && opponentMaxLegsWon >= 2) {
            checkAchievement(playerId, 'reverse_sweep', 1, match.id, { mode: 'absolute' });
          }

          // Comeback one leg: won after being 0:1 down (any best-of-3+ match)
          if (trailedAtAnyPoint && opponentMaxLegsWon >= 1) {
            checkAchievement(playerId, 'comeback_one_leg', 1, match.id, { mode: 'absolute' });
          }
        }

        // Flawless match: won without any bust and average > 60
        const allWinnerThrows = match.legs.flatMap(l => l.throws.filter(t => t.playerId === playerId));
        const winnerHadBust = allWinnerThrows.some(t => t.isBust);
        if (!winnerHadBust && player.matchAverage && player.matchAverage > 60) {
          checkAchievement(playerId, 'flawless_match', 1, match.id, { mode: 'absolute' });
        }

        // Exact visits: won a match where total visits across all legs equals target (e.g. 13)
        {
          const totalVisits = match.legs.reduce((sum, l) => {
            return sum + l.throws.filter(t => t.playerId === playerId).length;
          }, 0);
          checkAchievement(playerId, 'exact_visits', totalVisits, match.id, { mode: 'absolute' });
        }

        // Perfect 501 match: 501 game, average <= 15 darts per leg across all won legs
        if (match.settings.startScore === 501) {
          const wonLegs = match.legs.filter(l => l.winner === playerId);
          if (wonLegs.length > 0) {
            const totalDartsInWonLegs = wonLegs.reduce((sum, l) => {
              const throws = l.throws.filter(t => t.playerId === playerId);
              return sum + throws.reduce((s, t) => s + t.darts.length, 0);
            }, 0);
            const avgDartsPerLeg = totalDartsInWonLegs / wonLegs.length;
            if (avgDartsPerLeg <= 15) {
              checkAchievement(playerId, 'perfect_501_match', 1, match.id, { mode: 'absolute' });
            }
          }
        }
      }

      // Average threshold streak achievements (for all players)
      if (player.matchAverage) {
        if (player.matchAverage >= 40) {
          avg40StreakRef.current[playerId] = (avg40StreakRef.current[playerId] || 0) + 1;
          checkStreakProgress(playerId, 'average_40_plus', avg40StreakRef.current[playerId], match.id);
        } else {
          avg40StreakRef.current[playerId] = 0;
        }
        if (player.matchAverage >= 50) {
          avg50StreakRef.current[playerId] = (avg50StreakRef.current[playerId] || 0) + 1;
          checkStreakProgress(playerId, 'average_50_plus', avg50StreakRef.current[playerId], match.id);
        } else {
          avg50StreakRef.current[playerId] = 0;
        }
      } else {
        avg40StreakRef.current[playerId] = 0;
        avg50StreakRef.current[playerId] = 0;
      }

      // Match no bust check
      const playerThrows = match.legs.flatMap(leg => leg.throws.filter(t => t.playerId === playerId));
      const hadAnyBust = playerThrows.some(t => t.isBust);
      if (!hadAnyBust && isWinner && playerThrows.length > 0) {
        checkAchievement(playerId, 'match_no_bust', 1, match.id, { mode: 'absolute' });
      }

      // --- Fail: Match-level checks ---
      // Bust counts in match
      const matchBustCount = playerThrows.filter(t => t.isBust).length;
      if (matchBustCount >= 2) {
        checkAchievement(playerId, 'busts_in_match', matchBustCount, match.id, { mode: 'absolute' });
      }

      // Bust on high score (remaining > 100)
      for (const leg of match.legs) {
        const legThrows = leg.throws.filter(t => t.playerId === playerId);
        const startScore = match.settings.startScore || 501;
        let remaining = startScore;
        for (const t of legThrows) {
          if (t.isBust && remaining > 100) {
            checkAchievement(playerId, 'bust_on_high_score', 1, match.id);
          }
          if (t.isBust && remaining < 20) {
            checkAchievement(playerId, 'bust_on_low_score', 1, match.id);
          }
          if (t.isBust && remaining === 2) {
            checkAchievement(playerId, 'bust_on_2', 1, match.id);
          }
          if (!t.isBust) {
            remaining -= t.score;
          }
        }
      }

      // Missed checkouts count
      const missedCheckouts = playerThrows.filter(t => t.isCheckoutAttempt && !playerThrows.some(
        pt => pt.visitNumber === t.visitNumber && !pt.isBust
      )).length;
      // Simpler: count checkout attempts that didn't result in a checkout
      const checkoutAttemptVisits = playerThrows.filter(t => t.isCheckoutAttempt);
      const missedCheckoutCount = checkoutAttemptVisits.filter(t => t.isBust || t.score === 0).length;
      if (missedCheckoutCount > 0) {
        checkAchievement(playerId, 'missed_checkouts', missedCheckoutCount, match.id);
      }

      // Miss on checkout attempt (dart missed board during checkout attempt)
      for (const t of playerThrows) {
        if (t.isCheckoutAttempt && t.darts.some(d => d.multiplier === 0 || d.segment === 0)) {
          checkAchievement(playerId, 'miss_on_checkout_attempt', 1, match.id);
        }
      }

      // Low average checks
      if (player.matchAverage) {
        if (player.matchAverage < 30) {
          checkAchievement(playerId, 'match_average_under_30', 1, match.id);
        }
        if (player.matchAverage < 20) {
          checkAchievement(playerId, 'match_average_under_20', 1, match.id);
        }
        if (player.matchAverage < 15) {
          checkAchievement(playerId, 'match_average_under_15', 1, match.id);
        }
      }

      // No 60+ score in match
      const maxScore = Math.max(...playerThrows.filter(t => !t.isBust).map(t => t.score), 0);
      if (maxScore < 60 && playerThrows.length > 0) {
        checkAchievement(playerId, 'no_60_plus_match', 1, match.id);
      }

      // Checkout percentage under 10% (min 5 attempts)
      if (player.checkoutAttempts && player.checkoutAttempts >= 5) {
        const checkoutPct = (player.checkoutsHit / player.checkoutAttempts) * 100;
        if (checkoutPct < 10) {
          checkAchievement(playerId, 'checkout_pct_under_10', 1, match.id);
        }
      }

      // Zero visits in match (total across all legs)
      const totalZeroVisits = playerThrows.filter(t => t.score === 0 && t.darts.length === 3).length;
      if (totalZeroVisits >= 2) {
        checkAchievement(playerId, 'zero_visits_in_match', totalZeroVisits, match.id, { mode: 'absolute' });
      }

      // --- Fail: Loser-specific checks ---
      if (!isWinner) {
        checkAchievement(playerId, 'matches_lost', 1, match.id);

        // Whitewash loss (0 legs won)
        if (player.legsWon === 0) {
          checkAchievement(playerId, 'matches_lost_whitewash', 1, match.id);
        }

        // Lost with higher average
        const opponents = match.players.filter(p => p.playerId !== playerId);
        const winnerPlayer = opponents.find(p => isPlayerWinner(p.playerId));
        if (winnerPlayer && player.matchAverage && winnerPlayer.matchAverage) {
          if (player.matchAverage > winnerPlayer.matchAverage) {
            checkAchievement(playerId, 'lost_with_higher_average', 1, match.id);
          }
          // Lost with big average difference
          if (winnerPlayer.matchAverage - player.matchAverage >= 50) {
            checkAchievement(playerId, 'lost_big_avg_diff', 1, match.id);
          }
        }

        // Lost to easy bot (level 1-3)
        const botOpponents = opponents.filter(p => p.isBot && isPlayerWinner(p.playerId));
        for (const bot of botOpponents) {
          if (bot.botLevel && bot.botLevel <= 3) {
            checkAchievement(playerId, 'lost_to_easy_bot', 1, match.id);
          }
        }

        // Lost more legs: lost despite having more legs won than the winner (3+ player game)
        if (match.players.length >= 3) {
          const winnerPlayer = opponents.find(p => isPlayerWinner(p.playerId));
          if (winnerPlayer && player.legsWon > winnerPlayer.legsWon) {
            checkAchievement(playerId, 'lost_more_legs', 1, match.id);
          }
        }

        // Last place in multiplayer (3+ players)
        if (match.players.length >= 3) {
          const minLegs = Math.min(...match.players.map(p => p.legsWon));
          if (player.legsWon === minLegs) {
            const playersWithMinLegs = match.players.filter(p => p.legsWon === minLegs);
            if (playersWithMinLegs.length === 1) {
              checkAchievement(playerId, 'last_place_multi', 1, match.id);
            }
          }
        }

        // Lead blown (lost after 2:0 lead in best of 5+)
        const legsToWin = match.settings.legsToWin || 3;
        if (legsToWin >= 3) {
          // Check leg progression to see if player had 2:0 lead
          let playerLegs = 0;
          let opponentMaxLegs = 0;
          let hadTwoZeroLead = false;
          for (const leg of match.legs) {
            if (leg.winner === playerId) {
              playerLegs++;
            } else if (leg.winner) {
              opponentMaxLegs++;
            }
            if (playerLegs === 2 && opponentMaxLegs === 0) {
              hadTwoZeroLead = true;
            }
          }
          if (hadTwoZeroLead) {
            checkAchievement(playerId, 'lead_blown', 1, match.id);
          }
        }

        // Missed match dart: loser had checkout attempt in the last leg they could have won
        // (i.e., they were in a position to win the match but failed to checkout)
        const loserLegsNeeded = match.settings.legsToWin || 3;
        if (player.legsWon === loserLegsNeeded - 1) {
          // Player was 1 leg away from winning — check if they had checkout attempt in any losing leg
          const losingLegs = match.legs.filter(l => l.winner && l.winner !== playerId);
          for (const leg of losingLegs) {
            const loserThrows = leg.throws.filter(t => t.playerId === playerId);
            if (loserThrows.some(t => t.isCheckoutAttempt)) {
              checkAchievement(playerId, 'missed_match_dart', 1, match.id);
              break;
            }
          }
        }
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
  }, [checkAchievement, checkStreakProgress]);

  // ==================== TRAINING CHECKS ====================
  interface TrainingResult {
    mode: string;
    completed: boolean;
    hitRate?: number;       // 0-100 percentage
    score?: number;         // Final score
    averageScore?: number;  // Average per round
    highestScore?: number;
    totalDarts?: number;
    totalHits?: number;
    totalAttempts?: number;
    duration?: number;      // seconds
    numbersHit?: number[];  // which numbers were hit (for around-the-clock)
  }

  const checkTrainingAchievements = useCallback((
    playerId: string,
    result: TrainingResult
  ) => {
    if (!result.completed) return;

    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Basic completion
    checkAchievement(playerId, 'training_completed', 1);

    // Mode-specific checks
    if (result.mode === 'around-the-clock') {
      checkAchievement(playerId, 'training_around_clock', 1);
      // All numbers hit (1-20)
      if (result.numbersHit && result.numbersHit.length >= 20) {
        checkAchievement(playerId, 'training_all_numbers', 1, undefined, { mode: 'absolute' });
      }
    }

    // Hit rate / accuracy checks
    if (result.hitRate !== undefined) {
      if (result.hitRate >= 80) {
        checkAchievement(playerId, 'training_80_percent', 1, undefined, { mode: 'absolute' });
      }
      if (result.hitRate === 100) {
        checkAchievement(playerId, 'training_perfect', 1, undefined, { mode: 'absolute' });
      }

      // Doubles accuracy
      if (result.mode === 'doubles' && result.hitRate > 0) {
        checkAchievement(playerId, 'training_doubles_percent', result.hitRate, undefined, { mode: 'absolute' });
      }

      // Triples accuracy
      if (result.mode === 'triples') {
        checkAchievement(playerId, 'training_triples', result.totalHits || 0, undefined, { mode: 'absolute' });
        // 100 triples in training (cumulative)
        if (result.totalHits) {
          checkAchievement(playerId, 'training_100_triples', result.totalHits);
        }
      }

      // Checkout percent
      if (result.mode === 'checkout-121' && result.hitRate > 0) {
        checkAchievement(playerId, 'training_checkout_percent', result.hitRate, undefined, { mode: 'absolute' });
      }
    }

    // Score training average
    if (result.mode === 'score-training' && result.averageScore) {
      checkAchievement(playerId, 'training_scoring_avg', result.averageScore, undefined, { mode: 'absolute' });
      if (result.averageScore >= 100) {
        checkAchievement(playerId, 'training_scoring_100', 1);
      }
    }

    // Fast + good training (completed in under 5 min with 80%+ hit rate)
    if (result.duration && result.duration < 300 && result.hitRate && result.hitRate >= 80) {
      checkAchievement(playerId, 'training_fast_good', 1, undefined, { mode: 'absolute' });
    }

    // Score improvement tracking (handled by comparing with previous best — the caller should pass this)
    // For now, personal best detection happens in saveSession, we can check it there

    // Time-based training achievements
    if (hour >= 5 && hour < 8) {
      checkAchievement(playerId, 'training_morning', 1);
      checkAchievement(playerId, 'training_early', 1, undefined, { mode: 'absolute' });
    }
    if (hour >= 22 || hour < 2) {
      checkAchievement(playerId, 'training_late', 1, undefined, { mode: 'absolute' });
    }

    // Weekend training
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      checkAchievement(playerId, 'weekend_training', 1);
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
      checkAchievement(playerId, 'all_training_types', 6, undefined, { mode: 'absolute' });
    }
  }, [checkAchievement]);

  // ==================== CALENDAR/DAILY CHECKS ====================
  const checkCalendarAchievements = useCallback(async (playerId: string) => {
    try {
      const stats = await api.achievements.getCalendarStats(playerId);

      // Unique play days (cumulative count)
      if (stats.uniquePlayDays > 0) {
        checkAchievement(playerId, 'unique_play_days', stats.uniquePlayDays, undefined, { mode: 'absolute' });
      }

      // Unique win days (cumulative count)
      if (stats.uniqueWinDays > 0) {
        checkAchievement(playerId, 'unique_win_days', stats.uniqueWinDays, undefined, { mode: 'absolute' });
      }

      // Daily play streak
      if (stats.dailyPlayStreak > 0) {
        checkStreakProgress(playerId, 'daily_play', stats.dailyPlayStreak);
      }

      // Daily training streak
      if (stats.dailyTrainingStreak > 0) {
        checkStreakProgress(playerId, 'daily_training', stats.dailyTrainingStreak);
      }

      // Days since first game
      if (stats.daysSinceFirstGame > 0) {
        checkAchievement(playerId, 'days_since_first_game', stats.daysSinceFirstGame, undefined, { mode: 'absolute' });
      }

      // Training sessions today (for training_one_day)
      if (stats.trainingsToday > 0) {
        checkAchievement(playerId, 'training_one_day', stats.trainingsToday, undefined, { mode: 'absolute' });
      }

      // Win days this month (for daily_win_month)
      if (stats.winDaysThisMonth > 0) {
        checkAchievement(playerId, 'daily_win_month', stats.winDaysThisMonth, undefined, { mode: 'absolute' });
      }

      // Consecutive days with 3+ wins
      if (stats.dailyThreeWinsStreak > 0) {
        checkAchievement(playerId, 'daily_three_wins', stats.dailyThreeWinsStreak, undefined, { mode: 'absolute' });
      }

      // 100 wins in X days (target is 30 — unlock if achieved within 30 days)
      if (stats.wins100InDays !== null && stats.wins100InDays <= 30) {
        checkAchievement(playerId, 'wins_100_days', stats.wins100InDays, undefined, { mode: 'absolute' });
      }

      // Game mode variety
      if (stats.distinctGameTypes > 0) {
        // All modes tried (at least 1 game in each mode)
        // x01 counts as 1 mode, cricket, around-the-clock, shanghai = 4 total modes
        if (stats.distinctGameTypes >= 4) {
          checkAchievement(playerId, 'all_modes_tried', 1, undefined, { mode: 'absolute' });
        }
      }

      // Games played in all X01 modes (min across 301/501/701)
      if (stats.minGamesAllModes > 0) {
        checkAchievement(playerId, 'all_modes_played', stats.minGamesAllModes, undefined, { mode: 'absolute' });
      }

      // Wins in all X01 modes (min wins across 301/501/701)
      if (stats.minWinsAllModes > 0) {
        checkAchievement(playerId, 'wins_all_modes', stats.minWinsAllModes, undefined, { mode: 'absolute' });
      }

      // All training types completed
      if (stats.distinctTrainingTypes >= 6) {
        checkAchievement(playerId, 'all_training_types', stats.distinctTrainingTypes, undefined, { mode: 'absolute' });
      }

      // All training 90%+ (minimum hit rate across all training types)
      if (stats.minHitRateAllTraining >= 90) {
        checkAchievement(playerId, 'all_training_90', stats.minHitRateAllTraining, undefined, { mode: 'absolute' });
      }
    } catch (error) {
      logger.error('Failed to check calendar achievements:', error);
    }
  }, [checkAchievement, checkStreakProgress]);

  return {
    checkMatchAchievements,
    checkLegAchievements,
    checkThrowAchievements,
    checkTrainingAchievements,
    checkAllTrainingModesAchievement,
    checkCalendarAchievements,
  };
};
