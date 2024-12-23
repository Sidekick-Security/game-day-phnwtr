/**
 * Authentication Reducer Tests
 * Comprehensive test suite for authentication state management with enhanced security features
 * @version 1.0.0
 */

import { describe, it, expect } from '@jest/globals'; // ^29.0.0
import { authReducer } from '../../src/store/reducers/auth.reducer';
import { AuthActionTypes } from '../../src/store/actions/auth.actions';
import { AuthState } from '../../src/types/auth.types';

describe('authReducer', () => {
  // Mock initial test data
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'EXERCISE_ADMIN',
    organizationId: 'test-org',
    mfaEnabled: true,
    lastLogin: new Date().toISOString(),
  };

  const mockToken = 'mock.jwt.token';

  const mockSecurityContext = {
    failedAttempts: 0,
    lastFailedAttempt: null,
    securityViolations: [],
    rateLimit: {
      attempts: 0,
      resetTime: null,
    }
  };

  const mockSessionContext = {
    lastActivity: new Date().toISOString(),
    deviceFingerprint: 'mock-device-id',
    ipAddress: '127.0.0.1',
    sessionTimeout: 3600,
  };

  // Test initial state
  it('should handle initial state with security context', () => {
    const initialState = authReducer(undefined, { type: '@@INIT' });
    
    expect(initialState).toEqual({
      isAuthenticated: false,
      token: null,
      user: null,
      error: null,
      mfaRequired: false,
      sessionContext: {
        lastActivity: null,
        deviceFingerprint: null,
        ipAddress: null,
        sessionTimeout: 3600,
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
    });
  });

  // Test login request
  it('should handle LOGIN_REQUEST with security metadata', () => {
    const initialState = authReducer(undefined, { type: '@@INIT' });
    const action = {
      type: AuthActionTypes.LOGIN_REQUEST,
      payload: {
        email: mockUser.email,
        deviceFingerprint: 'mock-device-id',
      }
    };

    const state = authReducer(initialState, action);
    
    expect(state.error).toBeNull();
    expect(state.sessionContext.deviceFingerprint).toBe('mock-device-id');
    expect(state.sessionContext.lastActivity).toBeTruthy();
  });

  // Test successful login
  it('should handle LOGIN_SUCCESS with comprehensive state update', () => {
    const initialState = authReducer(undefined, { type: '@@INIT' });
    const action = {
      type: AuthActionTypes.LOGIN_SUCCESS,
      payload: {
        token: mockToken,
        user: mockUser,
        sessionContext: mockSessionContext,
      }
    };

    const state = authReducer(initialState, action);
    
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe(mockToken);
    expect(state.user).toEqual(mockUser);
    expect(state.error).toBeNull();
    expect(state.securityContext.failedAttempts).toBe(0);
    expect(state.sessionContext.lastActivity).toBeTruthy();
  });

  // Test login failure with security tracking
  it('should handle LOGIN_FAILURE with security violation tracking', () => {
    const initialState = authReducer(undefined, { type: '@@INIT' });
    const action = {
      type: AuthActionTypes.LOGIN_FAILURE,
      payload: {
        error: 'Invalid credentials'
      }
    };

    const state = authReducer(initialState, action);
    
    expect(state.error).toBe('Invalid credentials');
    expect(state.securityContext.failedAttempts).toBe(1);
    expect(state.securityContext.lastFailedAttempt).toBeTruthy();
  });

  // Test excessive login failures
  it('should track security violations for excessive login failures', () => {
    let state = authReducer(undefined, { type: '@@INIT' });
    const failureAction = {
      type: AuthActionTypes.LOGIN_FAILURE,
      payload: {
        error: 'Invalid credentials'
      }
    };

    // Simulate 3 failed attempts
    for (let i = 0; i < 3; i++) {
      state = authReducer(state, failureAction);
    }
    
    expect(state.securityContext.failedAttempts).toBe(3);
    expect(state.securityContext.securityViolations.length).toBe(1);
    expect(state.securityContext.securityViolations[0].type).toBe('excessive_login_failures');
  });

  // Test MFA requirement
  it('should handle MFA_REQUIRED state', () => {
    const initialState = authReducer(undefined, { type: '@@INIT' });
    const action = {
      type: AuthActionTypes.MFA_REQUIRED
    };

    const state = authReducer(initialState, action);
    
    expect(state.mfaRequired).toBe(true);
    expect(state.sessionContext.lastActivity).toBeTruthy();
  });

  // Test MFA validation
  it('should handle MFA_VALIDATED with session update', () => {
    const initialState = {
      ...authReducer(undefined, { type: '@@INIT' }),
      mfaRequired: true
    };
    
    const action = {
      type: AuthActionTypes.MFA_VALIDATED
    };

    const state = authReducer(initialState, action);
    
    expect(state.mfaRequired).toBe(false);
    expect(state.isAuthenticated).toBe(true);
    expect(state.sessionContext.lastActivity).toBeTruthy();
  });

  // Test session timeout
  it('should handle SESSION_TIMEOUT with security cleanup', () => {
    const authenticatedState: AuthState = {
      isAuthenticated: true,
      token: mockToken,
      user: mockUser,
      error: null,
      mfaRequired: false,
      sessionContext: mockSessionContext,
      securityContext: mockSecurityContext
    };

    const action = {
      type: AuthActionTypes.SESSION_TIMEOUT
    };

    const state = authReducer(authenticatedState, action);
    
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.sessionContext.lastActivity).toBeNull();
    expect(state.securityContext.securityViolations.length).toBe(1);
    expect(state.securityContext.securityViolations[0].type).toBe('session_timeout');
  });

  // Test token refresh
  it('should handle REFRESH_TOKEN with session update', () => {
    const initialState = {
      ...authReducer(undefined, { type: '@@INIT' }),
      token: mockToken
    };

    const newToken = 'new.jwt.token';
    const action = {
      type: AuthActionTypes.REFRESH_TOKEN,
      payload: {
        token: newToken
      }
    };

    const state = authReducer(initialState, action);
    
    expect(state.token).toBe(newToken);
    expect(state.sessionContext.lastActivity).toBeTruthy();
  });

  // Test security violation handling
  it('should handle SECURITY_VIOLATION with appropriate response', () => {
    const authenticatedState: AuthState = {
      isAuthenticated: true,
      token: mockToken,
      user: mockUser,
      error: null,
      mfaRequired: false,
      sessionContext: mockSessionContext,
      securityContext: mockSecurityContext
    };

    const action = {
      type: AuthActionTypes.SECURITY_VIOLATION,
      payload: {
        type: 'suspicious_activity',
        details: {
          reason: 'Multiple failed attempts from unknown device'
        }
      }
    };

    const state = authReducer(authenticatedState, action);
    
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.securityContext.securityViolations.length).toBe(1);
    expect(state.securityContext.securityViolations[0].type).toBe('suspicious_activity');
  });

  // Test logout with security context preservation
  it('should handle LOGOUT with security context preservation', () => {
    const authenticatedState: AuthState = {
      isAuthenticated: true,
      token: mockToken,
      user: mockUser,
      error: null,
      mfaRequired: false,
      sessionContext: mockSessionContext,
      securityContext: {
        ...mockSecurityContext,
        failedAttempts: 2,
        securityViolations: [{
          type: 'suspicious_activity',
          timestamp: new Date().toISOString()
        }]
      }
    };

    const action = {
      type: AuthActionTypes.LOGOUT
    };

    const state = authReducer(authenticatedState, action);
    
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.securityContext.failedAttempts).toBe(2);
    expect(state.securityContext.securityViolations.length).toBe(1);
  });
});