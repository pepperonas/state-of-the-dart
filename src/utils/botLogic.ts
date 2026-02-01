import { Dart, Player, PlayerStats } from '../types';

/**
 * Bot difficulty presets
 * Level 1-10 corresponds to PPD (Points Per Dart) of 20-120
 */
export interface BotPreset {
  level: number;
  name: string;
  nameDE: string;
  ppd: number; // Target Points Per Dart
  accuracy: number; // 0-1, affects variance
  checkoutAccuracy: number; // 0-1, chance to hit checkout
  tripleAccuracy: number; // 0-1, chance to hit triple when aiming
}

export const BOT_PRESETS: BotPreset[] = [
  { level: 1, name: 'Beginner', nameDE: 'Anfänger', ppd: 20, accuracy: 0.3, checkoutAccuracy: 0.1, tripleAccuracy: 0.1 },
  { level: 2, name: 'Novice', nameDE: 'Neuling', ppd: 30, accuracy: 0.4, checkoutAccuracy: 0.15, tripleAccuracy: 0.15 },
  { level: 3, name: 'Amateur', nameDE: 'Amateur', ppd: 40, accuracy: 0.5, checkoutAccuracy: 0.2, tripleAccuracy: 0.2 },
  { level: 4, name: 'Casual', nameDE: 'Gelegenheitsspieler', ppd: 50, accuracy: 0.55, checkoutAccuracy: 0.25, tripleAccuracy: 0.25 },
  { level: 5, name: 'Regular', nameDE: 'Stammspieler', ppd: 60, accuracy: 0.6, checkoutAccuracy: 0.35, tripleAccuracy: 0.35 },
  { level: 6, name: 'Experienced', nameDE: 'Erfahren', ppd: 70, accuracy: 0.65, checkoutAccuracy: 0.45, tripleAccuracy: 0.45 },
  { level: 7, name: 'Advanced', nameDE: 'Fortgeschritten', ppd: 80, accuracy: 0.7, checkoutAccuracy: 0.55, tripleAccuracy: 0.55 },
  { level: 8, name: 'Expert', nameDE: 'Experte', ppd: 90, accuracy: 0.8, checkoutAccuracy: 0.65, tripleAccuracy: 0.65 },
  { level: 9, name: 'Professional', nameDE: 'Profi', ppd: 100, accuracy: 0.85, checkoutAccuracy: 0.75, tripleAccuracy: 0.75 },
  { level: 10, name: 'World Class', nameDE: 'Weltklasse', ppd: 120, accuracy: 0.92, checkoutAccuracy: 0.85, tripleAccuracy: 0.85 },
];

/**
 * Bot play styles for more varied gameplay
 */
export type BotPlayStyle = 'aggressive' | 'defensive' | 'balanced' | 'clutch';

export interface BotPersonality {
  style: BotPlayStyle;
  name: string;
  nameDE: string;
  emoji: string;
  description: string;
  // Modifiers
  tripleBonus: number; // +/- accuracy when aiming for triples
  checkoutBonus: number; // +/- accuracy on checkout attempts
  pressureModifier: number; // How bot performs under pressure (remaining < 100)
  consistencyVariance: number; // How much performance varies (0 = consistent, 1 = streaky)
}

