/**
 * Analytics Service Implementation
 * Provides comprehensive analytics functionality for the GameDay Platform
 * including metrics tracking, gap analysis, and trend analysis.
 * @version 1.0.0
 */

import { 
  IAnalyticsService, 
  IMetricsResponse, 
  IGapAnalysisResponse, 
  IHistoricalTrendsResponse,
  ReportFormat
} from '../interfaces/analytics.interface';
import { 
  MetricType, 
  GapType, 
  IMetric, 
  IGap, 
  IReport 
} from '../types/analytics.types';
import { apiClient, handleApiError } from '../utils/api.utils';
import { ANALYTICS_ENDPOINTS } from '../constants/api.constants';
import { apiConfig } from '../config/api.config';
import dayjs from 'dayjs';

/**
 * Analytics Service class implementing IAnalyticsService interface
 * Provides enterprise-grade analytics operations with caching and error handling
 */
export class AnalyticsService implements IAnalyticsService {
  private readonly baseUrl: string = ANALYTICS_ENDPOINTS.BASE;
  private readonly apiClient = apiClient;
  private readonly requestCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    // Initialize cache cleanup interval
    setInterval(() => this.cleanupCache(), apiConfig.cache.ttl);
  }

  /**
   * Retrieves performance metrics with caching support
   * @param organizationId Organization identifier
   * @param exerciseId Optional exercise identifier
   * @param metricType Optional metric type filter
   * @param page Page number for pagination
   * @param limit Items per page
   */
  public async getMetrics(
    organizationId: string,
    exerciseId?: string,
    metricType?: MetricType,
    page: number = 1,
    limit: number = 10
  ): Promise<IMetricsResponse> {
    try {
      const cacheKey = this.generateCacheKey('metrics', { 
        organizationId, 
        exerciseId, 
        metricType, 
        page, 
        limit 
      });

      // Check cache first
      const cachedData = this.getCachedData<IMetricsResponse>(cacheKey);
      if (cachedData) return cachedData;

      // Create abort controller for request cancellation
      const controller = new AbortController();
      this.abortControllers.set(cacheKey, controller);

      const params = new URLSearchParams({
        organization_id: organizationId,
        page: page.toString(),
        limit: limit.toString(),
        ...(exerciseId && { exercise_id: exerciseId }),
        ...(metricType && { metric_type: metricType })
      });

      const response = await this.apiClient.get<IMetricsResponse>(
        `${ANALYTICS_ENDPOINTS.METRICS}?${params}`,
        {
          signal: controller.signal,
          timeout: apiConfig.axiosInstance.defaults.timeout
        }
      );

      // Cache successful response
      this.cacheData(cacheKey, response.data);
      this.abortControllers.delete(cacheKey);

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Retrieves gap analysis with priority sorting
   * @param organizationId Organization identifier
   * @param exerciseId Optional exercise identifier
   * @param gapType Optional gap type filter
   * @param includeCompliance Include compliance mapping
   */
  public async getGapAnalysis(
    organizationId: string,
    exerciseId?: string,
    gapType?: GapType,
    includeCompliance: boolean = true
  ): Promise<IGapAnalysisResponse> {
    try {
      const cacheKey = this.generateCacheKey('gaps', { 
        organizationId, 
        exerciseId, 
        gapType, 
        includeCompliance 
      });

      const cachedData = this.getCachedData<IGapAnalysisResponse>(cacheKey);
      if (cachedData) return cachedData;

      const controller = new AbortController();
      this.abortControllers.set(cacheKey, controller);

      const params = new URLSearchParams({
        organization_id: organizationId,
        include_compliance: includeCompliance.toString(),
        ...(exerciseId && { exercise_id: exerciseId }),
        ...(gapType && { gap_type: gapType })
      });

      const response = await this.apiClient.get<IGapAnalysisResponse>(
        `${ANALYTICS_ENDPOINTS.GAPS}?${params}`,
        {
          signal: controller.signal,
          timeout: apiConfig.axiosInstance.defaults.timeout
        }
      );

      this.cacheData(cacheKey, response.data);
      this.abortControllers.delete(cacheKey);

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Retrieves historical trends with date validation
   * @param organizationId Organization identifier
   * @param metricType Metric type for trend analysis
   * @param startDate Start date for trend period
   * @param endDate End date for trend period
   * @param includeSeasonality Include seasonality analysis
   */
  public async getHistoricalTrends(
    organizationId: string,
    metricType: MetricType,
    startDate: string,
    endDate: string,
    includeSeasonality: boolean = true
  ): Promise<IHistoricalTrendsResponse> {
    try {
      // Validate date range
      if (!this.validateDateRange(startDate, endDate)) {
        throw new Error('Invalid date range specified');
      }

      const cacheKey = this.generateCacheKey('trends', { 
        organizationId, 
        metricType, 
        startDate, 
        endDate, 
        includeSeasonality 
      });

      const cachedData = this.getCachedData<IHistoricalTrendsResponse>(cacheKey);
      if (cachedData) return cachedData;

      const controller = new AbortController();
      this.abortControllers.set(cacheKey, controller);

      const params = new URLSearchParams({
        organization_id: organizationId,
        metric_type: metricType,
        start_date: startDate,
        end_date: endDate,
        include_seasonality: includeSeasonality.toString()
      });

      const response = await this.apiClient.get<IHistoricalTrendsResponse>(
        `${ANALYTICS_ENDPOINTS.TRENDS}?${params}`,
        {
          signal: controller.signal,
          timeout: apiConfig.axiosInstance.defaults.timeout
        }
      );

      this.cacheData(cacheKey, response.data);
      this.abortControllers.delete(cacheKey);

      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Generates analytics report with progress tracking
   * @param organizationId Organization identifier
   * @param exerciseId Optional exercise identifier
   * @param format Report format
   * @param includeConfidential Include confidential information
   */
  public async generateReport(
    organizationId: string,
    exerciseId?: string,
    format: ReportFormat = 'pdf',
    includeConfidential: boolean = false
  ): Promise<Blob> {
    try {
      const controller = new AbortController();
      const requestId = this.generateCacheKey('report', { 
        organizationId, 
        exerciseId, 
        format 
      });
      
      this.abortControllers.set(requestId, controller);

      const response = await this.apiClient.post(
        ANALYTICS_ENDPOINTS.REPORTS,
        {
          organization_id: organizationId,
          exercise_id: exerciseId,
          format,
          include_confidential: includeConfidential
        },
        {
          signal: controller.signal,
          responseType: 'blob',
          timeout: apiConfig.axiosInstance.defaults.timeout * 2, // Double timeout for report generation
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.info(`Report generation progress: ${percentCompleted}%`);
          }
        }
      );

      this.abortControllers.delete(requestId);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Cancels any pending analytics requests
   */
  public cancelPendingRequests(): void {
    this.abortControllers.forEach((controller) => {
      controller.abort();
    });
    this.abortControllers.clear();
  }

  private generateCacheKey(prefix: string, params: Record<string, any>): string {
    return `${prefix}:${Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join(':')}`;
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.requestCache.get(key);
    if (cached && Date.now() - cached.timestamp < apiConfig.cache.ttl) {
      return cached.data as T;
    }
    return null;
  }

  private cacheData(key: string, data: any): void {
    // Implement LRU cache eviction if needed
    if (this.requestCache.size >= apiConfig.cache.maxSize) {
      const oldestKey = this.requestCache.keys().next().value;
      this.requestCache.delete(oldestKey);
    }
    this.requestCache.set(key, { data, timestamp: Date.now() });
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > apiConfig.cache.ttl) {
        this.requestCache.delete(key);
      }
    }
  }

  private validateDateRange(startDate: string, endDate: string): boolean {
    const start = dayjs(startDate);
    const end = dayjs(endDate);
    return start.isValid() && end.isValid() && end.isAfter(start);
  }
}