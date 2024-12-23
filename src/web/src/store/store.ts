/**
 * Redux Store Configuration for GameDay Platform
 * Implements centralized state management with Redux Toolkit, Redux Saga middleware,
 * and comprehensive TypeScript support.
 * @version 1.0.0
 */

// @reduxjs/toolkit v2.0.0 - Redux store configuration utilities
import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
// redux-saga v1.2.0 - Side effect management middleware
import createSagaMiddleware from 'redux-saga';

// Import root reducer and saga
import rootReducer from './reducers/root.reducer';
import rootSaga from './sagas/root.saga';

/**
 * Saga middleware configuration with monitoring and error tracking
 */
const sagaMiddleware = createSagaMiddleware({
  onError: (error, { sagaStack }) => {
    console.error('Saga error:', error);
    console.error('Saga stack:', sagaStack);
  },
  effectMiddlewares: [
    next => effect => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Saga effect:', effect);
      }
      return next(effect);
    }
  ]
});

/**
 * Redux middleware configuration with performance optimizations
 */
const middleware = [
  ...getDefaultMiddleware({
    // Enable immutability and serialization checks in development
    immutableCheck: process.env.NODE_ENV === 'development',
    serializableCheck: {
      ignoredActions: [
        // Add actions that contain non-serializable data
        'exercise/createWithAI',
        'analytics/generateReport'
      ],
      ignoredPaths: ['notifications.webSocket']
    },
    // Enable thunk middleware for async actions
    thunk: true
  }),
  sagaMiddleware
];

/**
 * Redux DevTools configuration with performance considerations
 */
const devTools = {
  // Enable DevTools only in development
  enabled: process.env.NODE_ENV === 'development',
  // Limit the number of tracked actions
  maxAge: 50,
  // Enable action tracing
  trace: true,
  // Enable action timing
  traceLimit: 25
};

/**
 * Configure and create the Redux store with all middleware and enhancements
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware,
  devTools,
  // Enable hot module replacement in development
  enhancers: (defaultEnhancers) => {
    if (process.env.NODE_ENV === 'development' && module.hot) {
      module.hot.accept('./reducers/root.reducer', () => {
        const newRootReducer = require('./reducers/root.reducer').default;
        store.replaceReducer(newRootReducer);
      });
    }
    return defaultEnhancers;
  }
});

// Run root saga
sagaMiddleware.run(rootSaga);

// Export store instance and types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export store instance as default
export default store;