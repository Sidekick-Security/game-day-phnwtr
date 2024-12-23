/**
 * @fileoverview Defines comprehensive interfaces and enums for managing participant responses
 * during tabletop exercises. Implements detailed validation states, compliance mapping,
 * and real-time tracking capabilities for enterprise-grade exercise management.
 * @version 1.0.0
 */

import { ObjectId } from 'mongodb'; // v6.0.x
import { IBaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Enumeration of possible response states throughout its lifecycle
 * Supports granular tracking of response progression from draft to validation
 */
export enum ResponseStatus {
  /** Initial state when response is being composed */
  DRAFT = 'DRAFT',
  /** Response has been submitted for review */
  SUBMITTED = 'SUBMITTED',
  /** Response has been reviewed and validated */
  VALIDATED = 'VALIDATED',
  /** Response requires modifications based on review */
  NEEDS_REVISION = 'NEEDS_REVISION'
}

/**
 * Enumeration of validation levels for assessing response quality and compliance
 * Enables detailed gap analysis and recommendation generation
 */
export enum ResponseValidation {
  /** Response fully satisfies exercise requirements and compliance criteria */
  MEETS_EXPECTATIONS = 'MEETS_EXPECTATIONS',
  /** Response satisfies some but not all requirements */
  PARTIALLY_MEETS = 'PARTIALLY_MEETS',
  /** Response does not adequately address requirements */
  DOES_NOT_MEET = 'DOES_NOT_MEET'
}

/**
 * Comprehensive interface for managing exercise responses with validation and compliance tracking
 * Extends IBaseEntity for consistent data management across the platform
 */
export interface IResponse extends IBaseEntity {
  /** Reference to the parent exercise */
  readonly exerciseId: ObjectId;
  
  /** Reference to the specific inject being responded to */
  readonly injectId: ObjectId;
  
  /** Reference to the participant providing the response */
  readonly participantId: ObjectId;
  
  /** Actual response content provided by the participant */
  content: string;
  
  /** Current status in the response lifecycle */
  status: ResponseStatus;
  
  /** Validation assessment of the response quality */
  validation: ResponseValidation;
  
  /** Feedback and notes from the validator */
  validatorNotes: string;
  
  /** Timestamp when response was submitted by participant */
  submissionTime: Date;
  
  /** Timestamp when response was validated */
  validationTime: Date;
  
  /** Array of attachment references (e.g., file paths, URLs) */
  attachments: string[];
  
  /** Array of compliance framework references satisfied by this response */
  complianceMapping: string[];
  
  /** 
   * Additional metadata for extensibility
   * Examples: response time metrics, AI-generated recommendations, etc.
   */
  metadata: Record<string, unknown>;
}