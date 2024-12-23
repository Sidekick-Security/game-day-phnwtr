/**
 * @fileoverview User Interface Definitions
 * @version 1.0.0
 * 
 * Defines comprehensive TypeScript interfaces for user management in the GameDay Platform.
 * Implements type-safe definitions for user profiles, preferences, and exercise participation.
 */

import { UserRole } from '../types/auth.types';
import { ParticipantRole } from '../types/exercise.types';

/**
 * Core user interface defining essential user properties and metadata
 * @interface IUser
 */
export interface IUser {
  /** Unique identifier for the user */
  id: string;
  
  /** User's email address (used for authentication) */
  email: string;
  
  /** User's first name */
  firstName: string;
  
  /** User's last name */
  lastName: string;
  
  /** User's assigned role determining system-wide permissions */
  role: UserRole;
  
  /** Organization the user belongs to */
  organizationId: string;
  
  /** Teams the user is a member of */
  teams: string[];
  
  /** Timestamp of user creation */
  createdAt: Date;
  
  /** Timestamp of last user update */
  updatedAt: Date;
  
  /** Timestamp of user's last login (null if never logged in) */
  lastLoginAt: Date | null;
  
  /** Flag indicating if the user account is active */
  isActive: boolean;
}

/**
 * Extended user profile interface including preferences and settings
 * @interface IUserProfile
 */
export interface IUserProfile {
  /** Core user information (read-only to prevent direct mutations) */
  user: Readonly<IUser>;
  
  /** User interface and locale preferences */
  preferences: IUserPreferences;
  
  /** Notification channel settings */
  notifications: INotificationSettings;
  
  /** User's roles in specific exercises */
  exerciseRoles: IUserExerciseRole[];
}

/**
 * User preferences interface for UI/UX customization
 * @interface IUserPreferences
 */
export interface IUserPreferences {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'system';
  
  /** Preferred interface language */
  language: string;
  
  /** User's timezone for date/time display */
  timezone: string;
  
  /** Preferred date format */
  dateFormat: string;
  
  /** Preferred time format */
  timeFormat: '12h' | '24h';
}

/**
 * Notification preferences interface for multi-channel communications
 * @interface INotificationSettings
 */
export interface INotificationSettings {
  /** Enable/disable email notifications */
  email: boolean;
  
  /** Enable/disable Slack notifications */
  slack: boolean;
  
  /** Enable/disable Microsoft Teams notifications */
  teams: boolean;
  
  /** Enable/disable exercise reminder notifications */
  exerciseReminders: boolean;
  
  /** Enable/disable exercise update notifications */
  exerciseUpdates: boolean;
  
  /** Minutes before exercise start to send reminder */
  reminderLeadTime: number;
}

/**
 * Interface defining user roles within specific exercises
 * @interface IUserExerciseRole
 */
export interface IUserExerciseRole {
  /** User identifier */
  userId: string;
  
  /** Exercise identifier */
  exerciseId: string;
  
  /** User's role in the specific exercise */
  role: ParticipantRole;
  
  /** Timestamp when role was assigned */
  assignedAt: Date;
  
  /** Current status of the role assignment */
  status: 'active' | 'inactive' | 'pending';
}