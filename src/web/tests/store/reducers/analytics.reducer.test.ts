// @jest/globals v29.0.0 - Testing framework
import { describe, it, expect, beforeEach } from '@jest/globals';

// Internal imports
import { analyticsReducer, initialState } from '../../src/store/reducers/analytics.reducer';
import { 
  fetchMetrics,
  fetchGapAnalysis,
  fetchHistoricalTrends,
  generateAnalyticsReport,
  clearAnalyticsError
} from '../../src/store/actions/analytics.actions';
import { 
  MetricType,
  GapType,
  GapSeverity,
  IMetric,
  IGap,
  IReport 
} from '../../src/types/analytics.types';

// Mock data for testing
const mockMetrics: IMetric[] = [
  {
    id: '1',
    organization_id: 'org-1',
    exercise_id: 'ex-1',
    metric_type: MetricType.RESPONSE_TIME,
    value: 85,
    timestamp: '2024-01-15T10:00:00Z',
    metadata: {
      source: 'exercise',
      confidence: 0.95,
      tags: ['incident-response']
    },
    unit: 'PERCENTAGE'
  }
];

const mockGaps: IGap[] = [
  {
    id: '1',
    organization_id: 'org-1',
    exercise_id: 'ex-1',
    gap_type: GapType.PROCESS,
    title: 'Incident Escalation Gap',
    description: 'Incident escalation procedures need improvement',
    severity: GapSeverity.HIGH,
    status: 'OPEN',
    affected_areas: ['incident-response', 'communication'],
    compliance_frameworks: ['SOC2', 'ISO27001'],
    metrics: [],
    recommendations: [{
      id: 'rec-1',
      description: 'Implement formal escalation matrix',
      priority: GapSeverity.HIGH,
      estimated_effort: '2 weeks',
      assigned_to: 'security-team'
    }],
    resolution_details: {
      steps: [],
      evidence: [],
      notes: []
    },
    identified_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    resolved_at: '',
    created_by: 'system',
    updated_by: 'system'
  }
];

const mockHistoricalTrends = [
  { timestamp: '2024-01-01T00:00:00Z', value: 80 },
  { timestamp: '2024-01-02T00:00:00Z', value: 82 },
  { timestamp: '2024-01-03T00:00:00Z', value: 85 }
];

const mockReport: IReport = {
  id: 'report-1',
  organization_id: 'org-1',
  exercise_id: 'ex-1',
  metrics_summary: [{
    metric_type: MetricType.RESPONSE_TIME,
    value: 85,
    trend: 'IMPROVING'
  }],
  gaps_summary: [{
    gap_type: GapType.PROCESS,
    count: 1,
    critical_count: 0
  }],
  compliance_summary: [{
    framework: 'SOC2',
    coverage: 85,
    gaps: 1
  }],
  generated_at: '2024-01-15T10:00:00Z',
  format: 'pdf'
};

