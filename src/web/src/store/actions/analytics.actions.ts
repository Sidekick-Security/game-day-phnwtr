// @reduxjs/toolkit v2.0.0 - Redux toolkit for action creation and async thunks
import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
// lodash v4.17.21 - Utility functions for performance optimization
import { debounce } from 'lodash';

// Internal imports
import { 
  MetricType, 
  GapType, 
  IMetric, 
  IGap, 
  IReport, 
  AnalyticsError 
} from '../../types/analytics.types';
import { AnalyticsService } from '../../services/analytics.service';

// Constants
const REQUEST_TIMEOUT = 30000;
const DEBOUNCE_DELAY = 300;

// Initialize analytics service
const analyticsService = new AnalyticsService();

/**
 * Action Types
 */
export const ANALYTICS_ACTION_TYPES = {
  FETCH_METRICS_REQUEST: 'analytics/fetchMetrics/pending',
  FETCH_METRICS_SUCCESS: 'analytics/fetchMetrics/fulfilled',
  FETCH_METRICS_FAILURE: 'analytics/fetchMetrics/rejected',
  
  FETCH_GAP_ANALYSIS_REQUEST: 'analytics/fetchGapAnalysis/pending',
  FETCH_GAP_ANALYSIS_SUCCESS: 'analytics/fetchGapAnalysis/fulfilled',
  FETCH_GAP_ANALYSIS_FAILURE: 'analytics/fetchGapAnalysis/rejected',
  
  FETCH_TRENDS_REQUEST: 'analytics/fetchHistoricalTrends/pending',
  FETCH_TRENDS_SUCCESS: 'analytics/fetchHistoricalTrends/fulfilled',
  FETCH_TRENDS_FAILURE: 'analytics/fetchHistoricalTrends/rejected',
  
  GENERATE_REPORT_REQUEST: 'analytics/generateReport/pending',
  GENERATE_REPORT_SUCCESS: 'analytics/generateReport/fulfilled',
  GENERATE_REPORT_FAILURE: 'analytics/generateReport/rejected',
  
  CLEAR_ANALYTICS_ERROR: 'analytics/clearError'
} as const;

/**
 * Action Creators
 */

/**
 * Fetches performance metrics with debouncing and caching support
 */
export const fetchMetrics = createAsyncThunk(
  ANALYTICS_ACTION_TYPES.FETCH_METRICS_REQUEST,
  async ({ 
    organizationId, 
    exerciseId, 
    metricType,
    page = 1,
    limit = 10 
  }: {
    organizationId: string;
    exerciseId?: string;
    metricType?: MetricType;
    page?: number;
    limit?: number;
  }, { signal }) => {
    try {
      const response = await analyticsService.getMetrics(
        organizationId,
        exerciseId,
        metricType,
        page,
        limit
      );
      return response;
    } catch (error) {
      throw new AnalyticsError('Failed to fetch metrics', error);
    }
  }
);

/**
 * Fetches gap analysis with compliance mapping
 */
export const fetchGapAnalysis = createAsyncThunk(
  ANALYTICS_ACTION_TYPES.FETCH_GAP_ANALYSIS_REQUEST,
  async ({ 
    organizationId, 
    exerciseId, 
    gapType,
    includeCompliance = true 
  }: {
    organizationId: string;
    exerciseId?: string;
    gapType?: GapType;
    includeCompliance?: boolean;
  }, { signal }) => {
    try {
      const response = await analyticsService.getGapAnalysis(
        organizationId,
        exerciseId,
        gapType,
        includeCompliance
      );
      return response;
    } catch (error) {
      throw new AnalyticsError('Failed to fetch gap analysis', error);
    }
  }
);

/**
 * Fetches historical trends with seasonality analysis
 */
export const fetchHistoricalTrends = createAsyncThunk(
  ANALYTICS_ACTION_TYPES.FETCH_TRENDS_REQUEST,
  async ({ 
    organizationId, 
    metricType,
    startDate,
    endDate,
    includeSeasonality = true 
  }: {
    organizationId: string;
    metricType: MetricType;
    startDate: string;
    endDate: string;
    includeSeasonality?: boolean;
  }, { signal }) => {
    try {
      const response = await analyticsService.getHistoricalTrends(
        organizationId,
        metricType,
        startDate,
        endDate,
        includeSeasonality
      );
      return response;
    } catch (error) {
      throw new AnalyticsError('Failed to fetch historical trends', error);
    }
  }
);

/**
 * Generates analytics report with progress tracking
 */
export const generateAnalyticsReport = createAsyncThunk(
  ANALYTICS_ACTION_TYPES.GENERATE_REPORT_REQUEST,
  async ({ 
    organizationId, 
    exerciseId,
    format = 'pdf',
    includeConfidential = false 
  }: {
    organizationId: string;
    exerciseId?: string;
    format?: 'pdf' | 'csv' | 'json' | 'xlsx';
    includeConfidential?: boolean;
  }, { signal }) => {
    try {
      const response = await analyticsService.generateReport(
        organizationId,
        exerciseId,
        format,
        includeConfidential
      );
      return response;
    } catch (error) {
      throw new AnalyticsError('Failed to generate analytics report', error);
    }
  }
);

/**
 * Clears analytics error state
 */
export const clearAnalyticsError = createAction(
  ANALYTICS_ACTION_TYPES.CLEAR_ANALYTICS_ERROR
);

// Export debounced versions of frequently called actions
export const debouncedFetchMetrics = debounce(
  (dispatch, params) => dispatch(fetchMetrics(params)),
  DEBOUNCE_DELAY
);

export const debouncedFetchGapAnalysis = debounce(
  (dispatch, params) => dispatch(fetchGapAnalysis(params)),
  DEBOUNCE_DELAY
);

// Export all actions as a single object
export const analyticsActions = {
  fetchMetrics,
  fetchGapAnalysis,
  fetchHistoricalTrends,
  generateAnalyticsReport,
  clearAnalyticsError,
  debouncedFetchMetrics,
  debouncedFetchGapAnalysis
};