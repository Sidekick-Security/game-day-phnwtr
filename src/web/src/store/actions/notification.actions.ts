/**
 * @fileoverview Redux actions for notification management in GameDay Platform
 * Implements real-time notification handling, multi-channel delivery, and exercise coordination
 * @version 1.0.0
 */

import { createAction, createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.5
import {
  INotification,
  INotificationService,
  INotificationError,
} from '../../interfaces/notification.interface';
import {
  NotificationType,
  NotificationChannel,
  NotificationStatus,
} from '../../types/notification.types';
import NotificationService from '../../services/notification.service';

// Action type constants
export const NOTIFICATION_ACTION_TYPES = {
  FETCH: 'notification/fetch',
  MARK_READ: 'notification/markRead',
  ARCHIVE: 'notification/archive',
  UPDATE_PREFERENCES: 'notification/updatePreferences',
  BATCH_ARCHIVE: 'notification/batchArchive',
  RECEIVE_REAL_TIME: 'notification/receiveRealTime',
  ERROR: 'notification/error',
} as const;

// Initialize notification service
const notificationService = new NotificationService();

/**
 * Fetches notifications with comprehensive filtering support
 */
export const fetchNotifications = createAsyncThunk<
  INotification[],
  { filter?: NotificationFilter },
  { rejectValue: INotificationError }
>(
  NOTIFICATION_ACTION_TYPES.FETCH,
  async ({ filter }, { rejectWithValue }) => {
    try {
      const notifications = await notificationService.getNotifications(filter);
      return notifications;
    } catch (error) {
      return rejectWithValue({
        code: 'FETCH_ERROR',
        message: 'Failed to fetch notifications',
        details: error,
      });
    }
  },
  {
    condition: (_, { getState }) => {
      const { notification } = getState() as any;
      return !notification.loading;
    },
  }
);

/**
 * Marks a notification as read with optimistic updates
 */
export const markNotificationAsRead = createAsyncThunk<
  void,
  string,
  { rejectValue: INotificationError }
>(
  NOTIFICATION_ACTION_TYPES.MARK_READ,
  async (notificationId, { rejectWithValue, dispatch }) => {
    try {
      // Optimistic update
      dispatch(updateNotificationStatus({
        id: notificationId,
        status: NotificationStatus.READ
      }));

      await notificationService.markAsRead(notificationId);
    } catch (error) {
      // Revert optimistic update
      dispatch(updateNotificationStatus({
        id: notificationId,
        status: NotificationStatus.UNREAD
      }));

      return rejectWithValue({
        code: 'MARK_READ_ERROR',
        message: 'Failed to mark notification as read',
        details: error,
      });
    }
  }
);

/**
 * Archives notifications with batch operation support
 */
export const archiveNotifications = createAsyncThunk<
  void,
  string[],
  { rejectValue: INotificationError }
>(
  NOTIFICATION_ACTION_TYPES.BATCH_ARCHIVE,
  async (notificationIds, { rejectWithValue, dispatch }) => {
    try {
      // Optimistic update for batch operation
      dispatch(updateBatchNotificationStatus({
        ids: notificationIds,
        status: NotificationStatus.ARCHIVED
      }));

      await notificationService.bulkArchive(notificationIds);
    } catch (error) {
      // Revert optimistic update
      dispatch(updateBatchNotificationStatus({
        ids: notificationIds,
        status: NotificationStatus.UNREAD
      }));

      return rejectWithValue({
        code: 'ARCHIVE_ERROR',
        message: 'Failed to archive notifications',
        details: error,
      });
    }
  }
);

/**
 * Updates notification preferences across channels
 */
export const updateNotificationPreferences = createAsyncThunk<
  void,
  Record<NotificationChannel, boolean>,
  { rejectValue: INotificationError }
>(
  NOTIFICATION_ACTION_TYPES.UPDATE_PREFERENCES,
  async (preferences, { rejectWithValue }) => {
    try {
      await notificationService.updateNotificationPreferences(preferences);
    } catch (error) {
      return rejectWithValue({
        code: 'PREFERENCES_ERROR',
        message: 'Failed to update notification preferences',
        details: error,
      });
    }
  }
);

// Synchronous actions for optimistic updates
export const updateNotificationStatus = createAction<{
  id: string;
  status: NotificationStatus;
}>('notification/updateStatus');

export const updateBatchNotificationStatus = createAction<{
  ids: string[];
  status: NotificationStatus;
}>('notification/updateBatchStatus');

export const receiveRealTimeNotification = createAction<INotification>(
  NOTIFICATION_ACTION_TYPES.RECEIVE_REAL_TIME
);

export const setNotificationError = createAction<INotificationError>(
  NOTIFICATION_ACTION_TYPES.ERROR
);

// Type exports for type safety
export type NotificationActionTypes = typeof NOTIFICATION_ACTION_TYPES;
export type NotificationThunkActions = {
  fetchNotifications: typeof fetchNotifications;
  markNotificationAsRead: typeof markNotificationAsRead;
  archiveNotifications: typeof archiveNotifications;
  updateNotificationPreferences: typeof updateNotificationPreferences;
};