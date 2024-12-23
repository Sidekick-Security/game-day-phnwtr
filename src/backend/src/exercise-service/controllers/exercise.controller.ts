/**
 * @fileoverview Exercise controller implementing comprehensive RESTful APIs for exercise management
 * with enhanced security, validation, and error handling capabilities.
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // v6.0.x
import { 
  controller, 
  httpGet, 
  httpPost, 
  httpPut, 
  httpPatch,
  rateLimit 
} from 'inversify-express-utils'; // v6.4.x
import { Request, Response } from 'express'; // v4.18.2
import { ObjectId } from 'mongodb'; // v6.0.x

import { ExerciseService } from '../services/exercise.service';
import { 
  IExercise, 
  ExerciseType, 
  ExerciseStatus,
  ExerciseComplexity 
} from '../interfaces/exercise.interface';
import { GameDayError } from '../../shared/middleware/error-handler.middleware';
import { Logger } from '../../shared/utils/logger.util';
import { validationMiddleware } from '../middleware/validation.middleware';
import { ErrorCode } from '../../shared/constants/error-codes';
import { HttpStatus } from '../../shared/constants/http-status';

/**
 * Controller handling exercise management endpoints with comprehensive security
 * and validation measures.
 */
@injectable()
@controller('/api/v1/exercises')
@rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }) // 100 requests per 15 minutes
export class ExerciseController {
  constructor(
    @inject(ExerciseService) private readonly exerciseService: ExerciseService,
    @inject(Logger) private readonly logger: Logger
  ) {}

  /**
   * Creates a new exercise with AI-driven scenario generation
   * @route POST /api/v1/exercises
   */
  @httpPost('/')
  @validationMiddleware(CreateExerciseDto)
  @rateLimit({ windowMs: 60 * 1000, max: 5 }) // 5 creates per minute
  async createExercise(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;
    this.logger.setCorrelationId(correlationId);

    try {
      const exerciseData = req.body;
      const exercise = await this.exerciseService.createExercise(
        exerciseData,
        exerciseData.complianceSettings,
        exerciseData.aiSettings
      );

      this.logger.info('Exercise created successfully', {
        exerciseId: exercise.id,
        type: exercise.type
      });

      return res.status(HttpStatus.CREATED).json({
        status: 'success',
        data: exercise,
        correlationId
      });
    } catch (error) {
      throw new GameDayError(
        'Failed to create exercise',
        ErrorCode.INTERNAL_SERVER_ERROR,
        'INTERNAL',
        'HIGH',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves exercise by ID with caching
   * @route GET /api/v1/exercises/:id
   */
  @httpGet('/:id')
  async getExercise(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;
    this.logger.setCorrelationId(correlationId);

    try {
      const exercise = await this.exerciseService.getExerciseById(req.params.id);
      
      if (!exercise) {
        throw new GameDayError(
          'Exercise not found',
          ErrorCode.EXERCISE_NOT_FOUND,
          'NOT_FOUND',
          'LOW',
          { exerciseId: req.params.id }
        );
      }

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: exercise,
        correlationId
      });
    } catch (error) {
      throw error instanceof GameDayError ? error : new GameDayError(
        'Failed to retrieve exercise',
        ErrorCode.INTERNAL_SERVER_ERROR,
        'INTERNAL',
        'MEDIUM',
        { originalError: error.message }
      );
    }
  }

  /**
   * Retrieves all exercises for an organization
   * @route GET /api/v1/exercises/organization/:orgId
   */
  @httpGet('/organization/:orgId')
  async getOrganizationExercises(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;
    this.logger.setCorrelationId(correlationId);

    try {
      const exercises = await this.exerciseService.getOrganizationExercises(
        new ObjectId(req.params.orgId)
      );

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: exercises,
        correlationId
      });
    } catch (error) {
      throw new GameDayError(
        'Failed to retrieve organization exercises',
        ErrorCode.INTERNAL_SERVER_ERROR,
        'INTERNAL',
        'MEDIUM',
        { organizationId: req.params.orgId }
      );
    }
  }

  /**
   * Schedules an exercise with participant notification
   * @route PUT /api/v1/exercises/:id/schedule
   */
  @httpPut('/:id/schedule')
  @validationMiddleware(ScheduleExerciseDto)
  async scheduleExercise(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;
    this.logger.setCorrelationId(correlationId);

    try {
      const exercise = await this.exerciseService.scheduleExercise(
        req.params.id,
        new Date(req.body.scheduledStartTime)
      );

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: exercise,
        correlationId
      });
    } catch (error) {
      throw new GameDayError(
        'Failed to schedule exercise',
        ErrorCode.INTERNAL_SERVER_ERROR,
        'INTERNAL',
        'HIGH',
        { exerciseId: req.params.id }
      );
    }
  }

  /**
   * Starts an exercise with real-time coordination
   * @route PATCH /api/v1/exercises/:id/start
   */
  @httpPatch('/:id/start')
  async startExercise(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;
    this.logger.setCorrelationId(correlationId);

    try {
      const exercise = await this.exerciseService.startExercise(req.params.id);

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: exercise,
        correlationId
      });
    } catch (error) {
      throw new GameDayError(
        'Failed to start exercise',
        ErrorCode.INTERNAL_SERVER_ERROR,
        'INTERNAL',
        'CRITICAL',
        { exerciseId: req.params.id }
      );
    }
  }

  /**
   * Pauses an in-progress exercise
   * @route PATCH /api/v1/exercises/:id/pause
   */
  @httpPatch('/:id/pause')
  async pauseExercise(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;
    this.logger.setCorrelationId(correlationId);

    try {
      const exercise = await this.exerciseService.pauseExercise(req.params.id);

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: exercise,
        correlationId
      });
    } catch (error) {
      throw new GameDayError(
        'Failed to pause exercise',
        ErrorCode.INTERNAL_SERVER_ERROR,
        'INTERNAL',
        'HIGH',
        { exerciseId: req.params.id }
      );
    }
  }

  /**
   * Resumes a paused exercise
   * @route PATCH /api/v1/exercises/:id/resume
   */
  @httpPatch('/:id/resume')
  async resumeExercise(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;
    this.logger.setCorrelationId(correlationId);

    try {
      const exercise = await this.exerciseService.resumeExercise(req.params.id);

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: exercise,
        correlationId
      });
    } catch (error) {
      throw new GameDayError(
        'Failed to resume exercise',
        ErrorCode.INTERNAL_SERVER_ERROR,
        'INTERNAL',
        'HIGH',
        { exerciseId: req.params.id }
      );
    }
  }

  /**
   * Completes an exercise and generates analysis
   * @route PATCH /api/v1/exercises/:id/complete
   */
  @httpPatch('/:id/complete')
  async completeExercise(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string;
    this.logger.setCorrelationId(correlationId);

    try {
      const exercise = await this.exerciseService.completeExercise(req.params.id);

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: exercise,
        correlationId
      });
    } catch (error) {
      throw new GameDayError(
        'Failed to complete exercise',
        ErrorCode.INTERNAL_SERVER_ERROR,
        'INTERNAL',
        'HIGH',
        { exerciseId: req.params.id }
      );
    }
  }
}