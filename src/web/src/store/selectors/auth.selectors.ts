/**
 * @fileoverview Redux selectors for authentication state
 * @version 1.0.0
 * 
 * Provides memoized selectors for accessing authentication state, user data,
 * and permission information in the GameDay Platform web application.
 */

import { createSelector } from '@reduxjs/toolkit';
import { AuthState, UserRole } from '../../types/auth.types';

/**
 * Base selector for accessing the auth slice from root state
 * @param {RootState} state - The root Redux state
 * @returns {AuthState} The authentication state slice
 */
export const selectAuthState = (state: RootState): AuthState => state.auth;

/**
 * Selector for checking if user is authenticated
 * Memoized to prevent unnecessary re-renders
 */
export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (authState): boolean => authState.isAuthenticated
);

/**
 * Selector for accessing current user profile data
 * Returns null if user is not authenticated
 */
export const selectCurrentUser = createSelector(
  [selectAuthState],
  (authState) => authState.user
);

/**
 * Selector for accessing the current authentication token
 * Returns null if no valid token exists
 */
export const selectAuthToken = createSelector(
  [selectAuthState],
  (authState) => authState.token
);

/**
 * Selector for accessing the current user's role
 * Returns null if no user is authenticated
 */
export const selectUserRole = createSelector(
  [selectCurrentUser],
  (user) => user?.role || null
);

/**
 * Selector for checking if user has a specific role
 * @param {UserRole} role - The role to check against
 */
export const selectHasRole = createSelector(
  [selectUserRole],
  (userRole): ((role: UserRole) => boolean) =>
    (role: UserRole): boolean => userRole === role
);

/**
 * Selector for checking if user has system admin privileges
 */
export const selectIsSystemAdmin = createSelector(
  [selectUserRole],
  (role): boolean => role === UserRole.SYSTEM_ADMIN
);

/**
 * Selector for checking if user has exercise admin privileges
 */
export const selectIsExerciseAdmin = createSelector(
  [selectUserRole],
  (role): boolean => role === UserRole.EXERCISE_ADMIN
);

/**
 * Selector for checking if user is a facilitator
 */
export const selectIsFacilitator = createSelector(
  [selectUserRole],
  (role): boolean => role === UserRole.FACILITATOR
);

/**
 * Selector for accessing user permissions array
 */
export const selectUserPermissions = createSelector(
  [selectAuthState],
  (authState) => authState.permissions
);

/**
 * Selector for checking if MFA is required for the current session
 */
export const selectMFARequired = createSelector(
  [selectAuthState],
  (authState) => authState.mfaRequired
);

/**
 * Selector for accessing the last activity timestamp
 */
export const selectLastActivity = createSelector(
  [selectAuthState],
  (authState) => authState.lastActivity
);

/**
 * Selector for checking authentication loading state
 */
export const selectAuthLoading = createSelector(
  [selectAuthState],
  (authState) => authState.loading
);

/**
 * Selector for accessing authentication error state
 */
export const selectAuthError = createSelector(
  [selectAuthState],
  (authState) => authState.error
);

/**
 * Helper selector for checking if user has specific permission
 * @param {string} permission - The permission to check
 */
export const selectHasPermission = createSelector(
  [selectUserPermissions],
  (permissions): ((permission: string) => boolean) =>
    (permission: string): boolean => 
      permissions.includes('*') || permissions.includes(permission)
);

/**
 * Type definition for the root state
 * This should match your Redux store structure
 */
interface RootState {
  auth: AuthState;
}