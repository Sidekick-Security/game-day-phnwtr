/**
 * Enhanced Authentication Hook for GameDay Platform
 * Provides comprehensive authentication state management and security features
 * including SSO, MFA, session management, and role-based access control.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react'; // ^18.2.0
import { AuthService, IAuthContext } from '../services/auth.service';
import { IUser } from '../interfaces/user.interface';
import { AuthProvider, UserRole } from '../types/auth.types';
import { IAuthPermission } from '../interfaces/auth.interface';

// Constants for token and session management
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_REFRESH_ATTEMPTS = 3;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const PERMISSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initialize auth service instance
const authService = new AuthService();

/**
 * Enhanced authentication hook providing comprehensive auth functionality
 * @returns {IAuthContext} Authentication context with enhanced security features
 */
export const useAuth = (): IAuthContext => {
  // Core authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<IUser | null>(null);
  const [mfaRequired, setMfaRequired] = useState<boolean>(false);
  const [permissionCache, setPermissionCache] = useState<Map<string, boolean>>(new Map());

  // Session management
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  /**
   * Initialize authentication state and session monitoring
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const isValid = await authService.validateSession();
        if (isValid) {
          const currentUser = await authService.getCurrentUser();
          setIsAuthenticated(true);
          setUser(currentUser);
          startSessionMonitoring();
          startTokenRefresh();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        handleLogout();
      }
    };

    initializeAuth();

    // Cleanup on unmount
    return () => {
      stopSessionMonitoring();
      stopTokenRefresh();
    };
  }, []);

  /**
   * Enhanced login handler with MFA support and device fingerprinting
   */
  const login = useCallback(async (email: string, password: string, provider: AuthProvider = AuthProvider.JWT) => {
    try {
      const deviceFingerprint = await authService.getDeviceFingerprint();
      const response = await authService.login({
        email,
        password,
        provider,
        deviceId: deviceFingerprint,
        clientMetadata: {
          userAgent: navigator.userAgent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
        }
      });

      if (response.mfaRequired) {
        setMfaRequired(true);
        return { mfaRequired: true, challengeId: response.challengeId };
      }

      setAuthState(response);
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  /**
   * MFA validation handler
   */
  const validateMFA = useCallback(async (mfaToken: string, challengeId: string) => {
    try {
      const response = await authService.validateMFA(mfaToken, challengeId);
      setAuthState(response);
      setMfaRequired(false);
      return response;
    } catch (error) {
      console.error('MFA validation error:', error);
      throw error;
    }
  }, []);

  /**
   * Secure logout handler with token invalidation
   */
  const handleLogout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthState();
    }
  }, []);

  /**
   * Token refresh handler with exponential backoff
   */
  const refreshToken = useCallback(async (attempt: number = 0) => {
    try {
      const response = await authService.refreshToken();
      setAuthState(response);
    } catch (error) {
      if (attempt < MAX_REFRESH_ATTEMPTS) {
        const backoffDelay = Math.pow(2, attempt) * 1000;
        setTimeout(() => refreshToken(attempt + 1), backoffDelay);
      } else {
        console.error('Token refresh failed:', error);
        handleLogout();
      }
    }
  }, []);

  /**
   * Permission checking with caching
   */
  const checkPermission = useCallback(async (permission: IAuthPermission): Promise<boolean> => {
    if (!user) return false;

    const cacheKey = `${permission.role}_${permission.resource}_${permission.action}`;
    const cachedResult = permissionCache.get(cacheKey);
    
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    const hasPermission = user.role === UserRole.SYSTEM_ADMIN || 
      (user.role === permission.role && (!permission.scope || 
        permission.scope.every(scope => user.teams.includes(scope))));

    setPermissionCache(new Map(permissionCache.set(cacheKey, hasPermission)));
    
    // Clear cache after duration
    setTimeout(() => {
      setPermissionCache(cache => {
        const newCache = new Map(cache);
        newCache.delete(cacheKey);
        return newCache;
      });
    }, PERMISSION_CACHE_DURATION);

    return hasPermission;
  }, [user, permissionCache]);

  /**
   * Session monitoring setup
   */
  const startSessionMonitoring = () => {
    stopSessionMonitoring();
    const timeout = setTimeout(handleLogout, SESSION_TIMEOUT);
    setSessionTimeout(timeout);

    // Reset timeout on user activity
    const resetTimeout = () => {
      stopSessionMonitoring();
      startSessionMonitoring();
    };

    window.addEventListener('mousemove', resetTimeout);
    window.addEventListener('keypress', resetTimeout);

    return () => {
      window.removeEventListener('mousemove', resetTimeout);
      window.removeEventListener('keypress', resetTimeout);
    };
  };

  /**
   * Token refresh setup
   */
  const startTokenRefresh = () => {
    stopTokenRefresh();
    const interval = setInterval(() => refreshToken(), TOKEN_REFRESH_INTERVAL);
    setRefreshInterval(interval);
  };

  // Helper functions
  const stopSessionMonitoring = () => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
    }
  };

  const stopTokenRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  };

  const setAuthState = (response: any) => {
    setIsAuthenticated(true);
    setUser(response.user);
    startSessionMonitoring();
    startTokenRefresh();
  };

  const clearAuthState = () => {
    setIsAuthenticated(false);
    setUser(null);
    setMfaRequired(false);
    stopSessionMonitoring();
    stopTokenRefresh();
    setPermissionCache(new Map());
  };

  return {
    isAuthenticated,
    user,
    login,
    logout: handleLogout,
    refreshToken,
    validateMFA,
    checkPermission,
  };
};

export default useAuth;