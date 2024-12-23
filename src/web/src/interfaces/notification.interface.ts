/**
 * @fileoverview Notification interfaces for the GameDay Platform web application
 * Supporting multi-channel notifications and real-time exercise updates
 * @version 1.0.0
 */

import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationFilter,
  NotificationMetadata
} from '../types/notification.types';

/**
 * Interface defining the structure of notification content
 * Supports rich content with additional data payload
 */
export interface INotificationContent {
  /** Title of the notification */
  title: string;
  
  /** Main notification message content */
  message: string;
  
  /** Additional structured data associated with the notification */
  data?: Record<string, any>;
}

/**
 * Core notification interface representing a single notification instance
 * Combines all notification attributes and metadata
 */
export interface INotification {
  /** Unique identifier for the notification */
  id: string;
  
  /** Type of notification event */
  type: NotificationType;
  
  /** Delivery channel for the notification */
  channel: NotificationChannel;
  
  /** Priority level indicating urgency */
  priority: NotificationPriority;
  
  /** Current status of the notification */
  status: NotificationStatus;
  
  /** List of recipient identifiers */
  recipients: string[];
  
  /** Structured notification content */
  content: INotificationContent;
  
  /** Associated exercise identifier */
  exerciseId: string;
  
  /** Additional metadata and context */
  metadata: NotificationMetadata;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
}

/**
 * Service interface for managing notifications
 * Provides methods for notification operations and exercise updates
 */
export interface INotificationService {
  /**
   * Retrieves notifications based on provided filters
   * @param filter Optional filtering criteria
   * @returns Promise resolving to array of notifications
   */
  getNotifications(filter?: NotificationFilter): Promise<INotification[]>;
  
  /**
   * Marks a notification as read
   * @param notificationId ID of the notification to mark
   */
  markAsRead(notificationId: string): Promise<void>;
  
  /**
   * Archives a notification
   * @param notificationId ID of the notification to archive
   */
  archiveNotification(notificationId: string): Promise<void>;
  
  /**
   * Updates notification channel preferences
   * @param channelConfig Configuration for each notification channel
   */
  updateNotificationPreferences(
    channelConfig: Record<NotificationChannel, boolean>
  ): Promise<void>;
  
  /**
   * Subscribes to real-time updates for a specific exercise
   * @param exerciseId ID of the exercise to subscribe to
   */
  subscribeToExerciseUpdates(exerciseId: string): Promise<void>;
  
  /**
   * Unsubscribes from exercise updates
   * @param exerciseId ID of the exercise to unsubscribe from
   */
  unsubscribeFromExerciseUpdates(exerciseId: string): Promise<void>;
  
  /**
   * Marks multiple notifications as read in bulk
   * @param notificationIds Array of notification IDs to mark as read
   */
  bulkMarkAsRead(notificationIds: string[]): Promise<void>;
  
  /**
   * Archives multiple notifications in bulk
   * @param notificationIds Array of notification IDs to archive
   */
  bulkArchive(notificationIds: string[]): Promise<void>;
}