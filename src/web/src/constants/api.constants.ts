/**
 * API Constants for GameDay Platform
 * Defines all API-related constants including endpoints, version, timeouts
 * and base URLs for all microservices.
 * @version 1.0.0
 */

/**
 * Current API version prefix for all endpoints
 * Used to maintain consistent versioning across all service calls
 */
export const API_VERSION = 'v1';

/**
 * Default timeout in milliseconds for API requests (30 seconds)
 * Ensures appropriate request termination for enterprise-scale operations
 */
export const API_TIMEOUT = 30000;

/**
 * Exercise Service Endpoints
 * Handles all exercise-related operations including CRUD and control actions
 */
export const EXERCISE_ENDPOINTS = {
  BASE: '/api/v1/exercises',
  CREATE: '/api/v1/exercises',
  GET_BY_ID: '/api/v1/exercises/:id',
  UPDATE: '/api/v1/exercises/:id',
  DELETE: '/api/v1/exercises/:id',
  LIST: '/api/v1/exercises',
  START: '/api/v1/exercises/:id/start',
  STOP: '/api/v1/exercises/:id/stop',
  PAUSE: '/api/v1/exercises/:id/pause',
  RESUME: '/api/v1/exercises/:id/resume',
} as const;

/**
 * Scenario Service Endpoints
 * Manages scenario generation, validation, and retrieval operations
 */
export const SCENARIO_ENDPOINTS = {
  BASE: '/api/v1/scenarios',
  GENERATE: '/api/v1/scenarios/generate',
  VALIDATE: '/api/v1/scenarios/:id/validate',
  GET_BY_ID: '/api/v1/scenarios/:id',
  LIST: '/api/v1/scenarios',
} as const;

/**
 * Analytics Service Endpoints
 * Provides access to metrics, gap analysis, trends, and reporting functionalities
 */
export const ANALYTICS_ENDPOINTS = {
  BASE: '/api/v1/analytics',
  METRICS: '/api/v1/analytics/metrics',
  GAPS: '/api/v1/analytics/gaps',
  TRENDS: '/api/v1/analytics/trends',
  REPORTS: '/api/v1/analytics/reports',
} as const;

/**
 * Notification Service Endpoints
 * Handles notification delivery, template management, and user preferences
 */
export const NOTIFICATION_ENDPOINTS = {
  BASE: '/api/v1/notifications',
  SEND: '/api/v1/notifications/send',
  TEMPLATES: '/api/v1/notifications/templates',
  PREFERENCES: '/api/v1/notifications/preferences',
} as const;

/**
 * Comprehensive mapping of all API endpoints for core microservices
 * Provides centralized endpoint management
 */
export const API_ENDPOINTS = {
  EXERCISE: EXERCISE_ENDPOINTS,
  SCENARIO: SCENARIO_ENDPOINTS,
  ANALYTICS: ANALYTICS_ENDPOINTS,
  NOTIFICATION: NOTIFICATION_ENDPOINTS,
} as const;

/**
 * Type definitions for API endpoints to ensure type safety
 */
export type ExerciseEndpoints = typeof EXERCISE_ENDPOINTS;
export type ScenarioEndpoints = typeof SCENARIO_ENDPOINTS;
export type AnalyticsEndpoints = typeof ANALYTICS_ENDPOINTS;
export type NotificationEndpoints = typeof NOTIFICATION_ENDPOINTS;
export type ApiEndpoints = typeof API_ENDPOINTS;