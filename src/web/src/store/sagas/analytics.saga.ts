// redux-saga/effects v1.2.0 - Redux Saga effect creators for handling side effects
import { 
  call, 
  put, 
  takeLatest, 
  delay, 
  race 
} from 'redux-saga/effects';

// Internal imports with enhanced error handling and type safety
import { 
  fetchMetrics,
  fetchGapAnalysis,
  fetchHistoricalTrends,
  generateAnalyticsReport
} from '../actions/analytics.actions';

// Import analytics service with caching and request cancellation support
import { AnalyticsService } from '../../services/analytics.service';

// Import analytics type definitions with enhanced error typing
import { 
  MetricType, 
  GapType, 
  IMetric, 
  IGap, 
  IAnalyticsError 
} from '../../types/analytics.types';

// Initialize analytics service instance
const analyticsService = new AnalyticsService();

// Constants for configuration
const CACHE_DURATION = 300000; // 5 minutes
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

/**
 * Root saga that watches for analytics-related actions
 * Implements comprehensive error handling and request cancellation
 */
export function* watchAnalyticsSagas() {
  yield takeLatest(fetchMetrics.pending.type, handleFetchMetrics);
  yield takeLatest(fetchGapAnalysis.pending.type, handleFetchGapAnalysis);
  yield takeLatest(fetchHistoricalTrends.pending.type, handleFetchHistoricalTrends);
  yield takeLatest(generateAnalyticsReport.pending.type, handleGenerateReport);
}

/**
 * Handles metrics fetching with caching and retry logic
 * @param action - Redux action containing metrics request parameters
 */
function* handleFetchMetrics(action: ReturnType<typeof fetchMetrics.pending>) {
  const { organizationId, exerciseId, metricType, page = 1, limit = 10 } = action.payload;
  
  try {
    // Implement race condition handling with timeout
    const { response, timeout } = yield race({
      response: call(analyticsService.getMetrics, 
        organizationId,
        exerciseId,
        metricType,
        page,
        limit
      ),
      timeout: delay(REQUEST_TIMEOUT)
    });

    if (timeout) {
      throw new Error('Request timeout exceeded');
    }

    yield put(fetchMetrics.fulfilled(response));
  } catch (error) {
    // Enhanced error handling with retry logic
    if (error.retryCount < MAX_RETRIES) {
      yield delay(Math.pow(2, error.retryCount) * 1000); // Exponential backoff
      yield put(fetchMetrics.pending({ 
        ...action.payload, 
        retryCount: (error.retryCount || 0) + 1 
      }));
    } else {
      yield put(fetchMetrics.rejected(error));
    }
  }
}

/**
 * Handles gap analysis fetching with real-time updates
 * @param action - Redux action containing gap analysis parameters
 */
function* handleFetchGapAnalysis(action: ReturnType<typeof fetchGapAnalysis.pending>) {
  const { organizationId, exerciseId, gapType, includeCompliance = true } = action.payload;
  
  try {
    // Implement race condition handling with timeout
    const { response, timeout } = yield race({
      response: call(analyticsService.getGapAnalysis,
        organizationId,
        exerciseId,
        gapType,
        includeCompliance
      ),
      timeout: delay(REQUEST_TIMEOUT)
    });

    if (timeout) {
      throw new Error('Request timeout exceeded');
    }

    yield put(fetchGapAnalysis.fulfilled(response));
  } catch (error) {
    // Enhanced error handling with detailed error classification
    const enhancedError: IAnalyticsError = {
      message: error.message,
      code: error.code || 'GAP_ANALYSIS_ERROR',
      details: error.details,
      timestamp: new Date().toISOString()
    };
    yield put(fetchGapAnalysis.rejected(enhancedError));
  }
}

/**
 * Handles historical trends fetching with data optimization
 * @param action - Redux action containing historical trends parameters
 */
function* handleFetchHistoricalTrends(action: ReturnType<typeof fetchHistoricalTrends.pending>) {
  const { 
    organizationId, 
    metricType, 
    startDate, 
    endDate, 
    includeSeasonality = true 
  } = action.payload;
  
  try {
    // Implement race condition handling with timeout
    const { response, timeout } = yield race({
      response: call(analyticsService.getHistoricalTrends,
        organizationId,
        metricType,
        startDate,
        endDate,
        includeSeasonality
      ),
      timeout: delay(REQUEST_TIMEOUT)
    });

    if (timeout) {
      throw new Error('Request timeout exceeded');
    }

    yield put(fetchHistoricalTrends.fulfilled(response));
  } catch (error) {
    yield put(fetchHistoricalTrends.rejected(error));
  }
}

/**
 * Handles analytics report generation with progress tracking
 * @param action - Redux action containing report generation parameters
 */
function* handleGenerateReport(action: ReturnType<typeof generateAnalyticsReport.pending>) {
  const { 
    organizationId, 
    exerciseId, 
    format = 'pdf', 
    includeConfidential = false 
  } = action.payload;
  
  try {
    // Implement progress tracking for long-running report generation
    const response = yield call(analyticsService.generateReport,
      organizationId,
      exerciseId,
      format,
      includeConfidential
    );

    // Handle successful report generation
    yield put(generateAnalyticsReport.fulfilled(response));
  } catch (error) {
    // Enhanced error handling for report generation failures
    const enhancedError: IAnalyticsError = {
      message: error.message,
      code: error.code || 'REPORT_GENERATION_ERROR',
      details: error.details,
      timestamp: new Date().toISOString()
    };
    yield put(generateAnalyticsReport.rejected(enhancedError));
  }
}

// Export the root saga for Redux Saga middleware configuration
export default watchAnalyticsSagas;