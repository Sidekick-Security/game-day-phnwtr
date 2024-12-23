/**
 * @fileoverview Defines standardized error codes and types used across all backend microservices
 * for consistent error handling and client responses. Implements secure error handling patterns
 * with comprehensive domain-specific error coverage.
 * @version 1.0.0
 */

import { HttpStatus } from './http-status';

/**
 * Comprehensive enumeration of all possible error codes in the system.
 * Each code represents a specific error condition that can occur during
 * exercise management and platform operations.
 * 
 * @enum {string}
 */
export enum ErrorCode {
  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Authentication & Authorization Errors
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',

  // Resource Not Found Errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  EXERCISE_NOT_FOUND = 'EXERCISE_NOT_FOUND',
  SCENARIO_NOT_FOUND = 'SCENARIO_NOT_FOUND',
  INJECT_NOT_FOUND = 'INJECT_NOT_FOUND',
  PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',

  // Conflict Errors
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',

  // Business Logic Errors
  INVALID_OPERATION = 'INVALID_OPERATION',
  EXERCISE_IN_PROGRESS = 'EXERCISE_IN_PROGRESS',
  EXERCISE_COMPLETED = 'EXERCISE_COMPLETED',

  // System Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR'
}

/**
 * High-level categorization of error types for error handling and reporting.
 * Used to group related errors for consistent handling and monitoring.
 * 
 * @enum {string}
 */
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC',
  INTERNAL = 'INTERNAL'
}

/**
 * Maps error codes to their corresponding HTTP status codes for consistent API responses.
 * This mapping ensures that appropriate status codes are returned for each error condition.
 * 
 * @const {Record<ErrorCode, HttpStatus>}
 */
export const ErrorCodeStatusMap: Record<ErrorCode, HttpStatus> = {
  // Map validation errors to 400 Bad Request
  [ErrorCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,

  // Map authentication/authorization errors to 401/403
  [ErrorCode.AUTHENTICATION_ERROR]: HttpStatus.UNAUTHORIZED,
  [ErrorCode.AUTHORIZATION_ERROR]: HttpStatus.FORBIDDEN,

  // Map all not found errors to 404
  [ErrorCode.RESOURCE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.EXERCISE_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.SCENARIO_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.INJECT_NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.PARTICIPANT_NOT_FOUND]: HttpStatus.NOT_FOUND,

  // Map conflict errors to 409
  [ErrorCode.DUPLICATE_RESOURCE]: HttpStatus.CONFLICT,

  // Map business logic errors to 400
  [ErrorCode.INVALID_OPERATION]: HttpStatus.BAD_REQUEST,
  [ErrorCode.EXERCISE_IN_PROGRESS]: HttpStatus.BAD_REQUEST,
  [ErrorCode.EXERCISE_COMPLETED]: HttpStatus.BAD_REQUEST,

  // Map system errors to 500
  [ErrorCode.INTERNAL_SERVER_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR
};