export const BOT_PERSONALITIES: BotPersonality[] = [
  {
    style: 'aggressive',
    name: 'Aggressive',
    nameDE: 'Aggressiv',
    emoji: '🔥',
    description: 'Always goes for T20, high risk high reward',
    tripleBonus: 0.1,
    checkoutBonus: -0.05,
    pressureModifier: -0.1,
    consistencyVariance: 0.3,
  },
  {
    style: 'defensive',
    name: 'Defensive',
    nameDE: 'Defensiv',
    emoji: '🛡️',
    description: 'Plays it safe, consistent scoring',
    tripleBonus: -0.05,
    checkoutBonus: 0.05,
    pressureModifier: 0.05,
    consistencyVariance: 0.1,
  },
  {
    style: 'balanced',
    name: 'Balanced',
    nameDE: 'Ausgewogen',
    emoji: '⚖️',
    description: 'Well-rounded player',
    tripleBonus: 0,
    checkoutBonus: 0,
    pressureModifier: 0,
    consistencyVariance: 0.15,
  },
  {
    style: 'clutch',
    name: 'Clutch Player',
    nameDE: 'Nervenstark',
    emoji: '💎',
    description: 'Performs best under pressure',
    tripleBonus: -0.05,
    checkoutBonus: 0.15,
    pressureModifier: 0.15,
    consistencyVariance: 0.25,
  },
];

/**
 * Adaptive bot difficulty categories
 * These categories adjust based on player skill
 */
export type AdaptiveBotCategory = 'beginner' | 'regular' | 'pro';

export interface AdaptiveBotConfig {
  category: AdaptiveBotCategory;
  name: string;
  nameDE: string;
  description: string;
  descriptionDE: string;
  icon: string;
  // Relative difficulty: -2 to +2 levels from player skill
  difficultyOffset: number;
  // Min/max level bounds
  minLevel: number;
  maxLevel: number;
}

export const ADAPTIVE_BOT_CONFIGS: AdaptiveBotConfig[] = [
  {
    category: 'beginner',
    name: 'Beginner',
    nameDE: 'Neuling',
    description: 'Easier than you - good for practice',
    descriptionDE: 'Einfacher als du - gut zum Üben',
    icon: '🌱',
    difficultyOffset: -2,
    minLevel: 1,
    maxLevel: 5,
  },
  {
    category: 'regular',
    name: 'Regular',
    nameDE: 'Stammspieler',
    description: 'Matches your skill level',
    descriptionDE: 'Passt zu deinem Können',
    icon: '🎯',
    difficultyOffset: 0,
    minLevel: 2,
    maxLevel: 8,
  },
  {
    category: 'pro',
    name: 'Pro',
    nameDE: 'Profi',
    description: 'Challenging opponent',
    descriptionDE: 'Herausfordernder Gegner',
    icon: '🏆',
    difficultyOffset: 2,
    minLevel: 5,
    maxLevel: 10,
  },
];

/**
 * Analyze player stats to estimate their skill level (1-10)
 */
export function analyzePlayerSkill(stats: PlayerStats): number {
  // If player has no games, assume beginner level
  if (stats.gamesPlayed === 0) {
    return 3; // Start at amateur level
  }

  let skillScore = 0;
  let factors = 0;

  // Factor 1: Overall average (most important)
  // Average of 20 = Level 1, Average of 100+ = Level 10
  if (stats.averageOverall > 0) {
    const avgLevel = Math.min(10, Math.max(1, Math.floor(stats.averageOverall / 10)));
    skillScore += avgLevel * 3; // Triple weight
    factors += 3;
  }

  // Factor 2: Best average (shows potential)
  if (stats.bestAverage > 0) {
    const bestLevel = Math.min(10, Math.max(1, Math.floor(stats.bestAverage / 12)));
    skillScore += bestLevel * 2;
    factors += 2;
  }

  // Factor 3: Checkout percentage
  // 0-10% = Level 1-2, 50%+ = Level 9-10
  if (stats.checkoutPercentage > 0) {
    const checkoutLevel = Math.min(10, Math.max(1, Math.floor(stats.checkoutPercentage / 6) + 1));
    skillScore += checkoutLevel;
    factors += 1;
  }

  // Factor 4: 180s frequency (shows consistency at high level)
  if (stats.gamesPlayed > 0) {
    const oneEightyRate = stats.total180s / stats.gamesPlayed;
    // 0 per game = no bonus, 2+ per game = Level 10
    const oneEightyLevel = Math.min(10, Math.max(1, Math.floor(oneEightyRate * 4) + 3));
    skillScore += oneEightyLevel;
    factors += 1;
  }

  // Factor 5: Win rate (shows competitive ability)
  if (stats.gamesPlayed >= 3) {
    const winRate = stats.gamesWon / stats.gamesPlayed;
    // 50% win rate = neutral, adjust up/down based on it
    const winLevel = Math.min(10, Math.max(1, Math.floor(winRate * 8) + 2));
    skillScore += winLevel;
    factors += 1;
  }

  // Calculate weighted average
  const estimatedLevel = factors > 0 ? Math.round(skillScore / factors) : 3;

  // Clamp to valid range
  return Math.min(10, Math.max(1, estimatedLevel));
}

