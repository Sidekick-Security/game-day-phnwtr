/**
 * @fileoverview Authentication and Authorization Types
 * @version 1.0.0
 * 
 * Defines core authentication and authorization types for the GameDay Platform.
 * Implements comprehensive type safety for auth providers, user roles, tokens,
 * and authentication state management.
 */

/**
 * Supported authentication providers and methods
 * @enum {string}
 */
export enum AuthProvider {
  SSO = 'sso',
  OAUTH = 'oauth',
  SAML = 'saml',
  JWT = 'jwt',
  MFA = 'mfa'
}

/**
 * User roles defining access control hierarchy
 * Roles are ordered from highest (SYSTEM_ADMIN) to lowest (OBSERVER) privileges
 * @enum {string}
 */
export enum UserRole {
  SYSTEM_ADMIN = 'system_admin',
  EXERCISE_ADMIN = 'exercise_admin',
  FACILITATOR = 'facilitator',
  PARTICIPANT = 'participant',
  OBSERVER = 'observer'
}

/**
 * Authentication token types for token management
 * @type {string}
 */
export type AuthTokenType = 'ACCESS' | 'REFRESH' | 'MFA';

/**
 * User profile interface for authenticated users
 * @interface
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: UserRole;
  lastLogin?: Date;
  mfaEnabled: boolean;
}

/**
 * Login credentials structure with comprehensive authentication options
 * @interface
 */
export interface LoginCredentials {
  email: string;
  password: string;
  provider: AuthProvider;
  mfaToken?: string;
  rememberMe: boolean;
}

/**
 * Comprehensive authentication state structure
 * Maintains current auth status, user details, and security features
 * @interface
 */
export interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: UserProfile | null;
  role: UserRole;
  permissions: string[];
  mfaRequired: boolean;
  lastActivity: Date;
}

/**
 * Authentication error structure with detailed error information
 * @interface
 */
export interface AuthError {
  code: string;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Permission levels for different user roles
 * Maps roles to their corresponding access rights
 * @type {Record}
 */
export type RolePermissions = Record<UserRole, string[]>;

/**
 * Default permission mappings for user roles
 * @const
 */
export const DEFAULT_ROLE_PERMISSIONS: RolePermissions = {
  [UserRole.SYSTEM_ADMIN]: ['*'], // Full access
  [UserRole.EXERCISE_ADMIN]: [
    'exercise.create',
    'exercise.edit',
    'exercise.delete',
    'exercise.view',
    'analytics.view',
    'users.manage'
  ],
  [UserRole.FACILITATOR]: [
    'exercise.view',
    'exercise.control',
    'exercise.report',
    'analytics.view'
  ],
  [UserRole.PARTICIPANT]: [
    'exercise.participate',
    'exercise.view.assigned'
  ],
  [UserRole.OBSERVER]: [
    'exercise.view.assigned'
  ]
};

/**
 * MFA configuration options
 * @interface
 */
export interface MFAConfig {
  enabled: boolean;
  type: 'totp' | 'sms' | 'email';
  verified: boolean;
  backupCodes?: string[];
}

/**
 * Session configuration options
 * @interface
 */
export interface SessionConfig {
  maxInactiveMinutes: number;
  requireMFA: boolean;
  persistentSession: boolean;
  singleSession: boolean;
}

/**
 * Authentication provider configuration
 * @interface
 */
export interface AuthProviderConfig {
  provider: AuthProvider;
  clientId: string;
  tenantId?: string;
  scope: string[];
  redirectUri: string;
  responseType: 'code' | 'token';
}

/**
 * Token payload structure
 * @interface
 */
export interface TokenPayload {
  sub: string;
  iat: number;
  exp: number;
  role: UserRole;
  permissions: string[];
  organizationId: string;
  sessionId: string;
}

/**
 * Type guard to check if a role has specific permissions
 * @param {UserRole} role - The role to check
 * @param {string} permission - The permission to verify
 * @returns {boolean} - Whether the role has the permission
 */
export const hasPermission = (role: UserRole, permission: string): boolean => {
  const permissions = DEFAULT_ROLE_PERMISSIONS[role];
  return permissions.includes('*') || permissions.includes(permission);
};