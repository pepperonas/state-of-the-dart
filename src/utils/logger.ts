/**
 * Logger System
 *
 * In production: Only errors are logged
 * In development: All log levels are enabled
 */

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
    if (this.shouldLog('debug')) {
      console.log(`🔍 ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`ℹ️ ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`❌ ${message}`, ...args);
    }
  }

  // Special methods for specific use cases
  success(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`✅ ${message}`, ...args);
    }
  }

  gameEvent(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`🎯 ${message}`, ...args);
    }
  }

  botEvent(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`🤖 ${message}`, ...args);
    }
  }

  achievementEvent(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`🏆 ${message}`, ...args);
    }
  }

  apiEvent(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`🔄 ${message}`, ...args);
    }
  }

  userAction(action: string, details?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.log(`👤 [${action}]`, JSON.stringify({
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
