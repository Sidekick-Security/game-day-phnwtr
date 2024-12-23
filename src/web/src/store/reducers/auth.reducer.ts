/**
 * Authentication Reducer for GameDay Platform
 * Implements comprehensive state management for authentication with enhanced security features
 * including SSO, MFA, session monitoring, and security violation tracking.
 * @version 1.0.0
 */

import { createReducer, PayloadAction } from '@reduxjs/toolkit'; // ^2.0.0
import { AuthState } from '../../types/auth.types';
import { AuthActionTypes } from '../actions/auth.actions';

/**
 * Initial authentication state with comprehensive security context
 */
const initialState: AuthState = {
  isAuthenticated: false,
  token: null,
  user: null,
  error: null,
  mfaRequired: false,
  sessionContext: {
    lastActivity: null,
    deviceFingerprint: null,
    ipAddress: null,
    sessionTimeout: 3600, // 1 hour default timeout
  },
  securityContext: {
    failedAttempts: 0,
    lastFailedAttempt: null,
    securityViolations: [],
    rateLimit: {
      attempts: 0,
      resetTime: null,
    }
  }
};

/**
 * Enhanced authentication reducer with comprehensive security features
 */
export const authReducer = createReducer(initialState, (builder) => {
  builder
    // Handle login request with security context updates
    .addCase(AuthActionTypes.LOGIN_REQUEST, (state) => {
      state.error = null;
      state.sessionContext.lastActivity = new Date().toISOString();
      state.sessionContext.deviceFingerprint = window.navigator.userAgent;
    })

    // Handle successful login with comprehensive state update
    .addCase(AuthActionTypes.LOGIN_SUCCESS, (state, action: PayloadAction<AuthState>) => {
      state.isAuthenticated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.error = null;
      state.securityContext.failedAttempts = 0;
      state.securityContext.lastFailedAttempt = null;
      state.sessionContext = {
        ...state.sessionContext,
        lastActivity: new Date().toISOString(),
        sessionTimeout: action.payload.sessionContext?.sessionTimeout || state.sessionContext.sessionTimeout
      };
    })

    // Handle login failure with security violation tracking
    .addCase(AuthActionTypes.LOGIN_FAILURE, (state, action: PayloadAction<{ error: string }>) => {
      state.error = action.payload.error;
      state.securityContext.failedAttempts += 1;
      state.securityContext.lastFailedAttempt = new Date().toISOString();
      
      // Track security violations for potential lockout
      if (state.securityContext.failedAttempts >= 3) {
        state.securityContext.securityViolations.push({
          type: 'excessive_login_failures',
          timestamp: new Date().toISOString(),
          details: { attempts: state.securityContext.failedAttempts }
        });
      }
    })

    // Handle MFA requirement
    .addCase(AuthActionTypes.MFA_REQUIRED, (state) => {
      state.mfaRequired = true;
      state.sessionContext.lastActivity = new Date().toISOString();
    })

    // Handle successful MFA validation
    .addCase(AuthActionTypes.MFA_VALIDATED, (state) => {
      state.mfaRequired = false;
      state.isAuthenticated = true;
      state.sessionContext.lastActivity = new Date().toISOString();
    })

    // Handle session timeout
    .addCase(AuthActionTypes.SESSION_TIMEOUT, (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.sessionContext.lastActivity = null;
      state.securityContext.securityViolations.push({
        type: 'session_timeout',
        timestamp: new Date().toISOString()
      });
    })

    // Handle token refresh
    .addCase(AuthActionTypes.REFRESH_TOKEN, (state, action: PayloadAction<{ token: string }>) => {
      state.token = action.payload.token;
      state.sessionContext.lastActivity = new Date().toISOString();
    })

    // Handle security violations
    .addCase(AuthActionTypes.SECURITY_VIOLATION, (state, action: PayloadAction<{ 
      type: string, 
      details?: any 
    }>) => {
      state.securityContext.securityViolations.push({
        type: action.payload.type,
        timestamp: new Date().toISOString(),
        details: action.payload.details
      });

      // Implement automatic security responses based on violation type
      if (action.payload.type === 'suspicious_activity') {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      }
    })

    // Handle logout with comprehensive cleanup
    .addCase(AuthActionTypes.LOGOUT, (state) => {
      return {
        ...initialState,
        securityContext: {
          ...initialState.securityContext,
          failedAttempts: state.securityContext.failedAttempts,
          securityViolations: state.securityContext.securityViolations
        }
      };
    });
});

export default authReducer;