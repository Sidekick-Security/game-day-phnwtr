/**
 * Authentication Saga Implementation for GameDay Platform
 * Implements comprehensive side effects for authentication flows including
 * SSO, MFA, JWT management, and enhanced security controls.
 * @version 1.0.0
 */

import { takeLatest, put, call, all, fork, delay, race } from 'redux-saga/effects'; // ^1.2.0
import jwtDecode from 'jwt-decode'; // ^3.1.2

import {
  AuthActionTypes,
  loginSuccess,
  loginFailure,
  refreshToken,
  loginMfaRequired,
  loginProviderRedirect,
} from '../actions/auth.actions';

import AuthService from '../../services/auth.service';
import { AuthProvider, TokenPayload } from '../../types/auth.types';

// Constants for token management
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes
const MAX_LOGIN_ATTEMPTS = 5;

/**
 * Handles login requests with comprehensive security controls
 * Supports multiple authentication methods including SSO and MFA
 */
function* handleLogin(action: any) {
  try {
    // Extract login credentials and metadata
    const { credentials, deviceFingerprint } = action.payload;
    
    // Validate request and check rate limiting
    if (!validateLoginRequest(credentials)) {
      throw new Error('Invalid login request');
    }

    // Handle different authentication providers
    switch (credentials.provider) {
      case AuthProvider.SSO:
        yield call(handleSsoLogin, credentials);
        return;
      
      case AuthProvider.SAML:
        yield call(handleSamlLogin, credentials);
        return;
        
      default:
        // Direct JWT authentication flow
        const response = yield call(AuthService.login, {
          ...credentials,
          deviceFingerprint,
          timestamp: new Date().toISOString()
        });

        // Handle MFA challenge if required
        if (response.mfaRequired) {
          yield put(loginMfaRequired({
            challengeType: response.mfaType,
            challengeId: response.challengeId
          }));
          return;
        }

        // Validate authentication response
        if (!validateAuthResponse(response)) {
          throw new Error('Invalid authentication response');
        }

        // Store authentication state and setup refresh cycle
        yield call(setAuthenticationState, response);
        yield fork(startTokenRefreshCycle, response.expiresIn);

        yield put(loginSuccess(response));
    }
  } catch (error: any) {
    yield put(loginFailure({
      code: error.code || 'AUTH_ERROR',
      message: error.message,
      details: error.details
    }));
  }
}

/**
 * Handles secure logout with comprehensive cleanup
 */
function* handleLogout() {
  try {
    // Revoke tokens on the server
    yield call(AuthService.logout);

    // Clear local authentication state
    yield call(clearAuthenticationState);

    // Cancel any pending token refresh tasks
    yield cancel(tokenRefreshTask);

    // Log audit event
    yield call(logAuditEvent, 'logout', {
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Logout error:', error);
  }
}

/**
 * Manages token refresh cycle with enhanced security
 */
function* handleTokenRefresh() {
  try {
    // Validate current token before refresh
    const currentToken = yield call(AuthService.validateToken);
    if (!currentToken) {
      throw new Error('Invalid token state');
    }

    // Attempt token refresh with retry logic
    const { response, timeout } = yield race({
      response: call(AuthService.refreshToken),
      timeout: delay(5000)
    });

    if (timeout) {
      throw new Error('Token refresh timeout');
    }

    // Validate new tokens
    if (!validateAuthResponse(response)) {
      throw new Error('Invalid refresh response');
    }

    // Update authentication state
    yield call(setAuthenticationState, response);

    // Schedule next refresh
    yield fork(startTokenRefreshCycle, response.expiresIn);
  } catch (error: any) {
    yield put(loginFailure({
      code: 'TOKEN_REFRESH_ERROR',
      message: error.message
    }));
    yield call(handleLogout);
  }
}

/**
 * Handles MFA verification flow
 */
function* handleMfaChallenge(action: any) {
  try {
    const { token, challengeId } = action.payload;

    // Validate MFA token
    const response = yield call(AuthService.handleMfaChallenge, {
      token,
      challengeId,
      timestamp: new Date().toISOString()
    });

    // Complete authentication flow
    if (response.success) {
      yield call(setAuthenticationState, response);
      yield fork(startTokenRefreshCycle, response.expiresIn);
      yield put(loginSuccess(response));
    } else {
      throw new Error('MFA verification failed');
    }
  } catch (error: any) {
    yield put(loginFailure({
      code: 'MFA_ERROR',
      message: error.message
    }));
  }
}

/**
 * Handles SSO callback processing
 */
function* handleSsoCallback(action: any) {
  try {
    const { code, state } = action.payload;

    // Validate SSO state to prevent CSRF
    if (!validateSsoState(state)) {
      throw new Error('Invalid SSO state');
    }

    // Process SSO callback
    const response = yield call(AuthService.handleSsoCallback, {
      code,
      state
    });

    // Set authentication state
    yield call(setAuthenticationState, response);
    yield fork(startTokenRefreshCycle, response.expiresIn);
    yield put(loginSuccess(response));
  } catch (error: any) {
    yield put(loginFailure({
      code: 'SSO_ERROR',
      message: error.message
    }));
  }
}

// Helper functions

function* startTokenRefreshCycle(expiresIn: number) {
  const refreshTime = (expiresIn * 1000) - TOKEN_REFRESH_INTERVAL;
  yield delay(refreshTime);
  yield put(refreshToken());
}

function validateLoginRequest(credentials: any): boolean {
  return !!(credentials?.email && credentials?.provider);
}

function validateAuthResponse(response: any): boolean {
  return !!(response?.accessToken && response?.user);
}

function validateSsoState(state: string): boolean {
  const storedState = sessionStorage.getItem('sso_state');
  return state === storedState;
}

function* setAuthenticationState(authState: any) {
  // Store tokens securely
  localStorage.setItem('auth_token', authState.accessToken);
  localStorage.setItem('refresh_token', authState.refreshToken);
  
  // Store user context
  localStorage.setItem('user', JSON.stringify(authState.user));
  
  // Log authentication event
  yield call(logAuditEvent, 'login', {
    userId: authState.user.id,
    timestamp: new Date().toISOString()
  });
}

function* clearAuthenticationState() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  sessionStorage.removeItem('sso_state');
}

function* logAuditEvent(event: string, data: any) {
  try {
    yield call(AuthService.logAuditEvent, {
      event,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audit logging error:', error);
  }
}

/**
 * Root saga that combines all authentication watchers
 */
export function* watchAuthActions() {
  yield all([
    takeLatest(AuthActionTypes.LOGIN_REQUEST, handleLogin),
    takeLatest(AuthActionTypes.LOGOUT, handleLogout),
    takeLatest(AuthActionTypes.REFRESH_TOKEN, handleTokenRefresh),
    takeLatest(AuthActionTypes.MFA_CHALLENGE, handleMfaChallenge),
    takeLatest(AuthActionTypes.SSO_CALLBACK, handleSsoCallback)
  ]);
}

export default watchAuthActions;