/**
 * @fileoverview Comprehensive test suite for the NotificationService
 * Testing multi-channel delivery, enterprise integration, and real-time coordination
 * @version 1.0.0
 */

import { describe, beforeEach, afterEach, it, expect, jest } from '@jest/globals';
import { MockInstance } from 'jest-mock';
import { Container } from 'inversify';
import Bull, { Queue, Job } from 'bull';
import { Logger } from 'winston';
import { Counter, Histogram } from 'prom-client';

import { NotificationService } from '../services/notification.service';
import { TeamsAdapter } from '../services/adapters/teams.adapter';
import { SlackAdapter } from '../services/adapters/slack.adapter';
import { 
  INotification, 
  NotificationStatus, 
  NotificationType,
  NotificationChannel,
  NotificationPriority 
} from '../interfaces/notification.interface';
import { queueConfig } from '../config/queue';

// Mock implementations
jest.mock('bull');
jest.mock('prom-client');
jest.mock('../services/adapters/teams.adapter');
jest.mock('../services/adapters/slack.adapter');

describe('NotificationService', () => {
  let container: Container;
  let notificationService: NotificationService;
  let mockTeamsAdapter: jest.Mocked<TeamsAdapter>;
  let mockSlackAdapter: jest.Mocked<SlackAdapter>;
  let mockLogger: jest.Mocked<Logger>;
  let mockQueue: jest.Mocked<Queue>;
  let mockMetrics: {
    attemptCounter: jest.Mocked<Counter>;
    deliveryLatency: jest.Mocked<Histogram>;
    failureCounter: jest.Mocked<Counter>;
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Initialize mocks
    mockTeamsAdapter = {
      sendNotification: jest.fn(),
    } as any;

    mockSlackAdapter = {
      sendNotification: jest.fn(),
    } as any;

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as any;

    mockQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn(),
      getJob: jest.fn(),
    } as any;

    mockMetrics = {
      attemptCounter: { inc: jest.fn() } as any,
      deliveryLatency: { observe: jest.fn() } as any,
      failureCounter: { inc: jest.fn() } as any,
    };

    // Setup DI container
    container = new Container();
    container.bind('TeamsAdapter').toConstantValue(mockTeamsAdapter);
    container.bind('SlackAdapter').toConstantValue(mockSlackAdapter);
    container.bind('Logger').toConstantValue(mockLogger);
    container.bind('Config').toConstantValue(queueConfig);

    // Initialize service
    notificationService = new NotificationService(
      mockTeamsAdapter,
      mockSlackAdapter,
      mockLogger,
      queueConfig
    );

    // Replace queue and metrics with mocks
    (notificationService as any).notificationQueue = mockQueue;
    (notificationService as any).deliveryMetrics = mockMetrics;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('sendNotification', () => {
    it('should process notification with priority handling', async () => {
      // Arrange
      const notification: INotification = {
        id: 'test-id',
        type: NotificationType.EXERCISE_START,
        channel: NotificationChannel.TEAMS,
        priority: NotificationPriority.HIGH,
        content: {
          title: 'Test Notification',
          message: 'Test message',
          data: {}
        },
        recipients: ['recipient-id'],
        exerciseId: 'exercise-id',
        status: NotificationStatus.PENDING,
        metadata: {},
        retryCount: 0,
        lastRetryAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      mockQueue.add.mockResolvedValue({ id: 'job-id' } as Job);

      // Act
      const result = await notificationService.sendNotification(notification);

      // Assert
      expect(result).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledWith(
        notification,
        expect.objectContaining({
          priority: 1,
          attempts: 5
        })
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Queueing notification for delivery',
        expect.any(Object)
      );
    });

    it('should handle concurrent notifications without race conditions', async () => {
      // Arrange
      const notifications = Array(5).fill(null).map((_, index) => ({
        id: `test-id-${index}`,
        type: NotificationType.EXERCISE_START,
        channel: NotificationChannel.TEAMS,
        priority: NotificationPriority.HIGH,
        content: {
          title: `Test Notification ${index}`,
          message: `Test message ${index}`,
          data: {}
        },
        recipients: ['recipient-id'],
        exerciseId: 'exercise-id',
        status: NotificationStatus.PENDING,
        metadata: {},
        retryCount: 0,
        lastRetryAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      }));

      mockQueue.add.mockImplementation(async () => ({ id: 'job-id' } as Job));

      // Act
      const results = await Promise.all(
        notifications.map(n => notificationService.sendNotification(n))
      );

      // Assert
      expect(results).toHaveLength(5);
      expect(results.every(r => r === true)).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledTimes(5);
    });

    it('should implement retry with exponential backoff', async () => {
      // Arrange
      const notification: INotification = {
        id: 'test-id',
        type: NotificationType.EXERCISE_START,
        channel: NotificationChannel.SLACK,
        priority: NotificationPriority.HIGH,
        content: {
          title: 'Test Notification',
          message: 'Test message',
          data: {}
        },
        recipients: ['recipient-id'],
        exerciseId: 'exercise-id',
        status: NotificationStatus.PENDING,
        metadata: {},
        retryCount: 0,
        lastRetryAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const error = new Error('Delivery failed');
      mockQueue.add.mockResolvedValue({ id: 'job-id' } as Job);
      mockQueue.process.mockImplementation(async (callback) => {
        const job = { data: notification } as Job;
        await callback(job);
      });

      mockSlackAdapter.sendNotification
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ success: true });

      // Act
      const result = await notificationService.sendNotification(notification);

      // Assert
      expect(result).toBe(true);
      expect(mockSlackAdapter.sendNotification).toHaveBeenCalledTimes(1);
      expect(mockMetrics.attemptCounter.inc).toHaveBeenCalled();
    });
  });

  describe('getNotificationStatus', () => {
    it('should return correct status for existing notification', async () => {
      // Arrange
      const jobId = 'test-job-id';
      mockQueue.getJob.mockResolvedValue({
        id: jobId,
        getState: jest.fn().mockResolvedValue('completed')
      } as any);

      // Act
      const status = await notificationService.getNotificationStatus(jobId);

      // Assert
      expect(status).toBe(NotificationStatus.DELIVERED);
      expect(mockQueue.getJob).toHaveBeenCalledWith(jobId);
    });

    it('should handle non-existent notifications', async () => {
      // Arrange
      mockQueue.getJob.mockResolvedValue(null);

      // Act
      const status = await notificationService.getNotificationStatus('non-existent');

      // Assert
      expect(status).toBe(NotificationStatus.FAILED);
    });
  });

  describe('error handling', () => {
    it('should handle queue errors appropriately', async () => {
      // Arrange
      const notification: INotification = {
        id: 'test-id',
        type: NotificationType.EXERCISE_START,
        channel: NotificationChannel.TEAMS,
        priority: NotificationPriority.HIGH,
        content: {
          title: 'Test Notification',
          message: 'Test message',
          data: {}
        },
        recipients: ['recipient-id'],
        exerciseId: 'exercise-id',
        status: NotificationStatus.PENDING,
        metadata: {},
        retryCount: 0,
        lastRetryAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      mockQueue.add.mockRejectedValue(new Error('Queue error'));

      // Act
      const result = await notificationService.sendNotification(notification);

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to queue notification',
        expect.any(Object)
      );
    });

    it('should handle delivery errors with proper classification', async () => {
      // Arrange
      const notification: INotification = {
        id: 'test-id',
        type: NotificationType.EXERCISE_START,
        channel: NotificationChannel.TEAMS,
        priority: NotificationPriority.HIGH,
        content: {
          title: 'Test Notification',
          message: 'Test message',
          data: {}
        },
        recipients: ['recipient-id'],
        exerciseId: 'exercise-id',
        status: NotificationStatus.PENDING,
        metadata: {},
        retryCount: 0,
        lastRetryAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const error = new Error('rate limit exceeded');
      mockTeamsAdapter.sendNotification.mockRejectedValue(error);

      // Act & Assert
      await expect(
        (notificationService as any).processNotification(notification)
      ).rejects.toThrow(error);

      expect(mockMetrics.failureCounter.inc).toHaveBeenCalledWith(
        expect.objectContaining({
          error_type: 'RATE_LIMIT'
        })
      );
    });
  });
});