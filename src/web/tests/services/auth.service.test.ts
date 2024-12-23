/**
 * Authentication Service Test Suite
 * Comprehensive test coverage for authentication flows, token management,
 * security controls, and error handling.
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'; // ^29.0.0
import MockAdapter from 'axios-mock-adapter'; // ^1.21.0
import jwtDecode from 'jwt-decode'; // ^4.0.0

import { AuthService } from '../../src/services/auth.service';
import { AuthProvider } from '../../src/types/auth.types';
import { apiClient } from '../../src/utils/api.utils';
import { authConfig } from '../../src/config/auth.config';

// Mock implementations
jest.mock('jwt-decode');
const mockJwtDecode = jwtDecode as jest.MockedFunction<typeof jwtDecode>;
const mockApiClient = new MockAdapter(apiClient);

// Test data constants
const TEST_USER = {
  id: 'test-user-id',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'participant',
  organizationId: 'test-org'
};

const TEST_TOKENS = {
  accessToken: 'test-access-token',
  refreshToken: 'test-refresh-token',
  expiresIn: 3600
};

describe('AuthService', () => {
  let authService: AuthService;
  let mockLocalStorage: jest.SpyInstance;
  let mockSetTimeout: jest.SpyInstance;
  let mockClearTimeout: jest.SpyInstance;

  beforeEach(() => {
    // Initialize service and mocks
    authService = new AuthService();
    mockLocalStorage = jest.spyOn(window.localStorage, 'setItem');
    mockSetTimeout = jest.spyOn(global, 'setTimeout');
    mockClearTimeout = jest.spyOn(global, 'clearTimeout');
    
    // Reset all mocks
    mockApiClient.reset();
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockApiClient.reset();
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Authentication Methods', () => {
    it('should authenticate with valid credentials', async () => {
      const loginRequest = {
        email: TEST_USER.email,
        password: 'test-password',
        provider: AuthProvider.LOCAL
      };

      mockApiClient
        .onPost('/auth/login')
        .reply(200, { ...TEST_TOKENS, user: TEST_USER });

      const response = await authService.login(loginRequest);

      expect(response.accessToken).toBe(TEST_TOKENS.accessToken);
      expect(mockLocalStorage).toHaveBeenCalledWith('auth_token', TEST_TOKENS.accessToken);
      expect(mockSetTimeout).toHaveBeenCalled();
    });

    it('should handle SSO authentication flow', async () => {
      const ssoRequest = {
        email: TEST_USER.email,
        provider: AuthProvider.SSO,
        token: 'sso-token'
      };

      mockApiClient
        .onPost('/auth/login')
        .reply(200, { ...TEST_TOKENS, user: TEST_USER });

      const response = await authService.login(ssoRequest);

      expect(response.accessToken).toBe(TEST_TOKENS.accessToken);
      expect(response.user.email).toBe(TEST_USER.email);
    });

    it('should handle MFA setup and verification', async () => {
      const mfaRequest = {
        email: TEST_USER.email,
        password: 'test-password',
        provider: AuthProvider.LOCAL
      };

      mockApiClient
        .onPost('/auth/login')
        .reply(200, { 
          mfaRequired: true,
          challengeId: 'test-challenge'
        });

      const response = await authService.login(mfaRequest);

      expect(response.mfaRequired).toBe(true);
      expect(localStorage.getItem('mfa_challenge')).toBe('test-challenge');
    });
  });

  describe('Token Management', () => {
    it('should store tokens securely', async () => {
      const loginRequest = {
        email: TEST_USER.email,
        password: 'test-password',
        provider: AuthProvider.LOCAL
      };

      mockApiClient
        .onPost('/auth/login')
        .reply(200, { ...TEST_TOKENS, user: TEST_USER });

      await authService.login(loginRequest);

      expect(localStorage.getItem('auth_token')).toBe(TEST_TOKENS.accessToken);
      expect(localStorage.getItem('refresh_token')).toBe(TEST_TOKENS.refreshToken);
    });

    it('should refresh tokens before expiry', async () => {
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600
      };

      mockApiClient
        .onPost('/auth/refresh')
        .reply(200, newTokens);

      localStorage.setItem('refresh_token', TEST_TOKENS.refreshToken);

      const response = await authService.refreshToken();

      expect(response.accessToken).toBe(newTokens.accessToken);
      expect(mockSetTimeout).toHaveBeenCalled();
    });

    it('should validate token integrity', () => {
      const validToken = 'valid-token';
      mockJwtDecode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: authConfig.jwt.issuer,
        aud: authConfig.jwt.audience,
        deviceId: localStorage.getItem('device_id')
      });

      const isValid = authService.validateToken(validToken);

      expect(isValid).toBe(true);
      expect(mockJwtDecode).toHaveBeenCalledWith(validToken);
    });
  });

  describe('Security Controls', () => {
    it('should enforce rate limiting', async () => {
      const loginRequest = {
        email: TEST_USER.email,
        password: 'wrong-password',
        provider: AuthProvider.LOCAL
      };

      mockApiClient
        .onPost('/auth/login')
        .reply(401);

      // Attempt multiple logins
      for (let i = 0; i < authConfig.rateLimit.maxAttempts + 1; i++) {
        try {
          await authService.login(loginRequest);
        } catch (error) {
          // Expected errors
        }
      }

      // Next attempt should be rate limited
      await expect(authService.login(loginRequest))
        .rejects
        .toThrow('Too many login attempts');
    });

    it('should handle session timeouts', async () => {
      // Set expired last activity
      const expiredActivity = Date.now() - (authConfig.session.inactivityTimeout * 1000 + 1000);
      localStorage.setItem('last_activity', expiredActivity.toString());
      localStorage.setItem('auth_token', TEST_TOKENS.accessToken);

      const isValid = await authService.validateSession();

      expect(isValid).toBe(false);
      expect(localStorage.getItem('auth_token')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const loginRequest = {
        email: TEST_USER.email,
        password: 'test-password',
        provider: AuthProvider.LOCAL
      };

      mockApiClient
        .onPost('/auth/login')
        .networkError();

      await expect(authService.login(loginRequest))
        .rejects
        .toThrow();
    });

    it('should handle invalid credentials', async () => {
      const loginRequest = {
        email: TEST_USER.email,
        password: 'wrong-password',
        provider: AuthProvider.LOCAL
      };

      mockApiClient
        .onPost('/auth/login')
        .reply(401, { message: 'Invalid credentials' });

      await expect(authService.login(loginRequest))
        .rejects
        .toThrow('Invalid credentials');
    });

    it('should handle expired tokens', async () => {
      mockJwtDecode.mockReturnValue({
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired token
        iss: authConfig.jwt.issuer,
        aud: authConfig.jwt.audience
      });

      const isValid = authService.validateToken('expired-token');

      expect(isValid).toBe(false);
    });
  });

  describe('Logout Functionality', () => {
    it('should clear auth state on logout', async () => {
      // Setup initial auth state
      localStorage.setItem('auth_token', TEST_TOKENS.accessToken);
      localStorage.setItem('refresh_token', TEST_TOKENS.refreshToken);
      localStorage.setItem('last_activity', Date.now().toString());

      mockApiClient
        .onPost('/auth/logout')
        .reply(200);

      await authService.logout();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('last_activity')).toBeNull();
      expect(mockClearTimeout).toHaveBeenCalled();
    });
  });
});