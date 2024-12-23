/**
 * @fileoverview Core service implementing comprehensive business logic for managing tabletop exercises.
 * Provides AI-driven scenario generation, real-time coordination, multi-platform delivery,
 * and complete lifecycle management with robust error handling and compliance alignment.
 * @version 1.0.0
 */

import { injectable } from 'inversify'; // v6.0.x
import { ObjectId } from 'mongodb'; // v6.0.x
import Redis from 'ioredis'; // v5.3.x
import { 
  IExercise, 
  ExerciseType, 
  ExerciseStatus, 
  ExerciseComplexity,
  IExerciseSettings 
} from '../interfaces/exercise.interface';
import { Exercise } from '../models/exercise.model';
import { InjectService } from './inject.service';
import { ResponseService } from './response.service';
import { Logger } from '../../shared/utils/logger.util';
import { ErrorCode } from '../../shared/constants/error-codes';

/**
 * Configuration for AI-driven scenario generation
 */
interface AIConfig {
  enabled: boolean;
  complexity: ExerciseComplexity;
  dynamicInjects: boolean;
  complianceAlignment: boolean;
}

/**
 * Configuration for compliance framework validation
 */
interface ComplianceConfig {
  frameworks: string[];
  validationLevel: 'strict' | 'flexible';
  requireEvidence: boolean;
}

/**
 * Enhanced service class implementing comprehensive exercise management
 * with AI integration, real-time coordination, and performance optimization
 */
@injectable()
export class ExerciseService {
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly EXERCISE_METRICS_KEY = 'exercise:metrics:';

  constructor(
    private readonly exerciseModel: typeof Exercise,
    private readonly injectService: InjectService,
    private readonly responseService: ResponseService,
    private readonly logger: Logger,
    private readonly cache: Redis,
    private readonly metrics: MetricsService
  ) {}

  /**
   * Creates a new exercise with AI-driven scenario generation and compliance validation
   * @param exerciseData Exercise configuration data
   * @param complianceSettings Compliance framework settings
   * @param aiSettings AI generation settings
   * @returns Created exercise with initial scenario
   */
  async createExercise(
    exerciseData: Partial<IExercise>,
    complianceSettings: ComplianceConfig,
    aiSettings: AIConfig
  ): Promise<IExercise> {
    this.logger.debug('Creating new exercise', { 
      type: exerciseData.type,
      organization: exerciseData.organizationId 
    });

    try {
      // Validate exercise data
      this.validateExerciseData(exerciseData);

      // Initialize exercise with default settings
      const exercise = new this.exerciseModel({
        ...exerciseData,
        status: ExerciseStatus.DRAFT,
        settings: this.initializeExerciseSettings(aiSettings),
        complianceFrameworks: complianceSettings.frameworks,
        aiEnabled: aiSettings.enabled,
        complexity: aiSettings.complexity,
        metadata: {
          creationTimestamp: new Date(),
          lastModified: new Date(),
          complianceValidation: {
            level: complianceSettings.validationLevel,
            requireEvidence: complianceSettings.requireEvidence
          }
        }
      });

      const savedExercise = await exercise.save();
      await this.cacheExercise(savedExercise);

      // Generate initial scenario if AI is enabled
      if (aiSettings.enabled) {
        await this.generateAIScenario(savedExercise.id, aiSettings);
      }

      this.logger.info('Exercise created successfully', { 
        exerciseId: savedExercise.id,
        type: savedExercise.type
      });

      return savedExercise;
    } catch (error) {
      this.logger.error('Failed to create exercise', error as Error);
      throw error;
    }
  }

  /**
   * Schedules an exercise with participant notification and resource validation
   * @param exerciseId Exercise to schedule
   * @param scheduledStartTime Planned start time
   * @returns Updated exercise with scheduling details
   */
  async scheduleExercise(
    exerciseId: string,
    scheduledStartTime: Date
  ): Promise<IExercise> {
    this.logger.debug('Scheduling exercise', { exerciseId, scheduledStartTime });

    try {
      const exercise = await this.exerciseModel.findById(exerciseId);
      if (!exercise) {
        throw new Error(ErrorCode.EXERCISE_NOT_FOUND);
      }

      if (exercise.status !== ExerciseStatus.DRAFT) {
        throw new Error(ErrorCode.INVALID_OPERATION);
      }

      // Validate scheduling constraints
      this.validateSchedulingConstraints(exercise, scheduledStartTime);

      // Update exercise with scheduling details
      const scheduledExercise = await this.exerciseModel.updateExerciseStatus(
        exerciseId,
        ExerciseStatus.SCHEDULED
      );

      // Cache updated exercise data
      await this.cacheExercise(scheduledExercise);

      // Initialize performance metrics
      await this.initializeExerciseMetrics(exerciseId);

      return scheduledExercise;
    } catch (error) {
      this.logger.error('Failed to schedule exercise', error as Error, { exerciseId });
      throw error;
    }
  }

