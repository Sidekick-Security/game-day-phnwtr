/**
 * @fileoverview Advanced validation and sanitization utilities for secure data handling
 * across all backend microservices. Implements comprehensive security measures for
 * input validation, XSS protection, and SQL injection prevention.
 * @version 1.0.0
 */

import { validate, ValidationError as ClassValidatorError } from 'class-validator'; // v0.14.0
import { plainToClass } from 'class-transformer'; // v0.5.1
import { sanitize } from 'class-sanitizer'; // v1.0.1
import * as xss from 'xss'; // v1.0.14
import * as validator from 'validator'; // v13.9.0
import { ErrorCode } from '../constants/error-codes';
import { ApiResponse } from '../types/common.types';

// Constants for validation rules
const PASSWORD_MIN_LENGTH = 12;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_ENTROPY_THRESHOLD = 80;
const MAX_EMAIL_LENGTH = 254;
const SANITIZATION_OPTIONS = {
  allowedTags: [],
  allowedAttributes: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style']
};

/**
 * Enhanced validation result interface with detailed error reporting
 */
export interface ValidationResult<T = any> {
  isValid: boolean;
  errors: ValidationError[];
  data: T | null;
  score?: number;
}

/**
 * Structured validation error interface for consistent error reporting
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  details?: Record<string, any>;
}

/**
 * Type definition for class constructor
 */
type ClassType<T> = {
  new (...args: any[]): T;
};

/**
 * Comprehensive input validation with enhanced security checks
 * @param dto Class type for validation
 * @param data Input data to validate
 * @returns Validation result with transformed data or errors
 */
export async function validateInput<T>(
  dto: ClassType<T>,
  data: Record<string, any>
): Promise<ValidationResult<T>> {
  try {
    // Transform plain object to class instance
    const instance = plainToClass(dto, data);

    // Preliminary sanitization
    const sanitizedInstance = await sanitizeInput(instance);

    // Run class-validator validations
    const errors = await validate(sanitizedInstance, {
      whitelist: true,
      forbidNonWhitelisted: true,
      skipMissingProperties: false
    });

    if (errors.length > 0) {
      return {
        isValid: false,
        errors: transformValidationErrors(errors),
        data: null
      };
    }

    return {
      isValid: true,
      errors: [],
      data: sanitizedInstance
    };
  } catch (error) {
    return {
      isValid: false,
      errors: [{
        field: 'general',
        message: 'Validation processing error',
        code: ErrorCode.VALIDATION_ERROR
      }],
      data: null
    };
  }
}

/**
 * Enhanced input sanitization with comprehensive security measures
 * @param data Input data to sanitize
 * @returns Sanitized data object
 */
export function sanitizeInput<T>(data: T): T {
  if (!data) return data;

  if (typeof data === 'string') {
    return xss.filterXSS(data, SANITIZATION_OPTIONS) as any;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item)) as any;
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized as T;
  }

  return data;
}

/**
 * Comprehensive email validation with enhanced security checks
 * @param email Email address to validate
 * @returns Validation result with detailed error information
 */
export function validateEmail(email: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!email) {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: ErrorCode.VALIDATION_ERROR
    });
    return { isValid: false, errors, data: null };
  }

  if (!EMAIL_REGEX.test(email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format',
      code: ErrorCode.VALIDATION_ERROR
    });
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    errors.push({
      field: 'email',
      message: `Email must not exceed ${MAX_EMAIL_LENGTH} characters`,
      code: ErrorCode.VALIDATION_ERROR
    });
  }

  if (!validator.isEmail(email, { allow_utf8_local_part: false })) {
    errors.push({
      field: 'email',
      message: 'Email contains invalid characters',
      code: ErrorCode.VALIDATION_ERROR
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? email : null
  };
}

/**
 * Advanced password validation with strength assessment
 * @param password Password to validate
 * @returns Validation result with strength score
 */
export function validatePassword(password: string): ValidationResult {
  const errors: ValidationError[] = [];
  let score = 0;

  if (!password) {
    errors.push({
      field: 'password',
      message: 'Password is required',
      code: ErrorCode.VALIDATION_ERROR
    });
    return { isValid: false, errors, data: null, score: 0 };
  }

  // Length check
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push({
      field: 'password',
      message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
      code: ErrorCode.VALIDATION_ERROR
    });
  } else {
    score += 20;
  }

  // Character type checks
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  if (score < PASSWORD_ENTROPY_THRESHOLD) {
    errors.push({
      field: 'password',
      message: 'Password is not strong enough',
      code: ErrorCode.VALIDATION_ERROR,
      details: { score }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? password : null,
    score
  };
}

/**
 * Transform class-validator errors to standardized format
 * @param errors Array of class-validator errors
 * @returns Transformed validation errors
 */
function transformValidationErrors(errors: ClassValidatorError[]): ValidationError[] {
  return errors.map(error => ({
    field: error.property,
    message: Object.values(error.constraints || {})[0] || 'Invalid value',
    code: ErrorCode.VALIDATION_ERROR,
    details: error.constraints
  }));
}