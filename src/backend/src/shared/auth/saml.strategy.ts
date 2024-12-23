/**
 * Enterprise-grade SAML 2.0 authentication strategy implementation
 * Provides secure SSO capabilities with comprehensive validation and monitoring
 * @version 1.0.0
 * @package @gameday/shared
 */

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, SamlConfig } from 'passport-saml';
import { Cache } from 'cache-manager';
import { IAuthConfig } from '../interfaces/config.interface';
import { ApiResponse, HttpStatusCode } from '../types/common.types';
import * as crypto from 'crypto';

/**
 * Enhanced SAML profile interface with strict typing
 */
interface SamlProfile {
  readonly nameID: string;
  readonly nameIDFormat: string;
  readonly issuer: string;
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly groups?: string[];
  readonly organizationId?: string;
  readonly [key: string]: unknown;
}

/**
 * Enterprise-ready SAML authentication strategy with comprehensive security features
 */
@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
  private readonly logger = new Logger(SamlStrategy.name);
  private readonly replayCache: Map<string, number> = new Map();
  private readonly replayCacheTimeout = 86400000; // 24 hours in milliseconds

  constructor(
    private readonly authConfig: IAuthConfig,
    private readonly cache: Cache
  ) {
    super({
      // Core SAML configuration
      issuer: authConfig.ssoConfig.issuer,
      callbackUrl: authConfig.ssoConfig.callbackUrl,
      entryPoint: authConfig.ssoConfig.entryPoint,
      cert: authConfig.ssoConfig.cert,
      privateKey: authConfig.ssoConfig.privateKey,
      
      // Enhanced security settings
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      validateInResponseTo: true,
      requestIdExpirationPeriod: 86400,
      
      // Assertion encryption
      decryptionPvk: authConfig.ssoConfig.decryptionKey,
      wantAssertionsEncrypted: true,
      
      // Additional security features
      wantAuthnResponseSigned: true,
      wantAssertionsSigned: true,
      allowCreate: false,
      forceAuthn: true,
      
      // Metadata handling
      disableRequestedAuthnContext: false,
      authnContext: [
        'urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport'
      ],
      
      // Passport-specific settings
      passReqToCallback: true,
      
      // Error handling
      acceptedClockSkewMs: 300000 // 5 minutes
    } as SamlConfig);

    this.initializeReplayPrevention();
    this.logger.log('SAML Strategy initialized with enhanced security settings');
  }

  /**
   * Initialize replay attack prevention system
   * Cleans up expired replay cache entries periodically
   */
  private initializeReplayPrevention(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [id, timestamp] of this.replayCache.entries()) {
        if (now - timestamp > this.replayCacheTimeout) {
          this.replayCache.delete(id);
        }
      }
    }, 3600000); // Clean up every hour
  }

  /**
   * Comprehensive SAML assertion validation with security checks
   * @param profile SAML assertion profile
   * @returns Validated user data or error response
   */
  async validate(profile: Record<string, any>): Promise<ApiResponse<any>> {
    try {
      // Type cast and validate profile
      const samlProfile = profile as SamlProfile;
      
      // Validate required fields
      if (!samlProfile.nameID || !samlProfile.issuer) {
        throw new Error('Invalid SAML profile: Missing required fields');
      }

      // Prevent replay attacks
      const assertionId = crypto
        .createHash('sha256')
        .update(samlProfile.nameID + samlProfile.issuer)
        .digest('hex');
        
      if (this.replayCache.has(assertionId)) {
        throw new Error('Potential replay attack detected');
      }
      this.replayCache.set(assertionId, Date.now());

      // Validate issuer
      if (samlProfile.issuer !== this.authConfig.ssoConfig.issuer) {
        throw new Error('Invalid assertion issuer');
      }

      // Extract and validate user data
      const userData = {
        id: samlProfile.nameID,
        email: samlProfile.email,
        firstName: samlProfile.firstName,
        lastName: samlProfile.lastName,
        groups: samlProfile.groups || [],
        organizationId: samlProfile.organizationId,
        authMethod: 'saml',
        lastLogin: new Date()
      };

      // Validate organization membership
      if (!userData.organizationId) {
        throw new Error('Organization ID not provided in SAML assertion');
      }

      // Log successful authentication
      this.logger.log({
        message: 'SAML authentication successful',
        userId: userData.id,
        email: userData.email,
        organizationId: userData.organizationId,
        timestamp: new Date()
      });

      // Cache user session data
      await this.cache.set(
        `user_session:${userData.id}`,
        userData,
        { ttl: 3600 } // 1 hour cache
      );

      return {
        success: true,
        data: userData,
        error: null,
        message: 'Authentication successful',
        statusCode: HttpStatusCode.OK,
        timestamp: new Date()
      };

    } catch (error) {
      // Log authentication failure
      this.logger.error({
        message: 'SAML authentication failed',
        error: error.message,
        profile: profile,
        timestamp: new Date()
      });

      return {
        success: false,
        data: null,
        error: {
          code: 'AUTH_FAILED',
          message: error.message,
          details: {},
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        message: 'Authentication failed',
        statusCode: HttpStatusCode.UNAUTHORIZED,
        timestamp: new Date()
      };
    }
  }
}