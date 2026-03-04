/**
 * In-Memory Ring Buffer for Debug Logging
 *
 * Runs for ALL users in ALL environments (including production).
 * No console output, no performance overhead — just an in-memory array.
 * When admin sets a debug flag, the buffer is snapshot'd and persisted.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogCategory =
  | 'user_action'
  | 'navigation'
  | 'api_request'
  | 'api_response'
  | 'api_error'
  | 'game_event'
  | 'achievement'
  | 'error'
  | 'state_change'
  | 'lifecycle';

export interface LogEntry {
  id: number;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: unknown;
  route?: string;
}

const MAX_ENTRIES = 1000;

let idCounter = 0;
const buffer: LogEntry[] = [];

/**
 * Safely serialize data, handling circular references and large objects.
 */
function safeSerialize(data: unknown): unknown {
  if (data === undefined || data === null) return data;
  try {
    const seen = new WeakSet();
    const serialized = JSON.parse(JSON.stringify(data, (_key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      if (typeof value === 'string' && value.length > 500) {
        return value.slice(0, 500) + '...[truncated]';
      }
      return value;
    }));
    return serialized;
  } catch {
    return String(data);
  }
}

function getCurrentRoute(): string {
  try {
    return window.location.pathname + window.location.search;
  } catch {
    return '';
  }
}

export const logBuffer = {
  /**
   * Add a log entry to the ring buffer.
   * Always runs, regardless of environment.
   */
  log(level: LogLevel, category: LogCategory, message: string, data?: unknown): void {
    const entry: LogEntry = {
      id: ++idCounter,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data !== undefined ? safeSerialize(data) : undefined,
      route: getCurrentRoute(),
    };

    buffer.push(entry);

    // Trim buffer if over max
    if (buffer.length > MAX_ENTRIES) {
      buffer.splice(0, buffer.length - MAX_ENTRIES);
    }
  },

  /**
   * Get a snapshot of recent log entries.
   * Returns the larger set: last `maxEntries` or entries within `maxSeconds`.
   */
  getSnapshot(maxEntries = 500, maxSeconds = 60): LogEntry[] {
    const now = Date.now();
    const cutoff = now - maxSeconds * 1000;

    // Entries by time
    const byTime = buffer.filter(e => new Date(e.timestamp).getTime() >= cutoff);
    // Entries by count
    const byCount = buffer.slice(-maxEntries);

    // Return the larger set
    return byTime.length > byCount.length ? [...byTime] : [...byCount];
  },

  /**
   * Clear the buffer (mainly for testing).
   */
  clear(): void {
    buffer.length = 0;
    idCounter = 0;
  },

  /**
   * Get current buffer size.
   */
  get size(): number {
    return buffer.length;
  },
};

export default logBuffer;
