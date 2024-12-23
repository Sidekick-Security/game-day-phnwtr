/**
 * @fileoverview Enhanced service layer for managing exercise participants with real-time
 * coordination, comprehensive role management, and advanced analytics capabilities.
 * @version 1.0.0
 */

import { injectable, inject } from 'inversify';
import { ObjectId } from 'mongodb';
import { Logger } from 'winston';
import Redis from 'ioredis';
import { IParticipant, ParticipantRole, ParticipantStatus } from '../interfaces/participant.interface';
import { ParticipantModel } from '../models/participant.model';
import { ValidationError, ConcurrencyError } from '../../shared/interfaces/base.interface';

/**
 * Cache key patterns for participant data
 */
const CACHE_KEYS = {
  PARTICIPANT: (id: string) => `participant:${id}`,
  EXERCISE_PARTICIPANTS: (exerciseId: string) => `exercise:${exerciseId}:participants`,
  PARTICIPANT_STATS: (exerciseId: string) => `exercise:${exerciseId}:stats`
};

/**
 * Cache TTL values in seconds
 */
const CACHE_TTL = {
  PARTICIPANT: 300, // 5 minutes
  PARTICIPANT_LIST: 60, // 1 minute
  STATS: 120 // 2 minutes
};

@injectable()
export class ParticipantService {
  private readonly logger: Logger;
  private readonly cache: Redis;
  private readonly participantModel: typeof ParticipantModel;

  constructor(
    @inject('Logger') logger: Logger,
    @inject('Redis') cache: Redis
  ) {
    this.logger = logger;
    this.cache = cache;
    this.participantModel = ParticipantModel;
  }

