/**
 * @fileoverview Express router configuration for inject-related endpoints in the exercise service.
 * Implements secure, scalable routes for managing scenario events including creation,
 * scheduling, delivery and status management during tabletop exercises.
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import { container } from 'inversify'; // v6.0.x
import cors from 'cors'; // v2.8.x
import { body, param, query, validationResult } from 'express-validator'; // v7.0.x
import { RateLimiterMemory } from 'rate-limiter-flexible'; // v2.4.x
import { InjectController } from '../controllers/inject.controller';
import { errorHandler } from '../../shared/middleware/error-handler.middleware';
import { InjectType, InjectStatus } from '../interfaces/inject.interface';
import { HttpStatus } from '../../shared/constants/http-status';

// Base route for API endpoints
const INJECT_ROUTES_BASE = '/api/v1';

// Rate limiting configuration
const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per minute
  blockDuration: 60 * 2 // Block for 2 minutes if exceeded
});

/**
 * Configures and returns an Express router with all inject-related routes
 * @returns Configured Express router instance
 */
export const configureInjectRoutes = (): Router => {
  const router = Router({ strict: true });
  const injectController = container.get<InjectController>(InjectController);

  // Configure CORS with secure options
  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600 // 10 minutes
  }));

  // Rate limiting middleware
  const rateLimitMiddleware = async (req: any, res: any, next: any) => {
    try {
      await rateLimiter.consume(req.ip);
      next();
    } catch {
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        status: 'error',
        message: 'Too many requests, please try again later'
      });
    }
  };

  // Create new inject
  router.post(
    `${INJECT_ROUTES_BASE}/exercises/:exerciseId/injects`,
    rateLimitMiddleware,
    [
      param('exerciseId').isMongoId().withMessage('Invalid exercise ID'),
      body('type').isIn(Object.values(InjectType)).withMessage('Invalid inject type'),
      body('content').isString().notEmpty().withMessage('Content is required'),
      body('expectedResponse').isString().notEmpty().withMessage('Expected response is required'),
      body('timeoutMinutes').isInt({ min: 1 }).withMessage('Valid timeout duration required'),
      body('targetRoles').isArray().notEmpty().withMessage('Target roles required')
    ],
    injectController.createInject.bind(injectController)
  );

  // Schedule inject
  router.put(
    `${INJECT_ROUTES_BASE}/exercises/:exerciseId/injects/:injectId/schedule`,
    rateLimitMiddleware,
    [
      param('exerciseId').isMongoId().withMessage('Invalid exercise ID'),
      param('injectId').isMongoId().withMessage('Invalid inject ID'),
      body('scheduledTime').isISO8601().withMessage('Valid scheduled time required')
    ],
    injectController.scheduleInject.bind(injectController)
  );

  // Deliver inject
  router.post(
    `${INJECT_ROUTES_BASE}/exercises/:exerciseId/injects/:injectId/deliver`,
    rateLimitMiddleware,
    [
      param('exerciseId').isMongoId().withMessage('Invalid exercise ID'),
      param('injectId').isMongoId().withMessage('Invalid inject ID')
    ],
    injectController.deliverInject.bind(injectController)
  );

  // Get inject by ID
  router.get(
    `${INJECT_ROUTES_BASE}/exercises/:exerciseId/injects/:injectId`,
    [
      param('exerciseId').isMongoId().withMessage('Invalid exercise ID'),
      param('injectId').isMongoId().withMessage('Invalid inject ID')
    ],
    injectController.getInjectById.bind(injectController)
  );

  // Get exercise injects
  router.get(
    `${INJECT_ROUTES_BASE}/exercises/:exerciseId/injects`,
    [
      param('exerciseId').isMongoId().withMessage('Invalid exercise ID'),
      query('page').optional().isInt({ min: 1 }).withMessage('Invalid page number'),
      query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit')
    ],
    injectController.getExerciseInjects.bind(injectController)
  );

  // Update inject status
  router.put(
    `${INJECT_ROUTES_BASE}/exercises/:exerciseId/injects/:injectId/status`,
    rateLimitMiddleware,
    [
      param('exerciseId').isMongoId().withMessage('Invalid exercise ID'),
      param('injectId').isMongoId().withMessage('Invalid inject ID'),
      body('status').isIn(Object.values(InjectStatus)).withMessage('Invalid status')
    ],
    injectController.updateInjectStatus.bind(injectController)
  );

  // Validation middleware
  router.use((req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    next();
  });

  // Error handling middleware
  router.use(errorHandler);

  return router;
};

export default configureInjectRoutes;