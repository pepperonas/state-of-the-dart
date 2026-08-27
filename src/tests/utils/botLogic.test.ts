import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  BOT_PRESETS, BOT_PERSONALITIES, ADAPTIVE_BOT_CONFIGS,
  analyzePlayerSkill, calculateAdaptiveBotLevel, getAdaptiveBotConfigs,
  getBotPreset, generateBotThrow, generateBotTurn, createBotPlayer,
  getBotLevelName, getAllBotPresets,
} from '../../utils/botLogic';
import type { PlayerStats } from '../../types/index';

/**
 * The bots are the app's single-player opponent. Two things must hold no matter
 * what the random number generator does: a bot never produces an impossible
 * dart, and a higher level is never a weaker opponent.
 */
const stats = (over: Partial<PlayerStats> = {}): PlayerStats =>
  ({
    gamesPlayed: 0, gamesWon: 0, totalLegsPlayed: 0, totalLegsWon: 0,
    highestCheckout: 0, total180s: 0, total171Plus: 0, total140Plus: 0,
    total100Plus: 0, total60Plus: 0, bestAverage: 0, averageOverall: 0,
    checkoutPercentage: 0, totalCheckoutAttempts: 0, totalCheckoutHits: 0,
    checkoutsByDouble: {}, scoreDistribution: {}, bestLeg: 0, nineDartFinishes: 0,
    ...over,
  }) as PlayerStats;

afterEach(() => { vi.restoreAllMocks(); });