/**
 * Calculate bot level based on player skill and category
 */
export function calculateAdaptiveBotLevel(
  playerStats: PlayerStats | PlayerStats[],
  category: AdaptiveBotCategory
): number {
  const config = ADAPTIVE_BOT_CONFIGS.find(c => c.category === category);
  if (!config) return 5; // Default to middle level

  // If multiple players, calculate average skill
  let avgSkill: number;
  if (Array.isArray(playerStats)) {
    if (playerStats.length === 0) {
      avgSkill = 3;
    } else {
      const totalSkill = playerStats.reduce((sum, stats) => sum + analyzePlayerSkill(stats), 0);
      avgSkill = Math.round(totalSkill / playerStats.length);
    }
  } else {
    avgSkill = analyzePlayerSkill(playerStats);
  }

  // Apply difficulty offset
  let botLevel = avgSkill + config.difficultyOffset;

  // Add slight randomness (±1 level) for variety
  const variance = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
  botLevel += variance;

  // Clamp to config bounds
  botLevel = Math.min(config.maxLevel, Math.max(config.minLevel, botLevel));

  return botLevel;
}

/**
 * Get all adaptive bot configurations for UI
 */
export function getAdaptiveBotConfigs(): AdaptiveBotConfig[] {
  return ADAPTIVE_BOT_CONFIGS;
}

/**
 * Create an adaptive bot player
 */
export function createAdaptiveBotPlayer(
  category: AdaptiveBotCategory,
  humanPlayerStats: PlayerStats | PlayerStats[],
  existingBotCount: number = 0
): Player {
  const config = ADAPTIVE_BOT_CONFIGS.find(c => c.category === category);
  const level = calculateAdaptiveBotLevel(humanPlayerStats, category);
  const preset = getBotPreset(level);
  const botNumber = existingBotCount + 1;

  return {
    id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `${config?.icon || '🤖'} Bot ${botNumber} (${config?.nameDE || preset.nameDE})`,
    avatar: config?.icon || '🤖',
    createdAt: new Date(),
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalLegsPlayed: 0,
      totalLegsWon: 0,
      highestCheckout: 0,
      total180s: 0,
      total171Plus: 0,
      total140Plus: 0,
      total100Plus: 0,
      total60Plus: 0,
      bestAverage: 0,
      averageOverall: 0,
      checkoutPercentage: 0,
      totalCheckoutAttempts: 0,
      totalCheckoutHits: 0,
      checkoutsByDouble: {},
      scoreDistribution: {},
      bestLeg: 999,
      nineDartFinishes: 0,
    },
    preferences: {
      preferredCheckouts: {},
      soundEnabled: true,
      callerLanguage: 'de' as const,
      callerVoice: 'male' as const,
      vibrationEnabled: false,
    },
    isBot: true,
    botLevel: level,
  };
}

export function getBotPreset(level: number): BotPreset {
  const clampedLevel = Math.max(1, Math.min(10, level));
  return BOT_PRESETS[clampedLevel - 1];
}

/**
 * Common checkout routes for 2-dart and 3-dart finishes
 */
