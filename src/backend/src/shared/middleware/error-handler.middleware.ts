/**
 * @fileoverview Global error handling middleware providing standardized error handling
 * and response formatting across all backend microservices. Implements RFC-compliant
 * error responses with proper status codes, logging, and client-safe error messages.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { ErrorCode, ErrorType, ErrorCodeStatusMap } from '../constants/error-codes';
import { HttpStatus } from '../constants/http-status';
import Logger from '../utils/logger.util';

/**
 * Error severity levels for monitoring and alerting
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Custom error class with enhanced context and tracking capabilities
 */
export class GameDayError extends Error {
  public readonly code: ErrorCode;
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly correlationId: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    type: ErrorType = ErrorType.INTERNAL,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'GameDayError';
    this.code = code;
    this.type = type;
    this.severity = severity;
    this.correlationId = uuidv4();
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Safe error codes that can be exposed to clients
 */
const SAFE_ERROR_CODES = new Set([
  ErrorCode.VALIDATION_ERROR,
  ErrorCode.AUTHENTICATION_ERROR,
  ErrorCode.AUTHORIZATION_ERROR,
  ErrorCode.RESOURCE_NOT_FOUND,
  ErrorCode.EXERCISE_NOT_FOUND,
  ErrorCode.SCENARIO_NOT_FOUND,
  ErrorCode.INJECT_NOT_FOUND,
  ErrorCode.PARTICIPANT_NOT_FOUND,
  ErrorCode.DUPLICATE_RESOURCE,
  ErrorCode.INVALID_OPERATION,
  ErrorCode.EXERCISE_IN_PROGRESS,
  ErrorCode.EXERCISE_COMPLETED
]);

/**
 * Default error message for internal server errors
 */
const DEFAULT_ERROR_MESSAGE = 'An unexpected error occurred';

/**
 * Interface for standardized error responses
 */
interface ErrorResponse {
  status: 'error';
  code: string;
  message: string;
  correlationId: string;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * Global error handling middleware
 * Catches all errors, logs them appropriately, and returns standardized error responses
 */
export const errorHandler = (
  error: Error | GameDayError,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  // Generate correlation ID if not present
  const correlationId = (error as GameDayError).correlationId || uuidv4();

  // Get logger instance
  const logger = Logger.getInstance({
    serviceName: 'error-handler',
    environment: process.env.NODE_ENV || 'development'
  });

  // Set correlation ID for request tracking
  logger.setCorrelationId(correlationId);

  // Capture request context
  const requestContext = {
    url: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      authorization: '[REDACTED]' // Redact sensitive headers
    },
    query: req.query,
    body: req.body,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  // Determine error code and type
  const errorCode = (error as GameDayError).code || ErrorCode.INTERNAL_SERVER_ERROR;
  const errorType = (error as GameDayError).type || ErrorType.INTERNAL;
  const errorSeverity = (error as GameDayError).severity || ErrorSeverity.MEDIUM;

  // Log error with context
  logger.error(
    `Error occurred during request processing: ${error.message}`,
    error,
    {
      errorCode,
      errorType,
      severity: errorSeverity,
      correlationId,
      request: requestContext,
      stack: error.stack,
      context: (error as GameDayError).context || {}
    }
  );

  // Determine HTTP status code
  const httpStatus = ErrorCodeStatusMap[errorCode] || HttpStatus.INTERNAL_SERVER_ERROR;

  // Prepare client-safe error message
  const clientMessage = SAFE_ERROR_CODES.has(errorCode)
    ? error.message
    : DEFAULT_ERROR_MESSAGE;

  // Prepare error response
  const errorResponse: ErrorResponse = {
    status: 'error',
    code: errorCode,
    message: clientMessage,
    correlationId,
    timestamp: new Date().toISOString()
  };

  // Add additional details for safe error codes
  if (SAFE_ERROR_CODES.has(errorCode) && (error as GameDayError).context) {
    errorResponse.details = (error as GameDayError).context;
  }

  // Trigger alerts for critical errors
  if (errorSeverity === ErrorSeverity.CRITICAL) {
    // Implement alert triggering logic here
    logger.error('CRITICAL ERROR - Triggering alerts', error, {
      correlationId,
      severity: ErrorSeverity.CRITICAL
    });
  }

  // Send error response
  return res.status(httpStatus).json(errorResponse);
};

/**
 * Helper function to create a GameDayError with validation error details
 */
export const createValidationError = (
  message: string,
  details: Record<string, any>
): GameDayError => {
  return new GameDayError(
    message,
    ErrorCode.VALIDATION_ERROR,
    ErrorType.VALIDATION,
    ErrorSeverity.LOW,
    details
  );
};

/**
 * Helper function to create a GameDayError for not found resources
 */
export const createNotFoundError = (
  resourceType: string,
  resourceId: string
): GameDayError => {
  return new GameDayError(
    `${resourceType} with ID ${resourceId} not found`,
    ErrorCode.RESOURCE_NOT_FOUND,
    ErrorType.NOT_FOUND,
    ErrorSeverity.LOW,
    { resourceType, resourceId }
  );
};