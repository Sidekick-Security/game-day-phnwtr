/**
 * @fileoverview Express middleware providing comprehensive request/response logging
 * with ELK Stack integration, distributed tracing, and security monitoring.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { Logger } from '../utils/logger.util';
import { HttpStatus } from '../constants/http-status';
import { HttpMethod } from '../types/common.types';

// Symbols for storing request metadata
const REQUEST_START_TIME = Symbol('requestStartTime');
const CORRELATION_ID_HEADER = 'x-correlation-id';

// Fields that should be masked in logs for security
const LOG_SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret', 'authorization'];
const MAX_BODY_LOG_SIZE = 10000; // Maximum body size to log in bytes

/**
 * Interface for enhanced Express Request with timing data
 */
interface TimedRequest extends Request {
  [REQUEST_START_TIME]?: bigint;
}

/**
 * Masks sensitive data in request/response bodies
 * @param data Object containing potentially sensitive data
 * @returns Sanitized copy of the data
 */
const maskSensitiveData = (data: any): any => {
  if (!data) return data;
  
  if (typeof data === 'object') {
    const masked = { ...data };
    for (const key in masked) {
      if (LOG_SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field))) {
        masked[key] = '[REDACTED]';
      } else if (typeof masked[key] === 'object') {
        masked[key] = maskSensitiveData(masked[key]);
      }
    }
    return masked;
  }
  return data;
};

/**
 * Truncates request/response bodies that exceed size limit
 * @param body Request or response body
 * @returns Truncated body if necessary
 */
const truncateBody = (body: any): any => {
  const stringified = JSON.stringify(body);
  if (stringified.length > MAX_BODY_LOG_SIZE) {
    return {
      _truncated: true,
      _originalSize: stringified.length,
      _preview: stringified.substring(0, MAX_BODY_LOG_SIZE) + '...'
    };
  }
  return body;
};

/**
 * Express middleware that provides comprehensive request/response logging
 * with security monitoring, performance tracking, and distributed tracing.
 */
export const requestLogger = (req: TimedRequest, res: Response, next: NextFunction): void => {
  // Initialize logger instance
  const logger = Logger.getInstance({
    serviceName: 'gameday-platform',
    environment: process.env.NODE_ENV || 'development'
  });

  // Generate or propagate correlation ID for distributed tracing
  const correlationId = req.headers[CORRELATION_ID_HEADER] as string || uuidv4();
  logger.setCorrelationId(correlationId);
  
  // Add correlation ID to response headers
  res.setHeader(CORRELATION_ID_HEADER, correlationId);

  // Start high-resolution timer for request duration tracking
  req[REQUEST_START_TIME] = process.hrtime.bigint();

  // Log incoming request with sanitized data
  const requestLog = {
    correlationId,
    method: req.method,
    path: req.path,
    query: maskSensitiveData(req.query),
    headers: maskSensitiveData(req.headers),
    body: req.method !== HttpMethod.GET ? 
      truncateBody(maskSensitiveData(req.body)) : undefined,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  };

  logger.info('Incoming request', requestLog);

  // Capture response data by overriding res.end
  const originalEnd = res.end;
  let responseBody: any;

  // @ts-ignore - Override res.end to capture response body
  res.end = function(chunk: any, encoding: string): Response {
    if (chunk) {
      responseBody = chunk.toString();
      try {
        responseBody = JSON.parse(responseBody);
      } catch (e) {
        // Response is not JSON, use raw string
      }
    }

    // Calculate request duration
    const duration = Number(process.hrtime.bigint() - req[REQUEST_START_TIME]!) / 1e6; // Convert to ms

    // Log response with performance metrics
    const responseLog = {
      correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      responseSize: chunk ? chunk.length : 0,
      body: truncateBody(maskSensitiveData(responseBody)),
      timestamp: new Date().toISOString()
    };

    // Use appropriate log level based on status code
    if (res.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      logger.error('Request failed', new Error('Server error'), responseLog);
    } else if (res.statusCode >= HttpStatus.BAD_REQUEST) {
      logger.warn('Request failed', responseLog);
    } else {
      logger.info('Request completed', responseLog);
    }

    // Add performance metrics header
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Call original end method
    return originalEnd.apply(res, [chunk, encoding]);
  };

  // Error handling
  const errorHandler = (error: Error): void => {
    logger.error('Request pipeline error', error, {
      correlationId,
      method: req.method,
      path: req.path
    });
  };

  // Attach error handler
  res.on('error', errorHandler);

  // Debug logging for development
  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Request debug info', {
      correlationId,
      cookies: maskSensitiveData(req.cookies),
      session: maskSensitiveData(req.session)
    });
  }

  next();
};

export default requestLogger;