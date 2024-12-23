/**
 * @fileoverview Controller handling HTTP requests for exercise inject management.
 * Implements comprehensive inject creation, scheduling, delivery and status updates
 * with enhanced real-time tracking and compliance validation capabilities.
 * @version 1.0.0
 */

import { Request, Response } from 'express'; // v4.18.2
import { injectable, inject } from 'inversify'; // v6.0.x
import { ObjectId } from 'mongodb'; // v6.0.x
import rateLimit from 'express-rate-limit'; // v7.1.x
import CircuitBreaker from 'opossum'; // v7.1.x
import { IInject, InjectType, InjectStatus } from '../interfaces/inject.interface';
import { InjectService } from '../services/inject.service';
import { 
  errorHandler, 
  GameDayError, 
  createValidationError, 
  createNotFoundError 
} from '../../shared/middleware/error-handler.middleware';
import { ErrorCode } from '../../shared/constants/error-codes';
import { HttpStatus } from '../../shared/constants/http-status';
import Logger from '../../shared/utils/logger.util';

/**
 * Rate limiting configuration for inject endpoints
 */
const rateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please try again later'
};

/**
 * Circuit breaker configuration for external service calls
 */
const circuitBreakerConfig = {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000 // 30 seconds
};

/**
 * Controller handling all inject-related HTTP endpoints with enhanced
 * real-time tracking and compliance validation capabilities.
 */
@injectable()
export class InjectController {
  private readonly logger: Logger;
  private readonly rateLimiter: typeof rateLimit;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(
    @inject('InjectService') private readonly injectService: InjectService,
    @inject('Logger') logger: Logger
  ) {
    this.logger = logger;
    this.rateLimiter = rateLimit(rateLimitConfig);
    this.circuitBreaker = new CircuitBreaker(this.deliverInject.bind(this), circuitBreakerConfig);
  }

  /**
   * Creates a new exercise inject with compliance validation
   * @route POST /api/v1/exercises/:exerciseId/injects
   */
  public async createInject(req: Request, res: Response): Promise<Response> {
    try {
      const { exerciseId } = req.params;
      const injectData: Partial<IInject> = {
        ...req.body,
        exerciseId: new ObjectId(exerciseId)
      };

      // Validate required fields
      if (!injectData.type || !injectData.content || !injectData.expectedResponse) {
        throw createValidationError('Missing required inject fields', {
          required: ['type', 'content', 'expectedResponse']
        });
      }

      // Create inject with compliance validation
      const createdInject = await this.injectService.createInject(injectData);

      this.logger.info('Inject created successfully', {
        injectId: createdInject.id,
        exerciseId
      });

      return res.status(HttpStatus.CREATED).json({
        status: 'success',
        data: createdInject
      });
    } catch (error) {
      return errorHandler(error, req, res, null!);
    }
  }

  /**
   * Schedules an inject for delivery
   * @route POST /api/v1/exercises/:exerciseId/injects/:injectId/schedule
   */
  public async scheduleInject(req: Request, res: Response): Promise<Response> {
    try {
      const { injectId } = req.params;
      const { scheduledTime } = req.body;

      if (!scheduledTime) {
        throw createValidationError('Scheduled time is required', {
          required: ['scheduledTime']
        });
      }

      const scheduledInject = await this.injectService.scheduleInject(
        injectId,
        new Date(scheduledTime)
      );

      this.logger.info('Inject scheduled successfully', {
        injectId,
        scheduledTime
      });

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: scheduledInject
      });
    } catch (error) {
      return errorHandler(error, req, res, null!);
    }
  }

  /**
   * Delivers an inject with retry mechanism and circuit breaker
   * @route POST /api/v1/exercises/:exerciseId/injects/:injectId/deliver
   */
  public async deliverInject(req: Request, res: Response): Promise<Response> {
    try {
      const { injectId } = req.params;

      const deliveredInject = await this.circuitBreaker.fire(injectId);

      this.logger.info('Inject delivered successfully', {
        injectId,
        status: deliveredInject.status
      });

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: deliveredInject
      });
    } catch (error) {
      return errorHandler(error, req, res, null!);
    }
  }

  /**
   * Retrieves an inject by ID with caching
   * @route GET /api/v1/exercises/:exerciseId/injects/:injectId
   */
  public async getInjectById(req: Request, res: Response): Promise<Response> {
    try {
      const { injectId } = req.params;
      const inject = await this.injectService.getInjectById(injectId);

      if (!inject) {
        throw createNotFoundError('Inject', injectId);
      }

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: inject
      });
    } catch (error) {
      return errorHandler(error, req, res, null!);
    }
  }

  /**
   * Retrieves all injects for an exercise
   * @route GET /api/v1/exercises/:exerciseId/injects
   */
  public async getExerciseInjects(req: Request, res: Response): Promise<Response> {
    try {
      const { exerciseId } = req.params;
      const injects = await this.injectService.getInjectsByExercise(exerciseId);

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: injects
      });
    } catch (error) {
      return errorHandler(error, req, res, null!);
    }
  }

  /**
   * Updates inject status with validation
   * @route PATCH /api/v1/exercises/:exerciseId/injects/:injectId/status
   */
  public async updateInjectStatus(req: Request, res: Response): Promise<Response> {
    try {
      const { injectId } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(InjectStatus).includes(status)) {
        throw createValidationError('Invalid inject status', {
          allowedValues: Object.values(InjectStatus)
        });
      }

      const updatedInject = await this.injectService.updateInjectStatus(
        injectId,
        status
      );

      this.logger.info('Inject status updated successfully', {
        injectId,
        newStatus: status
      });

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: updatedInject
      });
    } catch (error) {
      return errorHandler(error, req, res, null!);
    }
  }

  /**
   * Validates inject compliance requirements
   * @route POST /api/v1/exercises/:exerciseId/injects/:injectId/validate
   */
  public async validateInjectCompliance(req: Request, res: Response): Promise<Response> {
    try {
      const { injectId } = req.params;
      const isValid = await this.injectService.validateInjectCompliance(injectId);

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          injectId,
          isCompliant: isValid
        }
      });
    } catch (error) {
      return errorHandler(error, req, res, null!);
    }
  }
}

export default InjectController;