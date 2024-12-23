/**
 * @fileoverview Defines comprehensive interfaces and enums for exercise injects,
 * supporting dynamic scenario delivery, response tracking, and compliance validation.
 * Implements enterprise-grade type safety and tracking capabilities.
 * @version 1.0.0
 */

import { ObjectId } from 'mongodb';
import { IBaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Comprehensive enumeration of supported inject types for exercise scenarios.
 * Maps to specific exercise components and compliance requirements.
 */
export enum InjectType {
  /** Updates to the core scenario narrative */
  SCENARIO_UPDATE = 'SCENARIO_UPDATE',
  
  /** Technical tasks requiring specific actions */
  TECHNICAL_TASK = 'TECHNICAL_TASK',
  
  /** Critical decision points requiring participant choices */
  DECISION_POINT = 'DECISION_POINT',
  
  /** Compliance-specific validation checks */
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK'
}

/**
 * Tracks the delivery and completion status of exercise injects
 * with enhanced state management for real-time tracking.
 */
export enum InjectStatus {
  /** Inject is scheduled but not yet delivered */
  PENDING = 'PENDING',
  
  /** Inject has been delivered to participants */
  DELIVERED = 'DELIVERED',
  
  /** Participants are actively working on the inject */
  IN_PROGRESS = 'IN_PROGRESS',
  
  /** All required responses have been received */
  COMPLETED = 'COMPLETED',
  
  /** Inject was bypassed in the exercise flow */
  SKIPPED = 'SKIPPED'
}

/**
 * Comprehensive interface for exercise injects with full tracking
 * and validation capabilities. Extends base entity for persistence.
 */
export interface IInject extends IBaseEntity {
  /** Reference to the parent exercise */
  readonly exerciseId: ObjectId;
  
  /** Classification of the inject content */
  readonly type: InjectType;
  
  /** Current delivery and completion status */
  readonly status: InjectStatus;
  
  /** Short descriptive title of the inject */
  readonly title: string;
  
  /** Detailed inject content or scenario update */
  readonly content: string;
  
  /** Expected response criteria for validation */
  readonly expectedResponse: string;
  
  /** Planned delivery time in the exercise timeline */
  readonly scheduledTime: Date;
  
  /** Actual time the inject was delivered */
  readonly deliveryTime: Date | null;
  
  /** Maximum time allowed for response in minutes */
  readonly timeoutMinutes: number;
  
  /** Specific roles targeted by this inject */
  readonly targetRoles: string[];
  
  /** Associated compliance framework requirements */
  readonly complianceRequirements: string[];
  
  /** Number of responses received for tracking */
  readonly responseCount: number;
  
  /** Indicates if inject was AI-generated */
  readonly isAiGenerated: boolean;
  
  /** Additional contextual data for inject processing */
  readonly metadata: {
    /** Difficulty level of the inject */
    difficulty?: 'LOW' | 'MEDIUM' | 'HIGH';
    
    /** Dependencies on other injects */
    dependencies?: string[];
    
    /** Custom validation rules */
    validationRules?: Record<string, unknown>;
    
    /** Platform-specific delivery options */
    deliveryOptions?: {
      platforms: string[];
      formatting?: Record<string, unknown>;
    };
    
    /** Additional tracking metrics */
    metrics?: {
      responseTimeAverage?: number;
      completionRate?: number;
      validationScore?: number;
    };
  };
}

/**
 * Type guard to check if a value is a valid InjectType
 * @param value The value to check
 * @returns boolean indicating if the value is a valid InjectType
 */
export const isInjectType = (value: string): value is InjectType => {
  return Object.values(InjectType).includes(value as InjectType);
};

/**
 * Type guard to check if a value is a valid InjectStatus
 * @param value The value to check
 * @returns boolean indicating if the value is a valid InjectStatus
 */
export const isInjectStatus = (value: string): value is InjectStatus => {
  return Object.values(InjectStatus).includes(value as InjectStatus);
};