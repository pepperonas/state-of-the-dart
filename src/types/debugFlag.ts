import type { LogEntry } from '../utils/logBuffer';

export type DebugFlagStatus = 'open' | 'investigating' | 'resolved' | 'dismissed';

export interface DebugFlag {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  comment: string;
  route?: string;
  browserInfo?: {
    userAgent: string;
    screenResolution: string;
    viewport: string;
    platform?: string;
    language?: string;
    onLine?: boolean;
  };
  screenshotUrl?: string;
  gameState?: unknown;
  logEntries: LogEntry[];
  status: DebugFlagStatus;
  adminNotes?: string;
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
}

export interface DebugFlagCreateRequest {
  comment: string;
  route?: string;
  browserInfo?: unknown;
  screenshotUrl?: string;
  gameState?: unknown;
  logEntries: LogEntry[];
}
