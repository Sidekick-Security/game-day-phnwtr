/**
 * @fileoverview Authentication Configuration
 * @version 1.0.0
 * 
 * Defines comprehensive authentication configuration for the GameDay Platform
 * including SSO, MFA, token management, and security controls.
 */

import { config } from 'dotenv';
import { AuthProvider } from '../types/auth.types';
import { IAuthContext } from '../interfaces/auth.interface';

// Load environment variables
config();

/**
 * JWT token configuration with enhanced security parameters
 * @interface JWTConfig
 */
interface JWTConfig {
  algorithm: 'RS256';
  accessTokenExpiry: number;
  refreshTokenExpiry: number;
  issuer: string;
  audience: string;
  rotationPolicy: {
    enabled: boolean;
    maxAge: number;
  };
}

/**
 * Multi-factor authentication configuration
 * @interface MFAConfig
 */
interface MFAConfig {
  enabled: boolean;
  methods: ('totp' | 'sms' | 'email')[];
  tokenExpiry: number;
  maxAttempts: number;
  backupCodesCount: number;
}

/**
 * Session management configuration
 * @interface SessionConfig
 */
interface SessionConfig {
  inactivityTimeout: number;
  maxConcurrentSessions: number;
  persistentSession: boolean;
  cookieSettings: {
    secure: boolean;
    sameSite: 'strict';
    httpOnly: boolean;
    maxAge: number;
  };
}

/**
 * Rate limiting configuration for security
 * @interface RateLimitConfig
 */
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutDuration: number;
}

/**
 * Comprehensive authentication configuration
 */
export const authConfig = {
  // Authentication providers configuration
  providers: {
    [AuthProvider.SSO]: {
      enabled: true,
      clientId: process.env.SSO_CLIENT_ID,
      tenantId: process.env.SSO_TENANT_ID,
      authority: process.env.SSO_AUTHORITY,
      redirectUri: `${process.env.APP_URL}/auth/callback`,
      postLogoutRedirectUri: `${process.env.APP_URL}/login`,
      scopes: ['openid', 'profile', 'email', 'offline_access'],
      responseType: 'code',
    },
    [AuthProvider.SAML]: {
      enabled: true,
      entryPoint: process.env.SAML_ENTRY_POINT,
      issuer: process.env.SAML_ISSUER,
      cert: process.env.SAML_CERT,
      signatureAlgorithm: 'sha256',
      validateInResponseTo: true,
      wantAssertionsSigned: true,
    },
    [AuthProvider.OAUTH]: {
      enabled: true,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      authorizationUrl: process.env.OAUTH_AUTH_URL,
      tokenUrl: process.env.OAUTH_TOKEN_URL,
      scopes: ['read', 'write'],
      responseType: 'code',
    }
  },

  // JWT configuration with enhanced security
  jwt: {
    algorithm: 'RS256',
    accessTokenExpiry: 3600, // 1 hour
    refreshTokenExpiry: 86400, // 24 hours
    issuer: process.env.JWT_ISSUER || 'gameday-platform',
    audience: process.env.JWT_AUDIENCE || 'gameday-api',
    rotationPolicy: {
      enabled: true,
      maxAge: 7200, // 2 hours
    }
  } as JWTConfig,

  // Multi-factor authentication settings
  mfa: {
    enabled: true,
    methods: ['totp', 'sms', 'email'],
    tokenExpiry: 300, // 5 minutes
    maxAttempts: 3,
    backupCodesCount: 10,
  } as MFAConfig,

  // Session management configuration
  session: {
    inactivityTimeout: 1800, // 30 minutes
    maxConcurrentSessions: 1,
    persistentSession: false,
    cookieSettings: {
      secure: true,
      sameSite: 'strict',
      httpOnly: true,
      maxAge: 86400000, // 24 hours
    }
  } as SessionConfig,

  // Rate limiting for security
  rateLimit: {
    maxAttempts: 5,
    windowMs: 900000, // 15 minutes
    lockoutDuration: 900, // 15 minutes
  } as RateLimitConfig,

  // Security headers configuration
  securityHeaders: {
    contentSecurityPolicy: {
      enabled: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", process.env.API_URL],
      }
    },
    strictTransportSecurity: {
      enabled: true,
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    }
  },

  // Audit logging configuration
  auditLog: {
    enabled: true,
    events: [
      'login',
      'logout',
      'token_refresh',
      'mfa_attempt',
      'password_change',
      'role_change',
    ],
    retention: 90, // days
  }
};

/**
 * Get environment-specific authentication configuration
 * @returns Complete authentication configuration object
 */
export const getAuthConfig = () => {
  const environment = process.env.NODE_ENV || 'development';
  
  // Apply environment-specific overrides
  if (environment === 'development') {
    return {
      ...authConfig,
      jwt: {
        ...authConfig.jwt,
        accessTokenExpiry: 86400, // 24 hours for development
      },
      mfa: {
        ...authConfig.mfa,
        enabled: false, // Disable MFA in development
      }
    };
  }

  return authConfig;
};

export default authConfig;