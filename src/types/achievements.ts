/**
 * Achievement System Types
 * 
 * Defines all achievement-related types, categories, and structures
 */

export type AchievementCategory = 
  | 'first_steps'    // Erste Schritte
  | 'scoring'        // Score-bezogen
  | 'checkout'       // Checkout-bezogen
  | 'training'       // Training-bezogen
  | 'consistency'    // Beständigkeit
  | 'special'        // Spezielle Achievements
  | 'master';        // Meisterschaft

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  points: number;
  requirement: {
    type: 'count' | 'value' | 'streak' | 'special';
    target: number;
    metric: string;
  };
  hidden?: boolean; // Hidden until unlocked
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: Date;
  playerId: string;
  gameId?: string; // Optional: ID des Spiels, in dem es freigeschaltet wurde
}

export interface PlayerAchievementProgress {
  playerId: string;
  unlockedAchievements: UnlockedAchievement[];
  progress: {
    [achievementId: string]: {
      current: number;
      target: number;
      percentage: number;
    };
  };
  totalPoints: number;
  lastUnlocked?: UnlockedAchievement;
}

export interface AchievementNotification {
  achievement: Achievement;
  playerId: string;
  timestamp: Date;
}

// All available achievements in the game
export const ACHIEVEMENTS: Achievement[] = [
  // ===== FIRST STEPS (5 Achievements) =====
  {
    id: 'first_game',
    name: 'Erste Schritte',
    description: 'Beende dein erstes Spiel',
    category: 'first_steps',
    tier: 'bronze',
    icon: '🎯',
    points: 10,
    requirement: { type: 'count', target: 1, metric: 'games_played' },
    rarity: 'common',
  },
  {
    id: 'rookie',
    name: 'Rookie',
    description: 'Spiele 10 Spiele',
    category: 'first_steps',
    tier: 'bronze',
    icon: '🎮',
    points: 25,
    requirement: { type: 'count', target: 10, metric: 'games_played' },
    rarity: 'common',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Spiele 50 Spiele',
    category: 'first_steps',
    tier: 'silver',
    icon: '⭐',
    points: 50,
    requirement: { type: 'count', target: 50, metric: 'games_played' },
    rarity: 'rare',
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Spiele 100 Spiele',
    category: 'first_steps',
    tier: 'gold',
    icon: '💯',
    points: 100,
    requirement: { type: 'count', target: 100, metric: 'games_played' },
    rarity: 'epic',
  },
  {
    id: 'legend',
    name: 'Legende',
    description: 'Spiele 500 Spiele',
    category: 'first_steps',
    tier: 'platinum',
    icon: '👑',
    points: 250,
    requirement: { type: 'count', target: 500, metric: 'games_played' },
    rarity: 'legendary',
  },

  // ===== SCORING (5 Achievements) =====
  {
    id: 'ton_80',
    name: 'Ton 80',
    description: 'Erziele deinen ersten 180',
    category: 'scoring',
    tier: 'silver',
    icon: '🔥',
    points: 50,
    requirement: { type: 'count', target: 1, metric: 'score_180' },
    rarity: 'rare',
  },
  {
    id: 'max_out',
    name: 'Max Out',
    description: 'Erziele 10x einen 180',
    category: 'scoring',
    tier: 'gold',
    icon: '💥',
    points: 100,
    requirement: { type: 'count', target: 10, metric: 'score_180' },
    rarity: 'epic',
  },
  {
    id: 'high_roller',
    name: 'High Roller',
    description: 'Erreiche einen Average von 60 in einem Spiel',
    category: 'scoring',
    tier: 'silver',
    icon: '📈',
    points: 50,
    requirement: { type: 'value', target: 60, metric: 'match_average' },
    rarity: 'rare',
  },
  {
    id: 'pro_scorer',
    name: 'Pro Scorer',
    description: 'Erreiche einen Average von 80 in einem Spiel',
    category: 'scoring',
    tier: 'gold',
    icon: '🎖️',
    points: 100,
    requirement: { type: 'value', target: 80, metric: 'match_average' },
    rarity: 'epic',
  },
  {
    id: 'world_class',
    name: 'Weltklasse',
    description: 'Erreiche einen Average von 100 in einem Spiel',
    category: 'scoring',
    tier: 'diamond',
    icon: '💎',
    points: 250,
    requirement: { type: 'value', target: 100, metric: 'match_average' },
    rarity: 'legendary',
  },

  // ===== CHECKOUT (4 Achievements) =====
  {
    id: 'checkout_king',
    name: 'Checkout King',
    description: 'Erreiche eine Checkout-Quote von 50% (min. 10 Versuche)',
    category: 'checkout',
    tier: 'gold',
    icon: '🎯',
    points: 75,
    requirement: { type: 'value', target: 50, metric: 'checkout_percentage' },
    rarity: 'epic',
  },
  {
    id: 'big_fish',
    name: 'Big Fish',
    description: 'Checke 170 aus',
    category: 'checkout',
    tier: 'gold',
    icon: '🐟',
    points: 100,
    requirement: { type: 'special', target: 170, metric: 'checkout_value' },
    rarity: 'epic',
    hidden: true,
  },
  {
    id: 'bullseye_master',
    name: 'Bullseye Master',
    description: 'Checke mit Double Bull aus',
    category: 'checkout',
    tier: 'silver',
    icon: '🎯',
    points: 50,
    requirement: { type: 'special', target: 1, metric: 'checkout_bullseye' },
    rarity: 'rare',
  },
  {
    id: 'perfect_finish',
    name: 'Perfect Finish',
    description: 'Checke einen exakten Score ohne Bust',
    category: 'checkout',
    tier: 'bronze',
    icon: '✨',
    points: 25,
    requirement: { type: 'count', target: 1, metric: 'perfect_checkout' },
    rarity: 'common',
  },

  // ===== TRAINING (3 Achievements) =====
  {
    id: 'trainee',
    name: 'Trainee',
    description: 'Absolviere dein erstes Training',
    category: 'training',
    tier: 'bronze',
    icon: '🎓',
    points: 25,
    requirement: { type: 'count', target: 1, metric: 'training_completed' },
    rarity: 'common',
  },
  {
    id: 'dedicated',
    name: 'Dedicated',
    description: 'Absolviere 50 Trainingseinheiten',
    category: 'training',
    tier: 'silver',
    icon: '💪',
    points: 75,
    requirement: { type: 'count', target: 50, metric: 'training_completed' },
    rarity: 'rare',
  },
  {
    id: 'master_trainer',
    name: 'Master Trainer',
    description: 'Absolviere alle 6 Trainingsmodi',
    category: 'training',
    tier: 'gold',
    icon: '🏆',
    points: 100,
    requirement: { type: 'special', target: 6, metric: 'training_all_modes' },
    rarity: 'epic',
  },

  // ===== CONSISTENCY (2 Achievements) =====
  {
    id: 'winning_streak',
    name: 'Siegesserie',
    description: 'Gewinne 5 Spiele in Folge',
    category: 'consistency',
    tier: 'gold',
    icon: '🔥',
    points: 100,
    requirement: { type: 'streak', target: 5, metric: 'wins' },
    rarity: 'epic',
  },
  {
    id: 'no_bust',
    name: 'No Bust',
    description: 'Gewinne ein Leg ohne einzigen Bust',
    category: 'consistency',
    tier: 'silver',
    icon: '✅',
    points: 50,
    requirement: { type: 'special', target: 1, metric: 'leg_no_bust' },
    rarity: 'rare',
  },

  // ===== SPECIAL & MASTER (1 Achievement) =====
  {
    id: 'nine_darter',
    name: '9-Darter',
    description: 'Beende ein Leg mit nur 9 Darts (501)',
    category: 'special',
    tier: 'diamond',
    icon: '💫',
    points: 500,
    requirement: { type: 'special', target: 9, metric: 'leg_darts' },
    rarity: 'legendary',
    hidden: true,
  },
];

