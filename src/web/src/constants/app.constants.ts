/**
 * Core application constants for the GameDay Platform web application
 * @version 1.0.0
 */

/**
 * Exercise type enum defining supported exercise categories
 */
export enum ExerciseType {
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  BUSINESS_CONTINUITY = 'BUSINESS_CONTINUITY',
  COMPLIANCE_VALIDATION = 'COMPLIANCE_VALIDATION',
  CRISIS_MANAGEMENT = 'CRISIS_MANAGEMENT',
  TECHNICAL_RECOVERY = 'TECHNICAL_RECOVERY'
}

/**
 * Application metadata constants
 */
export const APP_METADATA = {
  name: 'GameDay Platform',
  version: '1.0.0',
  description: 'AI-driven tabletop exercise platform for enterprise resilience'
} as const;

/**
 * Responsive design breakpoints in pixels
 * Following Material Design 3.0 responsive layout grid system
 */
export const BREAKPOINTS = {
  MOBILE: 320, // Mobile devices (320px - 767px)
  TABLET: 768, // Tablets (768px - 1023px)
  DESKTOP: 1024, // Desktop (1024px - 1439px)
  LARGE_DISPLAY: 1440 // Large displays (1440px+)
} as const;

/**
 * Exercise configuration constants including durations and participant limits
 */
export const EXERCISE_CONFIG = {
  DURATIONS: {
    [ExerciseType.SECURITY_INCIDENT]: 90, // Duration in minutes
    [ExerciseType.BUSINESS_CONTINUITY]: 60,
    [ExerciseType.COMPLIANCE_VALIDATION]: 60,
    [ExerciseType.CRISIS_MANAGEMENT]: 45,
    [ExerciseType.TECHNICAL_RECOVERY]: 120
  },
  MAX_PARTICIPANTS: 50, // Maximum number of participants per exercise
  MIN_PARTICIPANTS: 3 // Minimum number of participants required
} as const;

/**
 * Application-wide default settings
 */
export const APP_DEFAULTS = {
  LOCALE: 'en-US', // Default application locale
  TIMEZONE: 'UTC', // Default timezone for date/time handling
  MAX_FILE_SIZE: 10 * 1024 * 1024, // Maximum file upload size (10MB)
  API_TIMEOUT: 30000 // Default API request timeout in milliseconds
} as const;

/**
 * Type definitions for exercise configuration
 */
export type ExerciseDurations = typeof EXERCISE_CONFIG.DURATIONS;
export type ExerciseConfigType = typeof EXERCISE_CONFIG;
export type BreakpointKeys = keyof typeof BREAKPOINTS;
export type AppDefaultsType = typeof APP_DEFAULTS;

/**
 * Validation constants for exercise configuration
 */
export const EXERCISE_VALIDATION = {
  TITLE_MIN_LENGTH: 3,
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000,
  OBJECTIVES_MIN_COUNT: 1,
  OBJECTIVES_MAX_COUNT: 10
} as const;

/**
 * Theme-related constants following Material Design 3.0
 */
export const THEME_CONSTANTS = {
  SPACING_UNIT: 8, // Base spacing unit in pixels
  TRANSITION_DURATION: 200, // Base transition duration in milliseconds
  BORDER_RADIUS: {
    SMALL: 4,
    MEDIUM: 8,
    LARGE: 16
  },
  Z_INDEX: {
    MODAL: 1000,
    POPOVER: 900,
    DRAWER: 800,
    APPBAR: 700,
    OVERLAY: 600
  }
} as const;

// Ensure all constants are immutable
Object.freeze(APP_METADATA);
Object.freeze(BREAKPOINTS);
Object.freeze(EXERCISE_CONFIG);
Object.freeze(APP_DEFAULTS);
Object.freeze(EXERCISE_VALIDATION);
Object.freeze(THEME_CONSTANTS);