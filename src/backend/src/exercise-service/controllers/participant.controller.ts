/**
 * @fileoverview Enhanced controller for managing exercise participants with real-time
 * status tracking, multi-platform notifications, and comprehensive role-based access control.
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify'; // v6.0.1
import { 
  controller, httpPost, httpGet, httpPut, 
  httpDelete, httpPatch, authorize 
} from 'routing-controllers'; // v0.10.0
import { ObjectId } from 'mongodb'; // v6.0.0
import { RateLimit } from 'routing-controllers-rate-limiter'; // v1.0.0
import { Cache } from 'cache-manager'; // v5.0.0
import { validate } from 'class-validator'; // v0.14.0

import { ParticipantService } from '../services/participant.service';
import { 
  IParticipant, 
  ParticipantRole, 
  ParticipantStatus,
  INotificationPreferences 
} from '../interfaces/participant.interface';
import { ApiResponse, HttpStatusCode } from '../../shared/types/common.types';
import { ValidationError } from '../../shared/interfaces/base.interface';

/**
 * Enhanced controller for participant management with real-time features
 */
@injectable()
@controller('/api/participants')
export class ParticipantController {
  constructor(
    @inject('ParticipantService') private participantService: ParticipantService,
    @inject('CacheManager') private cacheManager: Cache
  ) {}

  /**
   * Creates a new participant with notification preferences
   * @param participantData The participant data to create
   * @returns Newly created participant with notification preferences
   */
  @httpPost('/')
  @authorize(['EXERCISE_ADMIN', 'FACILITATOR'])
  @RateLimit({ points: 100, duration: 60 })
  async createParticipant(
    @validate() participantData: Omit<IParticipant, 'id' | 'createdAt' | 'updatedAt' | 'version'>
  ): Promise<ApiResponse<IParticipant>> {
    try {
      const participant = await this.participantService.createParticipant(participantData);
      return {
        success: true,
        data: participant,
        error: null,
        message: 'Participant created successfully',
        statusCode: HttpStatusCode.CREATED,
        timestamp: new Date()
      };
    } catch (error) {
      throw new ValidationError('Failed to create participant', {
        error: [(error as Error).message]
      });
    }
  }

  /**
   * Updates participant status with real-time tracking
   */
  @httpPatch('/:id/status')
  @authorize(['EXERCISE_ADMIN', 'FACILITATOR'])
  @RateLimit({ points: 200, duration: 60 })
  async updateParticipantStatus(
    @param('id') id: string,
    @body() data: { status: ParticipantStatus; version: number }
  ): Promise<ApiResponse<IParticipant>> {
    try {
      const participant = await this.participantService.updateParticipantStatus(
        new ObjectId(id),
        data.status,
        data.version
      );
      return {
        success: true,
        data: participant,
        error: null,
        message: 'Participant status updated successfully',
        statusCode: HttpStatusCode.OK,
        timestamp: new Date()
      };
    } catch (error) {
      throw new ValidationError('Failed to update participant status', {
        error: [(error as Error).message]
      });
    }
  }

  /**
   * Updates notification preferences across multiple platforms
   */
  @httpPut('/:id/notifications')
  @authorize(['EXERCISE_ADMIN', 'FACILITATOR', 'PARTICIPANT'])
  @RateLimit({ points: 100, duration: 60 })
  async updateNotificationPreferences(
    @param('id') id: string,
    @body() preferences: Partial<INotificationPreferences>
  ): Promise<ApiResponse<IParticipant>> {
    try {
      const participant = await this.participantService.updateNotificationPreferences(
        new ObjectId(id),
        preferences
      );
      return {
        success: true,
        data: participant,
        error: null,
        message: 'Notification preferences updated successfully',
        statusCode: HttpStatusCode.OK,
        timestamp: new Date()
      };
    } catch (error) {
      throw new ValidationError('Failed to update notification preferences', {
        error: [(error as Error).message]
      });
    }
  }

  /**
   * Retrieves participant statistics with caching
   */
  @httpGet('/exercise/:exerciseId/stats')
  @authorize(['EXERCISE_ADMIN', 'FACILITATOR'])
  @RateLimit({ points: 300, duration: 60 })
  async getParticipantStats(
    @param('exerciseId') exerciseId: string
  ): Promise<ApiResponse<object>> {
    try {
      const stats = await this.participantService.getParticipantStats(
        new ObjectId(exerciseId)
      );
      return {
        success: true,
        data: stats,
        error: null,
        message: 'Participant statistics retrieved successfully',
        statusCode: HttpStatusCode.OK,
        timestamp: new Date()
      };
    } catch (error) {
      throw new ValidationError('Failed to retrieve participant statistics', {
        error: [(error as Error).message]
      });
    }
  }

  /**
   * Performs bulk status updates for exercise participants
   */
  @httpPatch('/exercise/:exerciseId/bulk-status')
  @authorize(['EXERCISE_ADMIN', 'FACILITATOR'])
  @RateLimit({ points: 50, duration: 60 })
  async bulkUpdateParticipants(
    @param('exerciseId') exerciseId: string,
    @body() data: { status: ParticipantStatus; filter?: Partial<IParticipant> }
  ): Promise<ApiResponse<number>> {
    try {
      const updateCount = await this.participantService.bulkUpdateStatus(
        new ObjectId(exerciseId),
        data.status,
        data.filter
      );
      return {
        success: true,
        data: updateCount,
        error: null,
        message: 'Bulk status update completed successfully',
        statusCode: HttpStatusCode.OK,
        timestamp: new Date()
      };
    } catch (error) {
      throw new ValidationError('Failed to perform bulk status update', {
        error: [(error as Error).message]
      });
    }
  }

  /**
   * Tracks real-time participant activity
   */
  @httpPost('/:id/activity')
  @authorize(['EXERCISE_ADMIN', 'FACILITATOR', 'PARTICIPANT'])
  @RateLimit({ points: 500, duration: 60 })
  async trackParticipantActivity(
    @param('id') id: string,
    @body() data: { activityType: string; metadata?: Record<string, unknown> }
  ): Promise<ApiResponse<void>> {
    try {
      await this.participantService.trackParticipantActivity(
        new ObjectId(id),
        data.activityType,
        data.metadata
      );
      return {
        success: true,
        data: null,
        error: null,
        message: 'Activity tracked successfully',
        statusCode: HttpStatusCode.OK,
        timestamp: new Date()
      };
    } catch (error) {
      throw new ValidationError('Failed to track participant activity', {
        error: [(error as Error).message]
      });
    }
  }
}