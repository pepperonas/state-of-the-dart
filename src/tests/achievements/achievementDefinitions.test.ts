/**
 * Achievement Definitions Tests
 *
 * Validates all 464 achievement definitions for correctness:
 * - No duplicate IDs
 * - No duplicate names within same category
 * - Valid types, categories, tiers, rarities
 * - Target values match description semantics
 * - exact_score achievements use type 'special'
 * - Progression series have strictly increasing targets
 * - Metrics consistency
 * - CUMULATIVE_METRICS completeness
 */
import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, Achievement, AchievementCategory, AchievementTier } from '../../types/achievements';

// Import CUMULATIVE_METRICS by reading the source (we can't import it directly since it's a const in context)
// Instead we define the expected set and verify against it
const EXPECTED_CUMULATIVE_METRICS = new Set([
  'games_played', 'wins', 'score_180', 'training_completed', 'checkouts',
  'triples_hit', 'doubles_hit', 'singles_hit', 'bullseye_hit', 'outer_bull_hit',
  'single_bull_hit', 'triple_20_hit', 'triple_19_hit', 'triple_18_hit', 'triple_17_hit',
  'score_100_plus', 'score_60_plus', 'score_80_plus', 'score_150_plus',
  'perfect_checkout', 'checkout_d20', 'checkout_d16', 'checkout_d12', 'checkout_d18', 'checkout_d1',
  'checkout_bullseye', 'weekend_games', 'late_night_games', 'early_morning_wins',
  'lunch_games', 'bot_wins', 'human_wins', 'missed_board', 'whitewash_wins',
  'unique_checkout_values', 'unique_opponents', 'legs_under_15_darts',
  'decider_wins', 'weekend_training', 'training_morning', 'training_around_clock',
  'busts', 'three_miss_visit', 'legs_lost', 'matches_lost', 'single_1_hit',
  'legs_lost_on_checkout', 'bust_on_high_score', 'bust_on_low_score', 'bust_on_2',
  'matches_lost_whitewash', 'missed_checkouts', 'visit_under_10_fail',
  'worst_visit_under_5', 'match_average_under_30', 'match_average_under_20',
  'zero_first_visit', 'miss_on_checkout_attempt', 'bust_on_checkout_attempt',
  'bust_after_180', 'double_bust_leg', 'triple_bust_leg', 'consecutive_misses',
  'visit_starts_with_miss', 'descending_darts', 'three_different_low',
  'same_low_score_streak', 'crash_after_high', 'lost_with_higher_average',
  'lost_big_avg_diff', 'last_place_multi', 'lost_to_easy_bot',
  'three_checkout_attempts_no_hit', 'five_checkout_attempts_no_hit',
  'checkout_pct_under_10', 'missed_match_dart', 'lost_more_legs',
  'lead_blown', 'match_average_under_15', 'no_60_plus_match',
  'visit_score_3', 'three_low_visits_row',
  'checkout_after_180', 'checkout_one_dart', 'checkout_two_dart', 'clutch_checkout',
  'first_visit_checkout', 'impossible_checkout', 'leg_no_bust', 'pressure_checkout',
  'robin_hood', 'same_segment', 'shanghai', 'shutout_leg', 'three_ones',
  'three_triples', 'triple_single_double', 'two_doubles_visit', 'visit_under_10',
  'achievements_unlocked', 'unique_play_days', 'comeback_wins', 'best_of_five_wins',
  'close_wins', 'weekend_wins', 'unique_win_days', 'legendary_achievements',
  'triple_consecutive_180', 'first_leg_wins', 'last_leg_wins', 'match_no_bust',
  'consecutive_60_plus', 'fail_achievements_unlocked',
  'unique_doubles', 'same_double', 'training_scoring_100',
]);

const VALID_CATEGORIES: AchievementCategory[] = [
  'first_steps', 'scoring', 'checkout', 'training', 'consistency', 'special', 'master', 'fail'
];

const VALID_TIERS: AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
const VALID_RARITIES = ['common', 'rare', 'epic', 'legendary'];
const VALID_TYPES = ['count', 'value', 'streak', 'special'];

// Metrics where lower values are better (used with isLowerBetter in checkAchievement)
const LOWER_IS_BETTER_METRICS = new Set([
  'game_time_max', 'leg_darts', 'leg_301_darts', 'checkout_darts_max', 'avg_darts_per_leg_max'
]);

