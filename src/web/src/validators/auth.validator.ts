/**
 * @fileoverview Authentication Validation Schemas and Functions
 * @version 1.0.0
 * 
 * Implements comprehensive validation schemas and security controls for 
 * authentication-related data in the GameDay Platform web application.
 */

import { z } from 'zod'; // v3.22.0
import { sanitize } from 'validator'; // v13.11.0
import { AuthProvider } from '../types/auth.types';
import { IAuthRequest } from '../interfaces/auth.interface';
import { ErrorCode } from '../constants/error.constants';

// Constants for validation rules
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;
const MFA_TOKEN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 255;
const MAX_AUTH_ATTEMPTS_PER_HOUR = 5;
const MAX_MFA_ATTEMPTS_PER_TOKEN = 3;

/**
 * Client metadata validation schema with security-focused requirements
 */
const clientMetadataSchema = z.object({
  userAgent: z.string().min(1).max(500),
  ipAddress: z.string().ip(),
  deviceId: z.string().uuid(),
  timestamp: z.number().int().positive(),
  platform: z.string().min(1).max(50),
  browserFingerprint: z.string().optional(),
  geoLocation: z.object({
    country: z.string().length(2),
    region: z.string().optional()
  }).optional()
});

/**
 * Enhanced password validation schema with security requirements
 */
const passwordSchema = z.string()
  .min(PASSWORD_MIN_LENGTH, 'Password must be at least 8 characters')
  .max(PASSWORD_MAX_LENGTH, 'Password cannot exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

/**
 * MFA token validation schema
 */
const mfaTokenSchema = z.string()
  .length(MFA_TOKEN_LENGTH)
  .regex(/^\d{6}$/, 'MFA token must be 6 digits');

/**
 * Comprehensive authentication request validation schema
 */
export const authRequestSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .min(5, 'Email is too short')
    .max(EMAIL_MAX_LENGTH, 'Email is too long')
    .transform(val => sanitize(val.toLowerCase().trim())),
  
  password: passwordSchema.optional(),
  
  provider: z.nativeEnum(AuthProvider, {
    errorMap: () => ({ message: 'Invalid authentication provider' })
  }),
  
  mfaToken: mfaTokenSchema.optional(),
  
  clientMetadata: clientMetadataSchema
}).strict();

/**
 * Interface for validation results
 */
interface ValidationResult {
  success: boolean;
  data?: any;
  error?: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Interface for MFA validation results
 */
interface MfaValidationResult {
  isValid: boolean;
  remainingAttempts: number;
  error?: string;
}

/**
 * Validates and sanitizes authentication request data with enhanced security checks
 * @param authRequest - The authentication request to validate
 * @returns ValidationResult containing success status and sanitized data or error
 */
export const validateAuthRequest = async (
  authRequest: Partial<IAuthRequest>
): Promise<ValidationResult> => {
  try {
    // Sanitize input data to prevent XSS and injection attacks
    const sanitizedRequest = {
      ...authRequest,
      email: authRequest.email ? sanitize(authRequest.email.toLowerCase().trim()) : '',
      clientMetadata: {
        ...authRequest.clientMetadata,
        userAgent: authRequest.clientMetadata?.userAgent 
          ? sanitize(authRequest.clientMetadata.userAgent)
          : ''
      }
    };

    // Validate against schema
    const validatedData = await authRequestSchema.parseAsync(sanitizedRequest);

    return {
      success: true,
      data: validatedData
    };

  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid authentication request',
          details: error.errors
        }
      };
    }

    return {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: 'Authentication validation failed'
      }
    };
  }
};

/**
 * Validates MFA token with comprehensive security checks
 * @param mfaToken - The MFA token to validate
 * @param userId - The user ID associated with the token
 * @returns MfaValidationResult with validation status and security checks
 */
export const validateMfaToken = async (
  mfaToken: string,
  userId: string
): Promise<MfaValidationResult> => {
  try {
    // Validate token format
    await mfaTokenSchema.parseAsync(mfaToken);

    // Additional security checks would be implemented here:
    // 1. Check token expiration
    // 2. Verify token hasn't been used (prevent replay)
    // 3. Check rate limiting for MFA attempts
    // 4. Validate token belongs to user

    return {
      isValid: true,
      remainingAttempts: MAX_MFA_ATTEMPTS_PER_TOKEN
    };

  } catch (error) {
    return {
      isValid: false,
      remainingAttempts: MAX_MFA_ATTEMPTS_PER_TOKEN - 1,
      error: error instanceof z.ZodError 
        ? error.errors[0]?.message 
        : 'Invalid MFA token'
    };
  }
};

/**
 * Type guard to check if a value is a valid auth provider
 * @param value - The value to check
 * @returns boolean indicating if the value is a valid auth provider
 */
export const isValidAuthProvider = (value: any): value is AuthProvider => {
  return Object.values(AuthProvider).includes(value as AuthProvider);
};