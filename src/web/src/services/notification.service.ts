/**
 * Enhanced Notification Service for GameDay Platform
 * Implements real-time notifications with multi-channel delivery support
 * @version 1.0.0
 */

import { BehaviorSubject } from 'rxjs'; // ^7.8.0

import {
  INotification,
  INotificationService,
  INotificationContent
} from '../interfaces/notification.interface';
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
  NotificationFilter
} from '../types/notification.types';
import { WebSocketService, WebSocketEventType } from './websocket.service';
import { apiClient, handleApiError } from '../utils/api.utils';
import { API_ENDPOINTS } from '../constants/api.constants';

/**
 * Constants for notification events and configuration
 */
const NOTIFICATION_EVENTS = {
  RECEIVED: 'notification:received',
  STATUS_CHANGED: 'notification:status_changed',
  ARCHIVED: 'notification:archived',
  PREFERENCES_UPDATED: 'notification:preferences_updated',
  CONNECTION_ERROR: 'notification:connection_error',
  RETRY_ATTEMPT: 'notification:retry_attempt'
} as const;

/**
 * Enhanced NotificationService implementation with comprehensive error handling
 * and state management capabilities
 */
export class NotificationService implements INotificationService {
  private readonly notificationsSubject: BehaviorSubject<INotification[]>;
  private readonly preferencesSubject: BehaviorSubject<Record<NotificationChannel, boolean>>;
  private readonly notificationHandlers: Map<string, Function>;
  private readonly retryAttempts: Map<string, number>;
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY = 1000;

  constructor(private readonly webSocketService: WebSocketService) {
    this.notificationsSubject = new BehaviorSubject<INotification[]>([]);
    this.preferencesSubject = new BehaviorSubject<Record<NotificationChannel, boolean>>({
      [NotificationChannel.IN_APP]: true,
      [NotificationChannel.EMAIL]: true,
      [NotificationChannel.TEAMS]: false,
      [NotificationChannel.SLACK]: false
    });
    this.notificationHandlers = new Map();
    this.retryAttempts = new Map();

    this.initializeWebSocket();
    this.setupNotificationHandlers();
  }

