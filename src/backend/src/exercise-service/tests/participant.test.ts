/**
 * @fileoverview Comprehensive test suite for participant-related functionality in the exercise service.
 * Tests participant lifecycle management, role-based access control, and real-time status updates.
 * @version 1.0.0
 */

import { jest } from '@jest/globals';
import { ObjectId } from 'mongodb';
import { ParticipantService } from '../services/participant.service';
import { ParticipantModel } from '../models/participant.model';
import { IParticipant, ParticipantRole, ParticipantStatus } from '../interfaces/participant.interface';
import { ValidationError, ConcurrencyError } from '../../shared/interfaces/base.interface';

// Mock external dependencies
jest.mock('../models/participant.model');
jest.mock('winston');
jest.mock('ioredis');

describe('ParticipantService', () => {
  let participantService: ParticipantService;
  let mockLogger: any;
  let mockCache: any;
  let testExerciseId: ObjectId;
  let testUserId: ObjectId;

  // Sample test data
  const mockParticipant: Partial<IParticipant> = {
    exerciseId: new ObjectId(),
    userId: new ObjectId(),
    role: ParticipantRole.PARTICIPANT,
    status: ParticipantStatus.INVITED,
    teamId: new ObjectId(),
    notificationPreferences: {
      email: true,
      slack: false,
      teams: false,
      inApp: true,
      mobileApp: false
    },
    lastActiveTime: new Date(),
    responseCount: 0,
    responseRate: 0,
    metadata: {}
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    };

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      setex: jest.fn(),
      del: jest.fn()
    };

    // Initialize service
    participantService = new ParticipantService(mockLogger, mockCache);

    // Set up test IDs
    testExerciseId = new ObjectId();
    testUserId = new ObjectId();
  });

  describe('createParticipant', () => {
    it('should create participant with valid data', async () => {
      // Setup
      const participantData = { ...mockParticipant };
      (ParticipantModel.findOne as jest.Mock).mockResolvedValue(null);
      (ParticipantModel.create as jest.Mock).mockResolvedValue({ ...participantData, id: new ObjectId() });

      // Execute
      const result = await participantService.createParticipant(participantData);

      // Verify
      expect(result).toBeDefined();
      expect(ParticipantModel.create).toHaveBeenCalledWith(participantData);
      expect(mockCache.setex).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Participant created successfully', expect.any(Object));
    });

    it('should throw ValidationError for duplicate participant', async () => {
      // Setup
      (ParticipantModel.findOne as jest.Mock).mockResolvedValue(mockParticipant);

      // Execute & Verify
      await expect(participantService.createParticipant(mockParticipant))
        .rejects
        .toThrow(ValidationError);
      expect(ParticipantModel.create).not.toHaveBeenCalled();
    });

    it('should validate role permissions', async () => {
      // Setup
      const invalidData = { ...mockParticipant, role: 'INVALID_ROLE' };

      // Execute & Verify
      await expect(participantService.createParticipant(invalidData))
        .rejects
        .toThrow(ValidationError);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateParticipantStatus', () => {
    const participantId = new ObjectId();
    const version = 1;

    it('should update status with valid transition', async () => {
      // Setup
      const updatedParticipant = { 
        ...mockParticipant, 
        status: ParticipantStatus.ACTIVE,
        version: version + 1 
      };
      (ParticipantModel.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedParticipant);

      // Execute
      const result = await participantService.updateParticipantStatus(
        participantId,
        ParticipantStatus.ACTIVE,
        version
      );

      // Verify
      expect(result).toEqual(updatedParticipant);
      expect(mockCache.setex).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith('Participant status updated successfully', expect.any(Object));
    });

    it('should handle concurrent updates with version mismatch', async () => {
      // Setup
      (ParticipantModel.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

      // Execute & Verify
      await expect(participantService.updateParticipantStatus(
        participantId,
        ParticipantStatus.ACTIVE,
        version
      )).rejects.toThrow(ConcurrencyError);
    });
  });

  describe('getParticipantStats', () => {
    it('should return cached stats when available', async () => {
      // Setup
      const cachedStats = {
        total: 10,
        byRole: { [ParticipantRole.PARTICIPANT]: 8, [ParticipantRole.FACILITATOR]: 2 },
        byStatus: { [ParticipantStatus.ACTIVE]: 7, [ParticipantStatus.INACTIVE]: 3 }
      };
      mockCache.get.mockResolvedValue(JSON.stringify(cachedStats));

      // Execute
      const result = await participantService.getParticipantStats(testExerciseId);

      // Verify
      expect(result).toEqual(cachedStats);
      expect(ParticipantModel.find).not.toHaveBeenCalled();
    });

    it('should calculate fresh stats when cache misses', async () => {
      // Setup
      mockCache.get.mockResolvedValue(null);
      (ParticipantModel.find as jest.Mock).mockResolvedValue([
        { ...mockParticipant, status: ParticipantStatus.ACTIVE },
        { ...mockParticipant, status: ParticipantStatus.ACTIVE },
        { ...mockParticipant, status: ParticipantStatus.INACTIVE }
      ]);

      // Execute
      const result = await participantService.getParticipantStats(testExerciseId);

      // Verify
      expect(result).toBeDefined();
      expect(result.total).toBe(3);
      expect(mockCache.setex).toHaveBeenCalled();
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should update multiple participants successfully', async () => {
      // Setup
      const updateCount = 5;
      (ParticipantModel.bulkStatusUpdate as jest.Mock).mockResolvedValue(updateCount);

      // Execute
      const result = await participantService.bulkUpdateStatus(
        testExerciseId,
        ParticipantStatus.ACTIVE
      );

      // Verify
      expect(result).toBe(updateCount);
      expect(mockCache.del).toHaveBeenCalledTimes(2); // Both participants and stats caches
      expect(mockLogger.info).toHaveBeenCalledWith('Bulk status update completed', expect.any(Object));
    });

    it('should handle update with additional filters', async () => {
      // Setup
      const filter = { role: ParticipantRole.PARTICIPANT };
      (ParticipantModel.bulkStatusUpdate as jest.Mock).mockResolvedValue(3);

      // Execute
      const result = await participantService.bulkUpdateStatus(
        testExerciseId,
        ParticipantStatus.INACTIVE,
        filter
      );

      // Verify
      expect(result).toBe(3);
      expect(ParticipantModel.bulkStatusUpdate).toHaveBeenCalledWith(
        testExerciseId,
        ParticipantStatus.INACTIVE,
        filter
      );
    });
  });
});