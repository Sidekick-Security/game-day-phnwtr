/**
 * @fileoverview Comprehensive test suite for InjectService class validating inject
 * lifecycle management, compliance validation, and real-time delivery capabilities.
 * @version 1.0.0
 */

import { jest } from '@jest/globals'; // v29.x
import { mockDeep, MockProxy } from 'jest-mock-extended'; // v3.x
import { ObjectId } from 'mongodb'; // v6.0.x
import { Cache } from 'cache-manager'; // v4.x.x

import { InjectService } from '../services/inject.service';
import { IInject, InjectType, InjectStatus } from '../interfaces/inject.interface';
import Inject from '../models/inject.model';
import { ResponseService } from '../services/response.service';
import { Logger } from '../../shared/utils/logger.util';
import { ErrorCode } from '../../shared/constants/error-codes';

describe('InjectService', () => {
  let injectService: InjectService;
  let mockInjectModel: MockProxy<typeof Inject>;
  let mockResponseService: MockProxy<ResponseService>;
  let mockLogger: MockProxy<Logger>;
  let mockCache: MockProxy<Cache>;

  // Test data
  const testExerciseId = new ObjectId().toString();
  const testInjectId = new ObjectId().toString();

  beforeEach(() => {
    // Reset all mocks before each test
    mockInjectModel = mockDeep<typeof Inject>();
    mockResponseService = mockDeep<ResponseService>();
    mockLogger = mockDeep<Logger>();
    mockCache = mockDeep<Cache>();

    // Initialize service with mocks
    injectService = new InjectService(
      mockInjectModel,
      mockResponseService,
      mockLogger,
      mockCache
    );

    // Configure default mock behaviors
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('createInject', () => {
    const validInjectData: Partial<IInject> = {
      exerciseId: new ObjectId(testExerciseId),
      type: InjectType.SCENARIO_UPDATE,
      title: 'Test Inject',
      content: 'Test content',
      expectedResponse: 'Expected response',
      scheduledTime: new Date(),
      timeoutMinutes: 30,
      targetRoles: ['Security Team'],
      complianceRequirements: ['REQ-001']
    };

    it('should create a new inject successfully', async () => {
      // Arrange
      const savedInject = { ...validInjectData, id: testInjectId, status: InjectStatus.PENDING };
      mockInjectModel.prototype.save.mockResolvedValueOnce(savedInject as any);

      // Act
      const result = await injectService.createInject(validInjectData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testInjectId);
      expect(result.status).toBe(InjectStatus.PENDING);
      expect(mockCache.set).toHaveBeenCalledWith(
        `inject:${testInjectId}`,
        expect.any(Object),
        expect.any(Number)
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Inject created successfully',
        expect.any(Object)
      );
    });

    it('should throw validation error for missing required fields', async () => {
      // Arrange
      const invalidData = { exerciseId: testExerciseId };

      // Act & Assert
      await expect(injectService.createInject(invalidData))
        .rejects
        .toThrow(ErrorCode.VALIDATION_ERROR);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create inject',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('deliverInject', () => {
    const mockInject = {
      id: testInjectId,
      status: InjectStatus.PENDING,
      exerciseId: testExerciseId
    };

    it('should deliver inject successfully with retries', async () => {
      // Arrange
      mockInjectModel.findById.mockResolvedValueOnce(mockInject as any);
      mockInjectModel.updateInjectStatus.mockResolvedValueOnce({
        ...mockInject,
        status: InjectStatus.DELIVERED
      } as any);

      // Act
      const result = await injectService.deliverInject(testInjectId);

      // Assert
      expect(result.status).toBe(InjectStatus.DELIVERED);
      expect(mockCache.set).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Inject delivered successfully',
        expect.any(Object)
      );
    });

    it('should throw error when inject not found', async () => {
      // Arrange
      mockInjectModel.findById.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(injectService.deliverInject(testInjectId))
        .rejects
        .toThrow(ErrorCode.INJECT_NOT_FOUND);
    });

    it('should throw error for invalid status transition', async () => {
      // Arrange
      mockInjectModel.findById.mockResolvedValueOnce({
        ...mockInject,
        status: InjectStatus.DELIVERED
      } as any);

      // Act & Assert
      await expect(injectService.deliverInject(testInjectId))
        .rejects
        .toThrow(ErrorCode.INVALID_OPERATION);
    });
  });

  describe('validateInjectCompliance', () => {
    it('should validate compliance requirements successfully', async () => {
      // Arrange
      const mockInject = {
        id: testInjectId,
        complianceRequirements: ['REQ-001'],
        metadata: {}
      };
      mockInjectModel.findById.mockResolvedValueOnce(mockInject as any);
      mockInjectModel.updateOne.mockResolvedValueOnce({ modifiedCount: 1 } as any);

      // Act
      const result = await injectService.validateInjectCompliance(testInjectId);

      // Assert
      expect(result).toBe(true);
      expect(mockInjectModel.updateOne).toHaveBeenCalledWith(
        { _id: testInjectId },
        expect.any(Object)
      );
    });
  });

  describe('getInjectById', () => {
    it('should return cached inject if available', async () => {
      // Arrange
      const cachedInject = { id: testInjectId };
      mockCache.get.mockResolvedValueOnce(cachedInject);

      // Act
      const result = await injectService.getInjectById(testInjectId);

      // Assert
      expect(result).toBe(cachedInject);
      expect(mockInjectModel.findById).not.toHaveBeenCalled();
    });

    it('should fetch and cache inject if not in cache', async () => {
      // Arrange
      const dbInject = { id: testInjectId };
      mockCache.get.mockResolvedValueOnce(null);
      mockInjectModel.findById.mockResolvedValueOnce(dbInject as any);

      // Act
      const result = await injectService.getInjectById(testInjectId);

      // Assert
      expect(result).toBe(dbInject);
      expect(mockCache.set).toHaveBeenCalledWith(
        `inject:${testInjectId}`,
        dbInject,
        expect.any(Number)
      );
    });
  });

  describe('getInjectsByExercise', () => {
    it('should return all injects for an exercise', async () => {
      // Arrange
      const mockInjects = [
        { id: testInjectId, exerciseId: testExerciseId }
      ];
      mockInjectModel.findByExercise.mockResolvedValueOnce(mockInjects as any);

      // Act
      const result = await injectService.getInjectsByExercise(testExerciseId);

      // Assert
      expect(result).toEqual(mockInjects);
      expect(mockInjectModel.findByExercise).toHaveBeenCalledWith(testExerciseId);
    });
  });

  describe('updateInjectStatus', () => {
    it('should update inject status successfully', async () => {
      // Arrange
      const updatedInject = {
        id: testInjectId,
        status: InjectStatus.COMPLETED
      };
      mockInjectModel.updateInjectStatus.mockResolvedValueOnce(updatedInject as any);

      // Act
      const result = await injectService.updateInjectStatus(
        testInjectId,
        InjectStatus.COMPLETED
      );

      // Assert
      expect(result).toBe(updatedInject);
      expect(mockCache.set).toHaveBeenCalledWith(
        `inject:${testInjectId}`,
        updatedInject,
        expect.any(Number)
      );
    });
  });
});