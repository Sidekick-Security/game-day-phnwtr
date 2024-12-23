/**
 * @fileoverview Express router configuration for response-related endpoints in the exercise service.
 * Implements secure, monitored, and performance-optimized routes for managing participant responses
 * during tabletop exercises with comprehensive security controls and compliance features.
 * @version 1.0.0
 */

import express, { Router } from 'express'; // v4.18.2
import compression from 'compression'; // v1.7.4
import helmet from 'helmet'; // v7.1.0
import rateLimit from 'express-rate-limit'; // v6.7.0
import { ResponseController } from '../controllers/response.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validationMiddleware } from '../middleware/validation.middleware';

/**
 * DTO for creating new responses with validation
 */
class CreateResponseDto {
  readonly exerciseId!: string;
  readonly injectId!: string;
  readonly content!: string;
  readonly attachments?: string[];
}

/**
 * DTO for response validation with compliance mapping
 */
class ValidationDto {
  readonly validation!: string;
  readonly validatorNotes!: string;
  readonly complianceGaps?: string[];
}

/**
 * Rate limiting configuration for response endpoints
 */
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Configures and returns an Express router with secure, monitored response-related routes
 * @param responseController Initialized ResponseController instance
 * @returns Configured Express router
 */
export function configureResponseRoutes(responseController: ResponseController): Router {
  const router = express.Router();

  // Apply security middleware
  router.use(helmet());
  router.use(compression());
  router.use(rateLimiter);

  /**
   * POST /responses
   * Creates a new response with validation and security controls
   */
  router.post(
    '/',
    authenticate,
    validationMiddleware(CreateResponseDto),
    async (req, res, next) => {
      try {
        const response = await responseController.createResponse(req.body);
        res.status(201).json({
          success: true,
          data: response,
          message: 'Response created successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /responses/:responseId/submit
   * Submits a response for validation with security controls
   */
  router.put(
    '/:responseId/submit',
    authenticate,
    async (req, res, next) => {
      try {
        const response = await responseController.submitResponse(req.params.responseId);
        res.status(200).json({
          success: true,
          data: response,
          message: 'Response submitted successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /responses/:responseId/validate
   * Validates a submitted response with role-based access control
   */
  router.put(
    '/:responseId/validate',
    authenticate,
    authorize(['facilitator', 'admin']),
    validationMiddleware(ValidationDto),
    async (req, res, next) => {
      try {
        const response = await responseController.validateResponse(
          req.params.responseId,
          req.body
        );
        res.status(200).json({
          success: true,
          data: response,
          message: 'Response validated successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /responses/exercise/:exerciseId
   * Retrieves paginated responses for a specific exercise
   */
  router.get(
    '/exercise/:exerciseId',
    authenticate,
    async (req, res, next) => {
      try {
        const responses = await responseController.getExerciseResponses(
          req.params.exerciseId
        );
        res.status(200).json({
          success: true,
          data: responses,
          message: 'Exercise responses retrieved successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /responses/inject/:injectId
   * Retrieves paginated responses for a specific inject
   */
  router.get(
    '/inject/:injectId',
    authenticate,
    async (req, res, next) => {
      try {
        const responses = await responseController.getInjectResponses(
          req.params.injectId
        );
        res.status(200).json({
          success: true,
          data: responses,
          message: 'Inject responses retrieved successfully'
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

// Export configured router
export const responseRouter = configureResponseRoutes(new ResponseController());