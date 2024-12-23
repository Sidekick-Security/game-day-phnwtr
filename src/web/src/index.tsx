/**
 * Entry point for the GameDay Platform web application
 * Implements comprehensive initialization with security, monitoring, and accessibility features
 * @version 1.0.0
 */

import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import * as Sentry from '@sentry/react';

import App from './App';
import { store } from './store/store';
import { defaultTheme } from './assets/styles/theme';
import { ErrorCode } from './constants/error.constants';
import { handleApiError } from './utils/error.utils';

// Constants for performance monitoring
const PERFORMANCE_MARKS = {
  INITIAL_LOAD: 'initial_load',
  FIRST_CONTENTFUL_PAINT: 'first_contentful_paint',
  TIME_TO_INTERACTIVE: 'time_to_interactive'
};

/**
 * Initialize performance monitoring and error tracking services
 */
const initializeMonitoring = (): void => {
  // Initialize Sentry for error tracking
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.REACT_APP_SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
      integrations: [
        new Sentry.BrowserTracing({
          tracingOrigins: [window.location.origin],
        }),
      ],
    });
  }

  // Set initial performance mark
  if (window.performance && window.performance.mark) {
    window.performance.mark(PERFORMANCE_MARKS.INITIAL_LOAD);
  }

  // Initialize analytics if available
  if (window.analytics) {
    window.analytics.page({
      title: document.title,
      url: window.location.href,
      path: window.location.pathname,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Validate required environment variables and configurations
 */
const validateEnvironment = (): boolean => {
  const requiredVars = [
    'REACT_APP_API_ENDPOINT',
    'REACT_APP_AUTH_DOMAIN',
    'REACT_APP_VERSION'
  ];

  const missingVars = requiredVars.filter(
    varName => !process.env[varName]
  );

  if (missingVars.length > 0) {
    const error = new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    handleApiError(error, {
      logError: true,
      includeStack: true,
      correlationId: crypto.randomUUID()
    });
    return false;
  }

  return true;
};

/**
 * Initialize and render the React application with all required providers
 */
const renderApp = (): void => {
  // Get root element with null check
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  // Add accessibility attributes to root element
  rootElement.setAttribute('role', 'application');
  rootElement.setAttribute('aria-label', 'GameDay Platform');

  // Create root using React 18 createRoot API
  const root = createRoot(rootElement);

  // Initialize monitoring
  initializeMonitoring();

  // Render app with error boundary and providers
  root.render(
    <StrictMode>
      <Sentry.ErrorBoundary
        fallback={({ error }) => (
          <div role="alert" aria-live="assertive">
            <h1>An error has occurred</h1>
            <p>{error.message}</p>
          </div>
        )}
        beforeCapture={(scope) => {
          scope.setTag('location', window.location.href);
          scope.setTag('version', process.env.REACT_APP_VERSION || 'unknown');
        }}
      >
        <Provider store={store}>
          <App />
        </Provider>
      </Sentry.ErrorBoundary>
    </StrictMode>
  );

  // Record performance metrics
  if (window.performance && window.performance.measure) {
    window.performance.measure(
      PERFORMANCE_MARKS.TIME_TO_INTERACTIVE,
      PERFORMANCE_MARKS.INITIAL_LOAD
    );
  }
};

// Initialize application with error handling
try {
  if (validateEnvironment()) {
    renderApp();
  }
} catch (error) {
  handleApiError(error, {
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    logError: true,
    includeStack: true
  });
  
  // Render minimal error UI
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
      <div role="alert" aria-live="assertive">
        <h1>Unable to start application</h1>
        <p>Please try refreshing the page or contact support if the problem persists.</p>
      </div>
    );
  }
}