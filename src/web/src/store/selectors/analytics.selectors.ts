/**
 * Analytics Selectors for GameDay Platform
 * Provides memoized selectors for accessing and computing analytics state data
 * with enhanced performance optimization and real-time computation capabilities.
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // ^2.0.0
import { RootState } from '../reducers/root.reducer';
import {
  MetricType,
  GapType,
  IMetric,
  IGap,
  IReport,
  TrendDirection
} from '../../types/analytics.types';

/**
 * Base selector for analytics state slice
 */
const selectAnalyticsState = (state: RootState) => state.analytics;

/**
 * Enhanced selector for metrics data with statistical analysis
 */
export const selectMetrics = createSelector(
  [selectAnalyticsState],
  (analytics) => {
    const metrics = analytics.metrics;
    const loading = analytics.loading.metrics;

    // Compute total metrics count
    const totalCount = metrics.length;

    // Calculate statistical measures
    const statistics = {
      mean: metrics.reduce((acc, m) => acc + m.value, 0) / totalCount,
      median: (() => {
        const sorted = [...metrics].sort((a, b) => a.value - b.value);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid].value : (sorted[mid - 1].value + sorted[mid].value) / 2;
      })(),
      variance: metrics.reduce((acc, m) => acc + Math.pow(m.value - statistics.mean, 2), 0) / totalCount
    };

    // Determine trend direction based on recent data points
    const trendDirection = (() => {
      if (metrics.length < 2) return 'stable';
      const recent = metrics.slice(-3);
      const trend = recent.reduce((acc, curr, idx) => {
        if (idx === 0) return 0;
        return acc + (curr.value - recent[idx - 1].value);
      }, 0);
      return trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable';
    })();

    return {
      data: metrics,
      loading,
      totalCount,
      statistics,
      trendDirection
    };
  }
);

/**
 * Enhanced selector for gap analysis with compliance mapping
 */
export const selectGapAnalysis = createSelector(
  [selectAnalyticsState],
  (analytics) => {
    const gaps = analytics.gaps;
    const loading = analytics.loading.gaps;

    // Compute gap statistics by category
    const statistics = gaps.reduce((acc, gap) => ({
      ...acc,
      [gap.gap_type]: (acc[gap.gap_type] || 0) + 1
    }), {} as Record<string, number>);

    // Map gaps to compliance requirements
    const complianceMapping = gaps.reduce((acc, gap) => {
      gap.compliance_frameworks.forEach(framework => {
        if (!acc[framework]) acc[framework] = [];
        acc[framework].push(gap.id);
      });
      return acc;
    }, {} as Record<string, string[]>);

    // Calculate severity scores
    const severity = gaps.reduce((acc, gap) => ({
      ...acc,
      [gap.severity]: (acc[gap.severity] || 0) + 1
    }), {} as Record<string, number>);

    return {
      data: gaps,
      statistics,
      loading,
      complianceMapping,
      severity
    };
  }
);

/**
 * Enhanced selector for historical trends with seasonality detection
 */
export const selectHistoricalTrends = createSelector(
  [selectAnalyticsState],
  (analytics) => {
    const trends = analytics.historicalTrends;
    const loading = analytics.loading.trends;

    // Detect seasonal patterns
    const seasonality = trends.reduce((acc, trend, idx) => {
      if (idx === 0) return acc;
      const timeDiff = new Date(trend.timestamp).getTime() - 
                      new Date(trends[idx - 1].timestamp).getTime();
      const period = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      acc[period] = (acc[period] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generate short-term forecast
    const forecast = trends.length > 0 ? trends.slice(-3).map(trend => ({
      ...trend,
      value: trend.value * 1.1, // Simple projection, replace with actual forecasting logic
      forecast: true
    })) : [];

    return {
      data: trends,
      metricType: analytics.activeMetricType,
      loading,
      seasonality,
      forecast
    };
  }
);

/**
 * Enhanced selector for analytics reports with download management
 */
export const selectReport = createSelector(
  [selectAnalyticsState],
  (analytics) => {
    const report = analytics.report;
    const loading = analytics.loading.report;

    // Generate download URL with expiration
    const downloadUrl = report ? `${report.id}?expires=${Date.now() + 3600000}` : null;

    return {
      data: report,
      downloadUrl,
      loading,
      progress: analytics.reportProgress || 0,
      format: report?.format || 'pdf'
    };
  }
);

/**
 * Enhanced selector for analytics errors with recovery suggestions
 */
export const selectAnalyticsError = createSelector(
  [selectAnalyticsState],
  (analytics) => {
    const error = analytics.error;
    if (!error) return null;

    // Generate recovery suggestion based on error type
    const recovery = (() => {
      switch (error.type) {
        case 'network':
          return 'Check your network connection and try again';
        case 'validation':
          return 'Verify your input data and resubmit';
        case 'server':
          return 'The server is experiencing issues, please try again later';
        default:
          return 'Please try the operation again';
      }
    })();

    return {
      message: error.message,
      operation: error.code,
      timestamp: new Date(error.timestamp || Date.now()).getTime(),
      recovery,
      retryCount: analytics.retryCount || 0
    };
  }
);