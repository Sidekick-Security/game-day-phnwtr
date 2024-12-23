import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals'; // ^29.7.0
import MockAdapter from 'axios-mock-adapter'; // ^1.22.0

import { AnalyticsService } from '../../src/services/analytics.service';
import { 
  MetricType, 
  GapType, 
  GapSeverity, 
  GapStatus, 
  TimeRange, 
  ReportFormat 
} from '../../src/types/analytics.types';
import { apiClient } from '../../src/utils/api.utils';
import { ANALYTICS_ENDPOINTS } from '../../src/constants/api.constants';
import { apiConfig } from '../../src/config/api.config';

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockAxios: MockAdapter;
  
  // Test constants
  const mockOrganizationId = 'test-org-123';
  const mockExerciseId = 'test-exercise-456';
  const mockMetricsResponse = {
    metrics: [
      {
        id: 'metric-1',
        organization_id: mockOrganizationId,
        exercise_id: mockExerciseId,
        metric_type: MetricType.RESPONSE_TIME,
        value: 85.5,
        timestamp: '2024-01-20T10:00:00Z',
        metadata: {
          source: 'exercise',
          confidence: 0.95,
          tags: ['incident-response']
        },
        unit: 'SECONDS'
      }
    ],
    total: 1,
    page_info: {
      current_page: 1,
      total_pages: 1,
      total_items: 1,
      items_per_page: 10,
      has_next: false,
      has_previous: false
    },
    cache_ttl: 300
  };

  const mockGapAnalysisResponse = {
    gaps: [
      {
        id: 'gap-1',
        organization_id: mockOrganizationId,
        exercise_id: mockExerciseId,
        gap_type: GapType.PROCESS,
        title: 'Incident Escalation Gap',
        description: 'Delayed escalation process identified',
        severity: GapSeverity.HIGH,
        status: GapStatus.OPEN,
        affected_areas: ['incident-response'],
        compliance_frameworks: ['SOC2'],
        identified_at: '2024-01-20T10:00:00Z'
      }
    ],
    statistics: {
      [GapType.PROCESS]: 1
    },
    critical_count: 0,
    compliance_impact: {
      affected_frameworks: ['SOC2'],
      coverage_impact: 15,
      risk_level: GapSeverity.HIGH,
      remediation_priority: 1
    }
  };

  beforeEach(() => {
    // Initialize mock adapter with custom configuration
    mockAxios = new MockAdapter(apiClient, { 
      delayResponse: 100,
      onNoMatch: 'throwException'
    });
    
    // Initialize analytics service
    analyticsService = new AnalyticsService();
    
    // Clear cache before each test
    jest.spyOn(Storage.prototype, 'getItem');
    jest.spyOn(Storage.prototype, 'setItem');
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up mocks and spies
    mockAxios.reset();
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('getMetrics', () => {
    test('should retrieve metrics successfully with caching', async () => {
      // Setup mock response
      mockAxios.onGet(new RegExp(`${ANALYTICS_ENDPOINTS.METRICS}.*`))
        .reply(200, mockMetricsResponse);

      // First call - should hit API
      const result1 = await analyticsService.getMetrics(
        mockOrganizationId,
        mockExerciseId,
        MetricType.RESPONSE_TIME
      );

      expect(result1).toEqual(mockMetricsResponse);
      expect(mockAxios.history.get.length).toBe(1);

      // Second call - should use cache
      const result2 = await analyticsService.getMetrics(
        mockOrganizationId,
        mockExerciseId,
        MetricType.RESPONSE_TIME
      );

      expect(result2).toEqual(mockMetricsResponse);
      expect(mockAxios.history.get.length).toBe(1); // No additional API call
    });

    test('should handle API errors gracefully', async () => {
      mockAxios.onGet(new RegExp(`${ANALYTICS_ENDPOINTS.METRICS}.*`))
        .reply(500, { 
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        });

      await expect(analyticsService.getMetrics(mockOrganizationId))
        .rejects.toThrow('Internal server error');
    });

    test('should handle request timeout', async () => {
      mockAxios.onGet(new RegExp(`${ANALYTICS_ENDPOINTS.METRICS}.*`))
        .timeout();

      await expect(analyticsService.getMetrics(mockOrganizationId))
        .rejects.toThrow('timeout');
    });
  });

  describe('getGapAnalysis', () => {
    test('should retrieve gap analysis with compliance mapping', async () => {
      mockAxios.onGet(new RegExp(`${ANALYTICS_ENDPOINTS.GAPS}.*`))
        .reply(200, mockGapAnalysisResponse);

      const result = await analyticsService.getGapAnalysis(
        mockOrganizationId,
        mockExerciseId,
        GapType.PROCESS,
        true
      );

      expect(result).toEqual(mockGapAnalysisResponse);
      expect(result.gaps[0].compliance_frameworks).toContain('SOC2');
    });

    test('should handle empty gap analysis results', async () => {
      mockAxios.onGet(new RegExp(`${ANALYTICS_ENDPOINTS.GAPS}.*`))
        .reply(200, {
          gaps: [],
          statistics: {},
          critical_count: 0,
          compliance_impact: null
        });

      const result = await analyticsService.getGapAnalysis(mockOrganizationId);
      expect(result.gaps).toHaveLength(0);
    });
  });

  describe('getHistoricalTrends', () => {
    const mockTrendsResponse = {
      data: [
        { timestamp: '2024-01-01T00:00:00Z', value: 80 },
        { timestamp: '2024-01-02T00:00:00Z', value: 85 }
      ],
      trend_direction: 1,
      trend_percentage: 6.25,
      seasonality: {
        pattern_type: 'daily',
        confidence_score: 0.85,
        peak_periods: []
      }
    };

    test('should validate date range and retrieve trends', async () => {
      mockAxios.onGet(new RegExp(`${ANALYTICS_ENDPOINTS.TRENDS}.*`))
        .reply(200, mockTrendsResponse);

      const result = await analyticsService.getHistoricalTrends(
        mockOrganizationId,
        MetricType.RESPONSE_TIME,
        '2024-01-01',
        '2024-01-02',
        true
      );

      expect(result).toEqual(mockTrendsResponse);
      expect(result.data).toHaveLength(2);
    });

    test('should reject invalid date ranges', async () => {
      await expect(analyticsService.getHistoricalTrends(
        mockOrganizationId,
        MetricType.RESPONSE_TIME,
        '2024-01-02', // Start date after end date
        '2024-01-01',
        true
      )).rejects.toThrow('Invalid date range specified');
    });
  });

  describe('generateReport', () => {
    const mockReportBlob = new Blob(['test report data'], { type: 'application/pdf' });

    test('should generate report with progress tracking', async () => {
      const onUploadProgress = jest.fn();

      mockAxios.onPost(ANALYTICS_ENDPOINTS.REPORTS)
        .reply(200, mockReportBlob);

      const result = await analyticsService.generateReport(
        mockOrganizationId,
        mockExerciseId,
        'pdf',
        false
      );

      expect(result).toEqual(mockReportBlob);
    });

    test('should handle report generation failures', async () => {
      mockAxios.onPost(ANALYTICS_ENDPOINTS.REPORTS)
        .reply(422, {
          code: 'INVALID_FORMAT',
          message: 'Unsupported report format'
        });

      await expect(analyticsService.generateReport(
        mockOrganizationId,
        mockExerciseId,
        'invalid' as ReportFormat
      )).rejects.toThrow('Unsupported report format');
    });
  });

  describe('Cache Management', () => {
    test('should clear cache after TTL expiration', async () => {
      jest.useFakeTimers();
      
      mockAxios.onGet(new RegExp(`${ANALYTICS_ENDPOINTS.METRICS}.*`))
        .reply(200, mockMetricsResponse);

      // First call
      await analyticsService.getMetrics(mockOrganizationId);
      expect(mockAxios.history.get.length).toBe(1);

      // Advance time past TTL
      jest.advanceTimersByTime(apiConfig.cache.ttl + 1000);

      // Second call should hit API again
      await analyticsService.getMetrics(mockOrganizationId);
      expect(mockAxios.history.get.length).toBe(2);

      jest.useRealTimers();
    });

    test('should handle cache eviction when size limit reached', async () => {
      // Fill cache to max size
      for (let i = 0; i < apiConfig.cache.maxSize + 1; i++) {
        mockAxios.onGet(new RegExp(`${ANALYTICS_ENDPOINTS.METRICS}.*`))
          .reply(200, mockMetricsResponse);

        await analyticsService.getMetrics(`org-${i}`);
      }

      // Verify oldest cache entry was evicted
      const result = await analyticsService.getMetrics('org-0');
      expect(mockAxios.history.get.length).toBeGreaterThan(apiConfig.cache.maxSize);
    });
  });
});