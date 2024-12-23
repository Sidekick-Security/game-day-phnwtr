/**
 * @fileoverview Validation utilities for the GameDay Platform
 * @version 1.0.0
 * 
 * Provides comprehensive validation utilities with enhanced security features
 * for input validation, form validation, and data validation across the platform.
 */

import { z } from 'zod'; // v3.22.0
import { isEmail } from 'validator'; // v13.11.0
import { ExerciseType } from '../types/exercise.types';
import { ErrorCode } from '../constants/error.constants';
import { LoginCredentials } from '../types/auth.types';

// Constants for validation rules
const VALIDATION_CONSTANTS = {
  PASSWORD: {
    MIN_LENGTH: 12,
    MAX_LENGTH: 128,
    MIN_SCORE: 3,
    REQUIRED_CHARS: {
      UPPERCASE: /[A-Z]/,
      LOWERCASE: /[a-z]/,
      NUMBER: /[0-9]/,
      SPECIAL: /[!@#$%^&*(),.?":{}|<>]/
    }
  },
  EMAIL: {
    MAX_LENGTH: 254, // RFC 5321
    ALLOWED_DOMAINS: [
      'company.com',
      'organization.com'
    ],
    BLOCKED_DOMAINS: [
      'tempmail.com',
      'disposable.com'
    ]
  },
  EXERCISE: {
    TITLE_MIN_LENGTH: 5,
    TITLE_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 2000,
    MIN_PARTICIPANTS: 2,
    MAX_PARTICIPANTS: 50
  }
};

/**
 * Interface for validation results with detailed feedback
 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  details?: Record<string, unknown>;
}

/**
 * Enhanced email validation with domain checks and security features
 * @param {string} email - Email address to validate
 * @returns {ValidationResult} Validation result with detailed feedback
 */
export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];

  // Basic format validation
  if (!email || !isEmail(email, { 
    allow_utf8_local_part: false,
    require_tld: true,
    allow_ip_domain: false
  })) {
    errors.push('Invalid email format');
    return { isValid: false, errors };
  }

  // Length validation
  if (email.length > VALIDATION_CONSTANTS.EMAIL.MAX_LENGTH) {
    errors.push('Email exceeds maximum length');
  }

  // Domain validation
  const domain = email.split('@')[1].toLowerCase();
  
  if (VALIDATION_CONSTANTS.EMAIL.BLOCKED_DOMAINS.includes(domain)) {
    errors.push('Email domain not allowed');
  }

  // Organization domain validation (if configured)
  if (VALIDATION_CONSTANTS.EMAIL.ALLOWED_DOMAINS.length > 0 && 
      !VALIDATION_CONSTANTS.EMAIL.ALLOWED_DOMAINS.includes(domain)) {
    errors.push('Email must be from an approved organization domain');
  }

  return {
    isValid: errors.length === 0,
    errors,
    details: { domain }
  };
};

/**
 * Enhanced password validation with complexity scoring
 * @param {string} password - Password to validate
 * @param {object} options - Optional validation configuration
 * @returns {ValidationResult} Validation result with strength score
 */