describe('the preset table', () => {
  it('covers levels 1..10 with no gaps', () => {
    const levels = BOT_PRESETS.map((p) => p.level).sort((a, b) => a - b);
    expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  /** A higher level must never be a weaker opponent. */
  it('gets stronger with every level', () => {
    const byLevel = [...BOT_PRESETS].sort((a, b) => a.level - b.level);
    for (let i = 1; i < byLevel.length; i++) {
      expect(byLevel[i].ppd, `level ${byLevel[i].level}`)
        .toBeGreaterThan(byLevel[i - 1].ppd);
      expect(byLevel[i].accuracy).toBeGreaterThanOrEqual(byLevel[i - 1].accuracy);
    }
  });

  it('keeps every probability inside 0..1', () => {
    for (const p of BOT_PRESETS) {
      for (const key of ['accuracy', 'tripleAccuracy', 'checkoutAccuracy'] as const) {
        expect(p[key], `${p.level}.${key}`).toBeGreaterThan(0);
        expect(p[key], `${p.level}.${key}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('getBotPreset clamps out-of-range levels instead of returning undefined', () => {
    expect(getBotPreset(0)).toBeTruthy();
    expect(getBotPreset(99)).toBeTruthy();
    expect(getBotPreset(-3)).toBeTruthy();
    expect(getAllBotPresets()).toHaveLength(10);
  });

  it('names every level in both languages', () => {
    for (let level = 1; level <= 10; level++) {
      expect(getBotLevelName(level, 'de')).toBeTruthy();
      expect(getBotLevelName(level, 'en')).toBeTruthy();
    }
  });
});

describe('personalities and adaptive configs', () => {
  it('every personality has a usable play style', () => {
    expect(BOT_PERSONALITIES.length).toBeGreaterThan(0);
    // Icon names, not emoji — the app renders its own icon set.
    for (const p of BOT_PERSONALITIES) expect(p.emoji).toMatch(/^[a-zA-Z]+$/);
    for (const p of BOT_PERSONALITIES) {
      expect(['aggressive', 'defensive', 'balanced', 'clutch']).toContain(p.style);
    }
  });

  it('the adaptive categories cover beginner, regular and pro', () => {
    expect(getAdaptiveBotConfigs()).toBe(ADAPTIVE_BOT_CONFIGS);
    expect(ADAPTIVE_BOT_CONFIGS.map((c) => c.category).sort())
      .toEqual(['beginner', 'pro', 'regular']);
  });

  it('every adaptive range is a valid, non-inverted level window', () => {
    for (const c of ADAPTIVE_BOT_CONFIGS) {
      expect(c.minLevel).toBeGreaterThanOrEqual(1);
      expect(c.maxLevel).toBeLessThanOrEqual(10);
      expect(c.minLevel).toBeLessThanOrEqual(c.maxLevel);
    }
  });
});

describe('analyzePlayerSkill', () => {
  it('assumes an amateur for someone who has never played', () => {
    expect(analyzePlayerSkill(stats())).toBe(3);
  });

  it('always lands inside 1..10', () => {
    const extremes = [
      stats({ gamesPlayed: 1, averageOverall: 0.1 }),
      stats({ gamesPlayed: 500, averageOverall: 200, bestAverage: 300, checkoutPercentage: 100, total180s: 5000, gamesWon: 500 }),
      stats({ gamesPlayed: 3, averageOverall: -5 as never }),
    ];
    for (const s of extremes) {
      const level = analyzePlayerSkill(s);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(10);
    }
  });

  /** A better player must never be assessed as weaker. */
  it('rates a stronger player at least as high', () => {
    const weak = analyzePlayerSkill(stats({ gamesPlayed: 20, averageOverall: 25, bestAverage: 30, checkoutPercentage: 5 }));
    const strong = analyzePlayerSkill(stats({ gamesPlayed: 20, averageOverall: 95, bestAverage: 120, checkoutPercentage: 45, total180s: 40, gamesWon: 18 }));
    expect(strong).toBeGreaterThan(weak);
  });

  it('never returns a fractional level', () => {
    const level = analyzePlayerSkill(stats({ gamesPlayed: 7, averageOverall: 53, bestAverage: 71, checkoutPercentage: 23 }));
    expect(Number.isInteger(level)).toBe(true);
  });
});

describe('calculateAdaptiveBotLevel', () => {
  it('stays inside the category window however skilled the player', () => {
    for (const config of ADAPTIVE_BOT_CONFIGS) {
      for (const s of [stats(), stats({ gamesPlayed: 99, averageOverall: 120, bestAverage: 150, checkoutPercentage: 80, total180s: 300, gamesWon: 99 })]) {
        for (let i = 0; i < 30; i++) {
          const level = calculateAdaptiveBotLevel(s, config.category);
          expect(level, `${config.category}`).toBeGreaterThanOrEqual(config.minLevel);
          expect(level, `${config.category}`).toBeLessThanOrEqual(config.maxLevel);
        }
      }
    }
  });

  it('averages across several players', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // suppress the ±1 variance
    const level = calculateAdaptiveBotLevel(
      [stats({ gamesPlayed: 10, averageOverall: 30 }), stats({ gamesPlayed: 10, averageOverall: 90 })],
      'regular'
    );
    expect(Number.isInteger(level)).toBe(true);
  });

  it('handles an empty player list rather than producing NaN', () => {
    const level = calculateAdaptiveBotLevel([], 'regular');
    expect(Number.isInteger(level)).toBe(true);
    expect(level).toBeGreaterThanOrEqual(1);
  });

  it('falls back to a middle level for an unknown category', () => {
    expect(calculateAdaptiveBotLevel(stats(), 'nonsense' as never)).toBe(5);
  });
});

describe('generateBotThrow', () => {
  it('always produces a dart that exists on a board', () => {
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 60; i++) {
        const dart = generateBotThrow(level, 501 - (i * 7) % 400, (i % 3) + 1);
        expect([0, 1, 2, 3], `level ${level}`).toContain(dart.multiplier);
        const validSegment = dart.segment === 0 || dart.segment === 25 || (dart.segment >= 1 && dart.segment <= 20);
        expect(validSegment, `segment ${dart.segment}`).toBe(true);
        expect(dart.score).toBeGreaterThanOrEqual(0);
        expect(dart.score).toBeLessThanOrEqual(60);
      }
    }
  });

  it('the dart score matches its own segment and multiplier', () => {
    for (let i = 0; i < 200; i++) {
      const d = generateBotThrow(5, 170, 3);
      const expected = d.segment === 25 ? (d.multiplier === 2 ? 50 : 25) : d.segment * d.multiplier;
      expect(d.score).toBe(expected);
    }
  });

  /**
   * A missed dart lands on a *neighbouring bed*, not in the void — which is what
   * a real miss looks like and what makes the heatmap meaningful. It may still
   * score.
   */
  it('a miss still produces a real dart', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999); // never hits the target
    const d = generateBotThrow(1, 501, 3);
    expect([0, 1, 2, 3]).toContain(d.multiplier);
    expect(d.score).toBeGreaterThanOrEqual(0);
    expect(d.score).toBeLessThanOrEqual(60);
  });

  /**
   * ⚠️ The "smart bot" bust check only guards the dart the bot *hits*. A missed
   * dart lands on a neighbouring bed with no such check, so a bot can and does
   * bust — measured at roughly one dart in six from tight remainders. That is
   * realistic (players bust too) and the reducer voids the turn.
   *
   * So the guarantee is not "never busts"; it is "never produces a dart that
   * could not physically be thrown".
   */
  it('produces only legal darts, even from a tight remainder', () => {
    for (let level = 1; level <= 10; level++) {
      for (const remaining of [2, 3, 40, 50, 60, 100, 170]) {
        for (let i = 0; i < 40; i++) {
          const d = generateBotThrow(level, remaining, 3);
          expect([0, 1, 2, 3]).toContain(d.multiplier);
          const legalSegment = d.segment === 0 || d.segment === 25 || (d.segment >= 1 && d.segment <= 20);
          expect(legalSegment, `level ${level}: segment ${d.segment}`).toBe(true);
          expect(d.score).toBeLessThanOrEqual(60);
        }
      }
    }
  });
});

describe('generateBotTurn', () => {
  it('never throws more than three darts', () => {
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 40; i++) {
        expect(generateBotTurn(level, 501).length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('always throws at least one dart', () => {
    for (let i = 0; i < 40; i++) {
      expect(generateBotTurn(5, 501).length).toBeGreaterThanOrEqual(1);
    }
  });

  /** A turn may not score more than three darts physically can. */
  it('never scores more than 180 in a turn', () => {
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 40; i++) {
        const total = generateBotTurn(level, 501).reduce((n, d) => n + d.score, 0);
        expect(total, `level ${level}`).toBeLessThanOrEqual(180);
      }
    }
  });

  it('stops at a checkout rather than throwing on', () => {
    // ⚠️ The invariant is NOT "any zero ends the turn". In X01, reaching exactly
    // zero on a single is a BUST, not a checkout — only a double finishes. So the
    // real rule is: once the bot lands on zero *with a double*, it must not throw
    // again. An earlier version of this test asserted the looser claim and passed
    // only by luck of the RNG.
    for (let i = 0; i < 400; i++) {
      const darts = generateBotTurn(10, 40);
      let left = 40;
      for (let d = 0; d < darts.length; d++) {
        left -= darts[d].score;
        if (left === 0 && darts[d].multiplier === 2) {
          expect(d, 'checked out on a double but kept throwing').toBe(darts.length - 1);
        }
      }
    }
  });

  it('never throws on after the score has gone below zero', () => {
    // A dart that takes the score negative is a bust; the turn ends there.
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 60; i++) {
        const darts = generateBotTurn(level, 40);
        let left = 40;
        for (let d = 0; d < darts.length; d++) {
          left -= darts[d].score;
          if (left < 0) {
            expect(d, `level ${level}: threw on after a bust`).toBe(darts.length - 1);
          }
        }
      }
    }
  });

  it('a stronger bot scores more on average', () => {
    const avg = (level: number) => {
      let total = 0;
      for (let i = 0; i < 400; i++) {
        total += generateBotTurn(level, 501).reduce((n, d) => n + d.score, 0);
      }
      return total / 400;
    };
    expect(avg(10)).toBeGreaterThan(avg(1));
  });
});

describe('createBotPlayer', () => {
  it('is marked as a bot and carries its level', () => {
    const bot = createBotPlayer(7);
    expect(bot.isBot).toBe(true);
    expect(bot.botLevel).toBe(7);
    expect(bot.name).toBeTruthy();
  });

  it('numbers additional bots so two are distinguishable', () => {
    expect(createBotPlayer(5, 0).name).not.toBe(createBotPlayer(5, 1).name);
  });

  it('carries an icon name, not an emoji', () => {
    const bot = createBotPlayer(3);
    expect(bot.avatar).toBeTruthy();
    expect(bot.avatar!).toMatch(/^[a-zA-Z]+$/);
  });

  it('starts with empty stats', () => {
    expect(createBotPlayer(5).stats.gamesPlayed).toBe(0);
  });
});
