/**
 * @fileoverview MongoDB schema and model implementation for exercise injects.
 * Provides comprehensive data validation, lifecycle management, and query methods
 * for managing exercise scenario events and updates.
 * @version 1.0.0
 */

import { Schema, model, Document, Model } from 'mongoose'; // v7.x
import { IInject, InjectType, InjectStatus } from '../interfaces/inject.interface';
import { IBaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Extends Document with IInject interface for type-safe operations
 */
export interface InjectDocument extends Document, IInject {}

/**
 * Custom methods interface for the Inject model
 */
interface InjectModel extends Model<InjectDocument> {
  findByExercise(exerciseId: string): Promise<InjectDocument[]>;
  findPendingInjects(): Promise<InjectDocument[]>;
  updateInjectStatus(injectId: string, newStatus: InjectStatus): Promise<InjectDocument>;
}

/**
 * MongoDB schema definition for exercise injects with comprehensive validation
 */
export const InjectSchema = new Schema<InjectDocument>(
  {
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: 'Exercise',
      required: [true, 'Exercise ID is required'],
      index: true
    },
    type: {
      type: String,
      enum: Object.values(InjectType),
      required: [true, 'Inject type is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(InjectStatus),
      default: InjectStatus.PENDING,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [255, 'Title cannot exceed 255 characters']
    },
    content: {
      type: String,
      required: [true, 'Content is required']
    },
    expectedResponse: {
      type: String,
      required: [true, 'Expected response is required']
    },
    scheduledTime: {
      type: Date,
      required: [true, 'Scheduled time is required'],
      index: true
    },
    deliveryTime: {
      type: Date,
      default: null
    },
    timeoutMinutes: {
      type: Number,
      required: [true, 'Timeout duration is required'],
      min: [1, 'Timeout must be at least 1 minute']
    },
    targetRoles: {
      type: [String],
      required: [true, 'Target roles are required'],
      validate: {
        validator: (roles: string[]) => roles.length > 0,
        message: 'At least one target role is required'
      }
    },
    complianceRequirements: {
      type: [String],
      default: [],
      index: true
    },
    responseCount: {
      type: Number,
      default: 0,
      min: 0
    },
    isAiGenerated: {
      type: Boolean,
      default: false
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    versionKey: 'version',
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common query patterns
InjectSchema.index({ exerciseId: 1, scheduledTime: 1 });
InjectSchema.index({ status: 1, scheduledTime: 1 });

/**
 * Finds all injects for a specific exercise ordered by scheduled time
 * @param exerciseId The ID of the exercise
 * @returns Promise resolving to array of inject documents
 */
InjectSchema.statics.findByExercise = async function(
  exerciseId: string
): Promise<InjectDocument[]> {
  return this.find({ exerciseId })
    .sort({ scheduledTime: 1 })
    .exec();
};

/**
 * Retrieves all pending injects scheduled for delivery within the next window
 * @returns Promise resolving to array of pending inject documents
 */
InjectSchema.statics.findPendingInjects = async function(): Promise<InjectDocument[]> {
  const deliveryWindow = new Date();
  deliveryWindow.setMinutes(deliveryWindow.getMinutes() + 5); // 5-minute delivery window

  return this.find({
    status: InjectStatus.PENDING,
    scheduledTime: {
      $lte: deliveryWindow
    }
  })
    .sort({ scheduledTime: 1 })
    .exec();
};

/**
 * Updates the status of an inject with validation and tracking
 * @param injectId The ID of the inject to update
 * @param newStatus The new status to set
 * @returns Promise resolving to the updated inject document
 */
InjectSchema.statics.updateInjectStatus = async function(
  injectId: string,
  newStatus: InjectStatus
): Promise<InjectDocument> {
  const inject = await this.findById(injectId);
  if (!inject) {
    throw new Error('Inject not found');
  }

  // Validate status transition
  const validTransitions: Record<InjectStatus, InjectStatus[]> = {
    [InjectStatus.PENDING]: [InjectStatus.DELIVERED, InjectStatus.SKIPPED],
    [InjectStatus.DELIVERED]: [InjectStatus.IN_PROGRESS],
    [InjectStatus.IN_PROGRESS]: [InjectStatus.COMPLETED],
    [InjectStatus.COMPLETED]: [],
    [InjectStatus.SKIPPED]: []
  };

  if (!validTransitions[inject.status].includes(newStatus)) {
    throw new Error(`Invalid status transition from ${inject.status} to ${newStatus}`);
  }

  const update: Partial<InjectDocument> = { status: newStatus };

  // Set delivery time when transitioning to DELIVERED
  if (newStatus === InjectStatus.DELIVERED) {
    update.deliveryTime = new Date();
  }

  // Increment response count when transitioning to COMPLETED
  if (newStatus === InjectStatus.COMPLETED) {
    update.$inc = { responseCount: 1 };
  }

  return this.findByIdAndUpdate(
    injectId,
    update,
    { new: true, runValidators: true }
  ).exec();
};

// Create and export the Inject model
export const Inject = model<InjectDocument, InjectModel>('Inject', InjectSchema);