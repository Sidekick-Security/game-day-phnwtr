/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables used in the GameDay Platform
 * @version 4.5.0
 */

/**
 * Extended ImportMetaEnv interface for GameDay Platform environment variables
 * Provides strongly-typed definitions for all configuration values
 */
interface ImportMetaEnv {
  /**
   * Application name for display and identification purposes
   * @example "GameDay Platform"
   */
  readonly VITE_APP_NAME: string;

  /**
   * Application version following semantic versioning
   * @example "1.0.0"
   */
  readonly VITE_APP_VERSION: string;

  /**
   * Base URL for API endpoints
   * @example "https://api.gameday.platform/v1"
   */
  readonly VITE_API_BASE_URL: string;

  /**
   * API request timeout in milliseconds
   * @example "30000"
   */
  readonly VITE_API_TIMEOUT: string;

  /**
   * Authentication provider identifier
   * @example "auth0"
   */
  readonly VITE_AUTH_PROVIDER: string;

  /**
   * Authentication domain for SSO integration
   * @example "gameday.auth0.com"
   */
  readonly VITE_AUTH_DOMAIN: string;

  /**
   * OAuth client identifier
   * @example "your-client-id"
   */
  readonly VITE_AUTH_CLIENT_ID: string;

  /**
   * OAuth audience identifier for API access
   * @example "https://api.gameday.platform"
   */
  readonly VITE_AUTH_AUDIENCE: string;

  /**
   * Default locale for internationalization
   * @example "en-US"
   */
  readonly VITE_DEFAULT_LOCALE: string;

  /**
   * Default timezone for date/time handling
   * @example "UTC"
   */
  readonly VITE_DEFAULT_TIMEZONE: string;

  /**
   * Flag to enable/disable Multi-Factor Authentication
   * @example "true"
   */
  readonly VITE_ENABLE_MFA: string;

  /**
   * Session timeout duration in seconds
   * @example "3600"
   */
  readonly VITE_SESSION_TIMEOUT: string;

  /**
   * WebSocket server URL for real-time communications
   * @example "wss://ws.gameday.platform"
   */
  readonly VITE_WEBSOCKET_URL: string;
}

/**
 * Extends the ImportMeta interface to include environment variables
 * This ensures type safety when accessing import.meta.env
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Ensures environment variables are read-only at runtime
 * Prevents accidental modification of configuration values
 */
declare module "*.env" {
  const env: ImportMetaEnv;
  export default env;
}