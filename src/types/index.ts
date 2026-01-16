export interface Player {
  id: string;
  name: string;
  avatar: string;
  createdAt: Date;
  stats: PlayerStats;
  preferences: PlayerPreferences;
  isBot?: boolean;
  botLevel?: number; // 1-10 (20-120 PPD)
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  totalLegsPlayed: number;
  totalLegsWon: number;
  highestCheckout: number;
  total180s: number;
  total171Plus: number;
  total140Plus: number;
  total100Plus: number;
  total60Plus: number;
  bestAverage: number;
  averageOverall: number;
  checkoutPercentage: number;
  checkoutsByDouble: Record<string, { attempts: number; hits: number }>;
  scoreDistribution: Record<string, number>;
  bestLeg: number; // fewest darts
  nineDartFinishes: number;
}

export interface PlayerPreferences {
  preferredCheckouts: Record<number, string[]>;
  soundEnabled: boolean;
  callerLanguage: 'de' | 'en';
  callerVoice?: 'male' | 'female';
  vibrationEnabled?: boolean;
}

export type GameType = 'x01' | 'cricket' | 'around-the-clock' | 'shanghai';
export type GameStatus = 'setup' | 'in-progress' | 'paused' | 'completed' | 'abandoned';
export type CheckoutMode = 'double-out' | 'master-out' | 'straight-out';
export type CricketMode = 'standard' | 'cut-throat' | 'points';

export interface Match {
  id: string;
  type: GameType;
  settings: MatchSettings;
  players: MatchPlayer[];
  teams?: Team[];
  legs: Leg[];
  currentLegIndex: number;
  currentSetIndex: number;
  sets?: Set[];
  status: GameStatus;
  winner?: string;
  startedAt: Date;
  completedAt?: Date;
  pausedAt?: Date;
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
  color: string;
}

export interface MatchSettings {
  // X01 Settings
  startScore?: number;
  legsToWin?: number;
  setsToWin?: number;
  doubleOut?: boolean;
  doubleIn?: boolean;
  masterOut?: boolean;
  
  // Cricket Settings
  cricketMode?: CricketMode;
  cricketNumbers?: number[];
  
  // Around the Clock Settings
  clockDirection?: 'ascending' | 'descending';
  clockIncludeDoubles?: boolean;
  clockIncludeTriples?: boolean;
  
  // Shanghai Settings
  shanghaiRounds?: number;
  
  // General Settings
  timeLimit?: number; // in seconds per turn
  suddenDeath?: boolean;
}

export interface MatchPlayer {
  playerId: string;
  name: string;
  setsWon: number;
  legsWon: number;
  matchAverage: number;
  matchHighestScore: number;
  match180s: number;
  match171Plus: number;
  match140Plus: number;
  match100Plus: number;
  match60Plus: number;
  checkoutAttempts: number;
  checkoutsHit: number;
}

export interface Set {
  id: string;
  legs: Leg[];
  winner?: string;
  startedAt: Date;
  completedAt?: Date;
}

export interface Leg {
  id: string;
  throws: Throw[];
  cricketState?: CricketState;
  winner?: string;
  startedAt: Date;
  completedAt?: Date;
  totalDarts?: number;
}

export interface CricketState {
  [playerId: string]: {
    [number: string]: number; // 0-3 marks
    points: number;
  };
}

export interface Throw {
  id: string;
  playerId: string;
  darts: Dart[];
  score: number;
  remaining: number;
  timestamp: Date;
  isCheckoutAttempt?: boolean;
  isBust?: boolean;
  visitNumber: number;
  runningAverage?: number;
  first9Average?: number;
}

export interface Dart {
  segment: number; // 0 (miss), 1-20, 25 (outer bull), 50 (bull)
  multiplier: 0 | 1 | 2 | 3; // 0 = miss, 1 = single, 2 = double, 3 = triple
  score: number;
  bed?: 'single' | 'double' | 'triple' | 'outer-bull' | 'bull' | 'miss';
}

// Heatmap Types
export interface HeatmapData {
  playerId: string;
  segments: {
    [key: string]: number; // "segment-multiplier" -> count (e.g., "20-3" = triple 20)
  };
  totalDarts: number;
  lastUpdated: Date;
}

export interface SegmentHeat {
  segment: number;
  multiplier: number;
  count: number;
  percentage: number;
  color: string; // hex color based on frequency
}

