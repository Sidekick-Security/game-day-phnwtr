/**
 * Configuration interfaces for GameDay Platform backend microservices
 * Provides type-safe configuration management with enhanced security and monitoring capabilities
 * @version 1.0.0
 * @package @gameday/shared
 */

import { Environment } from '../types/config.types';

/**
 * Enhanced service-level configuration interface
 * Defines core service settings with health check and CORS support
 */
export interface IServiceConfig {
  /** Service name identifier */
  name: string;
  /** Deployment environment */
  env: Environment;
  /** Service port number */
  port: number;
  /** API version string */
  version: string;
  /** Health check endpoint path */
  healthCheckPath: string;
  /** Allowed CORS origins */
  corsOrigins: string[];
  /** Enable metrics collection flag */
  enableMetrics: boolean;
  /** Custom HTTP headers */
  headers: Record<string, string>;
}

/**
 * Extended MongoDB database configuration interface
 * Defines connection parameters with enhanced security and replication options
 */
export interface IDatabaseConfig {
  /** Database host address */
  host: string;
  /** Database port number */
  port: number;
  /** Database name */
  name: string;
  /** Database username */
  username: string;
  /** Database password */
  password: string;
  /** MongoDB replica set name */
  replicaSet: string;
  /** Authentication source database */
  authSource: string;
  /** SSL connection flag */
  ssl: boolean;
  /** Retry writes flag */
  retryWrites: boolean;
  /** Connection pool size */
  poolSize: number;
  /** Additional MongoDB connection options */
  options: Record<string, any>;
}

/**
 * Enhanced Redis configuration interface
 * Defines Redis settings with clustering and sentinel support
 */
export interface IRedisConfig {
  /** Redis host address */
  host: string;
  /** Redis port number */
  port: number;
  /** Redis password */
  password: string;
  /** Cache TTL in seconds */
  ttl: number;
  /** Redis cluster mode flag */
  cluster: boolean;
  /** Redis sentinel configuration */
  sentinels: Array<{ host: string; port: number }>;
  /** Maximum connection retry attempts */
  maxRetries: number;
  /** Connection timeout in milliseconds */
  connectTimeout: number;
}

/**
 * Comprehensive authentication configuration interface
 * Defines advanced security settings including SSO, MFA, and rate limiting
 */
export interface IAuthConfig {
  /** JWT signing secret */
  jwtSecret: string;
  /** JWT token expiry duration */
  jwtExpiry: string;
  /** Refresh token expiry duration */
  refreshTokenExpiry: string;
  /** SSO enablement flag */
  ssoEnabled: boolean;
  /** SSO provider identifier */
  ssoProvider: string;
  /** SSO provider-specific configuration */
  ssoConfig: Record<string, any>;
  /** MFA enablement flag */
  mfaEnabled: boolean;
  /** MFA type (e.g., 'totp', 'sms') */
  mfaType: string;
  /** MFA issuer name for TOTP */
  mfaIssuer: string;
  /** Rate limiting configuration */
  rateLimiting: {
    /** Enable rate limiting flag */
    enabled: boolean;
    /** Time window in milliseconds */
    windowMs: number;
  };
}

/**
 * Extended logging configuration interface
 * Defines comprehensive logging settings with rotation and compression
 */
export interface ILoggerConfig {
  /** Log level (e.g., 'debug', 'info', 'error') */
  level: string;
  /** Log format (e.g., 'json', 'simple') */
  format: string;
  /** Log file name pattern */
  filename: string;
  /** Error log file path */
  errorLogPath: string;
  /** Maximum log file size in bytes */
  maxSize: number;
  /** Maximum number of log files to keep */
  maxFiles: number;
  /** Log compression flag */
  compress: boolean;
  /** Log file date pattern */
  datePattern: string;
  /** Enable console logging flag */
  enableConsole: boolean;
}

/**
 * Root configuration interface
 * Combines all configuration sections into a single type-safe interface
 */
export interface IConfig {
  /** Service configuration */
  service: IServiceConfig;
  /** Database configuration */
  database: IDatabaseConfig;
  /** Redis configuration */
  redis: IRedisConfig;
  /** Authentication configuration */
  auth: IAuthConfig;
  /** Logger configuration */
  logger: ILoggerConfig;
}