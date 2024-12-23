/**
 * @fileoverview Error handling utilities for the GameDay Platform web application
 * @version 1.0.0
 * 
 * Provides comprehensive error handling, transformation, and reporting functionality
 * with support for internationalization, security, and accessibility requirements.
 */

import i18next from 'i18next'; // v22.0.0
import {
  ErrorCode,
  ErrorMessage,
  ErrorCategory,
  ERROR_CATEGORY_MAP,
  ERROR_SEVERITY_MAP,
  ERROR_SEVERITY_LEVELS,
  DEFAULT_ERROR_MESSAGE
} from '../constants/error.constants';

// Constants
const MAX_ERROR_RETRIES = 3;
const ERROR_LOGGING_ENABLED = process.env.NODE_ENV !== 'production';
const NETWORK_TIMEOUT_MS = 30000;

/**
 * Interface for standardized error response
 */
interface StandardizedError {
  code: ErrorCode;
  message: string;
  category: ErrorCategory;
  severity: keyof typeof ERROR_SEVERITY_LEVELS;
  timestamp: string;
  correlationId?: string;
  details?: Record<string, unknown>;
  aria?: {
    role: string;
    label: string;
    live: 'polite' | 'assertive';
  };
}

/**
 * Options for error handling configuration
 */
interface ErrorHandlingOptions {
  logError?: boolean;
  includeStack?: boolean;
  retry?: boolean;
  maxRetries?: number;
  correlationId?: string;
  locale?: string;
}

/**
 * Safely removes sensitive information from error details
 * @param details - Raw error details object
 * @returns Sanitized error details
 */
const sanitizeErrorDetails = (details: Record<string, unknown>): Record<string, unknown> => {
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'credential'];
  return Object.entries(details).reduce((acc, [key, value]) => {
    if (!sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, unknown>);
};

/**
 * Enhanced network error detection with comprehensive checks
 * @param error - Error object to analyze
 * @returns Boolean indicating if error is network-related
 */
export const isNetworkError = (error: Error): boolean => {
  // Check online status first
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return true;
  }

  // Check various network error signatures
  const networkErrorPatterns = [
    'NetworkError',
    'Failed to fetch',
    'Network request failed',
    'net::ERR_',
    'TypeError: Failed to fetch',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ECONNRESET'
  ];

  return Boolean(
    error.name === 'NetworkError' ||
    networkErrorPatterns.some(pattern => 
      error.message.includes(pattern) || (error.stack && error.stack.includes(pattern))
    ) ||
    (error instanceof TypeError && networkErrorPatterns.some(pattern => error.message.includes(pattern)))
  );
};

/**
 * Formats error messages with i18n support and accessibility considerations
 * @param code - Error code
 * @param message - Raw error message
 * @param options - Formatting options
 * @returns Accessible formatted error message
 */
export const formatErrorMessage = (
  code: ErrorCode,
  message: string,
  options: { locale?: string; interpolation?: Record<string, unknown> } = {}
): string => {
  const { locale = 'en', interpolation = {} } = options;

  // Get localized message template
  const template = i18next.exists(`errors.${code}`)
    ? i18next.t(`errors.${code}`, { lng: locale })
    : message || ErrorMessage[code] || DEFAULT_ERROR_MESSAGE;

  // Interpolate variables if any
  let formattedMessage = template;
  Object.entries(interpolation).forEach(([key, value]) => {
    formattedMessage = formattedMessage.replace(`{{${key}}}`, String(value));
  });

  // Sanitize message content
  formattedMessage = formattedMessage
    .replace(/[<>]/g, '') // Remove potential HTML
    .trim();

  return formattedMessage;
};

/**
 * Transforms API errors into standardized format with security measures
 * @param error - Raw error object
 * @param options - Error handling options
 * @returns Standardized error object
 */
export const handleApiError = (
  error: Error | unknown,
  options: ErrorHandlingOptions = {}
): StandardizedError => {
  const {
    logError = ERROR_LOGGING_ENABLED,
    includeStack = false,
    retry = false,
    maxRetries = MAX_ERROR_RETRIES,
    correlationId,
    locale
  } = options;

  // Initialize default error response
  let standardizedError: StandardizedError = {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    message: DEFAULT_ERROR_MESSAGE,
    category: ErrorCategory.SYSTEM,
    severity: 'ERROR',
    timestamp: new Date().toISOString(),
    correlationId,
    aria: {
      role: 'alert',
      label: 'Error notification',
      live: 'polite'
    }
  };

  try {
    // Handle network errors
    if (error instanceof Error && isNetworkError(error)) {
      standardizedError = {
        ...standardizedError,
        code: ErrorCode.NETWORK_ERROR,
        message: formatErrorMessage(ErrorCode.NETWORK_ERROR, error.message, { locale }),
        category: ERROR_CATEGORY_MAP[ErrorCode.NETWORK_ERROR],
        severity: ERROR_SEVERITY_MAP[ErrorCode.NETWORK_ERROR],
        aria: {
          ...standardizedError.aria,
          live: 'assertive' // Network errors are more urgent
        }
      };
    }
    // Handle API response errors
    else if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status: number; data?: any };
      const errorCode = Object.entries(ErrorCode).find(
        ([_, value]) => value === apiError.status
      )?.[0] as ErrorCode || ErrorCode.INTERNAL_SERVER_ERROR;

      standardizedError = {
        ...standardizedError,
        code: errorCode,
        message: formatErrorMessage(errorCode, apiError.data?.message, { locale }),
        category: ERROR_CATEGORY_MAP[errorCode],
        severity: ERROR_SEVERITY_MAP[errorCode],
        details: apiError.data ? sanitizeErrorDetails(apiError.data) : undefined
      };
    }

    // Log error if enabled
    if (logError) {
      const logData = {
        ...standardizedError,
        stack: includeStack ? (error instanceof Error ? error.stack : undefined) : undefined,
        timestamp: new Date().toISOString()
      };
      console.error('[GameDay Platform Error]:', logData);
    }

    // Handle retry logic if enabled
    if (retry && standardizedError.code === ErrorCode.NETWORK_ERROR && maxRetries > 0) {
      // Implementation of retry logic would go here
      // This is a placeholder for the actual retry implementation
    }

  } catch (e) {
    // Fallback error handling
    console.error('[Error Handler Failure]:', e);
  }

  return standardizedError;
};

/**
 * Type guard to check if an error is a StandardizedError
 * @param error - Error to check
 * @returns Boolean indicating if error is StandardizedError
 */
export const isStandardizedError = (error: unknown): error is StandardizedError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    'category' in error &&
    'severity' in error
  );
};