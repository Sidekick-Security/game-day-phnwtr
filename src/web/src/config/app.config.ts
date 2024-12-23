/**
 * Core application configuration file for GameDay Platform web interface
 * Implements Material Design 3.0 principles, responsive layouts, and exercise configurations
 * @version 1.0.0
 */

import { config } from 'dotenv'; // ^16.0.0
import { 
  APP_METADATA,
  BREAKPOINTS,
  EXERCISE_CONFIG,
  APP_DEFAULTS,
  EXERCISE_VALIDATION,
  ExerciseType
} from '../constants/app.constants';
import { defaultTheme, createOrganizationTheme } from './theme.config';

// Initialize environment variables
config();

/**
 * Environment configuration with validation
 */
const validateEnvironment = () => {
  const required = ['REACT_APP_API_BASE_URL', 'REACT_APP_AUTH_DOMAIN'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

validateEnvironment();

/**
 * Exercise type configuration with duration and participant limits
 */
const exerciseTypeConfig = {
  [ExerciseType.SECURITY_INCIDENT]: {
    duration: EXERCISE_CONFIG.DURATIONS[ExerciseType.SECURITY_INCIDENT],
    minParticipants: 5,
    maxParticipants: 20,
    requiresFacilitator: true,
    allowsObservers: true
  },
  [ExerciseType.BUSINESS_CONTINUITY]: {
    duration: EXERCISE_CONFIG.DURATIONS[ExerciseType.BUSINESS_CONTINUITY],
    minParticipants: 3,
    maxParticipants: 15,
    requiresFacilitator: true,
    allowsObservers: true
  },
  [ExerciseType.COMPLIANCE_VALIDATION]: {
    duration: EXERCISE_CONFIG.DURATIONS[ExerciseType.COMPLIANCE_VALIDATION],
    minParticipants: 3,
    maxParticipants: 10,
    requiresFacilitator: true,
    allowsObservers: false
  },
  [ExerciseType.CRISIS_MANAGEMENT]: {
    duration: EXERCISE_CONFIG.DURATIONS[ExerciseType.CRISIS_MANAGEMENT],
    minParticipants: 5,
    maxParticipants: 12,
    requiresFacilitator: true,
    allowsObservers: true
  },
  [ExerciseType.TECHNICAL_RECOVERY]: {
    duration: EXERCISE_CONFIG.DURATIONS[ExerciseType.TECHNICAL_RECOVERY],
    minParticipants: 4,
    maxParticipants: 15,
    requiresFacilitator: true,
    allowsObservers: false
  }
};

/**
 * Responsive layout configuration based on Material Design breakpoints
 */
const layoutConfig = {
  breakpoints: {
    mobile: {
      min: BREAKPOINTS.MOBILE,
      max: BREAKPOINTS.TABLET - 1,
      columns: 4,
      margin: 16,
      gutter: 16
    },
    tablet: {
      min: BREAKPOINTS.TABLET,
      max: BREAKPOINTS.DESKTOP - 1,
      columns: 8,
      margin: 24,
      gutter: 24
    },
    desktop: {
      min: BREAKPOINTS.DESKTOP,
      max: BREAKPOINTS.LARGE_DISPLAY - 1,
      columns: 12,
      margin: 24,
      gutter: 24
    },
    largeDisplay: {
      min: BREAKPOINTS.LARGE_DISPLAY,
      columns: 12,
      margin: 24,
      gutter: 24
    }
  },
  containerWidth: {
    mobile: '100%',
    tablet: '100%',
    desktop: '1200px',
    largeDisplay: '1400px'
  }
};

/**
 * Accessibility configuration following WCAG 2.1 Level AA
 */
const accessibilityConfig = {
  minimumContrastRatio: 4.5,
  highContrastRatio: 7,
  focusRingWidth: '3px',
  focusRingColor: 'primary.main',
  minimumTouchTarget: '44px',
  reducedMotion: {
    enabled: true,
    duration: '0ms'
  },
  fontScaling: {
    enabled: true,
    minScale: 0.8,
    maxScale: 2
  }
};

/**
 * Core application configuration object
 */
export const appConfig = {
  app: {
    name: APP_METADATA.name,
    version: APP_METADATA.version,
    description: APP_METADATA.description,
    environment: process.env.NODE_ENV || 'development',
    defaultLocale: APP_DEFAULTS.LOCALE,
    defaultTimezone: APP_DEFAULTS.TIMEZONE,
    maxFileSize: APP_DEFAULTS.MAX_FILE_SIZE
  },
  env: {
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    apiTimeout: APP_DEFAULTS.API_TIMEOUT,
    debug: process.env.NODE_ENV !== 'production'
  },
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL,
    timeout: APP_DEFAULTS.API_TIMEOUT,
    retryAttempts: 3,
    retryDelay: 1000,
    endpoints: {
      auth: '/auth',
      exercises: '/exercises',
      scenarios: '/scenarios',
      analytics: '/analytics'
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  },
  theme: {
    default: defaultTheme,
    createCustomTheme: createOrganizationTheme,
    colorSchemePreference: 'system',
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 16,
      htmlFontSize: 16
    }
  },
  exercises: {
    types: exerciseTypeConfig,
    validation: EXERCISE_VALIDATION,
    maxConcurrentExercises: 5,
    autoSaveInterval: 30000, // 30 seconds
    timeoutWarningThreshold: 300000 // 5 minutes
  },
  layout: layoutConfig,
  accessibility: accessibilityConfig
} as const;

/**
 * Type definitions for configuration
 */
export type AppConfig = typeof appConfig;
export type ExerciseConfig = typeof exerciseTypeConfig;
export type LayoutConfig = typeof layoutConfig;
export type AccessibilityConfig = typeof accessibilityConfig;

// Freeze configuration to prevent runtime modifications
Object.freeze(appConfig);
Object.freeze(appConfig.app);
Object.freeze(appConfig.env);
Object.freeze(appConfig.api);
Object.freeze(appConfig.theme);
Object.freeze(appConfig.exercises);
Object.freeze(appConfig.layout);
Object.freeze(appConfig.accessibility);

export default appConfig;