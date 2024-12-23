// @ts-check
import { 
  MetricType, 
  GapType, 
  GapSeverity, 
  GapStatus,
  IMetric,
  IGap,
  IReport
} from '../types/analytics.types';

/**
 * Pagination information structure for paginated responses
 */
export interface IPaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  items_per_page: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * Compliance impact analysis structure for gap analysis
 */
export interface IComplianceImpact {
  affected_frameworks: string[];
  coverage_impact: number;
  risk_level: GapSeverity;
  remediation_priority: number;
  compliance_citations: Array<{
    framework: string;
    control_id: string;
    description: string;
  }>;
}

/**
 * Seasonality analysis structure for historical trends
 */
export interface ISeasonalityAnalysis {
  pattern_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  confidence_score: number;
  peak_periods: Array<{
    start_time: string;
    end_time: string;
    magnitude: number;
  }>;
  seasonal_factors: Record<string, number>;
}

/**
 * Response structure for metrics API endpoint
 */
export interface IMetricsResponse {
  metrics: IMetric[];
  total: number;
  page_info: IPaginationInfo;
  cache_ttl: number;
}

/**
 * Response structure for gap analysis API endpoint
 */
export interface IGapAnalysisResponse {
  gaps: IGap[];
  statistics: Record<GapType, number>;
  critical_count: number;
  compliance_impact: IComplianceImpact;
}

/**
 * Response structure for historical trends API endpoint
 */
export interface IHistoricalTrendsResponse {
  data: Array<{
    timestamp: string;
    value: number;
  }>;
  trend_direction: number;
  trend_percentage: number;
  seasonality: ISeasonalityAnalysis;
}

/**
 * Available report formats for report generation
 */
export type ReportFormat = 'pdf' | 'csv' | 'json' | 'xlsx';

/**
 * Analytics service interface defining the contract for analytics operations
 */
export interface IAnalyticsService {
  /**
   * Retrieves performance metrics with pagination support
   * @param organizationId - Organization identifier
   * @param exerciseId - Optional exercise identifier for filtering
   * @param metricType - Optional metric type filter
   * @param page - Page number for pagination
   * @param limit - Number of items per page
   * @throws {Error} When metrics retrieval fails
   * @returns Promise resolving to paginated metrics response
   */
  getMetrics(
    organizationId: string,
    exerciseId?: string,
    metricType?: MetricType,
    page: number,
    limit: number
  ): Promise<IMetricsResponse>;

  /**
   * Retrieves gap analysis with compliance impact assessment
   * @param organizationId - Organization identifier
   * @param exerciseId - Optional exercise identifier for filtering
   * @param gapType - Optional gap type filter
   * @param includeCompliance - Flag to include compliance mapping
   * @throws {Error} When gap analysis fails
   * @returns Promise resolving to gap analysis response
   */
  getGapAnalysis(
    organizationId: string,
    exerciseId?: string,
    gapType?: GapType,
    includeCompliance: boolean
  ): Promise<IGapAnalysisResponse>;

  /**
   * Retrieves historical trends with seasonality analysis
   * @param organizationId - Organization identifier
   * @param metricType - Type of metric for trend analysis
   * @param startDate - Start date for trend period
   * @param endDate - End date for trend period
   * @param includeSeasonality - Flag to include seasonality analysis
   * @throws {Error} When trend analysis fails
   * @returns Promise resolving to historical trends response
   */
  getHistoricalTrends(
    organizationId: string,
    metricType: MetricType,
    startDate: string,
    endDate: string,
    includeSeasonality: boolean
  ): Promise<IHistoricalTrendsResponse>;

  /**
   * Generates analytics report in specified format
   * @param organizationId - Organization identifier
   * @param exerciseId - Optional exercise identifier for filtering
   * @param format - Desired report format
   * @param includeConfidential - Flag to include confidential information
   * @throws {Error} When report generation fails
   * @returns Promise resolving to report blob
   */
  generateReport(
    organizationId: string,
    exerciseId?: string,
    format: ReportFormat,
    includeConfidential: boolean
  ): Promise<Blob>;
}