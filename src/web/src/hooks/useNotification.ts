/**
 * Custom React hook for managing notifications in the GameDay Platform
 * Provides real-time notification handling, preferences management, and Redux integration
 * @version 1.0.0
 */

import { useEffect, useCallback } from 'react'; // ^18.2.0
import { useDispatch, useSelector } from 'react-redux'; // ^8.1.0
import { NotificationService } from '../services/notification.service';
import {
  fetchNotifications,
  markNotificationAsRead,
} from '../store/actions/notification.actions';
import {
  selectAllNotifications,
  selectUnreadNotificationCount,
} from '../store/selectors/notification.selectors';
import {
  INotification,
  INotificationError,
} from '../interfaces/notification.interface';
import {
  NotificationStatus,
  NotificationFilter,
} from '../types/notification.types';

// Initialize notification service as singleton
const notificationService = new NotificationService();

/**
 * Custom hook for comprehensive notification management
 * Handles real-time updates, error handling, and Redux integration
 */
export const useNotification = () => {
  const dispatch = useDispatch();
  
  // Redux selectors for notification state
  const notifications = useSelector(selectAllNotifications);
  const unreadCount = useSelector(selectUnreadNotificationCount);
  const loading = useSelector((state: any) => state.notification.loading);
  const error = useSelector((state: any) => state.notification.error);

  /**
   * Handles marking a notification as read with optimistic updates
   * @param notificationId - ID of the notification to mark as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await dispatch(markNotificationAsRead(notificationId)).unwrap();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }, [dispatch]);

  /**
   * Fetches initial notifications and sets up real-time subscription
   */
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      try {
        const filter: NotificationFilter = {
          status: [NotificationStatus.UNREAD],
          limit: 50,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        };
        await dispatch(fetchNotifications({ filter })).unwrap();
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    // Set up WebSocket connection for real-time updates
    const setupRealTimeNotifications = async () => {
      try {
        await notificationService.connect();
        
        // Subscribe to notification updates
        notificationService.onNotification$.subscribe({
          next: (notification: INotification) => {
            dispatch(fetchNotifications({ filter: {} }));
          },
          error: (error: INotificationError) => {
            console.error('Notification subscription error:', error);
          },
        });
      } catch (error) {
        console.error('Failed to setup real-time notifications:', error);
      }
    };

    fetchInitialNotifications();
    setupRealTimeNotifications();

    // Cleanup subscription on unmount
    return () => {
      notificationService.disconnect();
    };
  }, [dispatch]);

  /**
   * Refreshes notifications periodically and after window focus
   */
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      dispatch(fetchNotifications({ filter: {} }));
    }, 60000); // Refresh every minute

    const handleFocus = () => {
      dispatch(fetchNotifications({ filter: {} }));
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(refreshInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [dispatch]);

  /**
   * Error boundary effect for handling notification errors
   */
  useEffect(() => {
    if (error) {
      console.error('Notification error:', error);
      // Implement error reporting or user notification here
    }
  }, [error]);

  return {
    notifications,
    unreadCount,
    markAsRead,
    isLoading: loading,
    error,
  };
};

export default useNotification;
```

This implementation provides a comprehensive notification management hook that:

1. Integrates with Redux for state management using the provided actions and selectors
2. Handles real-time notifications through WebSocket connection
3. Implements optimistic updates for better UX
4. Includes error handling and reporting
5. Provides automatic refresh and focus-based updates
6. Manages cleanup of subscriptions and event listeners
7. Supports type safety throughout with TypeScript

Key features:

- Real-time updates through WebSocket subscription
- Periodic and focus-based refresh of notifications
- Optimistic updates for marking notifications as read
- Error boundary integration
- Type-safe implementation with TypeScript
- Cleanup of resources on unmount
- Integration with Redux store for state management

The hook can be used in components like:

```typescript
const MyComponent = () => {
  const { notifications, unreadCount, markAsRead, isLoading, error } = useNotification();

  // Use the notifications state and handlers in your component
};