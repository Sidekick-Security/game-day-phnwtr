/**
 * Test Suite for useAuth Hook
 * Verifies authentication flows, security controls, token management,
 * and role-based access control functionality.
 * @version 1.0.0
 */

import { renderHook, act } from '@testing-library/react-hooks'; // ^8.0.1
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals'; // ^29.0.0
import type { MockedFunction } from 'jest-mock'; // ^29.0.0

import { useAuth } from '../../src/hooks/useAuth';
import { AuthService } from '../../src/services/auth.service';
import { AuthProvider, UserRole } from '../../src/types/auth.types';
import type { IAuthRequest, IAuthResponse } from '../../src/interfaces/auth.interface';
import type { IUser } from '../../src/interfaces/user.interface';

// Mock AuthService
jest.mock('../../src/services/auth.service');

// Test data setup
const mockUsers = {
  admin: {
    id: 'admin-1',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.SYSTEM_ADMIN,
    organizationId: 'org-1',
    teams: ['security-team'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    isActive: true
  } as IUser,
  participant: {
    id: 'user-1',
    email: 'user@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: UserRole.PARTICIPANT,
    organizationId: 'org-1',
    teams: ['exercise-team'],
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
    isActive: true
  } as IUser
};

const mockTokens = {
  accessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  refreshToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
  expiresIn: 3600
};

describe('useAuth Hook', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset localStorage
    localStorage.clear();
    
    // Setup AuthService mocks
    mockAuthService = {
      login: jest.fn(),
      logout: jest.fn(),
      refreshToken: jest.fn(),
      validateSession: jest.fn(),
      validateMFA: jest.fn(),
      getCurrentUser: jest.fn()
    } as unknown as jest.Mocked<AuthService>;

    // Reset timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Authentication Flows', () => {
    it('should handle standard login flow successfully', async () => {
      const loginResponse: IAuthResponse = {
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        user: mockUsers.participant,
        expiresIn: mockTokens.expiresIn,
        tokenType: 'Bearer',
        sessionId: 'session-1'
      };

      mockAuthService.login.mockResolvedValueOnce(loginResponse);
      
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('user@example.com', 'password', AuthProvider.JWT);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUsers.participant);
      expect(localStorage.getItem('auth_token')).toBe(mockTokens.accessToken);
    });

    it('should handle MFA authentication flow', async () => {
      const mfaResponse = {
        mfaRequired: true,
        challengeId: 'mfa-challenge-1'
      };

      const loginResponse: IAuthResponse = {
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        user: mockUsers.participant,
        expiresIn: mockTokens.expiresIn,
        tokenType: 'Bearer',
        sessionId: 'session-1'
      };

      mockAuthService.login.mockResolvedValueOnce(mfaResponse);
      mockAuthService.validateMFA.mockResolvedValueOnce(loginResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        const response = await result.current.login('user@example.com', 'password');
        expect(response.mfaRequired).toBe(true);
        await result.current.validateMFA('123456', response.challengeId);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUsers.participant);
    });

    it('should handle SSO authentication', async () => {
      const loginResponse: IAuthResponse = {
        accessToken: mockTokens.accessToken,
        refreshToken: mockTokens.refreshToken,
        user: mockUsers.participant,
        expiresIn: mockTokens.expiresIn,
        tokenType: 'Bearer',
        sessionId: 'session-1'
      };

      mockAuthService.login.mockResolvedValueOnce(loginResponse);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login('user@example.com', '', AuthProvider.SSO);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(mockAuthService.login).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: AuthProvider.SSO
        })
      );
    });
  });

  describe('Token Management', () => {
    it('should refresh token before expiration', async () => {
      const refreshResponse: IAuthResponse = {
        accessToken: 'new-token',
        refreshToken: 'new-refresh-token',
        user: mockUsers.participant,
        expiresIn: 3600,
        tokenType: 'Bearer',
        sessionId: 'session-1'
      };

      mockAuthService.refreshToken.mockResolvedValueOnce(refreshResponse);

      const { result } = renderHook(() => useAuth());

      // Simulate token refresh
      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockAuthService.refreshToken).toHaveBeenCalled();
      expect(localStorage.getItem('auth_token')).toBe('new-token');
    });

    it('should handle token refresh failure', async () => {
      mockAuthService.refreshToken.mockRejectedValueOnce(new Error('Refresh failed'));
      mockAuthService.logout.mockResolvedValueOnce();

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.refreshToken();
        } catch (error) {
          expect(error.message).toBe('Refresh failed');
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Session Management', () => {
    it('should validate session on initialization', async () => {
      mockAuthService.validateSession.mockResolvedValueOnce(true);
      mockAuthService.getCurrentUser.mockResolvedValueOnce(mockUsers.participant);

      const { result } = renderHook(() => useAuth());

      // Wait for initialization
      await act(async () => {
        await jest.runAllTimers();
      });

      expect(mockAuthService.validateSession).toHaveBeenCalled();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUsers.participant);
    });

    it('should handle session timeout', async () => {
      mockAuthService.validateSession.mockResolvedValueOnce(true);
      mockAuthService.getCurrentUser.mockResolvedValueOnce(mockUsers.participant);

      const { result } = renderHook(() => useAuth());

      // Simulate session timeout
      await act(async () => {
        await jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });

  describe('Permission Management', () => {
    it('should validate admin permissions correctly', async () => {
      mockAuthService.validateSession.mockResolvedValueOnce(true);
      mockAuthService.getCurrentUser.mockResolvedValueOnce(mockUsers.admin);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await jest.runAllTimers();
      });

      const hasPermission = await result.current.checkPermission({
        role: UserRole.SYSTEM_ADMIN,
        resource: 'exercise',
        action: 'create'
      });

      expect(hasPermission).toBe(true);
    });

    it('should validate participant permissions correctly', async () => {
      mockAuthService.validateSession.mockResolvedValueOnce(true);
      mockAuthService.getCurrentUser.mockResolvedValueOnce(mockUsers.participant);

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await jest.runAllTimers();
      });

      const hasPermission = await result.current.checkPermission({
        role: UserRole.PARTICIPANT,
        resource: 'exercise',
        action: 'view',
        scope: ['exercise-team']
      });

      expect(hasPermission).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle login failures gracefully', async () => {
      mockAuthService.login.mockRejectedValueOnce(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login('user@example.com', 'wrong-password');
        } catch (error) {
          expect(error.message).toBe('Invalid credentials');
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('should handle network errors during authentication', async () => {
      mockAuthService.login.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        try {
          await result.current.login('user@example.com', 'password');
        } catch (error) {
          expect(error.message).toBe('Network error');
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });
});