const CHECKOUT_ROUTES: Record<number, { target: number; multiplier: 1 | 2 | 3 }[]> = {
  // Double-out finishes (most common first)
  170: [{ target: 20, multiplier: 3 }, { target: 20, multiplier: 3 }, { target: 25, multiplier: 2 }], // T20, T20, Bull
  167: [{ target: 20, multiplier: 3 }, { target: 19, multiplier: 3 }, { target: 25, multiplier: 2 }],
  164: [{ target: 20, multiplier: 3 }, { target: 18, multiplier: 3 }, { target: 25, multiplier: 2 }],
  161: [{ target: 20, multiplier: 3 }, { target: 17, multiplier: 3 }, { target: 25, multiplier: 2 }],
  160: [{ target: 20, multiplier: 3 }, { target: 20, multiplier: 3 }, { target: 20, multiplier: 2 }],
  158: [{ target: 20, multiplier: 3 }, { target: 20, multiplier: 3 }, { target: 19, multiplier: 2 }],
  157: [{ target: 20, multiplier: 3 }, { target: 19, multiplier: 3 }, { target: 20, multiplier: 2 }],
  156: [{ target: 20, multiplier: 3 }, { target: 20, multiplier: 3 }, { target: 18, multiplier: 2 }],
  // ... common 2-dart checkouts
  100: [{ target: 20, multiplier: 3 }, { target: 20, multiplier: 2 }],
  98: [{ target: 20, multiplier: 3 }, { target: 19, multiplier: 2 }],
  96: [{ target: 20, multiplier: 3 }, { target: 18, multiplier: 2 }],
  80: [{ target: 20, multiplier: 3 }, { target: 10, multiplier: 2 }],
  61: [{ target: 15, multiplier: 3 }, { target: 8, multiplier: 2 }],
  // Single-dart checkouts (doubles)
  50: [{ target: 25, multiplier: 2 }], // Bull
  40: [{ target: 20, multiplier: 2 }],
  38: [{ target: 19, multiplier: 2 }],
  36: [{ target: 18, multiplier: 2 }],
  34: [{ target: 17, multiplier: 2 }],
  32: [{ target: 16, multiplier: 2 }],
  30: [{ target: 15, multiplier: 2 }],
  28: [{ target: 14, multiplier: 2 }],
  26: [{ target: 13, multiplier: 2 }],
  24: [{ target: 12, multiplier: 2 }],
  22: [{ target: 11, multiplier: 2 }],
  20: [{ target: 10, multiplier: 2 }],
  18: [{ target: 9, multiplier: 2 }],
  16: [{ target: 8, multiplier: 2 }],
  14: [{ target: 7, multiplier: 2 }],
  12: [{ target: 6, multiplier: 2 }],
  10: [{ target: 5, multiplier: 2 }],
  8: [{ target: 4, multiplier: 2 }],
  6: [{ target: 3, multiplier: 2 }],
  4: [{ target: 2, multiplier: 2 }],
  2: [{ target: 1, multiplier: 2 }],
};

/**
 * Get bed name from segment and multiplier
 */
function getBed(segment: number, multiplier: 0 | 1 | 2 | 3): Dart['bed'] {
  if (multiplier === 0 || segment === 0) return 'miss';
  if (segment === 25) return 'outer-bull';
  if (segment === 50) return 'bull';
  if (multiplier === 1) return 'single';
  if (multiplier === 2) return 'double';
  if (multiplier === 3) return 'triple';
  return 'single';
}

/**
 * Create a Dart object
 */
function createDart(segment: number, multiplier: 0 | 1 | 2 | 3): Dart {
  const score = segment * (multiplier === 0 ? 0 : multiplier === 3 ? 3 : multiplier === 2 ? 2 : 1);
  // Handle bull special cases
  const actualScore = segment === 25 ? 25 : segment === 50 ? 50 : score;

  return {
    segment,
    multiplier,
    score: multiplier === 0 ? 0 : actualScore,
    bed: getBed(segment, multiplier),
  };
}

