// dayjs v1.11.0 - Date handling and formatting library
import dayjs from 'dayjs';

/**
 * Available metric types for analytics tracking
 */
export enum MetricType {
  RESPONSE_TIME = 'RESPONSE_TIME',
  COMPLIANCE_COVERAGE = 'COMPLIANCE_COVERAGE',
  EXERCISE_COMPLETION = 'EXERCISE_COMPLETION',
  PARTICIPANT_ENGAGEMENT = 'PARTICIPANT_ENGAGEMENT'
}

/**
 * Standardized units for metrics measurement
 */
export enum MetricUnit {
  PERCENTAGE = 'PERCENTAGE',
  SECONDS = 'SECONDS',
  COUNT = 'COUNT',
  SCORE = 'SCORE'
}

/**
 * Trend directions for metric analysis
 */
export enum TrendDirection {
  IMPROVING = 'IMPROVING',
  DECLINING = 'DECLINING',
  STABLE = 'STABLE'
}

/**
 * Types of gaps that can be identified during analysis
 */
export enum GapType {
  PEOPLE = 'PEOPLE',
  PROCESS = 'PROCESS',
  TECHNOLOGY = 'TECHNOLOGY',
  COMPLIANCE = 'COMPLIANCE'
}

/**
 * Severity levels for identified gaps
 */
export enum GapSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

/**
 * Status options for gap remediation tracking
 */
export enum GapStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ACCEPTED = 'ACCEPTED'
}

/**
 * Metadata structure for metrics
 */
export interface IMetricMetadata {
  source: string;
  confidence: number;
  tags: string[];
}

/**
 * Structure for performance metrics data
 */
export interface IMetric {
  id: string;
  organization_id: string;
  exercise_id: string;
  metric_type: MetricType;
  value: number;
  timestamp: string;
  metadata: IMetricMetadata;
  unit: MetricUnit;
}

/**
 * Structure for gap recommendations
 */
export interface IRecommendation {
  id: string;
  description: string;
  priority: GapSeverity;
  estimated_effort: string;
  assigned_to: string;
}

/**
 * Structure for identified gaps data
 */
export interface IGap {
  id: string;
  organization_id: string;
  exercise_id: string;
  gap_type: GapType;
  title: string;
  description: string;
  severity: GapSeverity;
  status: GapStatus;
  affected_areas: string[];
  compliance_frameworks: string[];
  metrics: IMetric[];
  recommendations: IRecommendation[];
  resolution_details: {
    steps: string[];
    evidence: string[];
    notes: string[];
  };
  identified_at: string;
  updated_at: string;
  resolved_at: string;
  created_by: string;
  updated_by: string;
}

/**
 * Structure for analytics reports
 */
export interface IReport {
  id: string;
  organization_id: string;
  exercise_id: string;
  metrics_summary: Array<{
    metric_type: MetricType;
    value: number;
    trend: TrendDirection;
  }>;
  gaps_summary: Array<{
    gap_type: GapType;
    count: number;
    critical_count: number;
  }>;
  compliance_summary: Array<{
    framework: string;
    coverage: number;
    gaps: number;
  }>;
  generated_at: string;
  format: 'pdf' | 'csv' | 'json';
}