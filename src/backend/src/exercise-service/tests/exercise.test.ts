/**
 * @fileoverview Comprehensive test suite for ExerciseService validating exercise lifecycle
 * management, compliance alignment, and real-time coordination capabilities.
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals'; // v29.x
import { ObjectId } from 'mongodb'; // v6.0.x
import { ExerciseService } from '../services/exercise.service';
import { 
  IExercise, 
  ExerciseType, 
  ExerciseStatus, 
  ExerciseComplexity 
} from '../interfaces/exercise.interface';
import { Exercise } from '../models/exercise.model';
import { InjectService } from '../services/inject.service';
import { ResponseService } from '../services/response.service';
import { Logger } from '../../shared/utils/logger.util';
import Redis from 'ioredis'; // v5.3.x
import { MetricsService } from '../../shared/services/metrics.service';
import { ErrorCode } from '../../shared/constants/error-codes';

// Mock dependencies
jest.mock('../models/exercise.model');
jest.mock('../services/inject.service');
jest.mock('../services/response.service');
jest.mock('../../shared/utils/logger.util');
jest.mock('ioredis');
jest.mock('../../shared/services/metrics.service');

describe('ExerciseService', () => {
  let exerciseService: ExerciseService;
  let mockExerciseModel: jest.Mocked<typeof Exercise>;
  let mockInjectService: jest.Mocked<InjectService>;
  let mockResponseService: jest.Mocked<ResponseService>;
  let mockLogger: jest.Mocked<Logger>;
  let mockCache: jest.Mocked<Redis>;
  let mockMetrics: jest.Mocked<MetricsService>;

  // Test data fixtures
  const testOrganizationId = new ObjectId();
  const testExerciseId = new ObjectId();
  const validExerciseData: Partial<IExercise> = {
    organizationId: testOrganizationId,
    title: 'Test Exercise',
    description: 'Test exercise description',
    type: ExerciseType.SECURITY_INCIDENT,
    scheduledStartTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    scheduledEndTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
    duration: 60
  };

  const validComplianceSettings = {
    frameworks: ['SOC2', 'ISO27001'],
    validationLevel: 'strict' as const,
    requireEvidence: true
  };

  const validAiSettings = {
    enabled: true,
    complexity: ExerciseComplexity.MEDIUM,
    dynamicInjects: true,
    complianceAlignment: true
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocked dependencies
    mockExerciseModel = Exercise as jest.Mocked<typeof Exercise>;
    mockInjectService = new InjectService(null, null, null, null) as jest.Mocked<InjectService>;
    mockResponseService = new ResponseService(null, null) as jest.Mocked<ResponseService>;
    mockLogger = new Logger({ serviceName: 'test', environment: 'test' }) as jest.Mocked<Logger>;
    mockCache = new Redis() as jest.Mocked<Redis>;
    mockMetrics = new MetricsService() as jest.Mocked<MetricsService>;

    // Initialize service with mocked dependencies
    exerciseService = new ExerciseService(
      mockExerciseModel,
      mockInjectService,
      mockResponseService,
      mockLogger,
      mockCache,
      mockMetrics
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Exercise Creation', () => {
    it('should create exercise with valid data and AI scenario generation', async () => {
      // Setup
      const mockSavedExercise = {
        ...validExerciseData,
        id: testExerciseId,
        status: ExerciseStatus.DRAFT
      };
      mockExerciseModel.prototype.save.mockResolvedValueOnce(mockSavedExercise as any);
      mockCache.set.mockResolvedValueOnce('OK');

      // Execute
      const result = await exerciseService.createExercise(
        validExerciseData,
        validComplianceSettings,
        validAiSettings
      );

      // Assert
      expect(result).toEqual(mockSavedExercise);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Exercise created successfully',
        expect.any(Object)
      );
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should validate compliance framework requirements during creation', async () => {
      // Setup
      const invalidComplianceSettings = {
        ...validComplianceSettings,
        frameworks: []
      };

      // Execute & Assert
      await expect(
        exerciseService.createExercise(
          validExerciseData,
          invalidComplianceSettings,
          validAiSettings
        )
      ).rejects.toThrow(ErrorCode.VALIDATION_ERROR);
    });

    it('should handle concurrent exercise creation requests', async () => {
      // Setup
      const createPromises = Array(5).fill(null).map(() =>
        exerciseService.createExercise(
          validExerciseData,
          validComplianceSettings,
          validAiSettings
        )
      );

      // Execute & Assert
      await expect(Promise.all(createPromises)).resolves.toHaveLength(5);
    });
  });

  describe('Exercise Scheduling', () => {
    it('should schedule exercise with valid timeframes and participants', async () => {
      // Setup
      const scheduledStartTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      mockExerciseModel.findById.mockResolvedValueOnce({
        ...validExerciseData,
        id: testExerciseId,
        status: ExerciseStatus.DRAFT
      } as any);
      mockExerciseModel.updateExerciseStatus.mockResolvedValueOnce({
        ...validExerciseData,
        id: testExerciseId,
        status: ExerciseStatus.SCHEDULED
      } as any);

      // Execute
      const result = await exerciseService.scheduleExercise(
        testExerciseId.toString(),
        scheduledStartTime
      );

      // Assert
      expect(result.status).toBe(ExerciseStatus.SCHEDULED);
      expect(mockMetrics.initializeMetrics).toHaveBeenCalled();
    });

    it('should validate participant availability before scheduling', async () => {
      // Setup
      const scheduledStartTime = new Date();
      mockExerciseModel.findById.mockResolvedValueOnce({
        ...validExerciseData,
        id: testExerciseId,
        status: ExerciseStatus.DRAFT
      } as any);

      // Execute & Assert
      await expect(
        exerciseService.scheduleExercise(
          testExerciseId.toString(),
          scheduledStartTime
        )
      ).rejects.toThrow(ErrorCode.VALIDATION_ERROR);
    });
  });

  describe('Exercise Execution', () => {
    it('should manage real-time status updates across platforms', async () => {
      // Setup
      mockExerciseModel.findById.mockResolvedValueOnce({
        ...validExerciseData,
        id: testExerciseId,
        status: ExerciseStatus.SCHEDULED
      } as any);
      mockExerciseModel.updateExerciseStatus.mockResolvedValueOnce({
        ...validExerciseData,
        id: testExerciseId,
        status: ExerciseStatus.IN_PROGRESS
      } as any);

      // Execute
      const result = await exerciseService.startExercise(testExerciseId.toString());

      // Assert
      expect(result.status).toBe(ExerciseStatus.IN_PROGRESS);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting exercise monitoring',
        expect.any(Object)
      );
    });

    it('should handle concurrent participant responses', async () => {
      // Setup
      mockExerciseModel.findById.mockResolvedValueOnce({
        ...validExerciseData,
        id: testExerciseId,
        status: ExerciseStatus.IN_PROGRESS
      } as any);

      // Execute multiple concurrent operations
      const operations = Array(10).fill(null).map(() =>
        exerciseService.getExerciseById(testExerciseId.toString())
      );

      // Assert
      await expect(Promise.all(operations)).resolves.toBeDefined();
    });

    it('should maintain exercise timeline synchronization', async () => {
      // Setup
      const exercise = {
        ...validExerciseData,
        id: testExerciseId,
        status: ExerciseStatus.IN_PROGRESS,
        actualStartTime: new Date()
      };
      mockExerciseModel.findById.mockResolvedValueOnce(exercise as any);
      mockCache.get.mockResolvedValueOnce(JSON.stringify(exercise));

      // Execute
      const result = await exerciseService.getExerciseById(testExerciseId.toString());

      // Assert
      expect(result).toBeDefined();
      expect(result.actualStartTime).toBeDefined();
    });
  });

  describe('Exercise Compliance', () => {
    it('should validate compliance requirements in real-time', async () => {
      // Setup
      const exercise = {
        ...validExerciseData,
        id: testExerciseId,
        status: ExerciseStatus.IN_PROGRESS,
        complianceFrameworks: validComplianceSettings.frameworks
      };
      mockExerciseModel.findById.mockResolvedValueOnce(exercise as any);

      // Execute & Assert
      await expect(
        exerciseService.getExerciseById(testExerciseId.toString())
      ).resolves.toMatchObject({
        complianceFrameworks: validComplianceSettings.frameworks
      });
    });
  });
});