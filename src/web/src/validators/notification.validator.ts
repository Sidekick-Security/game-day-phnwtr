/**
 * @fileoverview Notification validation schemas and functions for the GameDay Platform
 * Implements comprehensive validation for multi-channel notifications using Zod
 * @version 1.0.0
 */

import { z } from 'zod'; // v3.22.0
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationFilter
} from '../types/notification.types';
import {
  INotification,
  INotificationContent
} from '../interfaces/notification.interface';

// Constants for validation rules
const TITLE_MIN_LENGTH = 1;
const TITLE_MAX_LENGTH = 100;
const MESSAGE_MIN_LENGTH = 1;
const MESSAGE_MAX_LENGTH = 1000;
const MAX_RECIPIENTS = 1000;
const MAX_PAGE_SIZE = 100;

/**
 * Channel-specific content validation rules
 */
const CHANNEL_CONSTRAINTS = {
  [NotificationChannel.TEAMS]: {
    maxTitleLength: 75,
    maxMessageLength: 800
  },
  [NotificationChannel.SLACK]: {
    maxTitleLength: 80,
    maxMessageLength: 900
  },
  [NotificationChannel.EMAIL]: {
    maxTitleLength: 100,
    maxMessageLength: 1000
  },
  [NotificationChannel.IN_APP]: {
    maxTitleLength: 100,
    maxMessageLength: 500
  }
} as const;

/**
 * Schema for validating notification content with channel-specific rules
 */
export const notificationContentSchema = z.object({
  title: z.string()
    .min(TITLE_MIN_LENGTH, 'Title is required')
    .max(TITLE_MAX_LENGTH, 'Title exceeds maximum length')
    .regex(/^[^<>]*$/, 'Title contains invalid characters'),
  
  message: z.string()
    .min(MESSAGE_MIN_LENGTH, 'Message is required')
    .max(MESSAGE_MAX_LENGTH, 'Message exceeds maximum length')
    .regex(/^[^<>]*$/, 'Message contains invalid characters'),
  
  data: z.record(z.unknown()).optional(),
  
  metadata: z.record(z.unknown()).optional()
});

/**
 * Schema for validating complete notification objects
 */
export const notificationSchema = z.object({
  id: z.string().uuid('Invalid notification ID format'),
  
  type: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: 'Invalid notification type' })
  }),
  
  channel: z.nativeEnum(NotificationChannel, {
    errorMap: () => ({ message: 'Invalid notification channel' })
  }),
  
  priority: z.nativeEnum(NotificationPriority, {
    errorMap: () => ({ message: 'Invalid notification priority' })
  }),
  
  status: z.nativeEnum(NotificationStatus, {
    errorMap: () => ({ message: 'Invalid notification status' })
  }),
  
  recipients: z.array(z.string().uuid('Invalid recipient ID'))
    .min(1, 'At least one recipient is required')
    .max(MAX_RECIPIENTS, 'Too many recipients'),
  
  content: notificationContentSchema,
  
  exerciseId: z.string().uuid('Invalid exercise ID format'),
  
  metadata: z.object({
    timestamp: z.date(),
    exerciseId: z.string().uuid().optional(),
    injectId: z.string().uuid().optional(),
    participantId: z.string().uuid().optional(),
    channelSpecific: z.record(z.unknown()).optional(),
    customData: z.record(z.unknown()).optional()
  })
});

/**
 * Schema for validating notification filter parameters
 */
export const notificationFilterSchema = z.object({
  type: z.array(z.nativeEnum(NotificationType)).optional(),
  channel: z.array(z.nativeEnum(NotificationChannel)).optional(),
  priority: z.array(z.nativeEnum(NotificationPriority)).optional(),
  status: z.array(z.nativeEnum(NotificationStatus)).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  exerciseId: z.string().uuid().optional(),
  participantId: z.string().uuid().optional(),
  searchText: z.string().max(100).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(MAX_PAGE_SIZE).optional(),
  sortBy: z.enum(['timestamp', 'priority', 'status']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      return data.startDate <= data.endDate;
    }
    return true;
  },
  { message: 'Start date must be before or equal to end date' }
);

/**
 * Validates notification content with channel-specific constraints
 * @param content The notification content to validate
 * @param channel The delivery channel for the notification
 * @returns True if valid, throws ZodError if invalid
 */
export function validateNotificationContent(
  content: INotificationContent,
  channel: NotificationChannel
): boolean {
  const constraints = CHANNEL_CONSTRAINTS[channel];
  
  const channelSpecificSchema = notificationContentSchema.extend({
    title: z.string()
      .min(TITLE_MIN_LENGTH)
      .max(constraints.maxTitleLength, `Title exceeds maximum length for ${channel}`),
    message: z.string()
      .min(MESSAGE_MIN_LENGTH)
      .max(constraints.maxMessageLength, `Message exceeds maximum length for ${channel}`)
  });

  channelSpecificSchema.parse(content);
  return true;
}

/**
 * Validates complete notification object with enhanced rules
 * @param notification The notification object to validate
 * @returns True if valid, throws ZodError if invalid
 */
export function validateNotification(notification: Partial<INotification>): boolean {
  const result = notificationSchema.safeParse(notification);
  
  if (!result.success) {
    throw result.error;
  }

  // Additional validation for high-priority notifications
  if (notification.priority === NotificationPriority.HIGH) {
    if (!notification.content?.message || notification.content.message.length < 10) {
      throw new Error('High priority notifications require detailed message content');
    }
  }

  // Validate channel-specific content
  validateNotificationContent(notification.content!, notification.channel!);
  
  return true;
}

/**
 * Validates notification filter parameters
 * @param filter The filter parameters to validate
 * @returns True if valid, throws ZodError if invalid
 */
export function validateNotificationFilter(filter: NotificationFilter): boolean {
  const result = notificationFilterSchema.safeParse(filter);
  
  if (!result.success) {
    throw result.error;
  }
  
  // Additional validation for date ranges
  if (filter.startDate && filter.endDate) {
    const daysDifference = Math.abs(
      filter.endDate.getTime() - filter.startDate.getTime()
    ) / (1000 * 60 * 60 * 24);
    
    if (daysDifference > 90) {
      throw new Error('Date range cannot exceed 90 days');
    }
  }
  
  return true;
}