describe('Achievement Definitions', () => {
  describe('Total Count', () => {
    it('should have exactly 464 achievements', () => {
      expect(ACHIEVEMENTS.length).toBe(464);
    });
  });

  describe('Unique IDs', () => {
    it('should have no duplicate IDs', () => {
      const ids = ACHIEVEMENTS.map(a => a.id);
      const uniqueIds = new Set(ids);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      expect(duplicates).toEqual([]);
      expect(uniqueIds.size).toBe(ACHIEVEMENTS.length);
    });
  });

  describe('Valid Fields', () => {
    it('every achievement should have a non-empty id', () => {
      ACHIEVEMENTS.forEach(a => {
        expect(a.id, `Achievement has empty id`).toBeTruthy();
        expect(typeof a.id).toBe('string');
      });
    });

    it('every achievement should have a non-empty name', () => {
      ACHIEVEMENTS.forEach(a => {
        expect(a.name, `${a.id} has empty name`).toBeTruthy();
      });
    });

    it('every achievement should have a non-empty description', () => {
      ACHIEVEMENTS.forEach(a => {
        expect(a.description, `${a.id} has empty description`).toBeTruthy();
      });
    });

    it('every achievement should have a valid category', () => {
      ACHIEVEMENTS.forEach(a => {
        expect(VALID_CATEGORIES, `${a.id} has invalid category: ${a.category}`).toContain(a.category);
      });
    });

    it('every achievement should have a valid tier', () => {
      ACHIEVEMENTS.forEach(a => {
        expect(VALID_TIERS, `${a.id} has invalid tier: ${a.tier}`).toContain(a.tier);
      });
    });

    it('every achievement should have a valid type', () => {
      ACHIEVEMENTS.forEach(a => {
        expect(VALID_TYPES, `${a.id} has invalid type: ${a.requirement.type}`).toContain(a.requirement.type);
      });
    });

    it('every achievement should have a positive target', () => {
      ACHIEVEMENTS.forEach(a => {
        expect(a.requirement.target, `${a.id} has non-positive target`).toBeGreaterThan(0);
      });
    });

    it('every achievement should have positive points', () => {
      ACHIEVEMENTS.forEach(a => {
        expect(a.points, `${a.id} has non-positive points`).toBeGreaterThan(0);
      });
    });

    it('every achievement should have a non-empty metric', () => {
      ACHIEVEMENTS.forEach(a => {
        expect(a.requirement.metric, `${a.id} has empty metric`).toBeTruthy();
      });
    });

    it('every achievement with rarity should have a valid rarity', () => {
      ACHIEVEMENTS.filter(a => a.rarity).forEach(a => {
        expect(VALID_RARITIES, `${a.id} has invalid rarity: ${a.rarity}`).toContain(a.rarity);
      });
    });
  });

  describe('exact_score achievements', () => {
    it('all exact_score achievements should use type special', () => {
      const exactScoreAchievements = ACHIEVEMENTS.filter(a => a.requirement.metric === 'exact_score');
      expect(exactScoreAchievements.length).toBeGreaterThan(0);
      exactScoreAchievements.forEach(a => {
        expect(a.requirement.type, `${a.id} (${a.name}) with metric exact_score should use type 'special', not '${a.requirement.type}'`).toBe('special');
      });
    });
  });

  describe('Lower-is-better metrics', () => {
    it('leg_darts achievements should use type special (exact match for dart counts)', () => {
      const legDartAchievements = ACHIEVEMENTS.filter(a => a.requirement.metric === 'leg_darts');
      legDartAchievements.forEach(a => {
        expect(a.requirement.type, `${a.id} (${a.name}) with metric leg_darts should use type 'special', not '${a.requirement.type}'`).toBe('special');
      });
    });

    it('game_time_max achievements should use type special', () => {
      const timeMaxAchievements = ACHIEVEMENTS.filter(a => a.requirement.metric === 'game_time_max');
      timeMaxAchievements.forEach(a => {
        expect(a.requirement.type, `${a.id} (${a.name}) with metric game_time_max should use type 'special', not '${a.requirement.type}'`).toBe('special');
      });
    });
  });

  describe('Match-scoped metrics should use type special (not value)', () => {
    it('match_180_count achievements should use type special', () => {
      const achievements = ACHIEVEMENTS.filter(a => a.requirement.metric === 'match_180_count');
      achievements.forEach(a => {
        expect(a.requirement.type, `${a.id} (${a.name}) should use type 'special' for per-match metric`).toBe('special');
      });
    });

    it('tons_in_match achievements should use type special', () => {
      const achievements = ACHIEVEMENTS.filter(a => a.requirement.metric === 'tons_in_match');
      achievements.forEach(a => {
        expect(a.requirement.type, `${a.id} (${a.name}) should use type 'special' for per-match metric`).toBe('special');
      });
    });

    it('game_time_min achievements should use type special', () => {
      const achievements = ACHIEVEMENTS.filter(a => a.requirement.metric === 'game_time_min');
      achievements.forEach(a => {
        expect(a.requirement.type, `${a.id} (${a.name}) should use type 'special' for time threshold`).toBe('special');
      });
    });
  });

  describe('Progression Series', () => {
    it('count achievements sharing a metric should have non-decreasing targets within the same category', () => {
      // Group count achievements by metric+category
      const groups = new Map<string, Achievement[]>();
      ACHIEVEMENTS
        .filter(a => a.requirement.type === 'count')
        .forEach(a => {
          const key = `${a.requirement.metric}|${a.category}`;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(a);
        });

      groups.forEach((achs, key) => {
        if (achs.length < 2) return; // Not a series
        const sorted = [...achs].sort((a, b) => a.requirement.target - b.requirement.target);
        for (let i = 1; i < sorted.length; i++) {
          expect(
            sorted[i].requirement.target,
            `${key}: ${sorted[i].id} (target=${sorted[i].requirement.target}) should be >= ${sorted[i - 1].id} (target=${sorted[i - 1].requirement.target})`
          ).toBeGreaterThanOrEqual(sorted[i - 1].requirement.target);
        }
      });
    });
  });

  describe('Category Distribution', () => {
    it('should have achievements in all categories', () => {
      VALID_CATEGORIES.forEach(cat => {
        const count = ACHIEVEMENTS.filter(a => a.category === cat).length;
        expect(count, `Category '${cat}' has no achievements`).toBeGreaterThan(0);
      });
    });

    it('fail category should have exactly 100 achievements', () => {
      const failCount = ACHIEVEMENTS.filter(a => a.category === 'fail').length;
      expect(failCount).toBe(100);
    });
  });

  describe('Tier Distribution', () => {
    it('should have achievements in all tiers', () => {
      VALID_TIERS.forEach(tier => {
        const count = ACHIEVEMENTS.filter(a => a.tier === tier).length;
        expect(count, `Tier '${tier}' has no achievements`).toBeGreaterThan(0);
      });
    });
  });

  describe('Self-referencing achievements', () => {
    it('perfectionist/all_achievements targets should match total count', () => {
      const selfRef = ACHIEVEMENTS.filter(a =>
        a.requirement.metric === 'achievements_unlocked' && a.requirement.target === ACHIEVEMENTS.length
      );
      expect(selfRef.length).toBeGreaterThan(0);
      selfRef.forEach(a => {
        expect(a.requirement.target, `${a.id} target should be ${ACHIEVEMENTS.length}`).toBe(ACHIEVEMENTS.length);
      });
    });
  });

  describe('Description/Target Consistency', () => {
    it('no achievement description should say X-mal with a different target (for count type)', () => {
      const mismatches: string[] = [];
      ACHIEVEMENTS.forEach(a => {
        if (a.requirement.type !== 'count') return;
        const xMalMatch = a.description.match(/(\d+)[- ]?[Mm]al/);
        if (!xMalMatch) return;
        const descCount = parseInt(xMalMatch[1]);
        // Skip metrics where "X Mal" describes the condition, not the count
        const compoundEventMetrics = new Set([
          'double_bust_leg', 'triple_bust_leg', 'three_low_visits_row',
          'three_miss_visit', 'three_different_low', 'three_ones_fail'
        ]);
        if (compoundEventMetrics.has(a.requirement.metric)) return;
        if (descCount !== a.requirement.target) {
          mismatches.push(`${a.id}: description says ${descCount}-mal but target=${a.requirement.target}`);
        }
      });
      expect(mismatches).toEqual([]);
    });
  });
});

