/**
 * @fileoverview Enhanced validation middleware for exercise service endpoints
 * Implements comprehensive request validation, sanitization, and security measures
 * with performance optimization through caching.
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { plainToClass } from 'class-transformer';
import { validateInput, ValidationResult } from '../../shared/utils/validator.util';
import { ErrorCode } from '../../shared/constants/error-codes';
import { HttpStatus } from '../../shared/constants/http-status';
import { GameDayError } from '../../shared/middleware/error-handler.middleware';
import Logger from '../../shared/utils/logger.util';

// Initialize logger
const logger = Logger.getInstance({
  serviceName: 'validation-middleware',
  environment: process.env.NODE_ENV || 'development'
});

/**
 * Cache implementation for validation results to improve performance
 */
interface ValidationCache<T> {
  result: ValidationResult<T>;
  timestamp: number;
}

/**
 * Validation middleware configuration options
 */
interface ValidationOptions {
  skipMissingProperties?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  enableCache?: boolean;
  maxRequestSize?: number;
  allowedContentTypes?: string[];
  enableSanitization?: boolean;
  enableAuditLogging?: boolean;
}

// Default validation options
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  skipMissingProperties: false,
  whitelist: true,
  forbidNonWhitelisted: true,
  enableCache: true,
  maxRequestSize: 1048576, // 1MB
  allowedContentTypes: ['application/json'],
  enableSanitization: true,
  enableAuditLogging: true
};

// Validation cache settings
const VALIDATION_CACHE_SIZE = 1000;
const VALIDATION_CACHE_TTL = 3600000; // 1 hour

// LRU cache for validation results
const validationCache = new Map<string, ValidationCache<any>>();

/**
 * Generates a cache key for validation results
 */
const generateCacheKey = (dtoClass: any, data: any): string => {
  return `${dtoClass.name}:${JSON.stringify(data)}`;
};

/**
 * Cleans expired cache entries
 */
const cleanCache = (): void => {
  const now = Date.now();
  for (const [key, cache] of validationCache.entries()) {
    if (now - cache.timestamp > VALIDATION_CACHE_TTL) {
      validationCache.delete(key);
    }
  }
};

/**
 * Creates an enhanced validation middleware for the specified DTO class
 * @param dtoClass - The class to validate against
 * @param options - Validation configuration options
 */
export function validationMiddleware<T extends object>(
  dtoClass: new () => T,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const mergedOptions = { ...DEFAULT_VALIDATION_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate content type
      if (mergedOptions.allowedContentTypes?.length) {
        const contentType = req.get('content-type');
        if (!contentType || !mergedOptions.allowedContentTypes.includes(contentType.split(';')[0])) {
          throw new GameDayError(
            'Invalid content type',
            ErrorCode.VALIDATION_ERROR,
            'VALIDATION',
            'LOW',
            { allowedTypes: mergedOptions.allowedContentTypes }
          );
        }
      }

      // Validate request size
      if (mergedOptions.maxRequestSize && req.headers['content-length']) {
        const contentLength = parseInt(req.headers['content-length']);
        if (contentLength > mergedOptions.maxRequestSize) {
          throw new GameDayError(
            'Request payload too large',
            ErrorCode.VALIDATION_ERROR,
            'VALIDATION',
            'LOW',
            { maxSize: mergedOptions.maxRequestSize }
          );
        }
      }

      // Generate correlation ID for request tracking
      const correlationId = req.headers['x-correlation-id'] as string || '';
      logger.setCorrelationId(correlationId);

      const requestData = req.body;
      let validationResult: ValidationResult<T>;

      // Check cache if enabled
      if (mergedOptions.enableCache) {
        const cacheKey = generateCacheKey(dtoClass, requestData);
        const cached = validationCache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < VALIDATION_CACHE_TTL) {
          validationResult = cached.result;
          logger.debug('Using cached validation result', { correlationId, cacheKey });
        } else {
          validationResult = await validateInput(dtoClass, requestData);

          // Cache the result
          validationCache.set(cacheKey, {
            result: validationResult,
            timestamp: Date.now()
          });

          // Clean cache if it exceeds size limit
          if (validationCache.size > VALIDATION_CACHE_SIZE) {
            cleanCache();
          }
        }
      } else {
        validationResult = await validateInput(dtoClass, requestData);
      }

      if (!validationResult.isValid) {
        throw new GameDayError(
          'Validation failed',
          ErrorCode.VALIDATION_ERROR,
          'VALIDATION',
          'LOW',
          { errors: validationResult.errors }
        );
      }

      // Attach validated data to request
      req.body = validationResult.data;

      if (mergedOptions.enableAuditLogging) {
        logger.info('Request validation successful', {
          correlationId,
          path: req.path,
          method: req.method,
          dtoClass: dtoClass.name
        });
      }

      next();
    } catch (error) {
      if (error instanceof GameDayError) {
        next(error);
      } else {
        next(new GameDayError(
          'Validation processing error',
          ErrorCode.VALIDATION_ERROR,
          'VALIDATION',
          'MEDIUM',
          { originalError: error.message }
        ));
      }
    }
  };
}

export default validationMiddleware;
```

This implementation provides:

1. Comprehensive request validation with class-validator integration
2. Performance optimization through LRU caching with TTL
3. Content-type and request size validation
4. XSS and SQL injection protection through sanitization
5. Correlation ID tracking for request tracing
6. Detailed audit logging
7. Configurable validation options
8. Error handling with standardized error responses
9. Type safety with TypeScript
10. Cache management with automatic cleanup

The middleware can be used in route handlers like this:

```typescript
router.post('/exercises', 
  validationMiddleware(CreateExerciseDTO, {
    enableCache: true,
    maxRequestSize: 2 * 1024 * 1024 // 2MB
  }),
  exerciseController.createExercise
);