/**
 * Logger System
 *
 * In production: Only errors are logged to console
 * In development: All log levels are enabled for console
 *
 * Ring buffer: ALWAYS captures all logs regardless of environment
 */

import { logBuffer } from './logBuffer';
import type { LogCategory } from './logBuffer';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_PRODUCTION = import.meta.env.PROD;

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (IS_PRODUCTION) {
      // In production, only log errors
      return level === 'error';
    }
    // In development, log everything
    return true;
  }

  debug(message: string, ...args: any[]): void {
    logBuffer.log('debug', 'lifecycle', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    if (this.shouldLog('debug')) {
      console.log(`${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    logBuffer.log('info', 'lifecycle', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    if (this.shouldLog('info')) {
      console.log(`${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    logBuffer.log('warn', 'lifecycle', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    if (this.shouldLog('warn')) {
      console.warn(`${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    logBuffer.log('error', 'error', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    if (this.shouldLog('error')) {
      console.error(`${message}`, ...args);
    }
  }

  // Special methods for specific use cases
  success(message: string, ...args: any[]): void {
    logBuffer.log('info', 'lifecycle', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    if (this.shouldLog('info')) {
      console.log(`${message}`, ...args);
    }
  }

  gameEvent(message: string, ...args: any[]): void {
    logBuffer.log('debug', 'game_event', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    if (this.shouldLog('debug')) {
      console.log(`${message}`, ...args);
    }
  }

  botEvent(message: string, ...args: any[]): void {
    logBuffer.log('debug', 'game_event', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    if (this.shouldLog('debug')) {
      console.log(`${message}`, ...args);
    }
  }

  achievementEvent(message: string, ...args: any[]): void {
    logBuffer.log('info', 'achievement', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    if (this.shouldLog('info')) {
      console.log(`${message}`, ...args);
    }
  }

  apiEvent(message: string, ...args: any[]): void {
    logBuffer.log('debug', 'api_request', message, args.length === 1 ? args[0] : args.length > 1 ? args : undefined);
    if (this.shouldLog('debug')) {
      console.log(`${message}`, ...args);
    }
  }

  userAction(action: string, details?: Record<string, unknown>): void {
    logBuffer.log('info', 'user_action', action, details);
    if (this.shouldLog('info')) {
      console.log(`[${action}]`, JSON.stringify({
        timestamp: new Date().toISOString(),
        action,
        ...details,
      }));
    }
  }
}

// Export singleton instance
export const logger = new Logger();
export default logger;
