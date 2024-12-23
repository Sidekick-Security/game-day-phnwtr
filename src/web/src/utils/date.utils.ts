/**
 * @fileoverview Date and time utility functions for the GameDay Platform
 * Provides consistent date handling, formatting, and validation with internationalization support
 * @version 1.0.0
 */

// External dependencies
// dayjs v1.11.0 - Modern date manipulation library
import dayjs from 'dayjs';
// UTC plugin v1.11.0 - UTC timezone support
import utc from 'dayjs/plugin/utc';
// Timezone plugin v1.11.0 - Timezone handling
import timezone from 'dayjs/plugin/timezone';
// RelativeTime plugin v1.11.0 - Human-readable relative times
import relativeTime from 'dayjs/plugin/relativeTime';
// Duration plugin v1.11.0 - Duration calculations
import duration from 'dayjs/plugin/duration';

// Configure dayjs plugins
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(duration);

// Global constants for date formatting
export const DEFAULT_DATE_FORMAT = 'YYYY-MM-DD';
export const DEFAULT_TIME_FORMAT = 'HH:mm:ss';
export const DEFAULT_DATETIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
export const DEFAULT_TIMEZONE = 'UTC';

// Type definitions for better type safety
type DateInput = Date | string | number;
type FormatInput = string;
type TimezoneInput = string;

/**
 * Formats a date and time according to specified format and locale with timezone support
 * @param {DateInput} date - The date to format
 * @param {FormatInput} [format=DEFAULT_DATETIME_FORMAT] - Output format string
 * @param {TimezoneInput} [timezone=DEFAULT_TIMEZONE] - Target timezone
 * @returns {string} Formatted date string
 * @throws {Error} If date is invalid or format is malformed
 */
export const formatDateTime = (
  date: DateInput,
  format: FormatInput = DEFAULT_DATETIME_FORMAT,
  timezone: TimezoneInput = DEFAULT_TIMEZONE
): string => {
  try {
    // Input validation
    if (!date) {
      throw new Error('Date input is required');
    }

    // Create dayjs object with timezone
    const dayjsDate = dayjs(date).tz(timezone);

    // Validate date
    if (!dayjsDate.isValid()) {
      throw new Error('Invalid date input');
    }

    // Format date with fallback
    return dayjsDate.format(format);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Formats a duration in milliseconds to human-readable format with localization
 * @param {number} milliseconds - Duration in milliseconds
 * @param {FormatInput} [format] - Optional format string for custom formatting
 * @returns {string} Formatted duration string
 */
export const formatDuration = (
  milliseconds: number,
  format?: FormatInput
): string => {
  try {
    // Input validation
    if (typeof milliseconds !== 'number' || isNaN(milliseconds)) {
      throw new Error('Invalid duration input');
    }

    const durationObj = dayjs.duration(milliseconds);

    // If format is provided, use it for custom formatting
    if (format) {
      return durationObj.format(format);
    }

    // Default human-readable format
    if (milliseconds < 1000) {
      return `${milliseconds}ms`;
    }

    const hours = Math.floor(durationObj.asHours());
    const minutes = durationObj.minutes();
    const seconds = durationObj.seconds();

    // Build human-readable string
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.join(' ') || '0s';
  } catch (error) {
    console.error('Error formatting duration:', error);
    return 'Invalid Duration';
  }
};

/**
 * Parses a date string into a Date object with strict validation
 * @param {string} dateString - The date string to parse
 * @param {FormatInput} [format=DEFAULT_DATETIME_FORMAT] - Expected format of the input string
 * @returns {Date | null} Parsed Date object or null if invalid
 */
export const parseDateTime = (
  dateString: string,
  format: FormatInput = DEFAULT_DATETIME_FORMAT
): Date | null => {
  try {
    // Input validation
    if (!dateString || typeof dateString !== 'string') {
      throw new Error('Invalid date string input');
    }

    // Parse with strict mode
    const parsed = dayjs(dateString, format, true);

    if (!parsed.isValid()) {
      throw new Error('Invalid date format');
    }

    return parsed.toDate();
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

/**
 * Returns relative time string from now with localization support
 * @param {DateInput} date - The date to compare against now
 * @returns {string} Localized relative time string
 */
export const getRelativeTime = (date: DateInput): string => {
  try {
    // Input validation
    if (!date) {
      throw new Error('Date input is required');
    }

    const dayjsDate = dayjs(date);

    // Validate date
    if (!dayjsDate.isValid()) {
      throw new Error('Invalid date input');
    }

    // Get relative time with fallback for older dates
    const diffMonths = dayjsDate.diff(dayjs(), 'month');
    if (Math.abs(diffMonths) > 12) {
      return formatDateTime(date, DEFAULT_DATE_FORMAT);
    }

    return dayjsDate.fromNow();
  } catch (error) {
    console.error('Error getting relative time:', error);
    return 'Invalid Date';
  }
};

/**
 * Validates if a date string matches the expected format
 * @param {string} dateString - The date string to validate
 * @param {FormatInput} [format=DEFAULT_DATETIME_FORMAT] - Expected format
 * @returns {boolean} True if valid, false otherwise
 */
export const isValidDateFormat = (
  dateString: string,
  format: FormatInput = DEFAULT_DATETIME_FORMAT
): boolean => {
  try {
    return dayjs(dateString, format, true).isValid();
  } catch {
    return false;
  }
};

/**
 * Gets the start of a given time unit for a date
 * @param {DateInput} date - The date to process
 * @param {dayjs.UnitType} unit - The unit to get the start of (day, week, month, etc.)
 * @returns {Date} Date object representing the start of the unit
 */
export const getStartOf = (
  date: DateInput,
  unit: dayjs.UnitType
): Date => {
  try {
    return dayjs(date).startOf(unit).toDate();
  } catch (error) {
    console.error('Error getting start of unit:', error);
    return new Date();
  }
};

/**
 * Adds a specified amount of time to a date
 * @param {DateInput} date - The base date
 * @param {number} amount - The amount to add
 * @param {dayjs.UnitType} unit - The unit of time to add
 * @returns {Date} New date with added time
 */
export const addTime = (
  date: DateInput,
  amount: number,
  unit: dayjs.UnitType
): Date => {
  try {
    return dayjs(date).add(amount, unit).toDate();
  } catch (error) {
    console.error('Error adding time:', error);
    return new Date();
  }
};