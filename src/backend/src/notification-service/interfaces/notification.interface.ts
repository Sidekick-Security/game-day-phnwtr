/**
 * @fileoverview Core notification service interfaces and enums defining the structure
 * and types for multi-channel exercise notifications with enhanced type safety.
 * Implements enterprise-grade notification handling for the GameDay Platform.
 * @version 1.0.0
 */

import { IBaseEntity } from '../../shared/interfaces/base.interface';

/**
 * Enumeration of possible notification delivery statuses
 * Used for tracking notification lifecycle and retry management
 */
export enum NotificationStatus {
  PENDING = 'PENDING',     // Initial state, awaiting delivery
  DELIVERED = 'DELIVERED', // Successfully delivered to target channel
  FAILED = 'FAILED',      // Delivery failed after max retries
  CANCELLED = 'CANCELLED' // Manually cancelled or invalidated
}

/**
 * Enumeration of notification types for different exercise events
 * Maps to specific exercise workflow stages and actions
 */
export enum NotificationType {
  EXERCISE_START = 'EXERCISE_START',         // Exercise initiation notification
  EXERCISE_END = 'EXERCISE_END',             // Exercise completion notification
  INJECT_DELIVERED = 'INJECT_DELIVERED',     // New scenario inject available
  RESPONSE_REQUIRED = 'RESPONSE_REQUIRED',   // Action required from participant
  EXERCISE_UPDATE = 'EXERCISE_UPDATE'        // General exercise status update
}

/**
 * Supported notification delivery channels
 * Implements enterprise integration requirements for multi-channel delivery
 */
export enum NotificationChannel {
  TEAMS = 'TEAMS',   // Microsoft Teams integration
  SLACK = 'SLACK',   // Slack workspace integration
  EMAIL = 'EMAIL'    // Email delivery channel
}

/**
 * Priority levels for notifications affecting delivery strategy
 * and retry policies
 */
export enum NotificationPriority {
  HIGH = 'HIGH',     // Immediate delivery required
  MEDIUM = 'MEDIUM', // Standard delivery priority
  LOW = 'LOW'        // Background delivery acceptable
}

/**
 * Interface defining the structure of notification content
 * Supports rich content delivery across different channels
 */
export interface INotificationContent {
  /**
   * Main notification title/subject
   */
  readonly title: string;

  /**
   * Detailed notification message/body
   */
  readonly message: string;

  /**
   * Additional structured data specific to notification type
   * Used for channel-specific formatting and rich content
   */
  readonly data: Record<string, any>;
}

/**
 * Core notification interface extending base entity
 * Implements comprehensive notification tracking and delivery management
 */
export interface INotification extends IBaseEntity {
  /**
   * Type of notification corresponding to exercise events
   */
  readonly type: NotificationType;

  /**
   * Target delivery channel for the notification
   */
  readonly channel: NotificationChannel;

  /**
   * Notification priority level affecting delivery strategy
   */
  readonly priority: NotificationPriority;

  /**
   * List of recipient identifiers (user IDs, channel IDs, email addresses)
   */
  readonly recipients: string[];

  /**
   * Structured notification content
   */
  readonly content: INotificationContent;

  /**
   * Reference to associated exercise
   */
  readonly exerciseId: string;

  /**
   * Current delivery status
   */
  readonly status: NotificationStatus;

  /**
   * Additional metadata for tracking and analytics
   * Includes channel-specific delivery receipts and timestamps
   */
  readonly metadata: Record<string, any>;

  /**
   * Number of delivery attempts for retry management
   */
  readonly retryCount: number;

  /**
   * Timestamp of last retry attempt
   */
  readonly lastRetryAt: Date;
}