describe('Analytics Reducer', () => {
  let state: typeof initialState;

  beforeEach(() => {
    state = { ...initialState };
  });

  describe('Initial State', () => {
    it('should return the initial state', () => {
      expect(analyticsReducer(undefined, { type: 'unknown' })).toEqual(initialState);
    });

    it('should have empty arrays and null values initially', () => {
      expect(state.metrics).toHaveLength(0);
      expect(state.gaps).toHaveLength(0);
      expect(state.historicalTrends).toHaveLength(0);
      expect(state.report).toBeNull();
    });

    it('should have all loading states as false initially', () => {
      expect(state.loading.metrics).toBeFalsy();
      expect(state.loading.gaps).toBeFalsy();
      expect(state.loading.trends).toBeFalsy();
      expect(state.loading.report).toBeFalsy();
    });
  });

  describe('Metrics Management', () => {
    it('should handle fetchMetrics.pending', () => {
      const nextState = analyticsReducer(state, fetchMetrics.pending);
      expect(nextState.loading.metrics).toBeTruthy();
      expect(nextState.error).toEqual(initialState.error);
    });

    it('should handle fetchMetrics.fulfilled', () => {
      const payload = { metrics: mockMetrics };
      const nextState = analyticsReducer(state, fetchMetrics.fulfilled(payload, '', {}));
      expect(nextState.metrics).toEqual(mockMetrics);
      expect(nextState.loading.metrics).toBeFalsy();
    });

    it('should handle fetchMetrics.rejected', () => {
      const error = new Error('Network error');
      const nextState = analyticsReducer(state, fetchMetrics.rejected(error, '', {}));
      expect(nextState.loading.metrics).toBeFalsy();
      expect(nextState.error.message).toBe('Network error');
      expect(nextState.error.type).toBe('network');
    });
  });

  describe('Gap Analysis', () => {
    it('should handle fetchGapAnalysis.pending', () => {
      const nextState = analyticsReducer(state, fetchGapAnalysis.pending);
      expect(nextState.loading.gaps).toBeTruthy();
      expect(nextState.error).toEqual(initialState.error);
    });

    it('should handle fetchGapAnalysis.fulfilled', () => {
      const payload = { gaps: mockGaps };
      const nextState = analyticsReducer(state, fetchGapAnalysis.fulfilled(payload, '', {}));
      expect(nextState.gaps).toEqual(mockGaps);
      expect(nextState.loading.gaps).toBeFalsy();
    });

    it('should handle fetchGapAnalysis.rejected', () => {
      const error = new Error('Validation error');
      const nextState = analyticsReducer(state, fetchGapAnalysis.rejected(error, '', {}));
      expect(nextState.loading.gaps).toBeFalsy();
      expect(nextState.error.message).toBe('Validation error');
    });
  });

  describe('Historical Trends', () => {
    it('should handle fetchHistoricalTrends.pending', () => {
      const nextState = analyticsReducer(state, fetchHistoricalTrends.pending);
      expect(nextState.loading.trends).toBeTruthy();
      expect(nextState.error).toEqual(initialState.error);
    });

    it('should handle fetchHistoricalTrends.fulfilled', () => {
      const payload = { data: mockHistoricalTrends };
      const nextState = analyticsReducer(state, fetchHistoricalTrends.fulfilled(payload, '', {}));
      expect(nextState.historicalTrends).toEqual(mockHistoricalTrends);
      expect(nextState.loading.trends).toBeFalsy();
    });

    it('should handle fetchHistoricalTrends.rejected', () => {
      const error = new Error('Server error');
      const nextState = analyticsReducer(state, fetchHistoricalTrends.rejected(error, '', {}));
      expect(nextState.loading.trends).toBeFalsy();
      expect(nextState.error.message).toBe('Server error');
    });
  });

  describe('Report Generation', () => {
    it('should handle generateAnalyticsReport.pending', () => {
      const nextState = analyticsReducer(state, generateAnalyticsReport.pending);
      expect(nextState.loading.report).toBeTruthy();
      expect(nextState.error).toEqual(initialState.error);
    });

    it('should handle generateAnalyticsReport.fulfilled', () => {
      const nextState = analyticsReducer(state, generateAnalyticsReport.fulfilled(mockReport, '', {}));
      expect(nextState.report).toEqual(mockReport);
      expect(nextState.loading.report).toBeFalsy();
    });

    it('should handle generateAnalyticsReport.rejected', () => {
      const error = new Error('Report generation failed');
      const nextState = analyticsReducer(state, generateAnalyticsReport.rejected(error, '', {}));
      expect(nextState.loading.report).toBeFalsy();
      expect(nextState.error.message).toBe('Report generation failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors correctly', () => {
      const error = { name: 'AxiosError', message: 'Network Error' };
      const nextState = analyticsReducer(state, fetchMetrics.rejected(error, '', {}));
      expect(nextState.error.type).toBe('network');
      expect(nextState.error.message).toBe('Network Error');
    });

    it('should handle validation errors correctly', () => {
      const error = { name: 'ValidationError', message: 'Invalid data' };
      const nextState = analyticsReducer(state, fetchGapAnalysis.rejected(error, '', {}));
      expect(nextState.error.type).toBe('unknown');
      expect(nextState.error.message).toBe('Invalid data');
    });

    it('should clear error state when new request starts', () => {
      state.error = {
        code: 'ERROR',
        message: 'Previous error',
        timestamp: new Date().toISOString(),
        type: 'network'
      };
      const nextState = analyticsReducer(state, fetchMetrics.pending);
      expect(nextState.error).toEqual(initialState.error);
    });
  });

  describe('Loading State Management', () => {
    it('should handle multiple concurrent loading states', () => {
      let nextState = analyticsReducer(state, fetchMetrics.pending);
      nextState = analyticsReducer(nextState, fetchGapAnalysis.pending);
      
      expect(nextState.loading.metrics).toBeTruthy();
      expect(nextState.loading.gaps).toBeTruthy();
      expect(nextState.loading.trends).toBeFalsy();
      expect(nextState.loading.report).toBeFalsy();
    });

    it('should maintain independent loading states', () => {
      let nextState = analyticsReducer(state, fetchMetrics.pending);
      nextState = analyticsReducer(nextState, fetchMetrics.fulfilled({ metrics: mockMetrics }, '', {}));
      nextState = analyticsReducer(nextState, fetchGapAnalysis.pending);
      
      expect(nextState.loading.metrics).toBeFalsy();
      expect(nextState.loading.gaps).toBeTruthy();
    });
  });
});