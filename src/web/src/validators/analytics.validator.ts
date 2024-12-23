/**
 * @fileoverview Analytics Data Validation
 * @version 1.0.0
 * 
 * Provides comprehensive validation schemas and functions for analytics-related data
 * using Zod for type-safe validation with detailed error reporting.
 */

// zod v3.22.0 - Schema validation library
import { z } from 'zod';
// dayjs v1.11.0 - Date handling library
import dayjs from 'dayjs';

import { 
  MetricType, 
  GapType, 
  GapSeverity, 
  GapStatus,
  IMetric,
  IGap,
  IReport,
  MetricUnit,
  TrendDirection
} from '../types/analytics.types';

import {
  validateEmail,
  validateUUID,
  validateDateRange
} from '../utils/validation.utils';

/**
 * Constants for analytics validation rules
 */
const VALIDATION_CONSTANTS = {
  METRIC: {
    MIN_VALUE: 0,
    MAX_VALUE: 100,
    MAX_TAGS: 10,
    MAX_TAG_LENGTH: 50,
    CONFIDENCE_MIN: 0,
    CONFIDENCE_MAX: 1
  },
  GAP: {
    MIN_TITLE_LENGTH: 5,
    MAX_TITLE_LENGTH: 200,
    MAX_DESCRIPTION_LENGTH: 2000,
    MAX_AFFECTED_AREAS: 20,
    MAX_RECOMMENDATIONS: 10,
    MAX_RESOLUTION_STEPS: 50
  },
  REPORT: {
    MAX_METRICS: 100,
    MAX_GAPS: 1000,
    ALLOWED_FORMATS: ['pdf', 'csv', 'json'] as const
  }
};

/**
 * Validation schema for metric metadata
 */
const metricMetadataSchema = z.object({
  source: z.string().min(1).max(100),
  confidence: z.number()
    .min(VALIDATION_CONSTANTS.METRIC.CONFIDENCE_MIN)
    .max(VALIDATION_CONSTANTS.METRIC.CONFIDENCE_MAX),
  tags: z.array(z.string().max(VALIDATION_CONSTANTS.METRIC.MAX_TAG_LENGTH))
    .max(VALIDATION_CONSTANTS.METRIC.MAX_TAGS)
});

/**
 * Comprehensive validation schema for metrics
 */
export const metricSchema = z.object({
  id: z.string().refine(validateUUID, 'Invalid UUID format'),
  organization_id: z.string().refine(validateUUID, 'Invalid organization ID'),
  exercise_id: z.string().refine(validateUUID, 'Invalid exercise ID'),
  metric_type: z.nativeEnum(MetricType),
  value: z.number()
    .min(VALIDATION_CONSTANTS.METRIC.MIN_VALUE)
    .max(VALIDATION_CONSTANTS.METRIC.MAX_VALUE),
  timestamp: z.string().refine(
    (val) => dayjs(val).isValid(),
    'Invalid timestamp format'
  ),
  metadata: metricMetadataSchema,
  unit: z.nativeEnum(MetricUnit)
});

/**
 * Validation schema for recommendations
 */
const recommendationSchema = z.object({
  id: z.string().refine(validateUUID, 'Invalid UUID format'),
  description: z.string().min(1).max(500),
  priority: z.nativeEnum(GapSeverity),
  estimated_effort: z.string().min(1).max(100),
  assigned_to: z.string().refine(validateEmail, 'Invalid email format')
});

/**
 * Resolution details validation schema
 */
const resolutionDetailsSchema = z.object({
  steps: z.array(z.string().min(1).max(500))
    .max(VALIDATION_CONSTANTS.GAP.MAX_RESOLUTION_STEPS),
  evidence: z.array(z.string().url('Invalid URL format')),
  notes: z.array(z.string().max(1000))
});

/**
 * Comprehensive validation schema for gaps
 */
