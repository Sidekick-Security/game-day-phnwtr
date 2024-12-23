/**
 * @fileoverview Authentication and Authorization Interface Definitions
 * @version 1.0.0
 * 
 * Defines comprehensive TypeScript interfaces for authentication and authorization
 * in the GameDay Platform. Implements secure authentication flows, role-based access
 * control, and comprehensive security controls.
 */

import { AuthProvider, UserRole } from '../types/auth.types';
import { IUser } from '../interfaces/user.interface';

/**
 * Authentication request payload interface with enhanced security metadata
 * @interface IAuthRequest
 */
export interface IAuthRequest {
  /** User email for authentication */
  email: string;

  /** User password (only used for non-SSO flows) */
  password?: string;

  /** Authentication provider type */
  provider: AuthProvider;

  /** Multi-factor authentication token when required */
  mfaToken?: string;

  /** Unique device identifier for device tracking */
  deviceId: string;

  /** Additional client metadata for security analysis */
  clientMetadata: Record<string, unknown>;
}

/**
 * Authentication response interface containing tokens and session data
 * @interface IAuthResponse
 */
export interface IAuthResponse {
  /** JWT access token for API authorization */
  accessToken: string;

  /** Refresh token for token rotation */
  refreshToken: string;

  /** Authenticated user information */
  user: IUser;

  /** Token expiration time in seconds */
  expiresIn: number;

  /** Token type (usually 'Bearer') */
  tokenType: string;

  /** Unique session identifier for tracking */
  sessionId: string;
}

/**
 * Authentication context interface providing auth state and methods
 * @interface IAuthContext
 */
export interface IAuthContext {
  /** Current authentication state */
  isAuthenticated: boolean;

  /** Currently authenticated user or null */
  user: IUser | null;

  /**
   * Authenticate user with provided credentials
   * @param request Authentication request payload
   * @returns Promise resolving to authentication response
   */
  login: (request: IAuthRequest) => Promise<IAuthResponse>;

  /**
   * Terminate current user session
   * @returns Promise resolving when logout is complete
   */
  logout: () => Promise<void>;

  /**
   * Refresh authentication tokens
   * @returns Promise resolving to new authentication response
   */
  refreshToken: () => Promise<IAuthResponse>;

  /**
   * Validate current session status
   * @returns Promise resolving to session validity
   */
  validateSession: () => Promise<boolean>;

  /**
   * Check if current user has required permission
   * @param permission Permission requirements to check
   * @returns Promise resolving to permission status
   */
  checkPermission: (permission: IAuthPermission) => Promise<boolean>;
}

/**
 * Permission interface for role-based and attribute-based access control
 * @interface IAuthPermission
 */
export interface IAuthPermission {
  /** Required user role */
  role: UserRole;

  /** Resource being accessed */
  resource: string;

  /** Action being performed */
  action: string;

  /** Additional conditions for permission evaluation */
  conditions?: Record<string, any>;

  /** Required OAuth scopes */
  scope?: string[];

  /** Additional attributes for fine-grained control */
  attributes?: Record<string, unknown>;
}