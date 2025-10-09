/**
 * Logger Utility
 * 
 * Provides structured logging with log levels and environment-based filtering.
 * Reduces console noise in production while maintaining debug capabilities in development.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  level: LogLevel;
  enabledInProduction: boolean;
}

class Logger {
  private config: LoggerConfig;
  
  constructor() {
    this.config = {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      enabledInProduction: false
    };
  }
  
  /**
   * Debug level logging - for detailed debugging information
   * Only shown in development mode
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(`🔍 ${message}`, ...args);
    }
  }
  
  /**
   * Info level logging - for general informational messages
   */
  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`ℹ️ ${message}`, ...args);
    }
  }
  
  /**
   * Warning level logging - for potentially problematic situations
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`⚠️ ${message}`, ...args);
    }
  }
  
  /**
   * Error level logging - for error conditions
   */
  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      if (error instanceof Error) {
        console.error(`❌ ${message}`, error, ...args);
      } else {
        console.error(`❌ ${message}`, error, ...args);
      }
    }
  }
  
  /**
   * Determines if a log should be output based on current configuration
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const requestedLevelIndex = levels.indexOf(level);
    
    // In production, only show warnings and errors unless explicitly enabled
    if (process.env.NODE_ENV === 'production' && !this.config.enabledInProduction) {
      return level === 'error' || level === 'warn';
    }
    
    return requestedLevelIndex >= currentLevelIndex;
  }
  
  /**
   * Updates logger configuration
   */
  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Gets current configuration
   */
  getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for external use
export type { LogLevel, LoggerConfig };
