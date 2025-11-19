/**
 * Centralized logging utility for server-side logging
 * Provides environment-aware logging with timestamps
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  timestamp?: boolean;
  colorize?: boolean;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;
  private options: LoggerOptions;

  constructor(options: LoggerOptions = {}) {
    const nodeEnv = process.env.NODE_ENV || 'development';
    this.isDevelopment = nodeEnv === 'development';
    this.isProduction = nodeEnv === 'production';
    this.options = {
      timestamp: true,
      colorize: this.isDevelopment,
      ...options
    };
  }

  /**
   * Format timestamp for log messages
   */
  private getTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  }

  /**
   * Format log message with optional timestamp and level
   */
  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];
    
    if (this.options.timestamp) {
      parts.push(`[${this.getTimestamp()}]`);
    }
    
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    
    return parts.join(' ');
  }

  /**
   * Convert various input types to string
   */
  private stringify(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    
    if (data instanceof Error) {
      // For errors, include stack trace in development
      if (this.isDevelopment && data.stack) {
        return `${data.message}\nStack: ${data.stack}`;
      }
      return data.message;
    }
    
    if (typeof data === 'object') {
      try {
        // Pretty print objects in development
        if (this.isDevelopment) {
          return JSON.stringify(data, null, 2);
        }
        return JSON.stringify(data);
      } catch (error) {
        return '[Circular or Non-JSON Object]';
      }
    }
    
    return String(data);
  }

  /**
   * Apply color codes if in development mode
   */
  private colorize(level: LogLevel, message: string): string {
    if (!this.options.colorize) {
      return message;
    }

    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[37m',  // White
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m'   // Reset
    };

    return `${colors[level]}${message}${colors.reset}`;
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, ...args: any[]): void {
    // In production, only log errors and critical info
    if (this.isProduction) {
      if (level === 'debug') return; // Skip debug in production
      if (level === 'info' && !this.isImportantInfo(args)) return; // Skip non-critical info
    }

    // Convert all arguments to strings
    const messages = args.map(arg => this.stringify(arg));
    const fullMessage = messages.join(' ');
    
    // Format with timestamp and level
    const formattedMessage = this.formatMessage(level, fullMessage);
    
    // Apply color if in development
    const finalMessage = this.colorize(level, formattedMessage);
    
    // Output to appropriate console method
    switch (level) {
      case 'debug':
      case 'info':
        console.log(finalMessage);
        break;
      case 'warn':
        console.warn(finalMessage);
        break;
      case 'error':
        console.error(finalMessage);
        break;
    }
  }

  /**
   * Check if info message is important enough for production
   * Critical info includes: server startup, cron job execution, database operations
   */
  private isImportantInfo(args: any[]): boolean {
    const message = args.join(' ').toLowerCase();
    const importantKeywords = [
      'server', 'started', 'serving', 'port',
      'cron', 'reset', 'daily', 'hourly',
      'database', 'migration', 'backup',
      'critical', 'important', 'success'
    ];
    
    return importantKeywords.some(keyword => message.includes(keyword));
  }

  /**
   * Debug level - only logged in development
   */
  debug(...args: any[]): void {
    this.log('debug', ...args);
  }

  /**
   * Info level - logged in both environments (filtered in production)
   */
  info(...args: any[]): void {
    this.log('info', ...args);
  }

  /**
   * Warning level - logged in both environments
   */
  warn(...args: any[]): void {
    this.log('warn', ...args);
  }

  /**
   * Error level - always logged
   */
  error(...args: any[]): void {
    this.log('error', ...args);
  }

  /**
   * Special method for request logging (mimics the current log() function)
   */
  request(method: string, path: string, statusCode: number, duration: number, response?: any): void {
    let logLine = `${method} ${path} ${statusCode} in ${duration}ms`;
    
    if (response && this.isDevelopment) {
      // In development, include response data
      const responseStr = JSON.stringify(response);
      if (responseStr.length <= 80) {
        logLine += ` :: ${responseStr}`;
      } else {
        logLine += ` :: ${responseStr.slice(0, 79)}…`;
      }
    }
    
    // Use info level for successful requests, warn for client errors, error for server errors
    if (statusCode >= 500) {
      this.error(logLine);
    } else if (statusCode >= 400) {
      this.warn(logLine);
    } else {
      this.info(logLine);
    }
  }

  /**
   * Create a child logger with a prefix
   */
  child(prefix: string): PrefixedLogger {
    return new PrefixedLogger(this, prefix);
  }
}

/**
 * Prefixed logger for module-specific logging
 */
class PrefixedLogger {
  constructor(private parent: Logger, private prefix: string) {}

  debug(...args: any[]): void {
    this.parent.debug(`[${this.prefix}]`, ...args);
  }

  info(...args: any[]): void {
    this.parent.info(`[${this.prefix}]`, ...args);
  }

  warn(...args: any[]): void {
    this.parent.warn(`[${this.prefix}]`, ...args);
  }

  error(...args: any[]): void {
    this.parent.error(`[${this.prefix}]`, ...args);
  }
}

// Create and export the default logger instance
const logger = new Logger();

export { logger, Logger, PrefixedLogger };
export default logger;