export const validatePassword = (
  password: string,
  options: { checkHistory?: boolean; previousPasswords?: string[] } = {}
): ValidationResult => {
  const errors: string[] = [];
  let strengthScore = 0;

  // Length validation
  if (!password || password.length < VALIDATION_CONSTANTS.PASSWORD.MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_CONSTANTS.PASSWORD.MIN_LENGTH} characters`);
  }

  if (password.length > VALIDATION_CONSTANTS.PASSWORD.MAX_LENGTH) {
    errors.push(`Password exceeds maximum length of ${VALIDATION_CONSTANTS.PASSWORD.MAX_LENGTH} characters`);
  }

  // Character type validation
  const checks = VALIDATION_CONSTANTS.PASSWORD.REQUIRED_CHARS;
  if (!checks.UPPERCASE.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  } else strengthScore++;

  if (!checks.LOWERCASE.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  } else strengthScore++;

  if (!checks.NUMBER.test(password)) {
    errors.push('Password must contain at least one number');
  } else strengthScore++;

  if (!checks.SPECIAL.test(password)) {
    errors.push('Password must contain at least one special character');
  } else strengthScore++;

  // Password history check
  if (options.checkHistory && options.previousPasswords?.includes(password)) {
    errors.push('Password has been used previously');
  }

  return {
    isValid: errors.length === 0 && strengthScore >= VALIDATION_CONSTANTS.PASSWORD.MIN_SCORE,
    errors,
    details: { strengthScore }
  };
};

/**
 * Comprehensive exercise configuration validation
 * @param {object} exerciseConfig - Exercise configuration to validate
 * @returns {ValidationResult} Validation result with section-specific feedback
 */
export const validateExerciseConfig = (exerciseConfig: {
  type: ExerciseType;
  title: string;
  description: string;
  participants: Array<{ id: string; role: string }>;
  schedule: { startTime: Date; duration: number };
}): ValidationResult => {
  const errors: string[] = [];
  const details: Record<string, unknown> = {};

  // Exercise type validation
  if (!Object.values(ExerciseType).includes(exerciseConfig.type)) {
    errors.push('Invalid exercise type');
  }

  // Title validation using Zod schema
  const titleSchema = z.string()
    .min(VALIDATION_CONSTANTS.EXERCISE.TITLE_MIN_LENGTH)
    .max(VALIDATION_CONSTANTS.EXERCISE.TITLE_MAX_LENGTH);

  const titleResult = titleSchema.safeParse(exerciseConfig.title);
  if (!titleResult.success) {
    errors.push('Invalid title length');
  }

  // Description validation
  if (exerciseConfig.description.length > VALIDATION_CONSTANTS.EXERCISE.DESCRIPTION_MAX_LENGTH) {
    errors.push('Description exceeds maximum length');
  }

  // Participants validation
  const participantCount = exerciseConfig.participants.length;
  if (participantCount < VALIDATION_CONSTANTS.EXERCISE.MIN_PARTICIPANTS ||
      participantCount > VALIDATION_CONSTANTS.EXERCISE.MAX_PARTICIPANTS) {
    errors.push(`Invalid number of participants (${VALIDATION_CONSTANTS.EXERCISE.MIN_PARTICIPANTS}-${VALIDATION_CONSTANTS.EXERCISE.MAX_PARTICIPANTS} required)`);
  }

  // Schedule validation
  const now = new Date();
  if (exerciseConfig.schedule.startTime < now) {
    errors.push('Start time must be in the future');
  }

  if (exerciseConfig.schedule.duration < 30 || exerciseConfig.schedule.duration > 480) {
    errors.push('Duration must be between 30 and 480 minutes');
  }

  details.validatedAt = now;

  return {
    isValid: errors.length === 0,
    errors,
    details
  };
};

/**
 * Enhanced login credentials validation
 * @param {LoginCredentials} credentials - Login credentials to validate
 * @returns {ValidationResult} Validation result with auth requirements
 */
export const validateLoginCredentials = (credentials: LoginCredentials): ValidationResult => {
  const errors: string[] = [];
  const details: Record<string, unknown> = {};

  // Email validation
  const emailValidation = validateEmail(credentials.email);
  if (!emailValidation.isValid) {
    errors.push(...emailValidation.errors);
  }

  // Password validation
  const passwordValidation = validatePassword(credentials.password);
  if (!passwordValidation.isValid) {
    errors.push(...passwordValidation.errors);
  }

  details.requiresMFA = true; // Enhanced security default
  details.validatedAt = new Date();

  return {
    isValid: errors.length === 0,
    errors,
    details
  };
};

/**
 * Creates a validation error with standardized format
 * @param {string[]} errors - List of validation errors
 * @returns {Error} Standardized validation error
 */
export const createValidationError = (errors: string[]): Error => {
  return new Error(JSON.stringify({
    code: ErrorCode.VALIDATION_ERROR,
    errors,
    timestamp: new Date().toISOString()
  }));
};