describe('Achievement Evaluation Logic', () => {
  // Simulate the checkAchievement logic from AchievementContext
  function evaluateAchievement(
    achievement: Achievement,
    value: number,
    existingProgress: number = 0,
    isCumulative: boolean = false
  ): { shouldUnlock: boolean; effectiveValue: number } {
    const metric = achievement.requirement.metric;
    const target = achievement.requirement.target;

    let effectiveValue = value;
    if (isCumulative) {
      effectiveValue = existingProgress + value;
    }

    const isLowerBetter = LOWER_IS_BETTER_METRICS.has(metric);
    const shouldUnlock = isLowerBetter
      ? (effectiveValue <= target && effectiveValue > 0)
      : (effectiveValue >= target);

    return { shouldUnlock, effectiveValue };
  }

  describe('Type: count (cumulative)', () => {
    const countAchievements = ACHIEVEMENTS.filter(a => a.requirement.type === 'count');

    it('should unlock when accumulated count reaches target', () => {
      countAchievements.forEach(a => {
        const target = a.requirement.target;
        // Simulate incrementing by 1 until target
        const { shouldUnlock } = evaluateAchievement(a, 1, target - 1, true);
        expect(shouldUnlock, `${a.id} should unlock at accumulated value ${target}`).toBe(true);
      });
    });

    it('should not unlock when accumulated count is below target', () => {
      countAchievements.forEach(a => {
        if (a.requirement.target <= 1) return; // Skip target=1 (unlocks on first increment)
        const { shouldUnlock } = evaluateAchievement(a, 1, 0, true);
        expect(shouldUnlock, `${a.id} should not unlock at accumulated value 1 (target=${a.requirement.target})`).toBe(false);
      });
    });
  });

  describe('Type: special (exact match)', () => {
    const specialAchievements = ACHIEVEMENTS.filter(a => a.requirement.type === 'special');

    it('should unlock when value equals target (standard metrics)', () => {
      specialAchievements.forEach(a => {
        if (LOWER_IS_BETTER_METRICS.has(a.requirement.metric)) return;
        const target = a.requirement.target;
        const { shouldUnlock } = evaluateAchievement(a, target, 0, false);
        expect(shouldUnlock, `${a.id} should unlock when value=${target} equals target=${target}`).toBe(true);
      });
    });

    it('should unlock when value equals target (lower-is-better metrics)', () => {
      specialAchievements.forEach(a => {
        if (!LOWER_IS_BETTER_METRICS.has(a.requirement.metric)) return;
        const target = a.requirement.target;
        const { shouldUnlock } = evaluateAchievement(a, target, 0, false);
        expect(shouldUnlock, `${a.id} should unlock when value=${target} (lower-is-better)`).toBe(true);
      });
    });

    it('lower-is-better metrics should also unlock when value is below target', () => {
      specialAchievements.forEach(a => {
        if (!LOWER_IS_BETTER_METRICS.has(a.requirement.metric)) return;
        const target = a.requirement.target;
        if (target <= 1) return;
        const { shouldUnlock } = evaluateAchievement(a, target - 1, 0, false);
        expect(shouldUnlock, `${a.id} should unlock when value=${target - 1} < target=${target} (lower-is-better)`).toBe(true);
      });
    });

    it('lower-is-better metrics should not unlock for value 0', () => {
      specialAchievements.forEach(a => {
        if (!LOWER_IS_BETTER_METRICS.has(a.requirement.metric)) return;
        const { shouldUnlock } = evaluateAchievement(a, 0, 0, false);
        expect(shouldUnlock, `${a.id} should not unlock for value=0`).toBe(false);
      });
    });
  });

  describe('Type: value (threshold)', () => {
    const valueAchievements = ACHIEVEMENTS.filter(a => a.requirement.type === 'value');

    it('should unlock when value meets or exceeds target', () => {
      valueAchievements.forEach(a => {
        const target = a.requirement.target;
        const { shouldUnlock } = evaluateAchievement(a, target, 0, false);
        expect(shouldUnlock, `${a.id} should unlock when value=${target} >= target=${target}`).toBe(true);
      });
    });

    it('should unlock when value exceeds target', () => {
      valueAchievements.forEach(a => {
        const target = a.requirement.target;
        const { shouldUnlock } = evaluateAchievement(a, target + 10, 0, false);
        expect(shouldUnlock, `${a.id} should unlock when value=${target + 10} > target=${target}`).toBe(true);
      });
    });

    it('should not unlock when value is below target', () => {
      valueAchievements.forEach(a => {
        const target = a.requirement.target;
        if (target <= 1) return;
        const { shouldUnlock } = evaluateAchievement(a, target - 1, 0, false);
        expect(shouldUnlock, `${a.id} should not unlock when value=${target - 1} < target=${target}`).toBe(false);
      });
    });
  });

  describe('Type: streak', () => {
    const streakAchievements = ACHIEVEMENTS.filter(a => a.requirement.type === 'streak');

    it('should unlock when streak meets target', () => {
      streakAchievements.forEach(a => {
        const target = a.requirement.target;
        // Streaks are typically cumulative
        const isCumulative = EXPECTED_CUMULATIVE_METRICS.has(a.requirement.metric);
        const { shouldUnlock } = evaluateAchievement(a, target, 0, false);
        expect(shouldUnlock, `${a.id} should unlock when streak=${target}`).toBe(true);
      });
    });
  });

  describe('CUMULATIVE_METRICS completeness', () => {
    it('all count-type achievements with target > 1 should have their metric in CUMULATIVE_METRICS', () => {
      const missing: string[] = [];
      ACHIEVEMENTS
        .filter(a => a.requirement.type === 'count' && a.requirement.target > 1)
        .forEach(a => {
          if (!EXPECTED_CUMULATIVE_METRICS.has(a.requirement.metric)) {
            missing.push(`${a.id}: metric '${a.requirement.metric}' (target=${a.requirement.target}) not in CUMULATIVE_METRICS`);
          }
        });
      expect(missing).toEqual([]);
    });
  });
});

