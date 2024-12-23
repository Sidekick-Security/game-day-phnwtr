/**
 * Authentication Actions for GameDay Platform
 * Implements comprehensive Redux actions for authentication state management
 * with enhanced security features including SSO, MFA, and session monitoring.
 * @version 1.0.0
 */

import { createAction } from '@reduxjs/toolkit';
import { AuthState, LoginCredentials } from '../../types/auth.types';
import AuthService from '../../services/auth.service';

/**
 * Authentication action type constants
 * Defines all possible authentication state transitions
 */
export enum AuthActionTypes {
  // Login flow actions
  LOGIN_REQUEST = 'auth/loginRequest',
  LOGIN_SUCCESS = 'auth/loginSuccess',
  LOGIN_FAILURE = 'auth/loginFailure',
  
  // MFA-related actions
  MFA_REQUIRED = 'auth/mfaRequired',
  MFA_VALIDATE = 'auth/mfaValidate',
  MFA_SUCCESS = 'auth/mfaSuccess',
  MFA_FAILURE = 'auth/mfaFailure',
  
  // Session management actions
  SESSION_VALIDATE = 'auth/sessionValidate',
  SESSION_REFRESH = 'auth/sessionRefresh',
  SESSION_EXPIRED = 'auth/sessionExpired',
  SESSION_TIMEOUT = 'auth/sessionTimeout',
  
  // Security-related actions
  TOKEN_REFRESH = 'auth/tokenRefresh',
  TOKEN_REFRESH_SUCCESS = 'auth/tokenRefreshSuccess',
  TOKEN_REFRESH_FAILURE = 'auth/tokenRefreshFailure',
  TOKEN_VALIDATION_FAILED = 'auth/tokenValidationFailed',
  
  // Rate limiting actions
  RATE_LIMIT_WARNING = 'auth/rateLimitWarning',
  RATE_LIMIT_EXCEEDED = 'auth/rateLimitExceeded',
  
  // General auth actions
  LOGOUT = 'auth/logout',
  CLEAR_AUTH_ERROR = 'auth/clearError'
}

// Action Creators

/**
 * Initiates login request with enhanced security metadata
 */
export const loginRequest = createAction(
  AuthActionTypes.LOGIN_REQUEST,
  (credentials: LoginCredentials) => ({
    payload: {
      ...credentials,
      deviceFingerprint: window.navigator.userAgent,
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Handles successful login with comprehensive auth state
 */
export const loginSuccess = createAction(
  AuthActionTypes.LOGIN_SUCCESS,
  (authState: AuthState) => ({
    payload: {
      ...authState,
      lastActivity: new Date().toISOString()
    }
  })
);

/**
 * Handles login failures with detailed error information
 */
export const loginFailure = createAction(
  AuthActionTypes.LOGIN_FAILURE,
  (error: { code: string; message: string; details?: any }) => ({
    payload: {
      error,
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Triggers MFA validation flow
 */
export const mfaRequired = createAction(
  AuthActionTypes.MFA_REQUIRED,
  (challengeType: 'totp' | 'sms' | 'email') => ({
    payload: {
      challengeType,
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Validates MFA token
 */
export const validateMfa = createAction(
  AuthActionTypes.MFA_VALIDATE,
  (token: string, challengeId: string) => ({
    payload: {
      token,
      challengeId,
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Initiates session validation
 */
export const validateSession = createAction(
  AuthActionTypes.SESSION_VALIDATE,
  () => ({
    payload: {
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Handles token refresh
 */
export const refreshToken = createAction(
  AuthActionTypes.TOKEN_REFRESH,
  () => ({
    payload: {
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Handles successful token refresh
 */
export const tokenRefreshSuccess = createAction(
  AuthActionTypes.TOKEN_REFRESH_SUCCESS,
  (token: string, expiresIn: number) => ({
    payload: {
      token,
      expiresIn,
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Handles session timeout
 */
export const sessionTimeout = createAction(
  AuthActionTypes.SESSION_TIMEOUT,
  () => ({
    payload: {
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Handles rate limit exceeded
 */
export const rateLimitExceeded = createAction(
  AuthActionTypes.RATE_LIMIT_EXCEEDED,
  (retryAfter: number) => ({
    payload: {
      retryAfter,
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Initiates user logout with cleanup
 */
export const logout = createAction(
  AuthActionTypes.LOGOUT,
  (reason?: string) => ({
    payload: {
      reason,
      timestamp: new Date().toISOString()
    }
  })
);

/**
 * Clears authentication errors
 */
export const clearAuthError = createAction(
  AuthActionTypes.CLEAR_AUTH_ERROR
);

// Export action creator type
export type AuthAction = ReturnType<
  | typeof loginRequest
  | typeof loginSuccess
  | typeof loginFailure
  | typeof mfaRequired
  | typeof validateMfa
  | typeof validateSession
  | typeof refreshToken
  | typeof tokenRefreshSuccess
  | typeof sessionTimeout
  | typeof rateLimitExceeded
  | typeof logout
  | typeof clearAuthError
>;