// Training Types
export type TrainingType = 
  | 'singles' 
  | 'doubles' 
  | 'triples' 
  | 'checkout-121' 
  | 'bobs-27' 
  | 'score-training'
  | 'around-the-clock'
  | 'catch-40'
  | 'halve-it';

export interface TrainingSession {
  id: string;
  type: TrainingType;
  playerId: string;
  results: TrainingResult[];
  settings: TrainingSettings;
  startedAt: Date;
  completedAt?: Date;
  score?: number;
  personalBest?: boolean;
  // Statistics
  totalDarts?: number;
  totalHits?: number;
  totalAttempts?: number;
  hitRate?: number; // percentage
  averageScore?: number;
  highestScore?: number;
  duration?: number; // in seconds
}

export interface TrainingSettings {
  // Doubles Training
  doublesTargets?: number[];
  doublesRounds?: number;
  
  // Score Training
  scoreTarget?: number; // e.g., 60+, 80+, 100+
  scoreRounds?: number;
  
  // Checkout Training
  checkoutTargets?: number[];
  checkoutAttempts?: number;
  
  // Bob's 27
  startingScore?: number;
  
  // Around the Clock
  clockVariant?: 'standard' | 'doubles' | 'triples';
}

export interface TrainingResult {
  targetSegment?: number;
  targetMultiplier?: number;
  dartsThrown: Dart[];
  hit: boolean;
  timestamp: Date;
  score?: number;
}

// Tournament Types
export interface Tournament {
  id: string;
  name: string;
  type: 'knockout' | 'round-robin' | 'league' | 'swiss';
  participants: TournamentParticipant[];
  matches: TournamentMatch[];
  settings: TournamentSettings;
  status: 'setup' | 'in-progress' | 'completed';
  currentRound: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface TournamentParticipant {
  id: string;
  playerId: string;
  seed?: number;
  wins: number;
  losses: number;
  legsFor: number;
  legsAgainst: number;
  position?: number;
}

export interface TournamentMatch {
  id: string;
  matchId?: string;
  round: number;
  participant1Id: string;
  participant2Id: string;
  winner?: string;
  scheduled?: Date;
  completed?: Date;
}

export interface TournamentSettings {
  gameType: GameType;
  matchSettings: MatchSettings;
  bestOf?: number;
  doubleElimination?: boolean;
  thirdPlaceMatch?: boolean;
}

// Achievement System
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'score' | 'checkout' | 'milestone' | 'special';
  unlockedAt?: Date;
  progress?: number;
  target?: number;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

// Statistics
export interface SessionStats {
  average: number;
  first9Average: number;
  bestLeg: number;
  worstLeg: number;
  highestScore: number;
  checkoutPercentage: number;
  total180s: number;
  total171Plus: number;
  total140Plus: number;
  total100Plus: number;
  total60Plus: number;
  dartsThrown: number;
}

// Checkout Tables
export interface CheckoutRoute {
  score: number;
  darts: string[];
  preferred?: boolean;
}

export interface CheckoutTable {
  [score: number]: CheckoutRoute[];
}

// UI State
export interface AppState {
  currentMatch?: Match;
  currentPlayer?: Player;
  players: Player[];
  matches: Match[];
  tournaments: Tournament[];
  trainingSessions: TrainingSession[];
  achievements: Achievement[];
  settings: AppSettings;
}

export type AppTheme = 'modern' | 'steampunk' | 'dark'; // 'dark' is deprecated, maps to 'modern'

export interface AppSettings {
  theme: AppTheme;
  language: 'de' | 'en';
  soundVolume: number; // Deprecated: kept for backward compatibility
  callerVolume?: number; // Volume for caller sounds (scores, checkouts)
  effectsVolume?: number; // Volume for effects (UI sounds, game events)
  showCheckoutHints: boolean;
  autoNextPlayer: boolean;
  showStatsDuringGame: boolean;
  confirmScores: boolean;
  vibrationEnabled: boolean;
  showDartboardHelper: boolean;
}

// Game Events
export interface GameEvent {
  type: 'score' | 'checkout' | 'bust' | 'leg-won' | 'set-won' | 'match-won' | '180' | '9-darter';
  playerId: string;
  timestamp: Date;
  data?: any;
}

// Export/Import
export interface ExportData {
  version: string;
  exportedAt: Date;
  players: Player[];
  matches: Match[];
  tournaments: Tournament[];
  trainingSessions: TrainingSession[];
  achievements: Achievement[];
  settings: AppSettings;
}