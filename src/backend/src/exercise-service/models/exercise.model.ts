/**
 * @fileoverview MongoDB schema and model implementation for exercises in the GameDay Platform.
 * Provides comprehensive support for AI-driven scenarios, exercise lifecycle management,
 * and performance tracking with optimistic concurrency control.
 * @version 1.0.0
 */

import { Schema, model, Document } from 'mongoose'; // v7.x
import { plugin } from 'mongoose-update-if-current'; // v1.x
import { IExercise, ExerciseType, ExerciseStatus, ExerciseComplexity } from '../interfaces/exercise.interface';
import { IBaseEntity } from '../../shared/interfaces/base.interface';
import { FilterOperator, SortOrder } from '../../shared/types/common.types';

/**
 * Extended document type for exercises with versioning support
 */
export interface ExerciseDocument extends Document, IExercise, IBaseEntity {
  version: number;
}

/**
 * Options for filtering exercise queries
 */
interface FilterOptions {
  status?: ExerciseStatus[];
  type?: ExerciseType;
  startDate?: Date;
  endDate?: Date;
  complianceFrameworks?: string[];
  complexity?: ExerciseComplexity;
}

/**
 * MongoDB schema definition for exercises with comprehensive validation
 */
const ExerciseSchema = new Schema<ExerciseDocument>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Organization ID is required'],
      ref: 'Organization',
      index: true
    },
    title: {
      type: String,
      required: [true, 'Exercise title is required'],
      trim: true,
      maxlength: [255, 'Title cannot exceed 255 characters'],
      index: true
    },
    description: {
      type: String,
      required: [true, 'Exercise description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    type: {
      type: String,
      enum: Object.values(ExerciseType),
      required: [true, 'Exercise type is required'],
      index: true
    },
    status: {
      type: String,
      enum: Object.values(ExerciseStatus),
      default: ExerciseStatus.DRAFT,
      index: true
    },
    scheduledStartTime: {
      type: Date,
      required: [true, 'Scheduled start time is required'],
      index: true
    },
    scheduledEndTime: {
      type: Date,
      required: [true, 'Scheduled end time is required'],
      validate: {
        validator: function(this: ExerciseDocument, endTime: Date) {
          return endTime > this.scheduledStartTime;
        },
        message: 'End time must be after start time'
      }
    },
    actualStartTime: Date,
    actualEndTime: Date,
    duration: {
      type: Number,
      required: [true, 'Exercise duration is required'],
      min: [0, 'Duration cannot be negative'],
      validate: {
        validator: (v: number) => v <= 480,
        message: 'Duration cannot exceed 8 hours'
      }
    },
    scenarioId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Scenario ID is required'],
      ref: 'Scenario'
    },
    complianceFrameworks: {
      type: [String],
      default: [],
      index: true
    },
    aiEnabled: {
      type: Boolean,
      default: true
    },
    complexity: {
      type: String,
      enum: Object.values(ExerciseComplexity),
      default: ExerciseComplexity.MEDIUM
    },
    participantCount: {
      type: Number,
      default: 0,
      min: [0, 'Participant count cannot be negative']
    },
    injectCount: {
      type: Number,
      default: 0,
      min: [0, 'Inject count cannot be negative']
    },
    responseRate: {
      type: Number,
      default: 0,
      min: [0, 'Response rate cannot be negative'],
      max: [100, 'Response rate cannot exceed 100%']
    },
    settings: {
      allowDynamicInjects: { type: Boolean, default: true },
      autoProgressInjects: { type: Boolean, default: false },
      requireResponseValidation: { type: Boolean, default: true },
      notificationPreferences: {
        email: { type: Boolean, default: true },
        slack: { type: Boolean, default: true },
        teams: { type: Boolean, default: true }
      },
      timeoutSettings: {
        injectTimeout: { type: Number, default: 15 },
        responseTimeout: { type: Number, default: 30 }
      }
    },
    tags: [String],
    notes: String,
    lastPausedAt: Date,
    totalPauseDuration: {
      type: Number,
      default: 0,
      min: [0, 'Pause duration cannot be negative']
    },
    version: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for common query patterns
ExerciseSchema.index({ organizationId: 1, status: 1 });
ExerciseSchema.index({ organizationId: 1, scheduledStartTime: 1 });
ExerciseSchema.index({ complianceFrameworks: 1, status: 1 });

// Apply optimistic concurrency control
ExerciseSchema.plugin(plugin);

/**
 * Static method to find exercises by organization with filtering
 */
ExerciseSchema.statics.findByOrganization = async function(
  organizationId: string,
  options: FilterOptions = {}
): Promise<ExerciseDocument[]> {
  const query: any = { organizationId };

  if (options.status) {
    query.status = { [FilterOperator.IN]: options.status };
  }
  if (options.type) {
    query.type = options.type;
  }
  if (options.startDate) {
    query.scheduledStartTime = { [FilterOperator.GREATER_THAN]: options.startDate };
  }
  if (options.complianceFrameworks?.length) {
    query.complianceFrameworks = { [FilterOperator.IN]: options.complianceFrameworks };
  }

  return this.find(query).lean();
};

/**
 * Static method to find active exercises with metrics
 */
ExerciseSchema.statics.findActiveExercises = async function(): Promise<ExerciseDocument[]> {
  return this.find({
    status: ExerciseStatus.IN_PROGRESS,
    actualStartTime: { $exists: true }
  })
    .select('+responseRate +participantCount')
    .lean();
};

/**
 * Static method to update exercise status with validation
 */
ExerciseSchema.statics.updateExerciseStatus = async function(
  exerciseId: string,
  newStatus: ExerciseStatus
): Promise<ExerciseDocument> {
  const exercise = await this.findById(exerciseId);
  if (!exercise) {
    throw new Error('Exercise not found');
  }

  const updates: Partial<ExerciseDocument> = { status: newStatus };

  if (newStatus === ExerciseStatus.IN_PROGRESS) {
    updates.actualStartTime = new Date();
  } else if (newStatus === ExerciseStatus.COMPLETED) {
    updates.actualEndTime = new Date();
  } else if (newStatus === ExerciseStatus.PAUSED) {
    updates.lastPausedAt = new Date();
  }

  return this.findByIdAndUpdate(
    exerciseId,
    updates,
    { new: true, runValidators: true }
  );
};

// Create and export the Exercise model
export const Exercise = model<ExerciseDocument>('Exercise', ExerciseSchema);