  /**
   * Retrieves notifications with advanced filtering capabilities
   * @param filter Optional filtering criteria
   */
  public async getNotifications(filter?: NotificationFilter): Promise<INotification[]> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATION.BASE, {
        params: filter
      });
      
      const notifications = response.data;
      this.notificationsSubject.next(notifications);
      return notifications;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Marks a notification as read with optimistic updates
   * @param notificationId ID of the notification to mark as read
   */
  public async markAsRead(notificationId: string): Promise<void> {
    try {
      // Optimistic update
      const currentNotifications = this.notificationsSubject.value;
      const updatedNotifications = currentNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, status: NotificationStatus.READ }
          : notification
      );
      this.notificationsSubject.next(updatedNotifications);

      await apiClient.put(`${API_ENDPOINTS.NOTIFICATION.BASE}/${notificationId}/read`);
    } catch (error) {
      // Revert optimistic update on failure
      this.notificationsSubject.next(this.notificationsSubject.value);
      throw handleApiError(error);
    }
  }

  /**
   * Archives a notification with state management
   * @param notificationId ID of the notification to archive
   */
  public async archiveNotification(notificationId: string): Promise<void> {
    try {
      await apiClient.put(`${API_ENDPOINTS.NOTIFICATION.BASE}/${notificationId}/archive`);
      
      const currentNotifications = this.notificationsSubject.value;
      const updatedNotifications = currentNotifications.filter(
        notification => notification.id !== notificationId
      );
      this.notificationsSubject.next(updatedNotifications);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Updates notification preferences across channels
   * @param channelConfig Configuration for each notification channel
   */
  public async updateNotificationPreferences(
    channelConfig: Record<NotificationChannel, boolean>
  ): Promise<void> {
    try {
      await apiClient.put(API_ENDPOINTS.NOTIFICATION.PREFERENCES, channelConfig);
      this.preferencesSubject.next(channelConfig);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Subscribes to exercise updates via WebSocket
   * @param exerciseId ID of the exercise to subscribe to
   */
  public async subscribeToExerciseUpdates(exerciseId: string): Promise<void> {
    const handler = (data: any) => {
      const notification = this.createNotificationFromExerciseUpdate(data);
      this.addNotification(notification);
    };

    this.notificationHandlers.set(exerciseId, handler);
    this.webSocketService.subscribe(WebSocketEventType.EXERCISE_UPDATE, handler);
  }

  /**
   * Unsubscribes from exercise updates
   * @param exerciseId ID of the exercise to unsubscribe from
   */
  public async unsubscribeFromExerciseUpdates(exerciseId: string): Promise<void> {
    const handler = this.notificationHandlers.get(exerciseId);
    if (handler) {
      this.webSocketService.unsubscribe(WebSocketEventType.EXERCISE_UPDATE, handler);
      this.notificationHandlers.delete(exerciseId);
    }
  }

  /**
   * Marks multiple notifications as read in bulk
   * @param notificationIds Array of notification IDs to mark as read
   */
  public async bulkMarkAsRead(notificationIds: string[]): Promise<void> {
    try {
      await apiClient.put(`${API_ENDPOINTS.NOTIFICATION.BASE}/bulk/read`, {
        notificationIds
      });

      const currentNotifications = this.notificationsSubject.value;
      const updatedNotifications = currentNotifications.map(notification =>
        notificationIds.includes(notification.id)
          ? { ...notification, status: NotificationStatus.READ }
          : notification
      );
      this.notificationsSubject.next(updatedNotifications);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Archives multiple notifications in bulk
   * @param notificationIds Array of notification IDs to archive
   */
  public async bulkArchive(notificationIds: string[]): Promise<void> {
    try {
      await apiClient.put(`${API_ENDPOINTS.NOTIFICATION.BASE}/bulk/archive`, {
        notificationIds
      });

      const currentNotifications = this.notificationsSubject.value;
      const updatedNotifications = currentNotifications.filter(
        notification => !notificationIds.includes(notification.id)
      );
      this.notificationsSubject.next(updatedNotifications);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Initializes WebSocket connection with retry logic
   */
  private async initializeWebSocket(): Promise<void> {
    try {
      await this.webSocketService.connect('notifications');
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleConnectionError(error);
    }
  }

  /**
   * Sets up notification event handlers
   */
  private setupNotificationHandlers(): void {
    this.webSocketService.subscribe(
      WebSocketEventType.EXERCISE_UPDATE,
      this.handleExerciseUpdate.bind(this)
    );
  }

  /**
   * Handles exercise update events
   */
  private handleExerciseUpdate(data: any): void {
    const notification = this.createNotificationFromExerciseUpdate(data);
    this.addNotification(notification);
  }

  /**
   * Creates a notification object from exercise update data
   */
  private createNotificationFromExerciseUpdate(data: any): INotification {
    return {
      id: data.id,
      type: NotificationType.EXERCISE_UPDATE,
      channel: NotificationChannel.IN_APP,
      priority: NotificationPriority.MEDIUM,
      status: NotificationStatus.UNREAD,
      content: {
        title: data.title,
        message: data.message,
        data: data.metadata
      },
      recipients: data.recipients,
      exerciseId: data.exerciseId,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  /**
   * Adds a new notification to the state
   */
  private addNotification(notification: INotification): void {
    const currentNotifications = this.notificationsSubject.value;
    this.notificationsSubject.next([notification, ...currentNotifications]);
  }

  /**
   * Handles connection errors with retry logic
   */
  private handleConnectionError(error: any): void {
    const retryCount = this.retryAttempts.get('websocket') || 0;
    if (retryCount < this.MAX_RETRY_ATTEMPTS) {
      this.retryAttempts.set('websocket', retryCount + 1);
      setTimeout(() => {
        this.initializeWebSocket();
      }, this.RETRY_DELAY * Math.pow(2, retryCount));
    }
  }
}

export default NotificationService;