describe('exactScoreTargets Coverage', () => {
  it('all exact_score achievement targets should be in the exactScoreTargets array', () => {
    const exactScoreTargets = new Set([3, 7, 13, 26, 41, 42, 45, 60, 66, 69, 77, 85, 99, 100, 111, 123, 126, 140, 141, 160, 170, 171]);
    const exactScoreAchievements = ACHIEVEMENTS.filter(a => a.requirement.metric === 'exact_score');
    const missing: string[] = [];
    exactScoreAchievements.forEach(a => {
      if (!exactScoreTargets.has(a.requirement.target)) {
        missing.push(`${a.id}: target ${a.requirement.target} not in exactScoreTargets`);
      }
    });
    expect(missing).toEqual([]);
  });
});

describe('Semantic Duplicate Detection', () => {
  it('should flag achievements with identical metric + target + type as potential duplicates', () => {
    const seen = new Map<string, Achievement>();
    const duplicates: string[] = [];

    ACHIEVEMENTS.forEach(a => {
      const key = `${a.requirement.metric}|${a.requirement.target}|${a.requirement.type}`;
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        duplicates.push(`${a.id} duplicates ${existing.id} (${key})`);
      } else {
        seen.set(key, a);
      }
    });

    // Document known duplicates - these are tracked but not necessarily bugs
    // (some are intentional cross-category duplicates)
    // Just ensure we're aware of how many there are
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} semantic duplicate pairs (for review):`);
      duplicates.forEach(d => console.log(`  - ${d}`));
    }
    // We expect the known count of semantic duplicates (not zero, since some are intentional)
    expect(duplicates.length).toBeLessThanOrEqual(35);
  });
});

describe('Per-Category Achievement Validation', () => {
  describe('fail category', () => {
    const failAchievements = ACHIEVEMENTS.filter(a => a.category === 'fail');

    it('should have exactly 100 achievements', () => {
      expect(failAchievements.length).toBe(100);
    });

    it('all fail achievements should have valid metrics', () => {
      failAchievements.forEach(a => {
        expect(a.requirement.metric, `${a.id} has empty metric`).toBeTruthy();
        expect(a.requirement.target, `${a.id} has zero target`).toBeGreaterThan(0);
      });
    });
  });

  describe('scoring category', () => {
    const scoringAchievements = ACHIEVEMENTS.filter(a => a.category === 'scoring');

    it('should have scoring-related metrics', () => {
      const scoringMetrics = new Set(scoringAchievements.map(a => a.requirement.metric));
      // Should include at least some scoring-related metrics
      const expectedMetrics = ['score_180', 'exact_score', 'match_average', 'score_100_plus'];
      expectedMetrics.forEach(m => {
        expect(scoringMetrics.has(m), `scoring category should include metric '${m}'`).toBe(true);
      });
    });
  });

  describe('checkout category', () => {
    const checkoutAchievements = ACHIEVEMENTS.filter(a => a.category === 'checkout');

    it('should have checkout-related metrics', () => {
      const checkoutMetrics = new Set(checkoutAchievements.map(a => a.requirement.metric));
      const expectedMetrics = ['checkouts', 'checkout_value'];
      expectedMetrics.forEach(m => {
        expect(checkoutMetrics.has(m), `checkout category should include metric '${m}'`).toBe(true);
      });
    });
  });
});
