/**
 * @fileoverview MongoDB model implementation for exercise participants with comprehensive
 * validation, indexing, and real-time coordination capabilities.
 * @version 1.0.0
 */

import { Schema, model, Document } from 'mongoose'; // v6.0.x
import { IParticipant, ParticipantRole, ParticipantStatus, INotificationPreferences } from '../interfaces/participant.interface';
import { IBaseEntity } from '../../shared/interfaces/base.interface';
import { ObjectId } from 'mongodb';

/**
 * Interface extending both IParticipant and Document for Mongoose operations
 */
interface IParticipantDocument extends IParticipant, Document {}

/**
 * Notification preferences schema with validation
 */
const notificationPreferencesSchema = new Schema<INotificationPreferences>({
  email: { type: Boolean, required: true, default: true },
  slack: { type: Boolean, required: true, default: false },
  teams: { type: Boolean, required: true, default: false },
  inApp: { type: Boolean, required: true, default: true },
  mobileApp: { type: Boolean, required: true, default: false }
}, { _id: false });

/**
 * Response history schema for tracking participant engagement
 */
const responseHistorySchema = new Schema({
  injectId: { type: Schema.Types.ObjectId, required: true },
  timestamp: { type: Date, required: true },
  responseTime: { type: Number, required: true }, // in seconds
  quality: { type: Number, min: 0, max: 100 }
}, { _id: false });

/**
 * Comprehensive participant schema with validation and indexing
 */
const participantSchema = new Schema<IParticipantDocument>({
  exerciseId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  role: {
    type: String,
    enum: Object.values(ParticipantRole),
    required: true,
    default: ParticipantRole.PARTICIPANT
  },
  status: {
    type: String,
    enum: Object.values(ParticipantStatus),
    required: true,
    default: ParticipantStatus.INVITED
  },
  teamId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  notificationPreferences: {
    type: notificationPreferencesSchema,
    required: true,
    default: () => ({
      email: true,
      slack: false,
      teams: false,
      inApp: true,
      mobileApp: false
    })
  },
  lastActiveTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  responseCount: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  responseRate: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    max: 100
  },
  responseHistory: [responseHistorySchema],
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: () => new Map()
  }
}, {
  timestamps: true,
  versionKey: 'version'
});

// Compound indexes for optimized queries
participantSchema.index({ exerciseId: 1, status: 1 });
participantSchema.index({ exerciseId: 1, role: 1 });
participantSchema.index({ userId: 1, status: 1 });

// Static methods for participant management
participantSchema.statics = {
  /**
   * Finds participants by exercise ID with optional filters
   */
  async findByExerciseId(exerciseId: ObjectId, filters?: Partial<IParticipant>): Promise<IParticipant[]> {
    const query = { exerciseId, ...filters };
    return this.find(query).lean();
  },

  /**
   * Finds active participants within the specified time threshold
   */
  async findActiveParticipants(exerciseId: ObjectId, timeThresholdMinutes = 5): Promise<IParticipant[]> {
    const threshold = new Date(Date.now() - timeThresholdMinutes * 60 * 1000);
    return this.find({
      exerciseId,
      status: ParticipantStatus.ACTIVE,
      lastActiveTime: { $gte: threshold }
    }).lean();
  },

  /**
   * Updates participant status with validation
   */
  async updateStatus(participantId: ObjectId, status: ParticipantStatus): Promise<IParticipant | null> {
    return this.findByIdAndUpdate(
      participantId,
      { 
        status,
        lastActiveTime: new Date(),
        version: { $inc: 1 }
      },
      { new: true }
    );
  },

  /**
   * Updates participant role with access control validation
   */
  async updateRole(participantId: ObjectId, role: ParticipantRole): Promise<IParticipant | null> {
    return this.findByIdAndUpdate(
      participantId,
      { 
        role,
        version: { $inc: 1 }
      },
      { new: true }
    );
  },

  /**
   * Updates notification preferences
   */
  async updateNotificationPreferences(
    participantId: ObjectId,
    preferences: Partial<INotificationPreferences>
  ): Promise<IParticipant | null> {
    return this.findByIdAndUpdate(
      participantId,
      { 
        $set: { 'notificationPreferences': preferences },
        version: { $inc: 1 }
      },
      { new: true }
    );
  },

  /**
   * Calculates and updates participant response metrics
   */
  async calculateResponseMetrics(participantId: ObjectId): Promise<{ responseRate: number; responseCount: number }> {
    const participant = await this.findById(participantId);
    if (!participant) throw new Error('Participant not found');

    const metrics = {
      responseCount: participant.responseHistory.length,
      responseRate: participant.responseHistory.length > 0
        ? (participant.responseHistory.length / participant.responseHistory.length) * 100
        : 0
    };

    await this.findByIdAndUpdate(participantId, {
      responseCount: metrics.responseCount,
      responseRate: metrics.responseRate,
      version: { $inc: 1 }
    });

    return metrics;
  },

  /**
   * Bulk updates participant statuses for an exercise
   */
  async bulkStatusUpdate(
    exerciseId: ObjectId,
    status: ParticipantStatus,
    filter?: Partial<IParticipant>
  ): Promise<number> {
    const result = await this.updateMany(
      { exerciseId, ...filter },
      { 
        status,
        lastActiveTime: new Date(),
        version: { $inc: 1 }
      }
    );
    return result.modifiedCount;
  }
};

// Middleware for automatic lastActiveTime updates
participantSchema.pre('save', function(next) {
  this.lastActiveTime = new Date();
  next();
});

// Create and export the model
export const ParticipantModel = model<IParticipantDocument>('Participant', participantSchema);