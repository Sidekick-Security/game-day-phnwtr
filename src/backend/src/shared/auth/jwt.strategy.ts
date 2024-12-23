/**
 * Enhanced JWT authentication strategy implementation for GameDay Platform
 * Provides secure token-based authentication with RS256 encryption, MFA support,
 * and comprehensive security features
 * @version 1.0.0
 * @package @gameday/shared
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { IAuthConfig } from '../interfaces/config.interface';
import { ApiResponse, HttpStatusCode } from '../types/common.types';

/**
 * JWT payload interface with enhanced security claims
 */
interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  mfaVerified?: boolean;
  sessionId: string;
  iat: number;
  exp: number;
}

/**
 * Enhanced JWT Strategy with advanced security features
 * Implements secure token validation, MFA support, and rate limiting
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly rateLimiter: RateLimiterRedis;

  constructor(
    private readonly authConfig: IAuthConfig,
    rateLimiter: RateLimiterRedis
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: authConfig.jwtSecret,
      algorithms: ['RS256'], // Enforce RS256 for enhanced security
      passReqToCallback: true,
    });

    this.rateLimiter = rateLimiter;
  }

  /**
   * Enhanced token validation with comprehensive security checks
   * @param payload JWT token payload
   * @returns Promise resolving to validated user or throwing auth error
   */
  async validate(payload: JwtPayload): Promise<ApiResponse<any>> {
    try {
      // Rate limiting check
      await this.checkRateLimit(payload.sub);

      // Validate token expiration
      if (this.isTokenExpired(payload)) {
        throw new UnauthorizedException('Token has expired');
      }

      // Validate required claims
      this.validateClaims(payload);

      // Check MFA requirement if enabled
      if (this.authConfig.mfaEnabled && !payload.mfaVerified) {
        throw new UnauthorizedException('MFA verification required');
      }

      // Return validated user data
      return {
        success: true,
        data: {
          userId: payload.sub,
          email: payload.email,
          roles: payload.roles,
          sessionId: payload.sessionId,
        },
        error: null,
        message: 'Token validated successfully',
        statusCode: HttpStatusCode.OK,
        timestamp: new Date(),
      };

    } catch (error) {
      // Enhanced error handling with detailed responses
      return {
        success: false,
        data: null,
        error: {
          code: 'AUTH_ERROR',
          message: error.message,
          details: {
            tokenId: payload?.sub,
            errorType: error.name,
          },
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        message: 'Authentication failed',
        statusCode: HttpStatusCode.UNAUTHORIZED,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Validates MFA token if MFA is enabled
   * @param userId User identifier
   * @param mfaToken MFA verification token
   * @returns Promise resolving to MFA validation result
   */
  private async validateMfa(userId: string, mfaToken: string): Promise<boolean> {
    if (!this.authConfig.mfaEnabled) {
      return true;
    }

    try {
      // Implement MFA validation logic based on configured MFA type
      switch (this.authConfig.mfaType) {
        case 'totp':
          // TOTP validation implementation
          return true; // Placeholder - implement actual TOTP validation
        case 'sms':
          // SMS code validation implementation
          return true; // Placeholder - implement actual SMS validation
        default:
          throw new Error(`Unsupported MFA type: ${this.authConfig.mfaType}`);
      }
    } catch (error) {
      throw new UnauthorizedException('MFA validation failed');
    }
  }

  /**
   * Checks rate limiting constraints for token validation
   * @param userId User identifier
   */
  private async checkRateLimit(userId: string): Promise<void> {
    if (this.authConfig.rateLimiting.enabled) {
      try {
        await this.rateLimiter.consume(userId);
      } catch (error) {
        throw new UnauthorizedException('Rate limit exceeded');
      }
    }
  }

  /**
   * Validates required JWT claims
   * @param payload JWT payload
   */
  private validateClaims(payload: JwtPayload): void {
    const requiredClaims = ['sub', 'email', 'roles', 'sessionId', 'iat', 'exp'];
    const missingClaims = requiredClaims.filter(claim => !payload[claim]);

    if (missingClaims.length > 0) {
      throw new UnauthorizedException(`Missing required claims: ${missingClaims.join(', ')}`);
    }
  }

  /**
   * Checks if the token has expired
   * @param payload JWT payload
   * @returns boolean indicating if token is expired
   */
  private isTokenExpired(payload: JwtPayload): boolean {
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }
}