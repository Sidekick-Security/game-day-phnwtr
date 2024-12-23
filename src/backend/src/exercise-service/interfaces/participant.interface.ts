/**
 * @fileoverview Defines the core participant interfaces and enums for the GameDay Platform's
 * exercise service. Implements role-based access control, participant status tracking,
 * and notification preferences with strict type safety.
 * @version 1.0.0
 */

import { ObjectId } from 'mongodb';
import { IBaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Enumeration of participant roles in exercises with corresponding access levels
 * Based on the Role-Based Access Control Matrix from technical specifications
 */
export enum ParticipantRole {
  EXERCISE_ADMIN = 'EXERCISE_ADMIN',    // Full access to exercise management and control
  FACILITATOR = 'FACILITATOR',          // Exercise control and participation capabilities
  PARTICIPANT = 'PARTICIPANT',          // Limited to exercise participation only
  OBSERVER = 'OBSERVER'                 // Read-only access to exercise proceedings
}

/**
 * Enumeration of possible participant statuses throughout the exercise lifecycle
 */
export enum ParticipantStatus {
  INVITED = 'INVITED',       // Initial state when participant is invited
  ACCEPTED = 'ACCEPTED',     // Participant has accepted the invitation
  DECLINED = 'DECLINED',     // Participant has declined the invitation
  ACTIVE = 'ACTIVE',        // Participant is currently active in the exercise
  INACTIVE = 'INACTIVE'      // Participant is temporarily inactive or disconnected
}

/**
 * Interface defining notification preferences for multi-platform delivery
 * Supports various communication channels as specified in system requirements
 */
export interface INotificationPreferences {
  readonly email: boolean;      // Email notifications
  readonly slack: boolean;      // Slack integration notifications
  readonly teams: boolean;      // Microsoft Teams notifications
  readonly inApp: boolean;      // In-application notifications
  readonly mobileApp: boolean;  // Mobile application push notifications
}

/**
 * Core participant interface extending IBaseEntity with exercise-specific attributes
 * Implements comprehensive participant tracking and management capabilities
 */
export interface IParticipant extends IBaseEntity {
  /**
   * Reference to the exercise this participation record belongs to
   */
  readonly exerciseId: ObjectId;

  /**
   * Reference to the user participating in the exercise
   */
  readonly userId: ObjectId;

  /**
   * Assigned role determining access levels and permissions
   */
  readonly role: ParticipantRole;

  /**
   * Current participation status in the exercise
   */
  readonly status: ParticipantStatus;

  /**
   * Reference to the team the participant belongs to
   */
  readonly teamId: ObjectId;

  /**
   * Configured notification preferences for exercise communications
   */
  readonly notificationPreferences: INotificationPreferences;

  /**
   * Timestamp of the participant's last activity in the exercise
   */
  readonly lastActiveTime: Date;

  /**
   * Number of responses submitted by the participant
   */
  readonly responseCount: number;

  /**
   * Percentage of injects responded to by the participant
   */
  readonly responseRate: number;

  /**
   * Additional exercise-specific metadata for the participant
   * Allows for flexible extension of participant attributes
   */
  readonly metadata: Record<string, unknown>;
}