/**
 * Generate a random miss based on what the bot was aiming at
 */
function generateMiss(targetSegment: number, targetMultiplier: 1 | 2 | 3, accuracy: number): Dart {
  const random = Math.random();

  // Complete miss (hit outside the board)
  if (random < (1 - accuracy) * 0.3) {
    return createDart(0, 0);
  }

  // Adjacent segments on the dartboard
  const adjacentSegments: Record<number, number[]> = {
    20: [1, 5, 18, 12],
    1: [20, 18, 4, 13],
    18: [20, 1, 4, 13],
    4: [18, 13, 6, 10],
    13: [4, 6, 10, 15],
    6: [13, 10, 15, 2],
    10: [6, 15, 2, 17],
    15: [10, 2, 17, 3],
    2: [15, 17, 3, 19],
    17: [2, 3, 19, 7],
    3: [17, 19, 7, 16],
    19: [3, 7, 16, 8],
    7: [19, 16, 8, 11],
    16: [7, 8, 11, 9],
    8: [16, 11, 9, 12],
    11: [8, 9, 12, 14],
    9: [11, 12, 14, 5],
    12: [9, 14, 5, 20],
    14: [12, 5, 20, 1],
    5: [14, 20, 1, 18],
    25: [20, 1, 5, 18, 12, 9], // Bull neighbors
    50: [20, 1, 5, 18, 12, 9], // Bull neighbors
  };

  const neighbors = adjacentSegments[targetSegment] || [20, 1, 5, 18];

  // Hit adjacent segment
  if (random < 0.6) {
    const newSegment = neighbors[Math.floor(Math.random() * neighbors.length)];
    // Usually hit single when missing
    const newMultiplier: 1 | 2 | 3 = Math.random() < 0.7 ? 1 : (Math.random() < 0.5 ? 2 : 3);
    return createDart(newSegment, newMultiplier);
  }

  // Hit same segment but different multiplier
  if (targetMultiplier === 3) {
    // Aiming for triple, might hit single or double
    const newMultiplier: 1 | 2 = Math.random() < 0.7 ? 1 : 2;
    return createDart(targetSegment, newMultiplier);
  } else if (targetMultiplier === 2) {
    // Aiming for double, might hit single or miss outside
    if (Math.random() < 0.3) {
      return createDart(0, 0); // Miss outside
    }
    return createDart(targetSegment, 1);
  } else {
    // Aiming for single, might hit adjacent single
    const newSegment = neighbors[Math.floor(Math.random() * neighbors.length)];
    return createDart(newSegment, 1);
  }
}

/**
 * Determine the best target for the bot based on remaining score
 */
function determineTarget(remaining: number, dartsLeft: number, preset: BotPreset): { target: number; multiplier: 1 | 2 | 3 } {
  // Check if we have a checkout route
  if (remaining <= 170 && CHECKOUT_ROUTES[remaining]) {
    const route = CHECKOUT_ROUTES[remaining];
    const dartIndex = 3 - dartsLeft;
    if (route[dartIndex]) {
      return route[dartIndex];
    }
  }

  // If remaining is a double, go for it
  if (remaining <= 40 && remaining % 2 === 0) {
    return { target: remaining / 2, multiplier: 2 };
  }
  if (remaining === 50) {
    return { target: 25, multiplier: 2 }; // Bull
  }

  // Set up for a double (leave an even number)
  if (remaining <= 60) {
    // Try to leave a good double
    const goodLeaves = [40, 36, 32, 24, 20, 16];
    for (const leave of goodLeaves) {
      const needed = remaining - leave;
      if (needed > 0 && needed <= 20) {
        return { target: needed, multiplier: 1 };
      }
      if (needed > 0 && needed <= 60 && needed % 3 === 0 && needed / 3 <= 20) {
        return { target: needed / 3, multiplier: 3 };
      }
    }
  }

  // Default: aim for highest scoring treble based on skill
  if (preset.accuracy > 0.5) {
    // Better players aim for T20
    return { target: 20, multiplier: 3 };
  } else {
    // Weaker players aim for T19 (more forgiving)
    return { target: 19, multiplier: 3 };
  }
}

