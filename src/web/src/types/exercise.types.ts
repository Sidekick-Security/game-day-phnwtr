/**
 * @fileoverview Exercise management type definitions and enumerations
 * @version 1.0.0
 * 
 * Provides strongly-typed definitions for exercise management including:
 * - Exercise types and statuses
 * - Inject types and statuses
 * - Participant roles and statuses
 */

/**
 * Supported exercise types aligned with organizational incident response capabilities
 * @enum {string}
 */
export enum ExerciseType {
    SECURITY_INCIDENT = 'SECURITY_INCIDENT',
    BUSINESS_CONTINUITY = 'BUSINESS_CONTINUITY', 
    COMPLIANCE_VALIDATION = 'COMPLIANCE_VALIDATION',
    CRISIS_MANAGEMENT = 'CRISIS_MANAGEMENT',
    TECHNICAL_RECOVERY = 'TECHNICAL_RECOVERY'
}

/**
 * Exercise lifecycle statuses for tracking exercise progression
 * @enum {string}
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
 * Types of injects that can be delivered during exercise scenarios
 * @enum {string}
 */
export enum InjectType {
    SCENARIO_UPDATE = 'SCENARIO_UPDATE',
    DECISION_POINT = 'DECISION_POINT',
    INFORMATION = 'INFORMATION',
    ACTION_REQUIRED = 'ACTION_REQUIRED'
}

/**
 * Status tracking for inject delivery and response lifecycle
 * @enum {string}
 */
export enum InjectStatus {
    PENDING = 'PENDING',
    DELIVERED = 'DELIVERED',
    RESPONSE_REQUIRED = 'RESPONSE_REQUIRED',
    RESPONSE_RECEIVED = 'RESPONSE_RECEIVED',
    COMPLETED = 'COMPLETED'
}

/**
 * Role-based definitions for participant access levels and capabilities
 * @enum {string}
 */
export enum ParticipantRole {
    FACILITATOR = 'FACILITATOR',
    PARTICIPANT = 'PARTICIPANT',
    OBSERVER = 'OBSERVER'
}

/**
 * Status tracking for participant engagement and availability
 * @enum {string}
 */
export enum ParticipantStatus {
    INVITED = 'INVITED',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED',
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}