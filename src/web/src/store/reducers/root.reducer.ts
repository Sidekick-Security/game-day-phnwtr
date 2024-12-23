/**
 * Root Reducer Configuration for GameDay Platform
 * Combines all feature reducers into a single application state tree with
 * comprehensive TypeScript support and Redux DevTools integration.
 * @version 1.0.0
 */

// @reduxjs/toolkit v2.0.0 - Type-safe Redux utilities
import { combineReducers } from '@reduxjs/toolkit';

// Feature reducers with their respective state types
import { analyticsReducer, AnalyticsState } from './analytics.reducer';
import { authReducer, AuthState } from './auth.reducer';
import { exerciseReducer } from './exercise.reducer';
import { notificationReducer, NotificationState } from './notification.reducer';

/**
 * Root state interface combining all feature states
 * Provides comprehensive type safety for the entire application state tree
 */
export interface RootState {
  /** Analytics state including metrics, gaps, and trends */
  analytics: AnalyticsState;
  
  /** Authentication state including user session and security context */
  auth: AuthState;
  
  /** Exercise management state including scenarios and real-time data */
  exercise: ReturnType<typeof exerciseReducer>;
  
  /** Notification state including multi-channel delivery status */
  notification: NotificationState;
}

/**
 * Root reducer combining all feature reducers
 * Implements proper type inference and enables Redux DevTools integration
 */
const rootReducer = combineReducers<RootState>({
  analytics: analyticsReducer,
  auth: authReducer,
  exercise: exerciseReducer,
  notification: notificationReducer
});

/**
 * Export root reducer and state type for store configuration
 * Enables comprehensive TypeScript support across the application
 */
export default rootReducer;