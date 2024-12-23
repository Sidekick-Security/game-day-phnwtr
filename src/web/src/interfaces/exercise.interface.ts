/**
 * @fileoverview Exercise Interface Definitions
 * @version 1.0.0
 * 
 * Defines comprehensive TypeScript interfaces for exercise management in the GameDay Platform.
 * Implements type-safe definitions for exercises, injects, participants, and responses
 * with enhanced support for AI-driven scenarios and real-time tracking.
 */

import {
  ExerciseType,
  ExerciseStatus,
  InjectType,
  InjectStatus,
  ParticipantRole,
  ParticipantStatus
} from '../types/exercise.types';
import { IUser } from './user.interface';

/**
 * Main exercise interface with comprehensive exercise management capabilities
 * @interface IExercise
 */
export interface IExercise {
  /** Unique identifier for the exercise */
  id: string;

  /** Exercise title */
  title: string;

  /** Detailed exercise description */
  description: string;

  /** Exercise type categorization */
  type: ExerciseType;

  /** Current exercise status */
  status: ExerciseStatus;

  /** Organization identifier */
  organizationId: string;

  /** User ID of exercise creator */
  createdBy: string;

  /** Exercise creation timestamp */
  createdAt: Date;

  /** Scheduled start time */
  scheduledStart: Date;

  /** Scheduled end time */
  scheduledEnd: Date;

  /** Actual start time (null if not started) */
  actualStart: Date | null;

  /** Actual end time (null if not completed) */
  actualEnd: Date | null;

  /** Exercise participants */
  participants: IExerciseParticipant[];

  /** Exercise injects */
  injects: IExerciseInject[];

  /** AI scenario generation flag */
  isAiEnabled: boolean;

  /** AI configuration settings */
  aiConfig: {
    complexity: 'low' | 'medium' | 'high';
    adaptiveScenarios: boolean;
    complianceAlignment?: boolean;
  };

  /** Compliance frameworks addressed */
  complianceFrameworks: string[];

  /** Real-time exercise metrics */
  metrics: {
    responseTime: number;
    completionRate: number;
    participationRate: number;
    complianceCoverage?: number;
  };

  /** Exercise objectives and success criteria */
  objectives: {
    description: string;
    successCriteria: string[];
    complianceRequirements?: string[];
  }[];
}

/**
 * Exercise inject interface for scenario events and updates
 * @interface IExerciseInject
 */
export interface IExerciseInject {
  /** Unique identifier for the inject */
  id: string;

  /** Reference to parent exercise */
  exerciseId: string;

  /** Inject title */
  title: string;

  /** Detailed inject description */
  description: string;

  /** Inject type categorization */
  type: InjectType;

  /** Current inject status */
  status: InjectStatus;

  /** Scheduled delivery time */
  scheduledTime: Date;

  /** Actual delivery time (null if not delivered) */
  deliveredTime: Date | null;

  /** Response requirement flag */
  responseRequired: boolean;

  /** Response validation criteria */
  responseValidation: {
    required: boolean;
    criteria: string[];
    timeLimit: number;
    complianceChecks?: string[];
  };

  /** Participant responses */
  responses: IExerciseResponse[];

  /** AI generation flag */
  aiGenerated: boolean;

  /** Dependencies on other injects */
  dependencies?: string[];
}

/**
 * Exercise participant interface with enhanced tracking
 * @interface IExerciseParticipant
 */
export interface IExerciseParticipant {
  /** Unique identifier for participation record */
  id: string;

  /** Reference to exercise */
  exerciseId: string;

  /** Reference to user */
  userId: string;

  /** Participant role */
  role: ParticipantRole;

  /** Current participation status */
  status: ParticipantStatus;

  /** Join timestamp (null if not joined) */
  joinedAt: Date | null;

  /** Last activity timestamp */
  lastActive: Date | null;

  /** Detailed activity tracking */
  activityLog: {
    timestamp: Date;
    action: string;
    details: string;
    injectId?: string;
  }[];

  /** Participant performance metrics */
  metrics: {
    responseTime: number;
    participationRate: number;
    completionRate?: number;
    accuracyScore?: number;
  };
}

/**
 * Exercise response interface with validation support
 * @interface IExerciseResponse
 */
export interface IExerciseResponse {
  /** Unique identifier for the response */
  id: string;

  /** Reference to exercise */
  exerciseId: string;

  /** Reference to inject */
  injectId: string;

  /** Reference to participant */
  participantId: string;

  /** Response content */
  content: string;

  /** Submission timestamp */
  submittedAt: Date;

  /** Response attachments */
  attachments: {
    id: string;
    type: string;
    url: string;
    name: string;
    size?: number;
    metadata?: Record<string, unknown>;
  }[];

  /** Response validation results */
  validation: {
    isValid: boolean;
    feedback: string[];
    score: number;
    complianceValidation?: {
      framework: string;
      requirements: string[];
      conformance: boolean;
    }[];
  };
}