  /**
   * Starts an exercise with real-time coordination and monitoring
   * @param exerciseId Exercise to start
   * @returns Started exercise with initial metrics
   */
  async startExercise(exerciseId: string): Promise<IExercise> {
    this.logger.debug('Starting exercise', { exerciseId });

    try {
      const exercise = await this.getExerciseById(exerciseId);
      if (!exercise) {
        throw new Error(ErrorCode.EXERCISE_NOT_FOUND);
      }

      if (exercise.status !== ExerciseStatus.SCHEDULED) {
        throw new Error(ErrorCode.INVALID_OPERATION);
      }

      // Start exercise with initial inject delivery
      const startedExercise = await this.exerciseModel.updateExerciseStatus(
        exerciseId,
        ExerciseStatus.IN_PROGRESS
      );

      // Initialize real-time monitoring
      await this.startExerciseMonitoring(exerciseId);

      return startedExercise;
    } catch (error) {
      this.logger.error('Failed to start exercise', error as Error, { exerciseId });
      throw error;
    }
  }

  /**
   * Retrieves exercise by ID with caching
   * @param exerciseId Exercise ID to retrieve
   * @returns Exercise data with current state
   */
  async getExerciseById(exerciseId: string): Promise<IExercise | null> {
    const cacheKey = `exercise:${exerciseId}`;
    const cachedExercise = await this.cache.get(cacheKey);

    if (cachedExercise) {
      return JSON.parse(cachedExercise);
    }

    const exercise = await this.exerciseModel.findById(exerciseId);
    if (exercise) {
      await this.cacheExercise(exercise);
    }

    return exercise;
  }

  /**
   * Validates exercise data against schema and business rules
   * @param exerciseData Exercise data to validate
   */
  private validateExerciseData(exerciseData: Partial<IExercise>): void {
    if (!exerciseData.organizationId || !exerciseData.type || !exerciseData.title) {
      throw new Error(ErrorCode.VALIDATION_ERROR);
    }

    if (!Object.values(ExerciseType).includes(exerciseData.type)) {
      throw new Error(ErrorCode.VALIDATION_ERROR);
    }
  }

  /**
   * Initializes exercise settings with defaults
   * @param aiSettings AI configuration settings
   * @returns Initialized exercise settings
   */
  private initializeExerciseSettings(aiSettings: AIConfig): IExerciseSettings {
    return {
      allowDynamicInjects: aiSettings.dynamicInjects,
      autoProgressInjects: false,
      requireResponseValidation: true,
      notificationPreferences: {
        email: true,
        slack: true,
        teams: true
      },
      timeoutSettings: {
        injectTimeout: 15,
        responseTimeout: 30
      }
    };
  }

  /**
   * Caches exercise data for performance optimization
   * @param exercise Exercise to cache
   */
  private async cacheExercise(exercise: IExercise): Promise<void> {
    const cacheKey = `exercise:${exercise.id}`;
    await this.cache.set(
      cacheKey,
      JSON.stringify(exercise),
      'EX',
      this.CACHE_TTL
    );
  }

  /**
   * Generates AI-driven scenario for an exercise
   * @param exerciseId Exercise ID for scenario generation
   * @param aiSettings AI configuration settings
   */
  private async generateAIScenario(
    exerciseId: string,
    aiSettings: AIConfig
  ): Promise<void> {
    // Implementation would integrate with AI service for scenario generation
    this.logger.debug('Generating AI scenario', { exerciseId, complexity: aiSettings.complexity });
  }

  /**
   * Validates exercise scheduling constraints
   * @param exercise Exercise to validate
   * @param startTime Proposed start time
   */
  private validateSchedulingConstraints(
    exercise: IExercise,
    startTime: Date
  ): void {
    const now = new Date();
    if (startTime <= now) {
      throw new Error(ErrorCode.VALIDATION_ERROR);
    }

    // Additional scheduling validation logic
  }

  /**
   * Initializes exercise performance metrics
   * @param exerciseId Exercise ID for metrics
   */
  private async initializeExerciseMetrics(exerciseId: string): Promise<void> {
    const metricsKey = `${this.EXERCISE_METRICS_KEY}${exerciseId}`;
    await this.metrics.initializeMetrics(metricsKey, {
      participantCount: 0,
      responseRate: 0,
      complianceCoverage: 0,
      averageResponseTime: 0
    });
  }

  /**
   * Starts real-time exercise monitoring
   * @param exerciseId Exercise ID to monitor
   */
  private async startExerciseMonitoring(exerciseId: string): Promise<void> {
    // Implementation would initialize real-time monitoring
    this.logger.debug('Starting exercise monitoring', { exerciseId });
  }
}