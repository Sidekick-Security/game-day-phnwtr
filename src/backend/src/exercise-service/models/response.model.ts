/**
 * @fileoverview Implements MongoDB schema and model for exercise participant responses
 * with enhanced validation, compliance mapping, and real-time analytics capabilities.
 * @version 1.0.0
 */

import { Schema, model, Document } from 'mongoose'; // v7.x
import { IResponse, ResponseStatus, ResponseValidation } from '../interfaces/response.interface';
import { IBaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Interface for response analysis results including compliance gaps
 */
interface AnalysisResult {
  complianceCoverage: number;
  identifiedGaps: string[];
  recommendations: string[];
  metrics: {
    averageResponseTime: number;
    validationRate: number;
    complianceAlignment: number;
  };
}

/**
 * Interface for bulk validation operation results
 */
interface BulkValidationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Interface for response filtering options
 */
interface FilterOptions {
  status?: ResponseStatus[];
  validation?: ResponseValidation[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  complianceFrameworks?: string[];
}

/**
 * Interface for response analysis options
 */
interface AnalysisOptions {
  includeMetrics: boolean;
  complianceFrameworks?: string[];
  gapThreshold?: number;
}

/**
 * MongoDB document type for responses with enhanced validation support
 */
export interface ResponseDocument extends Document, IResponse, IBaseEntity {}

/**
 * MongoDB schema for exercise responses with comprehensive indexing
 */
const ResponseSchema = new Schema<ResponseDocument>(
  {
    exerciseId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Exercise',
      index: true
    },
    injectId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Inject',
      index: true
    },
    participantId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Participant',
      index: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(ResponseStatus),
      default: ResponseStatus.DRAFT,
      index: true
    },
    validation: {
      type: String,
      enum: Object.values(ResponseValidation),
      index: true
    },
    validatorNotes: {
      type: String,
      maxlength: 5000,
      trim: true
    },
    submissionTime: {
      type: Date,
      index: true
    },
    validationTime: {
      type: Date,
      index: true
    },
    attachments: {
      type: [String],
      default: [],
      validate: [
        (v: string[]) => v.length <= 10,
        'Maximum of 10 attachments allowed'
      ]
    },
    complianceMapping: {
      type: [String],
      default: [],
      index: true
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    versionKey: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound indexes for common query patterns
ResponseSchema.index({ exerciseId: 1, status: 1 });
ResponseSchema.index({ exerciseId: 1, participantId: 1 });
ResponseSchema.index({ exerciseId: 1, submissionTime: 1 });

/**
 * Finds all responses for a given exercise with enhanced filtering
 */
ResponseSchema.statics.findByExercise = async function(
  exerciseId: Schema.Types.ObjectId,
  options?: FilterOptions
): Promise<ResponseDocument[]> {
  const query = this.find({ exerciseId });

  if (options?.status) {
    query.where('status').in(options.status);
  }

  if (options?.validation) {
    query.where('validation').in(options.validation);
  }

  if (options?.timeRange) {
    query.where('submissionTime').gte(options.timeRange.start).lte(options.timeRange.end);
  }

  if (options?.complianceFrameworks) {
    query.where('complianceMapping').in(options.complianceFrameworks);
  }

  return query.sort({ submissionTime: -1 }).exec();
};

/**
 * Performs bulk validation of multiple responses
 */
ResponseSchema.statics.bulkValidateResponses = async function(
  responseIds: string[],
  validation: ResponseValidation,
  validatorNotes: string
): Promise<BulkValidationResult> {
  const session = await this.startSession();
  session.startTransaction();

  try {
    const result: BulkValidationResult = {
      successCount: 0,
      failureCount: 0,
      errors: []
    };

    for (const id of responseIds) {
      try {
        await this.findByIdAndUpdate(
          id,
          {
            validation,
            validatorNotes,
            validationTime: new Date(),
            status: ResponseStatus.VALIDATED
          },
          { session }
        );
        result.successCount++;
      } catch (error) {
        result.failureCount++;
        result.errors.push({ id, error: (error as Error).message });
      }
    }

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Analyzes responses for gap identification and compliance mapping
 */
ResponseSchema.statics.analyzeResponses = async function(
  exerciseId: Schema.Types.ObjectId,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  const pipeline = [
    { $match: { exerciseId } },
    {
      $group: {
        _id: null,
        totalResponses: { $sum: 1 },
        validatedResponses: {
          $sum: {
            $cond: [{ $eq: ['$status', ResponseStatus.VALIDATED] }, 1, 0]
          }
        },
        complianceMappings: { $push: '$complianceMapping' },
        responseTimes: {
          $push: {
            $subtract: ['$submissionTime', '$createdAt']
          }
        }
      }
    }
  ];

  const [analysis] = await this.aggregate(pipeline);

  const complianceCoverage = options.complianceFrameworks
    ? analysis.complianceMappings.flat().filter(
        (framework: string) => options.complianceFrameworks?.includes(framework)
      ).length / (analysis.totalResponses * options.complianceFrameworks.length)
    : 1;

  return {
    complianceCoverage,
    identifiedGaps: [], // Implement gap identification logic
    recommendations: [], // Implement recommendation generation
    metrics: {
      averageResponseTime: analysis.responseTimes.reduce((a: number, b: number) => a + b, 0) / analysis.totalResponses,
      validationRate: analysis.validatedResponses / analysis.totalResponses,
      complianceAlignment: complianceCoverage
    }
  };
};

// Create and export the Response model
export const Response = model<ResponseDocument>('Response', ResponseSchema);