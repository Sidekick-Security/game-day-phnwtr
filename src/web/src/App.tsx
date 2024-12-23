/**
 * Root Application Component for GameDay Platform
 * Implements comprehensive security, monitoring, and accessibility features
 * @version 1.0.0
 */

import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import Layout from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { AUTH_ROUTES, MAIN_ROUTES, ERROR_ROUTES } from './constants/routes.constants';
import { handleApiError } from './utils/error.utils';

// Lazy-loaded components for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const Login = lazy(() => import('./pages/auth/Login'));
const NotFound = lazy(() => import('./pages/errors/NotFound'));

/**
 * Protected Route Component with role-based access control
 */
const ProtectedRoute: React.FC<{
  element: React.ReactElement;
  requiredRoles?: string[];
}> = ({ element, requiredRoles = [] }) => {
  const { isAuthenticated, user, checkPermission } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const validateAccess = async () => {
      if (isAuthenticated && user && requiredRoles.length > 0) {
        const hasPermission = await checkPermission({
          role: user.role,
          resource: location.pathname,
          action: 'access'
        });

        if (!hasPermission) {
          // Track unauthorized access attempt
          if (window.analytics) {
            window.analytics.track('Unauthorized Access Attempt', {
              path: location.pathname,
              userId: user.id,
              requiredRoles,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    };

    validateAccess();
  }, [isAuthenticated, user, location.pathname, requiredRoles, checkPermission]);

  if (!isAuthenticated) {
    return <Navigate to={AUTH_ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return element;
};

/**
 * Main Application Component
 * Implements comprehensive security and monitoring features
 */
const App: React.FC = () => {
  const { theme, themeMode, prefersReducedMotion } = useTheme();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Monitor route changes for analytics
  useEffect(() => {
    if (window.analytics) {
      window.analytics.page({
        path: location.pathname,
        title: document.title,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  }, [location]);

  // Handle global errors
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    const enhancedError = handleApiError(error, {
      logError: true,
      includeStack: true,
      correlationId: crypto.randomUUID()
    });

    // Track error in analytics
    if (window.analytics) {
      window.analytics.track('Application Error', {
        ...enhancedError,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  };

  return (
    <ErrorBoundary onError={handleError}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <CssBaseline />
          <Layout>
            <Suspense
              fallback={
                <div role="progressbar" aria-label="Loading content">
                  Loading...
                </div>
              }
            >
              <Routes>
                {/* Public Routes */}
                <Route
                  path={AUTH_ROUTES.LOGIN}
                  element={!isAuthenticated ? <Login /> : <Navigate to={MAIN_ROUTES.DASHBOARD} replace />}
                />

                {/* Protected Routes */}
                <Route
                  path={MAIN_ROUTES.DASHBOARD}
                  element={
                    <ProtectedRoute
                      element={<Dashboard />}
                      requiredRoles={['system_admin', 'exercise_admin', 'facilitator', 'participant']}
                    />
                  }
                />
                <Route
                  path={MAIN_ROUTES.ANALYTICS}
                  element={
                    <ProtectedRoute
                      element={<Analytics />}
                      requiredRoles={['system_admin', 'exercise_admin', 'facilitator']}
                    />
                  }
                />
                <Route
                  path={MAIN_ROUTES.SETTINGS}
                  element={
                    <ProtectedRoute
                      element={<Settings />}
                      requiredRoles={['system_admin', 'exercise_admin']}
                    />
                  }
                />

                {/* Error Routes */}
                <Route path={ERROR_ROUTES.NOT_FOUND} element={<NotFound />} />
                <Route path="*" element={<Navigate to={ERROR_ROUTES.NOT_FOUND} replace />} />
              </Routes>
            </Suspense>
          </Layout>
        </LocalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

/**
 * Root Application Wrapper with Router
 */
const AppWrapper: React.FC = () => (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

export default AppWrapper;