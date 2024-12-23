/**
 * @fileoverview Error constants for the GameDay Platform web application
 * @version 1.0.0
 * 
 * Defines standardized error codes, messages, and types for consistent error handling
 * across the application. Implements type-safe, immutable error constants with
 * user-friendly messages that maintain security by not exposing sensitive information.
 */

/**
 * Enumeration of all possible error codes in the application
 * Includes both HTTP standard and domain-specific errors
 */
export enum ErrorCode {
  // HTTP Standard Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  NETWORK_ERROR = 'NETWORK_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Domain-Specific Errors
  EXERCISE_NOT_FOUND = 'EXERCISE_NOT_FOUND',
  SCENARIO_GENERATION_FAILED = 'SCENARIO_GENERATION_FAILED',
  PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',
  EXERCISE_ALREADY_IN_PROGRESS = 'EXERCISE_ALREADY_IN_PROGRESS',
  EXERCISE_COMPLETED = 'EXERCISE_COMPLETED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  INVALID_EXERCISE_STATE = 'INVALID_EXERCISE_STATE',
  SESSION_EXPIRED = 'SESSION_EXPIRED'
}

/**
 * User-friendly error messages that are internationalization-ready
 * and maintain security by not exposing sensitive information
 */
export enum ErrorMessage {
  // HTTP Standard Error Messages
  UNAUTHORIZED = 'Please sign in to continue.',
  FORBIDDEN = 'You do not have permission to perform this action.',
  NOT_FOUND = 'The requested resource was not found.',
  BAD_REQUEST = 'Invalid request. Please check your input and try again.',
  NETWORK_ERROR = 'Unable to connect to the server. Please check your internet connection.',
  INTERNAL_SERVER_ERROR = 'An unexpected error occurred. Our team has been notified.',
  VALIDATION_ERROR = 'Please correct the highlighted fields and try again.',

  // Domain-Specific Error Messages
  EXERCISE_NOT_FOUND = 'The requested exercise could not be found.',
  SCENARIO_GENERATION_FAILED = 'Unable to generate scenario. Please try again.',
  PARTICIPANT_NOT_FOUND = 'The specified participant was not found in this exercise.',
  EXERCISE_ALREADY_IN_PROGRESS = 'This exercise is already in progress.',
  EXERCISE_COMPLETED = 'This exercise has been completed and cannot be modified.',
  INSUFFICIENT_PERMISSIONS = 'You do not have the required permissions for this action.',
  INVALID_EXERCISE_STATE = 'The exercise is not in a valid state for this action.',
  SESSION_EXPIRED = 'Your session has expired. Please sign in again.'
}

/**
 * Categories of errors for better organization and handling
 */
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  SYSTEM = 'SYSTEM'
}

/**
 * Default error message when a specific message is not available
 * @constant
 */
export const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred. Please try again later.';

/**
 * Error severity levels for appropriate UI treatment and logging
 * @constant
 */
export const ERROR_SEVERITY_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
} as const;

/**
 * Maps error codes to their respective categories for consistent handling
 * @constant
 */
export const ERROR_CATEGORY_MAP: Record<ErrorCode, ErrorCategory> = {
  [ErrorCode.UNAUTHORIZED]: ErrorCategory.AUTHENTICATION,
  [ErrorCode.FORBIDDEN]: ErrorCategory.AUTHORIZATION,
  [ErrorCode.NOT_FOUND]: ErrorCategory.SYSTEM,
  [ErrorCode.BAD_REQUEST]: ErrorCategory.VALIDATION,
  [ErrorCode.NETWORK_ERROR]: ErrorCategory.SYSTEM,
  [ErrorCode.INTERNAL_SERVER_ERROR]: ErrorCategory.SYSTEM,
  [ErrorCode.VALIDATION_ERROR]: ErrorCategory.VALIDATION,
  [ErrorCode.EXERCISE_NOT_FOUND]: ErrorCategory.BUSINESS_LOGIC,
  [ErrorCode.SCENARIO_GENERATION_FAILED]: ErrorCategory.SYSTEM,
  [ErrorCode.PARTICIPANT_NOT_FOUND]: ErrorCategory.BUSINESS_LOGIC,
  [ErrorCode.EXERCISE_ALREADY_IN_PROGRESS]: ErrorCategory.BUSINESS_LOGIC,
  [ErrorCode.EXERCISE_COMPLETED]: ErrorCategory.BUSINESS_LOGIC,
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: ErrorCategory.AUTHORIZATION,
  [ErrorCode.INVALID_EXERCISE_STATE]: ErrorCategory.BUSINESS_LOGIC,
  [ErrorCode.SESSION_EXPIRED]: ErrorCategory.AUTHENTICATION
} as const;

/**
 * Maps error codes to their severity levels for appropriate handling
 * @constant
 */
export const ERROR_SEVERITY_MAP: Record<ErrorCode, keyof typeof ERROR_SEVERITY_LEVELS> = {
  [ErrorCode.UNAUTHORIZED]: 'WARNING',
  [ErrorCode.FORBIDDEN]: 'WARNING',
  [ErrorCode.NOT_FOUND]: 'WARNING',
  [ErrorCode.BAD_REQUEST]: 'WARNING',
  [ErrorCode.NETWORK_ERROR]: 'ERROR',
  [ErrorCode.INTERNAL_SERVER_ERROR]: 'CRITICAL',
  [ErrorCode.VALIDATION_ERROR]: 'INFO',
  [ErrorCode.EXERCISE_NOT_FOUND]: 'WARNING',
  [ErrorCode.SCENARIO_GENERATION_FAILED]: 'ERROR',
  [ErrorCode.PARTICIPANT_NOT_FOUND]: 'WARNING',
  [ErrorCode.EXERCISE_ALREADY_IN_PROGRESS]: 'WARNING',
  [ErrorCode.EXERCISE_COMPLETED]: 'INFO',
  [ErrorCode.INSUFFICIENT_PERMISSIONS]: 'WARNING',
  [ErrorCode.INVALID_EXERCISE_STATE]: 'WARNING',
  [ErrorCode.SESSION_EXPIRED]: 'WARNING'
} as const;