// @reduxjs/toolkit v2.0.0 - Type-safe Redux reducer creation
import { createReducer } from '@reduxjs/toolkit';

// Internal imports for analytics types and actions
import { IMetric, IGap, IReport } from '../../types/analytics.types';
import {
  fetchMetrics,
  fetchGapAnalysis,
  fetchHistoricalTrends,
  generateAnalyticsReport
} from '../actions/analytics.actions';

/**
 * Interface for analytics error state
 */
interface AnalyticsError {
  code: string | null;
  message: string | null;
  timestamp: string | null;
  type: 'network' | 'validation' | 'server' | 'unknown' | null;
}

/**
 * Interface for analytics loading states
 */
interface LoadingState {
  metrics: boolean;
  gaps: boolean;
  trends: boolean;
  report: boolean;
}

/**
 * Interface for analytics state
 */
interface AnalyticsState {
  metrics: IMetric[];
  gaps: IGap[];
  historicalTrends: Array<{ timestamp: string; value: number }>;
  report: IReport | null;
  loading: LoadingState;
  error: AnalyticsError;
}

/**
 * Initial state for analytics reducer
 */
const initialState: AnalyticsState = {
  metrics: [],
  gaps: [],
  historicalTrends: [],
  report: null,
  loading: {
    metrics: false,
    gaps: false,
    trends: false,
    report: false
  },
  error: {
    code: null,
    message: null,
    timestamp: null,
    type: null
  }
};

/**
 * Analytics reducer with comprehensive error handling and loading states
 */
export const analyticsReducer = createReducer(initialState, (builder) => {
  builder
    // Metrics handling
    .addCase(fetchMetrics.pending, (state) => {
      state.loading.metrics = true;
      state.error = { ...initialState.error };
    })
    .addCase(fetchMetrics.fulfilled, (state, action) => {
      state.metrics = action.payload.metrics;
      state.loading.metrics = false;
    })
    .addCase(fetchMetrics.rejected, (state, action) => {
      state.loading.metrics = false;
      state.error = {
        code: action.error.code || 'UNKNOWN_ERROR',
        message: action.error.message || 'Failed to fetch metrics',
        timestamp: new Date().toISOString(),
        type: action.error.name === 'AxiosError' ? 'network' : 'unknown'
      };
    })

    // Gap analysis handling
    .addCase(fetchGapAnalysis.pending, (state) => {
      state.loading.gaps = true;
      state.error = { ...initialState.error };
    })
    .addCase(fetchGapAnalysis.fulfilled, (state, action) => {
      state.gaps = action.payload.gaps;
      state.loading.gaps = false;
    })
    .addCase(fetchGapAnalysis.rejected, (state, action) => {
      state.loading.gaps = false;
      state.error = {
        code: action.error.code || 'UNKNOWN_ERROR',
        message: action.error.message || 'Failed to fetch gap analysis',
        timestamp: new Date().toISOString(),
        type: action.error.name === 'AxiosError' ? 'network' : 'unknown'
      };
    })

    // Historical trends handling
    .addCase(fetchHistoricalTrends.pending, (state) => {
      state.loading.trends = true;
      state.error = { ...initialState.error };
    })
    .addCase(fetchHistoricalTrends.fulfilled, (state, action) => {
      state.historicalTrends = action.payload.data;
      state.loading.trends = false;
    })
    .addCase(fetchHistoricalTrends.rejected, (state, action) => {
      state.loading.trends = false;
      state.error = {
        code: action.error.code || 'UNKNOWN_ERROR',
        message: action.error.message || 'Failed to fetch historical trends',
        timestamp: new Date().toISOString(),
        type: action.error.name === 'AxiosError' ? 'network' : 'unknown'
      };
    })

    // Report generation handling
    .addCase(generateAnalyticsReport.pending, (state) => {
      state.loading.report = true;
      state.error = { ...initialState.error };
    })
    .addCase(generateAnalyticsReport.fulfilled, (state, action) => {
      state.report = action.payload;
      state.loading.report = false;
    })
    .addCase(generateAnalyticsReport.rejected, (state, action) => {
      state.loading.report = false;
      state.error = {
        code: action.error.code || 'UNKNOWN_ERROR',
        message: action.error.message || 'Failed to generate analytics report',
        timestamp: new Date().toISOString(),
        type: action.error.name === 'AxiosError' ? 'network' : 'unknown'
      };
    });
});

// Export reducer and state interface for store configuration
export type { AnalyticsState, AnalyticsError, LoadingState };
export default analyticsReducer;