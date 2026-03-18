/**
 * Structured logging utility for the Release Manager Tool
 * Provides consistent logging with severity levels and context
 */

/**
 * Log severity levels
 */
export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * Log entry structure
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  stackTrace?: string;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
}

/**
 * Structured logger implementation
 */
export class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: config.minLevel || LogLevel.INFO,
      enableConsole: config.enableConsole !== false,
      enableFile: config.enableFile || false,
      filePath: config.filePath
    };
  }
  
  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * Log an error message
   */
  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error);
  }
  
  /**
   * Log a critical error message
   */
  critical(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(LogLevel.CRITICAL, message, context, error);
  }
  
  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    // Check if this log level should be recorded
    if (!this.shouldLog(level)) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      error,
      stackTrace: error?.stack
    };
    
    // Add to buffer
    this.logBuffer.push(entry);
    
    // Output to console if enabled
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }
    
    // Keep buffer size manageable (last 1000 entries)
    if (this.logBuffer.length > 1000) {
      this.logBuffer.shift();
    }
  }
  
  /**
   * Check if a log level should be recorded
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const minIndex = levels.indexOf(this.config.minLevel);
    const currentIndex = levels.indexOf(level);
    return currentIndex >= minIndex;
  }
  
  /**
   * Output log entry to console
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    const logMessage = `[${timestamp}] ${entry.level}: ${entry.message}${contextStr}`;
    
    switch (entry.level) {
      case LogLevel.INFO:
        console.log(logMessage);
        break;
      case LogLevel.WARN:
        console.warn(logMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage);
        if (entry.error) {
          console.error('Error details:', entry.error);
        }
        if (entry.stackTrace) {
          console.error('Stack trace:', entry.stackTrace);
        }
        break;
    }
  }
  
  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }
  
  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel, count: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.level === level)
      .slice(-count);
  }
  
  /**
   * Clear the log buffer
   */
  clearLogs(): void {
    this.logBuffer = [];
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();