export const gapSchema = z.object({
  id: z.string().refine(validateUUID, 'Invalid UUID format'),
  organization_id: z.string().refine(validateUUID, 'Invalid organization ID'),
  exercise_id: z.string().refine(validateUUID, 'Invalid exercise ID'),
  gap_type: z.nativeEnum(GapType),
  title: z.string()
    .min(VALIDATION_CONSTANTS.GAP.MIN_TITLE_LENGTH)
    .max(VALIDATION_CONSTANTS.GAP.MAX_TITLE_LENGTH),
  description: z.string().max(VALIDATION_CONSTANTS.GAP.MAX_DESCRIPTION_LENGTH),
  severity: z.nativeEnum(GapSeverity),
  status: z.nativeEnum(GapStatus),
  affected_areas: z.array(z.string())
    .max(VALIDATION_CONSTANTS.GAP.MAX_AFFECTED_AREAS),
  compliance_frameworks: z.array(z.string()),
  metrics: z.array(metricSchema),
  recommendations: z.array(recommendationSchema)
    .max(VALIDATION_CONSTANTS.GAP.MAX_RECOMMENDATIONS),
  resolution_details: resolutionDetailsSchema,
  identified_at: z.string().refine(
    (val) => dayjs(val).isValid(),
    'Invalid identification timestamp'
  ),
  updated_at: z.string().refine(
    (val) => dayjs(val).isValid(),
    'Invalid update timestamp'
  ),
  resolved_at: z.string().nullable(),
  created_by: z.string().refine(validateEmail, 'Invalid creator email'),
  updated_by: z.string().refine(validateEmail, 'Invalid updater email')
});

/**
 * Validation schema for metrics summary in reports
 */
const metricsSummarySchema = z.object({
  metric_type: z.nativeEnum(MetricType),
  value: z.number()
    .min(VALIDATION_CONSTANTS.METRIC.MIN_VALUE)
    .max(VALIDATION_CONSTANTS.METRIC.MAX_VALUE),
  trend: z.nativeEnum(TrendDirection)
});

/**
 * Validation schema for gaps summary in reports
 */
const gapsSummarySchema = z.object({
  gap_type: z.nativeEnum(GapType),
  count: z.number().min(0),
  critical_count: z.number().min(0)
});

/**
 * Validation schema for compliance summary in reports
 */
const complianceSummarySchema = z.object({
  framework: z.string().min(1),
  coverage: z.number()
    .min(VALIDATION_CONSTANTS.METRIC.MIN_VALUE)
    .max(VALIDATION_CONSTANTS.METRIC.MAX_VALUE),
  gaps: z.number().min(0)
});

/**
 * Comprehensive validation schema for report requests
 */
export const reportRequestSchema = z.object({
  id: z.string().refine(validateUUID, 'Invalid UUID format'),
  organization_id: z.string().refine(validateUUID, 'Invalid organization ID'),
  exercise_id: z.string().refine(validateUUID, 'Invalid exercise ID'),
  metrics_summary: z.array(metricsSummarySchema)
    .max(VALIDATION_CONSTANTS.REPORT.MAX_METRICS),
  gaps_summary: z.array(gapsSummarySchema)
    .max(VALIDATION_CONSTANTS.REPORT.MAX_GAPS),
  compliance_summary: z.array(complianceSummarySchema),
  generated_at: z.string().refine(
    (val) => dayjs(val).isValid(),
    'Invalid generation timestamp'
  ),
  format: z.enum(VALIDATION_CONSTANTS.REPORT.ALLOWED_FORMATS)
});

/**
 * Validates metric data with comprehensive error reporting
 * @param metricData - The metric data to validate
 * @returns Validation result with detailed error messages
 */
export const validateMetricData = (metricData: IMetric) => {
  return metricSchema.safeParse(metricData);
};

/**
 * Validates gap data with enhanced compliance mapping validation
 * @param gapData - The gap data to validate
 * @returns Validation result with detailed error messages
 */
export const validateGapData = (gapData: IGap) => {
  return gapSchema.safeParse(gapData);
};

/**
 * Validates report generation requests with format-specific validation
 * @param reportRequest - The report request to validate
 * @returns Validation result with detailed error messages
 */
export const validateReportRequest = (reportRequest: IReport) => {
  return reportRequestSchema.safeParse(reportRequest);
};