/**
 * Generate a single dart throw for a bot
 */
export function generateBotThrow(botLevel: number, remaining: number, dartsLeft: number): Dart {
  const preset = getBotPreset(botLevel);
  const target = determineTarget(remaining, dartsLeft, preset);

  // Determine if the bot hits the target
  let hitChance = preset.accuracy;

  // Adjust hit chance based on target type
  if (target.multiplier === 3) {
    hitChance *= preset.tripleAccuracy;
  } else if (target.multiplier === 2) {
    // Checkout attempt (double)
    if (remaining <= 40 || remaining === 50) {
      hitChance *= preset.checkoutAccuracy;
    } else {
      hitChance *= preset.accuracy * 0.8; // Regular double
    }
  }

  const hits = Math.random() < hitChance;

  if (hits) {
    // Calculate score
    let score: number;
    if (target.target === 25 && target.multiplier === 2) {
      score = 50; // Bull
    } else {
      score = target.target * target.multiplier;
    }

    // Check for bust
    const newRemaining = remaining - score;
    if (newRemaining < 0 || newRemaining === 1 || (newRemaining === 0 && target.multiplier !== 2)) {
      // Would bust, so we miss instead (smart bot)
      return generateMiss(target.target, target.multiplier, preset.accuracy);
    }

    return createDart(target.target, target.multiplier);
  } else {
    return generateMiss(target.target, target.multiplier, preset.accuracy);
  }
}

/**
 * Generate a complete turn (up to 3 darts) for a bot
 */
export function generateBotTurn(botLevel: number, startingScore: number): Dart[] {
  const darts: Dart[] = [];
  let remaining = startingScore;

  for (let i = 0; i < 3; i++) {
    const dart = generateBotThrow(botLevel, remaining, 3 - i);
    darts.push(dart);

    remaining -= dart.score;

    // Check for checkout (finished with double)
    if (remaining === 0 && dart.multiplier === 2) {
      break;
    }

    // Check for bust
    if (remaining < 0 || remaining === 1) {
      break;
    }
  }

  return darts;
}

/**
 * Create a bot player with the given level
 */
export function createBotPlayer(level: number, existingBotCount: number = 0): Player {
  const preset = getBotPreset(level);
  const botNumber = existingBotCount + 1;

  return {
    id: `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: `Bot ${botNumber} (${preset.nameDE})`,
    avatar: '🤖',
    createdAt: new Date(),
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalLegsPlayed: 0,
      totalLegsWon: 0,
      highestCheckout: 0,
      total180s: 0,
      total171Plus: 0,
      total140Plus: 0,
      total100Plus: 0,
      total60Plus: 0,
      bestAverage: 0,
      averageOverall: 0,
      checkoutPercentage: 0,
      totalCheckoutAttempts: 0,
      totalCheckoutHits: 0,
      checkoutsByDouble: {},
      scoreDistribution: {},
      bestLeg: 999,
      nineDartFinishes: 0,
    },
    preferences: {
      preferredCheckouts: {},
      soundEnabled: true,
      callerLanguage: 'de' as const,
      callerVoice: 'male' as const,
      vibrationEnabled: false,
    },
    isBot: true,
    botLevel: level,
  };
}

/**
 * Get display name for bot level
 */
export function getBotLevelName(level: number, language: 'en' | 'de' = 'de'): string {
  const preset = getBotPreset(level);
  return language === 'de' ? preset.nameDE : preset.name;
}

/**
 * Get all available bot presets for UI display
 */
export function getAllBotPresets(): BotPreset[] {
  return BOT_PRESETS;
}
