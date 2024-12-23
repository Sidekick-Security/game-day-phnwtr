// @ts-check
/**
 * @fileoverview Notification system type definitions supporting multi-channel delivery,
 * real-time exercise updates, and advanced filtering capabilities.
 * @version 1.0.0
 */

// External imports
import { UUID } from 'crypto'; // v20.0.0+ - For type definition of unique identifiers

/**
 * Supported notification delivery channels
 * @enum {string}
 */
export enum NotificationChannel {
    IN_APP = 'IN_APP',
    EMAIL = 'EMAIL',
    TEAMS = 'TEAMS',
    SLACK = 'SLACK'
}

/**
 * Types of notification events for exercise coordination
 * @enum {string}
 */
export enum NotificationType {
    EXERCISE_START = 'EXERCISE_START',
    EXERCISE_END = 'EXERCISE_END',
    INJECT_DELIVERED = 'INJECT_DELIVERED',
    RESPONSE_REQUIRED = 'RESPONSE_REQUIRED',
    PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
    PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
    EXERCISE_PAUSED = 'EXERCISE_PAUSED',
    EXERCISE_RESUMED = 'EXERCISE_RESUMED',
    SYSTEM_ALERT = 'SYSTEM_ALERT'
}

/**
 * Priority levels for notification urgency
 * @enum {string}
 */
export enum NotificationPriority {
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW'
}

/**
 * Notification read status for tracking user interaction
 * @enum {string}
 */
export enum NotificationStatus {
    UNREAD = 'UNREAD',
    READ = 'READ',
    ARCHIVED = 'ARCHIVED'
}

/**
 * Configuration for each notification channel
 * Includes channel-specific settings like webhook URLs and API keys
 */
export type NotificationChannelConfig = Record<NotificationChannel, {
    enabled: boolean;
    config?: {
        webhookUrl?: string;
        apiKey?: string;
        customSettings?: Record<string, unknown>;
    };
}>;

/**
 * Metadata associated with each notification
 * Includes exercise context, timing, and channel-specific data
 */
export type NotificationMetadata = {
    exerciseId?: UUID;
    injectId?: UUID;
    participantId?: UUID;
    timestamp: Date;
    channelSpecific?: Record<NotificationChannel, unknown>;
    customData?: Record<string, unknown>;
};

/**
 * Advanced filtering options for notification queries
 * Supports complex filtering, pagination, and sorting
 */
export type NotificationFilter = {
    type?: NotificationType[];
    channel?: NotificationChannel[];
    priority?: NotificationPriority[];
    status?: NotificationStatus[];
    startDate?: Date;
    endDate?: Date;
    exerciseId?: UUID;
    participantId?: UUID;
    searchText?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'timestamp' | 'priority' | 'status';
    sortOrder?: 'asc' | 'desc';
};

/**
 * Core notification interface combining all notification attributes
 */
export interface INotification {
    id: UUID;
    type: NotificationType;
    channel: NotificationChannel;
    priority: NotificationPriority;
    status: NotificationStatus;
    title: string;
    content: string;
    metadata: NotificationMetadata;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Notification creation payload type
 * Omits system-generated fields like id and timestamps
 */
export type CreateNotificationPayload = Omit<INotification, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Notification update payload type
 * Allows partial updates to mutable fields
 */
export type UpdateNotificationPayload = Partial<Omit<INotification, 'id' | 'type' | 'channel' | 'createdAt'>>;

/**
 * Batch notification operations payload type
 * Supports bulk operations with multiple notification IDs
 */
export type BatchNotificationOperation = {
    notificationIds: UUID[];
    operation: 'markAsRead' | 'markAsUnread' | 'archive' | 'delete';
};

/**
 * Channel-specific notification templates
 * Supports customized formatting for different delivery channels
 */
export type NotificationTemplate = {
    [key in NotificationChannel]: {
        titleTemplate: string;
        contentTemplate: string;
        formatting?: Record<string, unknown>;
    };
};