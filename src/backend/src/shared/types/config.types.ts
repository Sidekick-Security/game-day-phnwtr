/**
 * Core TypeScript type definitions for configuration settings used across all backend microservices
 * @version 1.0.0
 * @package @gameday/shared
 */

/**
 * Environment type enumeration for configuration
 * Represents the possible deployment environments for the application
 */
export enum Environment {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

/**
 * Service-level configuration type
 * Defines the core service configuration parameters used by all microservices
 */
export type ServiceConfig = {
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
};

/**
 * MongoDB database configuration type
 * Defines connection and authentication parameters for MongoDB instances
 */
export type DatabaseConfig = {
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
  /** Additional MongoDB connection options */
  options: Record<string, any>;
};

/**
 * Redis cache configuration type
 * Defines connection and cluster settings for Redis instances
 */
export type RedisConfig = {
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
  sentinels: Array<{
    host: string;
    port: number;
  }>;
};

/**
 * Authentication configuration type
 * Defines authentication and security settings including JWT, SSO, and MFA
 */
export type AuthConfig = {
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
    enabled: boolean;
    maxAttempts: number;
    windowMs: number;
  };
};

/**
 * Logging configuration type
 * Defines logging settings and rotation policies
 */
export type LoggerConfig = {
  /** Log level (e.g., 'debug', 'info', 'error') */
  level: string;
  /** Log format (e.g., 'json', 'simple') */
  format: string;
  /** Log file name pattern */
  filename: string;
  /** Maximum log file size in bytes */
  maxSize: number;
  /** Maximum number of log files to keep */
  maxFiles: number;
  /** Log compression flag */
  compress: boolean;
  /** Log file date pattern */
  datePattern: string;
  /** Error log file path */
  errorLogPath: string;
};