  /**
   * Creates a new participant with enhanced validation and caching
   * @param participantData The participant data to create
   * @returns Promise resolving to the created participant
   * @throws ValidationError if data is invalid
   */
  async createParticipant(participantData: Omit<IParticipant, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Promise<IParticipant> {
    this.logger.info('Creating new participant', { exerciseId: participantData.exerciseId, userId: participantData.userId });

    // Validate role permissions
    if (!this.isValidRole(participantData.role)) {
      throw new ValidationError('Invalid participant role', { role: ['Invalid role specified'] });
    }

    try {
      // Check for existing participation
      const existingParticipant = await this.participantModel.findOne({
        exerciseId: participantData.exerciseId,
        userId: participantData.userId
      });

      if (existingParticipant) {
        throw new ValidationError('Participant already exists', {
          participant: ['User is already participating in this exercise']
        });
      }

      // Create participant
      const participant = await this.participantModel.create(participantData);

      // Cache the new participant data
      await this.cacheParticipant(participant);

      // Invalidate exercise participants cache
      await this.cache.del(CACHE_KEYS.EXERCISE_PARTICIPANTS(participant.exerciseId.toString()));

      this.logger.info('Participant created successfully', {
        participantId: participant.id,
        exerciseId: participant.exerciseId
      });

      return participant;
    } catch (error) {
      this.logger.error('Failed to create participant', {
        error,
        exerciseId: participantData.exerciseId,
        userId: participantData.userId
      });
      throw error;
    }
  }

  /**
   * Updates participant status with optimistic locking
   * @param participantId The participant's ID
   * @param status The new status
   * @param version Current version for optimistic locking
   * @returns Promise resolving to the updated participant
   * @throws ConcurrencyError if version mismatch occurs
   */
  async updateParticipantStatus(
    participantId: ObjectId,
    status: ParticipantStatus,
    version: number
  ): Promise<IParticipant> {
    this.logger.info('Updating participant status', { participantId, status });

    try {
      const participant = await this.participantModel.findOneAndUpdate(
        { _id: participantId, version },
        {
          status,
          lastActiveTime: new Date(),
          $inc: { version: 1 }
        },
        { new: true }
      );

      if (!participant) {
        throw new ConcurrencyError('Participant version mismatch', participantId.toString(), version);
      }

      // Update cache
      await this.cacheParticipant(participant);

      this.logger.info('Participant status updated successfully', {
        participantId,
        status,
        newVersion: participant.version
      });

      return participant;
    } catch (error) {
      this.logger.error('Failed to update participant status', { error, participantId, status });
      throw error;
    }
  }

  /**
   * Retrieves comprehensive participation statistics with caching
   * @param exerciseId The exercise ID
   * @returns Promise resolving to detailed participation statistics
   */
  async getParticipantStats(exerciseId: ObjectId): Promise<object> {
    const cacheKey = CACHE_KEYS.PARTICIPANT_STATS(exerciseId.toString());

    try {
      // Check cache first
      const cachedStats = await this.cache.get(cacheKey);
      if (cachedStats) {
        return JSON.parse(cachedStats);
      }

      // Calculate fresh statistics
      const participants = await this.participantModel.find({ exerciseId });
      
      const stats = {
        total: participants.length,
        byRole: this.calculateRoleDistribution(participants),
        byStatus: this.calculateStatusDistribution(participants),
        responseMetrics: this.calculateResponseMetrics(participants),
        activeParticipants: participants.filter(p => 
          p.status === ParticipantStatus.ACTIVE &&
          p.lastActiveTime > new Date(Date.now() - 5 * 60 * 1000)
        ).length
      };

      // Cache the results
      await this.cache.setex(cacheKey, CACHE_TTL.STATS, JSON.stringify(stats));

      return stats;
    } catch (error) {
      this.logger.error('Failed to retrieve participant statistics', { error, exerciseId });
      throw error;
    }
  }

  /**
   * Bulk updates participant statuses for an exercise
   * @param exerciseId The exercise ID
   * @param status The new status
   * @param filter Optional filter criteria
   * @returns Promise resolving to the number of updated participants
   */
  async bulkUpdateStatus(
    exerciseId: ObjectId,
    status: ParticipantStatus,
    filter?: Partial<IParticipant>
  ): Promise<number> {
    this.logger.info('Performing bulk status update', { exerciseId, status, filter });

    try {
      const updateCount = await this.participantModel.bulkStatusUpdate(exerciseId, status, filter);

      // Invalidate relevant caches
      await Promise.all([
        this.cache.del(CACHE_KEYS.EXERCISE_PARTICIPANTS(exerciseId.toString())),
        this.cache.del(CACHE_KEYS.PARTICIPANT_STATS(exerciseId.toString()))
      ]);

      this.logger.info('Bulk status update completed', {
        exerciseId,
        status,
        updatedCount: updateCount
      });

      return updateCount;
    } catch (error) {
      this.logger.error('Failed to perform bulk status update', { error, exerciseId, status });
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async cacheParticipant(participant: IParticipant): Promise<void> {
    const cacheKey = CACHE_KEYS.PARTICIPANT(participant.id);
    await this.cache.setex(cacheKey, CACHE_TTL.PARTICIPANT, JSON.stringify(participant));
  }

  private isValidRole(role: ParticipantRole): boolean {
    return Object.values(ParticipantRole).includes(role);
  }

  private calculateRoleDistribution(participants: IParticipant[]): Record<ParticipantRole, number> {
    return participants.reduce((acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1;
      return acc;
    }, {} as Record<ParticipantRole, number>);
  }

  private calculateStatusDistribution(participants: IParticipant[]): Record<ParticipantStatus, number> {
    return participants.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<ParticipantStatus, number>);
  }

  private calculateResponseMetrics(participants: IParticipant[]): object {
    const metrics = participants.reduce((acc, p) => ({
      totalResponses: acc.totalResponses + p.responseCount,
      averageRate: acc.averageRate + p.responseRate,
      participantsWithResponses: acc.participantsWithResponses + (p.responseCount > 0 ? 1 : 0)
    }), { totalResponses: 0, averageRate: 0, participantsWithResponses: 0 });

    return {
      totalResponses: metrics.totalResponses,
      averageResponseRate: participants.length > 0 ? 
        metrics.averageRate / participants.length : 0,
      participationRate: participants.length > 0 ?
        (metrics.participantsWithResponses / participants.length) * 100 : 0
    };
  }
}