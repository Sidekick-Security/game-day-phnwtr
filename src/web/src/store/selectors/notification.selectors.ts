/**
 * @fileoverview Redux selectors for notification state management
 * Provides memoized selectors for accessing and computing notification state
 * with performance optimizations and type safety.
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // v1.9.0
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationFilter
} from '../../types/notification.types';
import { INotification } from '../../interfaces/notification.interface';

/**
 * Type definition for the notification state slice
 */
interface NotificationState {
  notifications: INotification[];
  preferences: Record<NotificationChannel, boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Type definition for the root state
 */
interface RootState {
  notification: NotificationState;
}

/**
 * Base selector to access the notification state slice
 * @param state - Root Redux state
 * @returns The notification state slice or null if undefined
 */
export const selectNotificationState = (state: RootState): NotificationState | null => 
  state?.notification || null;

/**
 * Memoized selector to retrieve all notifications
 * Performance optimized with result caching
 */
export const selectAllNotifications = createSelector(
  [selectNotificationState],
  (notificationState): INotification[] => {
    if (!notificationState) return [];
    return notificationState.notifications;
  }
);

/**
 * Memoized selector for unread notifications
 * Efficiently filters notifications based on status
 */
export const selectUnreadNotifications = createSelector(
  [selectAllNotifications],
  (notifications): INotification[] => 
    notifications.filter(notification => 
      notification.status === NotificationStatus.UNREAD
    )
);

/**
 * Memoized selector factory for filtering notifications by type
 * Creates reusable selectors for specific notification types
 * @param type - The notification type to filter by
 */
export const selectNotificationsByType = (type: NotificationType) =>
  createSelector(
    [selectAllNotifications],
    (notifications): INotification[] =>
      notifications.filter(notification => notification.type === type)
  );

/**
 * Memoized selector for filtered notifications based on complex criteria
 * Supports advanced filtering with multiple conditions
 * @param filter - The filter criteria to apply
 */
export const selectFilteredNotifications = (filter: NotificationFilter) =>
  createSelector(
    [selectAllNotifications],
    (notifications): INotification[] => {
      return notifications.filter(notification => {
        if (filter.type && !filter.type.includes(notification.type)) return false;
        if (filter.status && !filter.status.includes(notification.status)) return false;
        if (filter.startDate && new Date(notification.createdAt) < filter.startDate) return false;
        if (filter.endDate && new Date(notification.createdAt) > filter.endDate) return false;
        if (filter.exerciseId && notification.exerciseId !== filter.exerciseId) return false;
        return true;
      });
    }
  );

/**
 * Memoized selector for notification preferences
 * Retrieves channel configuration with type safety
 */
export const selectNotificationPreferences = createSelector(
  [selectNotificationState],
  (notificationState): Record<NotificationChannel, boolean> => {
    if (!notificationState) {
      return Object.values(NotificationChannel).reduce(
        (acc, channel) => ({ ...acc, [channel]: false }),
        {} as Record<NotificationChannel, boolean>
      );
    }
    return notificationState.preferences;
  }
);

/**
 * Memoized selector for notification loading state
 * Provides loading indicator for async operations
 */
export const selectNotificationLoading = createSelector(
  [selectNotificationState],
  (notificationState): boolean => notificationState?.loading || false
);

/**
 * Memoized selector for notification error state
 * Retrieves error messages with null safety
 */
export const selectNotificationError = createSelector(
  [selectNotificationState],
  (notificationState): string | null => notificationState?.error || null
);

/**
 * Memoized selector for notification counts by status
 * Computes notification statistics for UI display
 */
export const selectNotificationCounts = createSelector(
  [selectAllNotifications],
  (notifications): Record<NotificationStatus, number> => {
    const initialCounts = Object.values(NotificationStatus).reduce(
      (acc, status) => ({ ...acc, [status]: 0 }),
      {} as Record<NotificationStatus, number>
    );
    
    return notifications.reduce((counts, notification) => {
      counts[notification.status]++;
      return counts;
    }, initialCounts);
  }
);

/**
 * Memoized selector for the most recent notification
 * Retrieves the latest notification with type safety
 */
export const selectMostRecentNotification = createSelector(
  [selectAllNotifications],
  (notifications): INotification | null => {
    if (notifications.length === 0) return null;
    return notifications.reduce((latest, current) => 
      new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest
    );
  }
);