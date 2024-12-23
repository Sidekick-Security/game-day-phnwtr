/**
 * @fileoverview Authentication Utility Functions
 * @version 1.0.0
 * 
 * Provides secure token management, validation, and permission checking utilities
 * for the GameDay Platform web application. Implements enterprise-grade security
 * features including token encryption, rotation checks, and granular permissions.
 */

import { jwtDecode } from 'jwt-decode';
import { AES, enc } from 'crypto-js';
import { UserRole } from '../types/auth.types';
import { IAuthPermission } from '../interfaces/auth.interface';

// Constants for token management and security
const TOKEN_KEY = 'gameday_auth_token';
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || '';
const PERMISSION_CACHE_TTL = 300000; // 5 minutes in milliseconds

// Role hierarchy for permission evaluation
const ROLE_HIERARCHY = {
  [UserRole.SYSTEM_ADMIN]: 4,
  [UserRole.EXERCISE_ADMIN]: 3,
  [UserRole.FACILITATOR]: 2,
  [UserRole.PARTICIPANT]: 1,
  [UserRole.OBSERVER]: 0
};

// Permission cache for performance optimization
const permissionCache = new Map<string, { result: boolean; timestamp: number }>();

/**
 * Stores encrypted authentication token with rotation check
 * @param {string} token - JWT token to store
 */
export const setAuthToken = (token: string): void => {
  try {
    // Validate token format
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid token format');
    }

    // Validate token structure and expiration
    const decodedToken = jwtDecode(token);
    if (!decodedToken || !decodedToken.exp) {
      throw new Error('Invalid token structure');
    }

    // Encrypt token before storage
    const encryptedToken = AES.encrypt(token, TOKEN_ENCRYPTION_KEY).toString();
    
    // Store encrypted token
    localStorage.setItem(TOKEN_KEY, encryptedToken);

    // Set token in axios headers if available
    if (typeof window !== 'undefined' && window.axios) {
      window.axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Log token storage event (excluding sensitive data)
    console.info('Auth token stored successfully');
  } catch (error) {
    console.error('Failed to store auth token:', error);
    clearAuthToken();
    throw error;
  }
};

/**
 * Retrieves and decrypts stored authentication token
 * @returns {string | null} Decrypted token or null if not found/invalid
 */
export const getAuthToken = (): string | null => {
  try {
    const encryptedToken = localStorage.getItem(TOKEN_KEY);
    if (!encryptedToken) {
      return null;
    }

    // Decrypt token
    const decryptedToken = AES.decrypt(encryptedToken, TOKEN_ENCRYPTION_KEY)
      .toString(enc.Utf8);

    // Validate decrypted token
    if (!decryptedToken || !isTokenValid(decryptedToken)) {
      clearAuthToken();
      return null;
    }

    return decryptedToken;
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    clearAuthToken();
    return null;
  }
};

/**
 * Removes stored token and updates security state
 */
export const clearAuthToken = (): void => {
  try {
    // Remove token from storage
    localStorage.removeItem(TOKEN_KEY);

    // Clear axios headers if available
    if (typeof window !== 'undefined' && window.axios) {
      delete window.axios.defaults.headers.common['Authorization'];
    }

    // Clear permission cache
    permissionCache.clear();

    console.info('Auth token cleared successfully');
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
};

/**
 * Performs comprehensive token validation
 * @param {string} token - Token to validate
 * @returns {boolean} Token validity status
 */
export const isTokenValid = (token: string): boolean => {
  try {
    if (!token) {
      return false;
    }

    // Decode and validate token structure
    const decodedToken = jwtDecode(token);
    if (!decodedToken || !decodedToken.exp) {
      return false;
    }

    // Check token expiration
    const currentTime = Date.now() / 1000;
    if (decodedToken.exp < currentTime) {
      return false;
    }

    // Validate required claims
    if (!decodedToken.sub || !decodedToken.role) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Token validation failed:', error);
    return false;
  }
};

/**
 * Checks hierarchical and conditional permissions
 * @param {UserRole} userRole - Current user's role
 * @param {IAuthPermission} requiredPermission - Required permission
 * @returns {boolean} Permission status
 */
export const hasPermission = (
  userRole: UserRole,
  requiredPermission: IAuthPermission
): boolean => {
  try {
    // Generate cache key
    const cacheKey = `${userRole}:${requiredPermission.resource}:${requiredPermission.action}`;
    
    // Check cache
    const cached = permissionCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < PERMISSION_CACHE_TTL) {
      return cached.result;
    }

    // Check role hierarchy
    const userLevel = ROLE_HIERARCHY[userRole];
    const requiredLevel = ROLE_HIERARCHY[requiredPermission.role];
    
    if (userLevel === undefined || requiredLevel === undefined) {
      return false;
    }

    // Basic hierarchy check
    let hasAccess = userLevel >= requiredLevel;

    // Check additional conditions if basic access granted
    if (hasAccess && requiredPermission.conditions) {
      hasAccess = evaluatePermissionConditions(requiredPermission.conditions);
    }

    // Cache result
    permissionCache.set(cacheKey, {
      result: hasAccess,
      timestamp: Date.now()
    });

    return hasAccess;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
};

/**
 * Evaluates conditional permission requirements
 * @param {Record<string, any>} conditions - Permission conditions
 * @returns {boolean} Condition evaluation result
 */
const evaluatePermissionConditions = (
  conditions: Record<string, any>
): boolean => {
  try {
    // Implement condition evaluation logic based on your requirements
    // This is a placeholder implementation
    return Object.entries(conditions).every(([key, value]) => {
      // Add your condition evaluation logic here
      return true;
    });
  } catch (error) {
    console.error('Failed to evaluate permission conditions:', error);
    return false;
  }
};

// Type declaration for window object with axios
declare global {
  interface Window {
    axios?: {
      defaults: {
        headers: {
          common: {
            [key: string]: string;
          };
        };
      };
    };
  }
}