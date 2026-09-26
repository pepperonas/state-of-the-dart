/**
 * API Request/Response Types
 *
 * These types define the shape of data sent to and received from the API.
 */

import { Player, Match, TrainingSession, HeatmapData } from './index';

// Tenant (Profile) Types
export interface TenantCreateRequest {
  name: string;
  avatar?: string;
}

export interface TenantUpdateRequest {
  name?: string;
  avatar?: string;
}

// Player Types
export interface PlayerCreateRequest {
  name: string;
  avatar?: string;
  isBot?: boolean;
  botLevel?: number;
}

export interface PlayerUpdateRequest {
  name?: string;
  avatar?: string;
  stats?: Partial<Player['stats']>;
}

// Match Types
/** A player row as the API stores it — the match player plus derived totals. */
export type ApiMatchPlayer = Match['players'][number] & {
  highestScore?: number;
  dartsThrown?: number;
  first9Average?: number;
};

/** Legs and throws travel with epoch-ms timestamps (the columns are INTEGER). */
export interface ApiLeg {
  id: string;
  legNumber?: number;
  winner?: string;
  startedAt: number | null;
  completedAt: number | null;
  throws: Array<Omit<Match['legs'][number]['throws'][number], 'timestamp'> & { timestamp: number | null }>;
}

export interface MatchCreateRequest {
  id: string;
  gameType: string;
  status: string;
  players: ApiMatchPlayer[];
  settings: Match['settings'];
  startedAt: number;
  /** `null` clears — PUT only writes fields that are present. */
  completedAt?: number | null;
  winner?: string | null;
  legs?: ApiLeg[];
}

export interface MatchUpdateRequest {
  status?: string;
  winner?: string | null;
  completedAt?: number | null;
  players?: ApiMatchPlayer[];
  legs?: ApiLeg[];
}

// Training Session Types
export interface TrainingSessionCreateRequest {
  id: string;
  playerId: string;
  type: string;
  score?: number;
  totalAttempts?: number;
  totalHits?: number;
  hitRate?: number;
  duration?: number;
  completedAt?: Date | number;
  personalBest?: boolean;
  details?: Record<string, any>;
}

export interface TrainingSessionUpdateRequest {
  score?: number;
  attempts?: number;
  hits?: number;
  accuracy?: number;
  duration?: number;
  completedAt?: number;
  details?: Record<string, any>;
}

// Achievement Types
export interface AchievementProgressUpdateRequest {
  achievements: Record<string, { progress: number; completed: boolean }>;
}

// Settings Types
export interface SettingsUpdateRequest {
  theme?: string;
  language?: string;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
  callerVoice?: 'male' | 'female';
  callerLanguage?: 'de' | 'en';
  showHints?: boolean;
  autoConfirmThrow?: boolean;
}

export interface SettingUpdateRequest {
  key: string;
  value: any;
}

// Bug Report Types
export interface BugReportCreateRequest {
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'gameplay' | 'ui' | 'audio' | 'performance' | 'auth' | 'data' | 'other';
  screenshotUrl?: string;
  browserInfo?: {
    userAgent: string;
    screenResolution: string;
    viewport: string;
  };
  route?: string;
}
