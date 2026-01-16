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

  // ===== ADDITIONAL SCORING ACHIEVEMENTS (7) =====
  {
    id: 'ton_plus',
    name: 'Ton Plus',
    description: 'Erziele einen Score von 100+',
    category: 'scoring',
    tier: 'bronze',
    icon: '💯',
    points: 25,
    requirement: { type: 'count', target: 1, metric: 'score_100_plus' },
    rarity: 'common',
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Erziele 100x einen Score von 100+',
    category: 'scoring',
    tier: 'gold',
    icon: '🎪',
    points: 100,
    requirement: { type: 'count', target: 100, metric: 'score_100_plus' },
    rarity: 'epic',
  },
  {
    id: 'consistent_scorer',
    name: 'Konstanter Scorer',
    description: 'Erziele 10 Würfe hintereinander mit 60+',
    category: 'scoring',
    tier: 'silver',
    icon: '🎯',
    points: 75,
    requirement: { type: 'streak', target: 10, metric: 'score_60_plus' },
    rarity: 'rare',
  },
  {
    id: 'triple_master',
    name: 'Triple Meister',
    description: 'Treffe 100 Triple-Felder',
    category: 'scoring',
    tier: 'silver',
    icon: '🎯',
    points: 50,
    requirement: { type: 'count', target: 100, metric: 'triples_hit' },
    rarity: 'rare',
  },
  {
    id: 'perfect_round',
    name: 'Perfekte Runde',
    description: 'Erziele 3x Triple-20 in einem Visit (180)',
    category: 'scoring',
    tier: 'gold',
    icon: '⭐',
    points: 75,
    requirement: { type: 'special', target: 1, metric: 'perfect_180' },
    rarity: 'epic',
  },
  {
    id: 'Shanghai',
    name: 'Shanghai',
    description: 'Treffe Single, Double und Triple der gleichen Zahl',
    category: 'scoring',
    tier: 'silver',
    icon: '🏯',
    points: 60,
    requirement: { type: 'special', target: 1, metric: 'shanghai' },
    rarity: 'rare',
    hidden: true,
  },
  {
    id: 'low_ton',
    name: 'Low Ton',
    description: 'Erziele exakt 100 Punkte',
    category: 'scoring',
    tier: 'bronze',
    icon: '🎲',
    points: 20,
    requirement: { type: 'special', target: 100, metric: 'exact_score' },
    rarity: 'common',
  },

  // ===== ADDITIONAL CHECKOUT ACHIEVEMENTS (8) =====
  {
    id: 'checkout_novice',
    name: 'Checkout Anfänger',
    description: 'Checke dein erstes Spiel aus',
    category: 'checkout',
    tier: 'bronze',
    icon: '🎯',
    points: 10,
    requirement: { type: 'count', target: 1, metric: 'checkouts' },
    rarity: 'common',
  },
  {
    id: 'madhouse',
    name: 'Madhouse',
    description: 'Checke mit Double 1 aus',
    category: 'checkout',
    tier: 'silver',
    icon: '🏠',
    points: 50,
    requirement: { type: 'special', target: 1, metric: 'checkout_d1' },
    rarity: 'rare',
    hidden: true,
  },
  {
    id: 'century_checkout',
    name: 'Century Checkout',
    description: 'Checke 100 oder mehr aus',
    category: 'checkout',
    tier: 'gold',
    icon: '💯',
    points: 75,
    requirement: { type: 'special', target: 100, metric: 'checkout_value_min' },
    rarity: 'epic',
  },
  {
    id: 'double_trouble',
    name: 'Double Trouble',
    description: 'Checke 10 verschiedene Double-Felder',
    category: 'checkout',
    tier: 'silver',
    icon: '🎯',
    points: 60,
    requirement: { type: 'count', target: 10, metric: 'unique_doubles' },
    rarity: 'rare',
  },
  {
    id: 'favorite_double',
    name: 'Lieblings-Double',
    description: 'Checke 25x mit dem gleichen Double aus',
    category: 'checkout',
    tier: 'gold',
    icon: '❤️',
    points: 75,
    requirement: { type: 'count', target: 25, metric: 'same_double' },
    rarity: 'epic',
  },
  {
    id: 'quick_finish',
    name: 'Schneller Abschluss',
    description: 'Checke in unter 12 Darts (301)',
    category: 'checkout',
    tier: 'silver',
    icon: '⚡',
    points: 50,
    requirement: { type: 'special', target: 12, metric: 'checkout_darts_max' },
    rarity: 'rare',
  },
  {
    id: 'checkout_master',
    name: 'Checkout Meister',
    description: 'Erreiche 100 erfolgreiche Checkouts',
    category: 'checkout',
    tier: 'platinum',
    icon: '👑',
    points: 150,
    requirement: { type: 'count', target: 100, metric: 'checkouts' },
    rarity: 'legendary',
  },
  {
    id: 'big_40',
    name: 'Big 40',
    description: 'Checke genau 40 aus (D20)',
    category: 'checkout',
    tier: 'bronze',
    icon: '🎯',
    points: 25,
    requirement: { type: 'special', target: 40, metric: 'checkout_value' },
    rarity: 'common',
  },

  // ===== ADDITIONAL CONSISTENCY ACHIEVEMENTS (6) =====
  {
    id: 'comeback_king',
    name: 'Comeback King',
    description: 'Gewinne ein Spiel nach 0:2 Rückstand',
    category: 'consistency',
    tier: 'gold',
    icon: '👑',
    points: 100,
    requirement: { type: 'special', target: 1, metric: 'comeback_win' },
    rarity: 'epic',
  },
  {
    id: 'unstoppable',
    name: 'Unaufhaltsam',
    description: 'Gewinne 10 Spiele in Folge',
    category: 'consistency',
    tier: 'platinum',
    icon: '🔥',
    points: 200,
    requirement: { type: 'streak', target: 10, metric: 'wins' },
    rarity: 'legendary',
  },
  {
    id: 'perfect_leg',
    name: 'Perfektes Leg',
    description: 'Gewinne ein Leg mit über 100 Average',
    category: 'consistency',
    tier: 'platinum',
    icon: '💎',
    points: 150,
    requirement: { type: 'special', target: 100, metric: 'leg_average' },
    rarity: 'legendary',
  },
  {
    id: 'clutch_player',
    name: 'Clutch Player',
    description: 'Gewinne 5 Spiele im Decider',
    category: 'consistency',
    tier: 'gold',
    icon: '🎪',
    points: 100,
    requirement: { type: 'count', target: 5, metric: 'decider_wins' },
    rarity: 'epic',
  },
  {
    id: 'never_give_up',
    name: 'Never Give Up',
    description: 'Hole einen Rückstand von 200+ Punkten auf',
    category: 'consistency',
    tier: 'silver',
    icon: '💪',
    points: 75,
    requirement: { type: 'special', target: 200, metric: 'comeback_points' },
    rarity: 'rare',
  },
  {
    id: 'clean_sweep',
    name: 'Clean Sweep',
    description: 'Gewinne ein Match ohne Satzverlust (Best of 5)',
    category: 'consistency',
    tier: 'gold',
    icon: '🧹',
    points: 75,
    requirement: { type: 'special', target: 1, metric: 'whitewash' },
    rarity: 'epic',
  },

  // ===== ADDITIONAL TRAINING ACHIEVEMENTS (4) =====
  {
    id: 'training_addict',
    name: 'Training Junkie',
    description: 'Absolviere 100 Trainingseinheiten',
    category: 'training',
    tier: 'gold',
    icon: '🏋️',
    points: 100,
    requirement: { type: 'count', target: 100, metric: 'training_completed' },
    rarity: 'epic',
  },
  {
    id: 'around_the_clock',
    name: 'Around the Clock',
    description: 'Treffe alle Zahlen von 1-20 in einem Training',
    category: 'training',
    tier: 'silver',
    icon: '🕐',
    points: 50,
    requirement: { type: 'special', target: 1, metric: 'training_all_numbers' },
    rarity: 'rare',
  },
  {
    id: 'training_perfectionist',
    name: 'Training Perfektionist',
    description: 'Erreiche 100% in einem Training',
    category: 'training',
    tier: 'gold',
    icon: '✨',
    points: 75,
    requirement: { type: 'special', target: 100, metric: 'training_perfect' },
    rarity: 'epic',
  },
  {
    id: 'early_bird',
    name: 'Frühaufsteher',
    description: 'Absolviere ein Training vor 8 Uhr morgens',
    category: 'training',
    tier: 'bronze',
    icon: '🌅',
    points: 25,
    requirement: { type: 'special', target: 1, metric: 'training_early' },
    rarity: 'common',
    hidden: true,
  },

  // ===== ADDITIONAL SPECIAL & MASTER ACHIEVEMENTS (5) =====
  {
    id: 'hat_trick',
    name: 'Hat Trick',
    description: 'Erziele 3x 180 in einem Spiel',
    category: 'special',
    tier: 'platinum',
    icon: '🎩',
    points: 200,
    requirement: { type: 'special', target: 3, metric: 'match_180_count' },
    rarity: 'legendary',
    hidden: true,
  },
  {
    id: 'twelve_darter',
    name: '12-Darter',
    description: 'Beende ein Leg mit nur 12 Darts (501)',
    category: 'special',
    tier: 'platinum',
    icon: '🌟',
    points: 300,
    requirement: { type: 'special', target: 12, metric: 'leg_darts' },
    rarity: 'legendary',
    hidden: true,
  },
  {
    id: 'grand_master',
    name: 'Großmeister',
    description: 'Erreiche 10.000 Achievement-Punkte',
    category: 'master',
    tier: 'diamond',
    icon: '👑',
    points: 500,
    requirement: { type: 'value', target: 10000, metric: 'achievement_points' },
    rarity: 'legendary',
  },
  {
    id: 'all_rounder',
    name: 'Allrounder',
    description: 'Gewinne je 10 Spiele in 301, 501 und 701',
    category: 'master',
    tier: 'platinum',
    icon: '🎯',
    points: 150,
    requirement: { type: 'special', target: 10, metric: 'wins_all_modes' },
    rarity: 'legendary',
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Beende ein Spiel in unter 5 Minuten',
    category: 'special',
    tier: 'gold',
    icon: '⚡',
    points: 75,
    requirement: { type: 'special', target: 300, metric: 'game_time_max' },
    rarity: 'epic',
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
