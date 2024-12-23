/**
 * @fileoverview Core exercise interface definitions implementing comprehensive support for
 * tabletop exercise management, including configuration, lifecycle tracking, and compliance alignment.
 * @version 1.0.0
 */

import { ObjectId } from 'mongodb'; // v6.0.x
import { IBaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Comprehensive enumeration of supported exercise types aligned with platform capabilities
 */
export enum ExerciseType {
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  BUSINESS_CONTINUITY = 'BUSINESS_CONTINUITY',
  COMPLIANCE_VALIDATION = 'COMPLIANCE_VALIDATION',
  CRISIS_MANAGEMENT = 'CRISIS_MANAGEMENT',
  TECHNICAL_RECOVERY = 'TECHNICAL_RECOVERY'
}

/**
 * Enhanced exercise lifecycle status tracking with support for granular state management
 */
export enum ExerciseStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED'
}

/**
 * Exercise complexity levels for AI-driven scenario generation
 */
export enum ExerciseComplexity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

/**
 * Exercise settings configuration interface
 */
export interface IExerciseSettings {
  readonly allowDynamicInjects: boolean;
  readonly autoProgressInjects: boolean;
  readonly requireResponseValidation: boolean;
  readonly notificationPreferences: {
    readonly email: boolean;
    readonly slack: boolean;
    readonly teams: boolean;
  };
  readonly timeoutSettings: {
    readonly injectTimeout: number; // in minutes
    readonly responseTimeout: number; // in minutes
  };
}

/**
 * Core interface defining the structure and properties of a tabletop exercise
 * with enhanced support for lifecycle management, real-time tracking, and performance monitoring
 */
export interface IExercise extends IBaseEntity {
  /**
   * Reference to the organization conducting the exercise
   */
  readonly organizationId: ObjectId;

  /**
   * Exercise identification and description
   */
  readonly title: string;
  readonly description: string;
  readonly type: ExerciseType;
  readonly status: ExerciseStatus;

  /**
   * Temporal tracking for exercise scheduling and execution
   */
  readonly scheduledStartTime: Date;
  readonly scheduledEndTime: Date;
  readonly actualStartTime?: Date;
  readonly actualEndTime?: Date;
  readonly duration: number; // in minutes

  /**
   * Scenario and compliance configuration
   */
  readonly scenarioId: ObjectId;
  readonly complianceFrameworks: string[];
  readonly aiEnabled: boolean;
  readonly complexity: ExerciseComplexity;

  /**
   * Performance metrics and tracking
   */
  readonly participantCount: number;
  readonly injectCount: number;
  readonly responseRate: number; // percentage

  /**
   * Exercise configuration and preferences
   */
  readonly settings: IExerciseSettings;

  /**
   * Optional metadata for enhanced tracking
   */
  readonly tags?: string[];
  readonly notes?: string;
  readonly lastPausedAt?: Date;
  readonly totalPauseDuration?: number; // in minutes
}

/**
 * Type guard to check if a value is a valid ExerciseType
 * @param value The value to check
 * @returns boolean indicating if the value is a valid ExerciseType
 */
export const isExerciseType = (value: string): value is ExerciseType => {
  return Object.values(ExerciseType).includes(value as ExerciseType);
};

/**
 * Type guard to check if a value is a valid ExerciseStatus
 * @param value The value to check
 * @returns boolean indicating if the value is a valid ExerciseStatus
 */
export const isExerciseStatus = (value: string): value is ExerciseStatus => {
  return Object.values(ExerciseStatus).includes(value as ExerciseStatus);
};

/**
 * Type guard to check if a value is a valid ExerciseComplexity
 * @param value The value to check
 * @returns boolean indicating if the value is a valid ExerciseComplexity
 */
export const isExerciseComplexity = (value: string): value is ExerciseComplexity => {
  return Object.values(ExerciseComplexity).includes(value as ExerciseComplexity);
};