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
export interface MatchCreateRequest {
  id: string;
  gameType: string;
  status: string;
  players: Match['players'];
  settings: Match['settings'];
  startedAt: number;
  completedAt?: number;
  winner?: string;
  legs?: Match['legs'];
}

export interface MatchUpdateRequest {
  status?: string;
  winner?: string;
  completedAt?: number;
  players?: Match['players'];
  legs?: Match['legs'];
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
