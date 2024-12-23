// numeral v2.0.6 - Number formatting library
import numeral from 'numeral';
// i18next v23.0.0 - Internationalization framework
import i18next from 'i18next';

import {
  MetricType,
  GapType,
  GapSeverity,
  GapStatus,
} from '../types/analytics.types';

import {
  ExerciseType,
  ExerciseStatus,
  InjectType,
  InjectStatus,
  ParticipantRole,
  ParticipantStatus,
} from '../types/exercise.types';

// Global configuration constants
export const DEFAULT_LOCALE = 'en-US';
export const DEFAULT_CURRENCY = 'USD';
export const DEFAULT_PRECISION = 2;

// Metric-specific units mapping
export const METRIC_UNITS = {
  [MetricType.RESPONSE_TIME]: 'ms',
  [MetricType.COMPLIANCE_COVERAGE]: '%',
  [MetricType.EXERCISE_COMPLETION]: '%',
  [MetricType.PARTICIPANT_ENGAGEMENT]: '%',
};

/**
 * Formats metric values with appropriate units and locale-specific formatting
 * @param value - Numeric value to format
 * @param metricType - Type of metric being formatted
 * @param locale - Optional locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted metric string with appropriate unit
 * @throws TypeError for invalid inputs
 */
export function formatMetricValue(
  value: number,
  metricType: MetricType,
  locale: string = DEFAULT_LOCALE
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Value must be a valid number');
  }

  // Configure locale-specific formatting
  numeral.locale(locale);

  // Format based on metric type
  switch (metricType) {
    case MetricType.RESPONSE_TIME:
      return `${numeral(value).format('0,0')}${METRIC_UNITS[metricType]}`;
      
    case MetricType.COMPLIANCE_COVERAGE:
    case MetricType.EXERCISE_COMPLETION:
    case MetricType.PARTICIPANT_ENGAGEMENT:
      return `${numeral(value / 100).format('0.0%')}`;
      
    default:
      return numeral(value).format('0,0.00');
  }
}

/**
 * Formats enum values with proper capitalization and i18n translation
 * @param value - Enum value to format
 * @param enumType - Type of enum being formatted
 * @returns Formatted and translated string
 */
export function formatEnumValue(value: string, enumType: string): string {
  if (!value) return '';

  // Generate i18n key based on enum type and value
  const i18nKey = `enums.${enumType}.${value}`;
  
  // Get translation or fall back to formatted value
  const translation = i18next.exists(i18nKey) 
    ? i18next.t(i18nKey)
    : value.toLowerCase()
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  return translation;
}

/**
 * Formats percentage values with locale-specific formatting
 * @param value - Number to format as percentage (0-100 or 0-1)
 * @param precision - Number of decimal places (defaults to DEFAULT_PRECISION)
 * @param locale - Optional locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted percentage string
 * @throws TypeError for invalid inputs
 */
export function formatPercentage(
  value: number,
  precision: number = DEFAULT_PRECISION,
  locale: string = DEFAULT_LOCALE
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Value must be a valid number');
  }

  // Normalize value to 0-1 range
  const normalizedValue = value > 1 ? value / 100 : value;

  // Configure locale-specific formatting
  numeral.locale(locale);

  // Format with specified precision
  return numeral(normalizedValue).format(`0.${'0'.repeat(precision)}%`);
}

/**
 * Formats currency values with locale-specific formatting
 * @param value - Number to format as currency
 * @param currency - ISO 4217 currency code (defaults to DEFAULT_CURRENCY)
 * @param locale - Optional locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted currency string
 * @throws TypeError for invalid inputs
 */
export function formatCurrency(
  value: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('Value must be a valid number');
  }

  // Configure locale-specific formatting
  numeral.locale(locale);

  // Format with currency symbol
  const formatted = numeral(value).format('$0,0.00');
  
  // Handle non-USD currencies
  if (currency !== 'USD') {
    return formatted.replace('$', currency);
  }

  return formatted;
}

/**
 * Formats gap severity with appropriate color coding and translation
 * @param severity - GapSeverity enum value
 * @returns Object containing formatted label and color code
 */
export function formatGapSeverity(severity: GapSeverity): { label: string; color: string } {
  const severityMap = {
    [GapSeverity.CRITICAL]: { color: '#dc3545' },
    [GapSeverity.HIGH]: { color: '#fd7e14' },
    [GapSeverity.MEDIUM]: { color: '#ffc107' },
    [GapSeverity.LOW]: { color: '#28a745' },
  };

  return {
    label: formatEnumValue(severity, 'GapSeverity'),
    color: severityMap[severity]?.color || '#6c757d',
  };
}

/**
 * Formats trend indicators with directional symbols and colors
 * @param value - Current value
 * @param previousValue - Previous value for comparison
 * @returns Object containing trend symbol, label, and color
 */
export function formatTrend(
  value: number,
  previousValue: number
): { symbol: string; label: string; color: string } {
  const percentage = ((value - previousValue) / previousValue) * 100;
  
  if (Math.abs(percentage) < 1) {
    return { symbol: '→', label: 'Stable', color: '#6c757d' };
  }
  
  return percentage > 0
    ? { symbol: '↑', label: `+${formatPercentage(percentage)}`, color: '#28a745' }
    : { symbol: '↓', label: formatPercentage(percentage), color: '#dc3545' };
}

/**
 * Formats duration values into human-readable strings
 * @param milliseconds - Duration in milliseconds
 * @param locale - Optional locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted duration string
 */
export function formatDuration(
  milliseconds: number,
  locale: string = DEFAULT_LOCALE
): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}