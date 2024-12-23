/**
 * Enhanced OAuth 2.0 authentication strategy implementation
 * Provides enterprise-grade SSO integration with advanced security features
 * @version 1.0.0
 */

import { Strategy } from 'passport-oauth2'; // v1.7.0
import { sign, verify } from 'jsonwebtoken'; // v9.0.0
import { injectable, inject } from 'inversify';
import { IAuthConfig } from '../interfaces/config.interface';
import { ApiResponse, HttpStatusCode } from '../types/common.types';
import { Logger } from '../logger/logger.service';

/**
 * Token blacklist entry interface for revocation tracking
 */
interface BlacklistedToken {
  token: string;
  revokedAt: Date;
  reason?: string;
}

/**
 * Enhanced OAuth user profile with additional security context
 */
interface EnhancedUserProfile {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  organizationId: string;
  securityContext: {
    lastLogin: Date;
    mfaEnabled: boolean;
    securityLevel: string;
  };
}

/**
 * Rate limit tracking interface
 */
interface RateLimitEntry {
  attempts: number;
  windowStart: Date;
}

@injectable()
export class OAuthStrategy extends Strategy {
  private readonly tokenBlacklist: Map<string, BlacklistedToken>;
  private readonly rateLimitTracker: Map<string, RateLimitEntry>;
  private readonly logger: Logger;
  private readonly jwtSecret: string;
  private readonly tokenExpiry: string;

  constructor(
    @inject('IAuthConfig') private readonly authConfig: IAuthConfig,
    @inject('Logger') logger: Logger
  ) {
    // Initialize base OAuth strategy with enhanced security options
    super({
      authorizationURL: authConfig.ssoConfig.authorizationUrl,
      tokenURL: authConfig.ssoConfig.tokenUrl,
      clientID: authConfig.ssoConfig.clientId,
      clientSecret: authConfig.ssoConfig.clientSecret,
      callbackURL: authConfig.ssoConfig.callbackUrl,
      scope: ['openid', 'profile', 'email'],
      state: true,
      pkce: true,
      proxy: true
    });

    this.tokenBlacklist = new Map<string, BlacklistedToken>();
    this.rateLimitTracker = new Map<string, RateLimitEntry>();
    this.logger = logger;
    this.jwtSecret = authConfig.jwtSecret;
    this.tokenExpiry = authConfig.jwtExpiry;
  }

  /**
   * Validates OAuth tokens and user profile with enhanced security checks
   * @param accessToken OAuth access token
   * @param refreshToken OAuth refresh token
   * @param profile User profile from OAuth provider
   * @returns API response with validation result
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any
  ): Promise<ApiResponse<any>> {
    try {
      // Check rate limits
      if (!this.checkRateLimit(profile.id)) {
        this.logger.warn('Rate limit exceeded', { userId: profile.id });
        return {
          success: false,
          data: null,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts',
            details: {}
          },
          message: 'Rate limit exceeded',
          statusCode: HttpStatusCode.TOO_MANY_REQUESTS,
          timestamp: new Date()
        };
      }

      // Check token blacklist
      if (this.isTokenBlacklisted(accessToken)) {
        this.logger.warn('Blacklisted token used', { userId: profile.id });
        return {
          success: false,
          data: null,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token has been revoked',
            details: {}
          },
          message: 'Authentication failed',
          statusCode: HttpStatusCode.UNAUTHORIZED,
          timestamp: new Date()
        };
      }

      // Enhanced user profile with security context
      const enhancedProfile: EnhancedUserProfile = {
        id: profile.id,
        email: profile.emails[0].value,
        roles: profile.roles || [],
        permissions: profile.permissions || [],
        organizationId: profile.organizationId,
        securityContext: {
          lastLogin: new Date(),
          mfaEnabled: this.authConfig.mfaEnabled,
          securityLevel: 'standard'
        }
      };

      // Generate enhanced JWT token
      const token = this.generateToken(enhancedProfile);

      // Log successful authentication
      this.logger.info('User authenticated successfully', {
        userId: profile.id,
        email: profile.emails[0].value
      });

      return {
        success: true,
        data: {
          user: enhancedProfile,
          token,
          refreshToken
        },
        error: null,
        message: 'Authentication successful',
        statusCode: HttpStatusCode.OK,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Authentication error', { error });
      return {
        success: false,
        data: null,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
          details: { error: error.message }
        },
        message: 'Authentication failed',
        statusCode: HttpStatusCode.UNAUTHORIZED,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generates enhanced JWT token with security claims
   * @param userData User data to encode in token
   * @returns Signed JWT token
   */
  private generateToken(userData: EnhancedUserProfile): string {
    const payload = {
      sub: userData.id,
      email: userData.email,
      roles: userData.roles,
      permissions: userData.permissions,
      organizationId: userData.organizationId,
      securityContext: userData.securityContext,
      iat: Math.floor(Date.now() / 1000),
      type: 'access'
    };

    return sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiry,
      algorithm: 'RS256',
      audience: this.authConfig.ssoConfig.audience,
      issuer: this.authConfig.ssoConfig.issuer
    });
  }

  /**
   * Revokes a token by adding it to the blacklist
   * @param token Token to revoke
   * @param reason Optional reason for revocation
   * @returns Success status
   */
  async revokeToken(token: string, reason?: string): Promise<boolean> {
    try {
      const decoded = verify(token, this.jwtSecret);
      
      this.tokenBlacklist.set(token, {
        token,
        revokedAt: new Date(),
        reason
      });

      this.logger.info('Token revoked', {
        userId: decoded.sub,
        reason
      });

      return true;
    } catch (error) {
      this.logger.error('Token revocation failed', { error });
      return false;
    }
  }

  /**
   * Checks if a token is blacklisted
   * @param token Token to check
   * @returns Boolean indicating if token is blacklisted
   */
  private isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  /**
   * Enforces rate limiting for authentication attempts
   * @param userId User ID to track
   * @returns Boolean indicating if rate limit is exceeded
   */
  private checkRateLimit(userId: string): boolean {
    const now = new Date();
    const entry = this.rateLimitTracker.get(userId);

    if (!entry) {
      this.rateLimitTracker.set(userId, {
        attempts: 1,
        windowStart: now
      });
      return true;
    }

    const windowMs = this.authConfig.rateLimiting.windowMs;
    const maxAttempts = this.authConfig.rateLimiting.maxAttempts;

    if (now.getTime() - entry.windowStart.getTime() > windowMs) {
      // Reset window
      this.rateLimitTracker.set(userId, {
        attempts: 1,
        windowStart: now
      });
      return true;
    }

    if (entry.attempts >= maxAttempts) {
      return false;
    }

    entry.attempts++;
    this.rateLimitTracker.set(userId, entry);
    return true;
  }
}