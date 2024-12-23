/**
 * @fileoverview Redux reducer for notification state management in GameDay Platform
 * Implements comprehensive notification handling with multi-channel support,
 * real-time updates, and exercise coordination.
 * @version 1.0.0
 */

import { createReducer } from '@reduxjs/toolkit'; // ^2.0.0
import { INotification } from '../../interfaces/notification.interface';
import { NotificationStatus, NotificationChannel } from '../../types/notification.types';
import {
  fetchNotifications,
  markNotificationAsRead,
  archiveNotification,
  updateNotificationPreferences,
  archiveNotifications,
  receiveRealTimeNotification,
  updateNotificationStatus,
  updateBatchNotificationStatus,
  setNotificationError
} from '../actions/notification.actions';

/**
 * Interface defining the notification state slice
 */
export interface NotificationState {
  /** Array of notifications */
  notifications: INotification[];
  /** Loading state indicator */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Channel-specific notification preferences */
  preferences: Record<NotificationChannel, boolean>;
  /** Last synchronization timestamp */
  lastSync: Date | null;
  /** Status tracking for batch operations */
  batchOperationStatus: Record<string, boolean>;
}

/**
 * Initial state for the notification reducer
 */
const initialState: NotificationState = {
  notifications: [],
  loading: false,
  error: null,
  preferences: {
    [NotificationChannel.IN_APP]: true,
    [NotificationChannel.EMAIL]: true,
    [NotificationChannel.TEAMS]: false,
    [NotificationChannel.SLACK]: false
  },
  lastSync: null,
  batchOperationStatus: {}
};

/**
 * Enhanced notification reducer with comprehensive state management
 */
export const notificationReducer = createReducer(initialState, (builder) => {
  builder
    // Fetch notifications handling
    .addCase(fetchNotifications.pending, (state) => {
      state.loading = true;
      state.error = null;
    })
    .addCase(fetchNotifications.fulfilled, (state, action) => {
      state.notifications = action.payload;
      state.loading = false;
      state.lastSync = new Date();
    })
    .addCase(fetchNotifications.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || 'Failed to fetch notifications';
    })

    // Mark as read handling with optimistic updates
    .addCase(markNotificationAsRead.pending, (state, action) => {
      const notificationId = action.meta.arg;
      state.notifications = state.notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, status: NotificationStatus.READ }
          : notification
      );
    })
    .addCase(markNotificationAsRead.rejected, (state, action) => {
      const notificationId = action.meta.arg;
      state.notifications = state.notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, status: NotificationStatus.UNREAD }
          : notification
      );
      state.error = action.payload?.message || 'Failed to mark notification as read';
    })

    // Archive notification handling
    .addCase(archiveNotification.pending, (state, action) => {
      const notificationId = action.meta.arg;
      state.notifications = state.notifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, status: NotificationStatus.ARCHIVED }
          : notification
      );
    })
    .addCase(archiveNotification.rejected, (state, action) => {
      state.error = action.payload?.message || 'Failed to archive notification';
    })

    // Batch archive handling
    .addCase(archiveNotifications.pending, (state, action) => {
      const notificationIds = action.meta.arg;
      state.notifications = state.notifications.map(notification =>
        notificationIds.includes(notification.id)
          ? { ...notification, status: NotificationStatus.ARCHIVED }
          : notification
      );
      notificationIds.forEach(id => {
        state.batchOperationStatus[id] = true;
      });
    })
    .addCase(archiveNotifications.fulfilled, (state, action) => {
      const notificationIds = action.meta.arg;
      state.notifications = state.notifications.filter(
        notification => !notificationIds.includes(notification.id)
      );
      notificationIds.forEach(id => {
        delete state.batchOperationStatus[id];
      });
    })
    .addCase(archiveNotifications.rejected, (state, action) => {
      const notificationIds = action.meta.arg;
      state.notifications = state.notifications.map(notification =>
        notificationIds.includes(notification.id)
          ? { ...notification, status: NotificationStatus.UNREAD }
          : notification
      );
      notificationIds.forEach(id => {
        delete state.batchOperationStatus[id];
      });
      state.error = action.payload?.message || 'Failed to archive notifications';
    })

    // Update preferences handling
    .addCase(updateNotificationPreferences.pending, (state) => {
      state.loading = true;
    })
    .addCase(updateNotificationPreferences.fulfilled, (state, action) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload
      };
      state.loading = false;
    })
    .addCase(updateNotificationPreferences.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload?.message || 'Failed to update preferences';
    })

    // Real-time notification handling
    .addCase(receiveRealTimeNotification, (state, action) => {
      // Prevent duplicate notifications
      const isDuplicate = state.notifications.some(
        notification => notification.id === action.payload.id
      );
      
      if (!isDuplicate) {
        state.notifications = [
          action.payload,
          ...state.notifications
        ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
    })

    // Direct status updates
    .addCase(updateNotificationStatus, (state, action) => {
      state.notifications = state.notifications.map(notification =>
        notification.id === action.payload.id
          ? { ...notification, status: action.payload.status }
          : notification
      );
    })

    // Batch status updates
    .addCase(updateBatchNotificationStatus, (state, action) => {
      state.notifications = state.notifications.map(notification =>
        action.payload.ids.includes(notification.id)
          ? { ...notification, status: action.payload.status }
          : notification
      );
    })

    // Error handling
    .addCase(setNotificationError, (state, action) => {
      state.error = action.payload.message;
      state.loading = false;
    });
});

export default notificationReducer;