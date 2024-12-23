/**
 * Root Saga Implementation for GameDay Platform
 * Combines and coordinates all feature-specific sagas with enhanced error handling,
 * telemetry, and resource management.
 * @version 1.0.0
 */

import { 
  all, 
  fork, 
  call, 
  spawn, 
  cancelled, 
  setContext, 
  getContext 
} from 'redux-saga/effects'; // ^1.2.0
import { Channel } from 'redux-saga'; // ^1.2.0

// Import feature-specific sagas
import watchAuthActions from './auth.saga';
import watchExerciseSagas from './exercise.saga';
import watchAnalyticsSagas from './analytics.saga';
import notificationSaga from './notification.saga';

// Constants for error handling and monitoring
const SAGA_ERROR_THRESHOLD = 3;
const SAGA_MONITORING_INTERVAL = 5000;

/**
 * Higher-order function that wraps feature sagas with error handling and telemetry
 * @param saga - Feature saga to wrap
 * @param sagaName - Name of the saga for monitoring
 */
function createSagaErrorBoundary(saga: any, sagaName: string) {
  return function* boundSaga() {
    let errorCount = 0;
    
    while (errorCount < SAGA_ERROR_THRESHOLD) {
      try {
        // Initialize saga monitoring
        const monitoringChannel: Channel<any> = yield getContext('monitoringChannel');
        
        // Track saga execution start
        yield call([monitoringChannel, 'put'], {
          type: 'SAGA_STARTED',
          saga: sagaName,
          timestamp: Date.now()
        });

        // Execute saga with error protection
        yield call(saga);
        
        // Reset error count on successful execution
        errorCount = 0;

        // Track saga completion
        yield call([monitoringChannel, 'put'], {
          type: 'SAGA_COMPLETED',
          saga: sagaName,
          timestamp: Date.now()
        });

        break;
      } catch (error) {
        errorCount++;
        
        // Track saga error
        const monitoringChannel: Channel<any> = yield getContext('monitoringChannel');
        yield call([monitoringChannel, 'put'], {
          type: 'SAGA_ERROR',
          saga: sagaName,
          error,
          errorCount,
          timestamp: Date.now()
        });

        if (errorCount >= SAGA_ERROR_THRESHOLD) {
          console.error(`Saga ${sagaName} exceeded error threshold:`, error);
          throw error;
        }

        // Implement exponential backoff
        yield call(delay, Math.min(1000 * Math.pow(2, errorCount), 30000));
      } finally {
        if (yield cancelled()) {
          const monitoringChannel: Channel<any> = yield getContext('monitoringChannel');
          yield call([monitoringChannel, 'put'], {
            type: 'SAGA_CANCELLED',
            saga: sagaName,
            timestamp: Date.now()
          });
        }
      }
    }
  };
}

/**
 * Root saga that combines all feature sagas with error handling and monitoring
 */
export function* rootSaga() {
  try {
    // Initialize monitoring channel
    const monitoringChannel = yield call(Channel);
    yield setContext({ monitoringChannel });

    // Setup monitoring
    yield spawn(function* sagaMonitor() {
      while (true) {
        const event = yield call([monitoringChannel, 'take']);
        console.debug('Saga Monitor:', event);
        yield call(delay, SAGA_MONITORING_INTERVAL);
      }
    });

    // Combine all feature sagas with error boundaries
    yield all([
      // Authentication sagas
      fork(createSagaErrorBoundary(
        watchAuthActions,
        'authentication'
      )),

      // Exercise management sagas
      fork(createSagaErrorBoundary(
        watchExerciseSagas,
        'exercise'
      )),

      // Analytics sagas
      fork(createSagaErrorBoundary(
        watchAnalyticsSagas,
        'analytics'
      )),

      // Notification sagas
      fork(createSagaErrorBoundary(
        notificationSaga,
        'notification'
      ))
    ]);
  } catch (error) {
    // Handle critical errors that bypass individual error boundaries
    console.error('Critical saga error:', error);
    
    // Attempt to log critical error through monitoring channel
    try {
      const monitoringChannel: Channel<any> = yield getContext('monitoringChannel');
      yield call([monitoringChannel, 'put'], {
        type: 'CRITICAL_SAGA_ERROR',
        error,
        timestamp: Date.now()
      });
    } catch (monitoringError) {
      console.error('Failed to log critical error:', monitoringError);
    }

    throw error;
  }
}

// Helper function for delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default rootSaga;