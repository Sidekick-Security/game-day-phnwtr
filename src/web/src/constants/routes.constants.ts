/**
 * @fileoverview Centralized route configuration constants for the GameDay Platform web application.
 * Defines all application routes and their corresponding paths for consistent navigation.
 * @version 1.0.0
 */

/**
 * Authentication related route constants
 * Used for login, registration, and password management flows
 */
export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  CALLBACK: '/auth/callback',
  REGISTER: '/auth/register',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password/:token'
} as const;

/**
 * Main application navigation route constants
 * Core navigation paths for primary application features
 */
export const MAIN_ROUTES = {
  DASHBOARD: '/',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  HELP: '/help',
  DOCUMENTATION: '/docs'
} as const;

/**
 * Exercise management and execution route constants
 * Paths for exercise creation, management, and participation
 */
export const EXERCISE_ROUTES = {
  LIST: '/exercises',
  CREATE: '/exercises/create',
  DETAIL: '/exercises/:id',
  EDIT: '/exercises/:id/edit',
  CONTROL: '/exercises/:id/control',
  PARTICIPATE: '/exercises/:id/participate',
  REPORT: '/exercises/:id/report',
  TEMPLATES: '/exercises/templates'
} as const;

/**
 * Settings and configuration route constants
 * Paths for application settings, integrations, and organization management
 */
export const SETTINGS_ROUTES = {
  ORGANIZATION: '/settings/organization',
  TEAM: '/settings/team',
  PROFILE: '/settings/profile',
  INTEGRATION: {
    MAIN: '/settings/integrations',
    TEAMS: '/settings/integrations/teams',
    SLACK: '/settings/integrations/slack',
    CALENDAR: '/settings/integrations/calendar'
  },
  NOTIFICATION: '/settings/notifications',
  COMPLIANCE: '/settings/compliance',
  BILLING: '/settings/billing'
} as const;

/**
 * Error and system status route constants
 * Paths for error pages and system status notifications
 */
export const ERROR_ROUTES = {
  NOT_FOUND: '*',
  UNAUTHORIZED: '/error/unauthorized',
  FORBIDDEN: '/error/forbidden',
  SERVER_ERROR: '/error/server-error',
  MAINTENANCE: '/error/maintenance'
} as const;

/**
 * Analytics and reporting route constants
 * Paths for data analysis, reporting, and insights
 */
export const ANALYTICS_ROUTES = {
  DASHBOARD: '/analytics/dashboard',
  PERFORMANCE: '/analytics/performance',
  COMPLIANCE: '/analytics/compliance',
  REPORTS: '/analytics/reports',
  TRENDS: '/analytics/trends',
  EXPORT: '/analytics/export'
} as const;

// Type definitions for route parameters
export type ExerciseIdParam = {
  id: string;
};

export type ResetPasswordParam = {
  token: string;
};

// Ensure all routes are readonly to prevent accidental modifications
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type AuthRoutes = DeepReadonly<typeof AUTH_ROUTES>;
export type MainRoutes = DeepReadonly<typeof MAIN_ROUTES>;
export type ExerciseRoutes = DeepReadonly<typeof EXERCISE_ROUTES>;
export type SettingsRoutes = DeepReadonly<typeof SETTINGS_ROUTES>;
export type ErrorRoutes = DeepReadonly<typeof ERROR_ROUTES>;
export type AnalyticsRoutes = DeepReadonly<typeof ANALYTICS_ROUTES>;