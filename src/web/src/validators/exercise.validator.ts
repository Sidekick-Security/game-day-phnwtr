/**
 * @fileoverview Exercise Validation Schemas
 * @version 1.0.0
 * 
 * Implements comprehensive Zod validation schemas for exercise-related data
 * with strong type safety and detailed error messages.
 */

import { z } from 'zod'; // v3.22.0
import {
  ExerciseType,
  ExerciseStatus,
  InjectType,
  InjectStatus,
  ParticipantRole,
  ParticipantStatus
} from '../types/exercise.types';
import {
  IExercise,
  IExerciseInject,
  IExerciseParticipant,
  IExerciseResponse
} from '../interfaces/exercise.interface';
import { validateExerciseConfig } from '../utils/validation.utils';

// Global validation constants
const MIN_TITLE_LENGTH = 5;
const MAX_TITLE_LENGTH = 100;
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 50;
const MIN_EXERCISE_DURATION = 30;
const MAX_EXERCISE_DURATION = 480;

/**
 * Zod schema for validating exercise participant data
 */
export const participantSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.nativeEnum(ParticipantRole),
  status: z.nativeEnum(ParticipantStatus),
  joinedAt: z.date().nullable(),
  lastActive: z.date().nullable(),
  activityLog: z.array(z.object({
    timestamp: z.date(),
    action: z.string(),
    details: z.string(),
    injectId: z.string().uuid().optional()
  })),
  metrics: z.object({
    responseTime: z.number().min(0),
    participationRate: z.number().min(0).max(100),
    completionRate: z.number().min(0).max(100).optional(),
    accuracyScore: z.number().min(0).max(100).optional()
  })
});

/**
 * Zod schema for validating exercise response data
 */
export const responseSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  injectId: z.string().uuid(),
  participantId: z.string().uuid(),
  content: z.string().min(1),
  submittedAt: z.date(),
  attachments: z.array(z.object({
    id: z.string().uuid(),
    type: z.string(),
    url: z.string().url(),
    name: z.string(),
    size: z.number().optional(),
    metadata: z.record(z.unknown()).optional()
  })),
  validation: z.object({
    isValid: z.boolean(),
    feedback: z.array(z.string()),
    score: z.number().min(0).max(100),
    complianceValidation: z.array(z.object({
      framework: z.string(),
      requirements: z.array(z.string()),
      conformance: z.boolean()
    })).optional()
  })
});

/**
 * Zod schema for validating exercise inject data
 */
export const injectSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  title: z.string().min(MIN_TITLE_LENGTH).max(MAX_TITLE_LENGTH),
  description: z.string().min(MIN_DESCRIPTION_LENGTH).max(MAX_DESCRIPTION_LENGTH),
  type: z.nativeEnum(InjectType),
  status: z.nativeEnum(InjectStatus),
  scheduledTime: z.date(),
  deliveredTime: z.date().nullable(),
  responseRequired: z.boolean(),
  responseValidation: z.object({
    required: z.boolean(),
    criteria: z.array(z.string()),
    timeLimit: z.number().min(1).max(60),
    complianceChecks: z.array(z.string()).optional()
  }),
  responses: z.array(responseSchema),
  aiGenerated: z.boolean(),
  dependencies: z.array(z.string().uuid()).optional()
});

/**
 * Comprehensive Zod schema for validating exercise data
 */
export const exerciseSchema = z.object({
  id: z.string().uuid(),
  title: z.string()
    .min(MIN_TITLE_LENGTH, 'Title must be at least 5 characters')
    .max(MAX_TITLE_LENGTH, 'Title cannot exceed 100 characters'),
  description: z.string()
    .min(MIN_DESCRIPTION_LENGTH, 'Description must be at least 20 characters')
    .max(MAX_DESCRIPTION_LENGTH, 'Description cannot exceed 1000 characters'),
  type: z.nativeEnum(ExerciseType),
  status: z.nativeEnum(ExerciseStatus),
  organizationId: z.string().uuid(),
  createdBy: z.string().uuid(),
  createdAt: z.date(),
  scheduledStart: z.date(),
  scheduledEnd: z.date(),
  actualStart: z.date().nullable(),
  actualEnd: z.date().nullable(),
  participants: z.array(participantSchema)
    .min(MIN_PARTICIPANTS, 'At least 2 participants required')
    .max(MAX_PARTICIPANTS, 'Cannot exceed 50 participants'),
  injects: z.array(injectSchema),
  isAiEnabled: z.boolean(),
  aiConfig: z.object({
    complexity: z.enum(['low', 'medium', 'high']),
    adaptiveScenarios: z.boolean(),
    complianceAlignment: z.boolean().optional()
  }),
  complianceFrameworks: z.array(z.string()),
  metrics: z.object({
    responseTime: z.number().min(0),
    completionRate: z.number().min(0).max(100),
    participationRate: z.number().min(0).max(100),
    complianceCoverage: z.number().min(0).max(100).optional()
  }),
  objectives: z.array(z.object({
    description: z.string(),
    successCriteria: z.array(z.string()),
    complianceRequirements: z.array(z.string()).optional()
  }))
}).refine(
  (exercise) => {
    const duration = exercise.scheduledEnd.getTime() - exercise.scheduledStart.getTime();
    const durationInMinutes = duration / (1000 * 60);
    return durationInMinutes >= MIN_EXERCISE_DURATION && durationInMinutes <= MAX_EXERCISE_DURATION;
  },
  {
    message: `Exercise duration must be between ${MIN_EXERCISE_DURATION} and ${MAX_EXERCISE_DURATION} minutes`
  }
);

/**
 * Validates exercise data against schemas and business rules
 * @param exerciseData - Exercise data to validate
 * @returns Validation result with detailed error messages
 */
export const validateExercise = (exerciseData: Partial<IExercise>) => {
  try {
    // Basic schema validation
    const parseResult = exerciseSchema.safeParse(exerciseData);
    
    if (!parseResult.success) {
      return {
        isValid: false,
        errors: parseResult.error.errors.map(err => err.message),
        details: { zodErrors: parseResult.error.errors }
      };
    }

    // Additional business rule validation
    const configValidation = validateExerciseConfig({
      type: exerciseData.type!,
      title: exerciseData.title!,
      description: exerciseData.description!,
      participants: exerciseData.participants!,
      schedule: {
        startTime: exerciseData.scheduledStart!,
        duration: (exerciseData.scheduledEnd!.getTime() - exerciseData.scheduledStart!.getTime()) / (1000 * 60)
      }
    });

    if (!configValidation.isValid) {
      return configValidation;
    }

    return {
      isValid: true,
      errors: [],
      details: {
        validatedAt: new Date(),
        schemaVersion: '1.0.0'
      }
    };
  } catch (error) {
    return {
      isValid: false,
      errors: ['Unexpected validation error occurred'],
      details: { error }
    };
  }
};