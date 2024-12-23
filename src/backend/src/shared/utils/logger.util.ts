/**
 * @fileoverview Enterprise-grade logging utility for GameDay Platform microservices
 * Implements structured logging with ELK Stack integration, correlation tracking,
 * and secure transport mechanisms.
 * @version 1.0.0
 */

import winston from 'winston'; // v3.11.0
import DailyRotateFile from 'winston-daily-rotate-file'; // v4.7.1
import { ElasticsearchTransport } from 'winston-elasticsearch'; // v0.17.4
import { ErrorCode } from '../constants/error-codes';

/**
 * Configuration options for the Logger instance
 */
interface LoggerOptions {
  serviceName: string;
  environment: string;
  elasticsearchConfig?: {
    node: string;
    auth: {
      username: string;
      password: string;
    };
    ssl: {
      rejectUnauthorized: boolean;
      ca: string;
    };
  };
}

/**
 * Standard log levels with numeric priorities
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

/**
 * Singleton logger class providing standardized logging functionality
 * with ELK Stack integration and security features
 */
export class Logger {
  private static instance: Logger;
  private logger: winston.Logger;
  private options: LoggerOptions;
  private correlationId: string = '';
  private readonly serviceName: string;

  private constructor(options: LoggerOptions) {
    this.options = options;
    this.serviceName = options.serviceName;
    this.initializeLogger();
  }

  /**
   * Get singleton logger instance
   */
  public static getInstance(options: LoggerOptions): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }

  /**
   * Initialize Winston logger with secure configuration
   */
  private initializeLogger(): void {
    const transports: winston.transport[] = [
      // Console transport for local development
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp(),
          winston.format.json()
        ),
        level: this.options.environment === 'production' ? 'info' : 'debug',
      }),

      // Rotating file transport for local persistence
      new DailyRotateFile({
        filename: 'logs/%DATE%-application.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '10m',
        maxFiles: '14d',
        format: winston.format.json(),
        zippedArchive: true,
      }),
    ];

    // Add Elasticsearch transport in production
    if (this.options.environment === 'production' && this.options.elasticsearchConfig) {
      transports.push(
        new ElasticsearchTransport({
          level: 'info',
          clientOpts: {
            ...this.options.elasticsearchConfig,
            buffer: {
              size: 1000,
              flushInterval: 5000,
            },
          },
          indexPrefix: `gameday-logs-${this.options.environment}`,
        })
      );
    }

    // Initialize Winston logger with secure defaults
    this.logger = winston.createLogger({
      levels: LOG_LEVELS,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        this.sanitizeLogFormat()
      ),
      defaultMeta: {
        service: this.serviceName,
        environment: this.options.environment,
      },
      transports,
      exitOnError: false,
    });
  }

  /**
   * Custom format to sanitize sensitive data
   */
  private sanitizeLogFormat(): winston.Logform.Format {
    return winston.format((info) => {
      // Remove sensitive data patterns
      const sanitized = { ...info };
      this.sanitizeSensitiveData(sanitized);
      return sanitized;
    })();
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeSensitiveData(obj: any): void {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization'];
    Object.keys(obj).forEach(key => {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.sanitizeSensitiveData(obj[key]);
      }
    });
  }

  /**
   * Set correlation ID for request tracking
   */
  public setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /**
   * Log info level message
   */
  public info(message: string, meta: object = {}): void {
    this.logger.info(message, {
      correlationId: this.correlationId,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log error level message with enhanced error details
   */
  public error(message: string, error?: Error, meta: object = {}): void {
    const errorMeta = {
      correlationId: this.correlationId,
      errorCode: error?.name || ErrorCode.INTERNAL_SERVER_ERROR,
      stack: error?.stack,
      ...meta,
      timestamp: new Date().toISOString(),
    };

    this.logger.error(message, errorMeta);
  }

  /**
   * Log warning level message
   */
  public warn(message: string, meta: object = {}): void {
    this.logger.warn(message, {
      correlationId: this.correlationId,
      ...meta,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log debug level message when debug mode is enabled
   */
  public debug(message: string, meta: object = {}): void {
    if (this.options.environment !== 'production') {
      this.logger.debug(message, {
        correlationId: this.correlationId,
        ...meta,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Export singleton instance
export default Logger;