// Helper functions
export const getAchievementById = (id: string): Achievement | undefined => {
  return ACHIEVEMENTS.find(a => a.id === id);
};

export const getAchievementsByCategory = (category: AchievementCategory): Achievement[] => {
  return ACHIEVEMENTS.filter(a => a.category === category);
};

export const getAchievementsByTier = (tier: AchievementTier): Achievement[] => {
  return ACHIEVEMENTS.filter(a => a.tier === tier);
};

export const getTotalPoints = (achievements: Achievement[]): number => {
  return achievements.reduce((sum, a) => sum + a.points, 0);
};

export const getCategoryName = (category: AchievementCategory): string => {
  const names: Record<AchievementCategory, string> = {
    first_steps: 'Erste Schritte',
    scoring: 'Scoring',
    checkout: 'Checkout',
    training: 'Training',
    consistency: 'Beständigkeit',
    special: 'Spezial',
    master: 'Meisterschaft',
  };
  return names[category];
};

export const getTierColor = (tier: AchievementTier): string => {
  const colors: Record<AchievementTier, string> = {
    bronze: '#CD7F32',
    silver: '#C0C0C0',
    gold: '#FFD700',
    platinum: '#E5E4E2',
    diamond: '#B9F2FF',
  };
  return colors[tier];
};

export const getRarityColor = (rarity: 'common' | 'rare' | 'epic' | 'legendary'): string => {
  const colors = {
    common: '#9CA3AF',    // gray
    rare: '#3B82F6',      // blue
    epic: '#A855F7',      // purple
    legendary: '#F59E0B', // amber
  };
  return colors[rarity];
};
