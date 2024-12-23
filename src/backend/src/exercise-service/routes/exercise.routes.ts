/**
 * @fileoverview Express router configuration for exercise management endpoints
 * Implements comprehensive security controls, validation, rate limiting, and monitoring
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import { container } from 'inversify'; // v6.0.x
import helmet from 'helmet'; // v7.1.0
import cors from 'cors'; // v2.8.5
import rateLimit from 'express-rate-limit'; // v7.1.0

import { ExerciseController } from '../controllers/exercise.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import { Logger } from '../../shared/utils/logger.util';
import { ErrorCode } from '../../shared/constants/error-codes';
import { HttpStatus } from '../../shared/constants/http-status';

// Initialize router and logger
const router = Router();
const logger = Logger.getInstance({
  serviceName: 'exercise-routes',
  environment: process.env.NODE_ENV || 'development'
});

// Apply security middleware
router.use(helmet({
  contentSecurityPolicy: true,
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: true,
  dnsPrefetchControl: true,
  frameguard: true,
  hidePoweredBy: true,
  hsts: true,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: true,
  referrerPolicy: true,
  xssFilter: true
}));

router.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(HttpStatus.TOO_MANY_REQUESTS).json({
      status: 'error',
      code: ErrorCode.RATE_LIMIT_ERROR,
      message: 'Too many requests, please try again later'
    });
  }
});

router.use(limiter);

// Get controller instance from container
const exerciseController = container.get<ExerciseController>(ExerciseController);

// Exercise creation endpoint
router.post('/',
  authenticate,
  authorize(['admin', 'exercise_admin']),
  validateRequest('CreateExerciseDto'),
  rateLimit({ windowMs: 60 * 1000, max: 5 }), // 5 creates per minute
  async (req, res, next) => {
    try {
      const result = await exerciseController.createExercise(req, res);
      logger.info('Exercise created successfully', {
        exerciseId: result.data?.id,
        userId: req.user?.id
      });
      return result;
    } catch (error) {
      next(error);
    }
  }
);

// Get exercise by ID endpoint
router.get('/:id',
  authenticate,
  validateRequest('GetExerciseDto'),
  async (req, res, next) => {
    try {
      return await exerciseController.getExercise(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Get organization exercises endpoint
router.get('/organization/:orgId',
  authenticate,
  validateRequest('GetOrganizationExercisesDto'),
  async (req, res, next) => {
    try {
      return await exerciseController.getOrganizationExercises(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Schedule exercise endpoint
router.patch('/:id/schedule',
  authenticate,
  authorize(['admin', 'exercise_admin']),
  validateRequest('ScheduleExerciseDto'),
  rateLimit({ windowMs: 60 * 1000, max: 10 }), // 10 schedules per minute
  async (req, res, next) => {
    try {
      return await exerciseController.scheduleExercise(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Start exercise endpoint
router.patch('/:id/start',
  authenticate,
  authorize(['admin', 'exercise_admin', 'facilitator']),
  validateRequest('StartExerciseDto'),
  rateLimit({ windowMs: 60 * 1000, max: 10 }), // 10 starts per minute
  async (req, res, next) => {
    try {
      return await exerciseController.startExercise(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Pause exercise endpoint
router.patch('/:id/pause',
  authenticate,
  authorize(['admin', 'exercise_admin', 'facilitator']),
  validateRequest('PauseExerciseDto'),
  rateLimit({ windowMs: 60 * 1000, max: 10 }), // 10 pauses per minute
  async (req, res, next) => {
    try {
      return await exerciseController.pauseExercise(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Resume exercise endpoint
router.patch('/:id/resume',
  authenticate,
  authorize(['admin', 'exercise_admin', 'facilitator']),
  validateRequest('ResumeExerciseDto'),
  rateLimit({ windowMs: 60 * 1000, max: 10 }), // 10 resumes per minute
  async (req, res, next) => {
    try {
      return await exerciseController.resumeExercise(req, res);
    } catch (error) {
      next(error);
    }
  }
);

// Complete exercise endpoint
router.patch('/:id/complete',
  authenticate,
  authorize(['admin', 'exercise_admin', 'facilitator']),
  validateRequest('CompleteExerciseDto'),
  rateLimit({ windowMs: 60 * 1000, max: 10 }), // 10 completes per minute
  async (req, res, next) => {
    try {
      return await exerciseController.completeExercise(req, res);
    } catch (error) {
      next(error);
    }
  }
);

export default router;