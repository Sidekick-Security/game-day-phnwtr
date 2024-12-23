/**
 * @fileoverview React Error Boundary component for the GameDay Platform
 * @version 1.0.0
 * 
 * Provides comprehensive error handling for React components with support for
 * accessibility, error tracking, and development tools integration.
 */

import React, { Component, ErrorInfo } from 'react'; // v18.2.0
import { formatErrorMessage } from '../../utils/error.utils';
import { ErrorCode } from '../../constants/error.constants';

/**
 * Props interface for ErrorBoundary component
 */
interface ErrorBoundaryProps {
  /** Optional custom fallback UI component */
  fallback?: React.ReactNode;
  /** Optional error callback for external error handling */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * State interface for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component that catches JavaScript errors in child components
 * and displays a fallback UI with enhanced error handling capabilities.
 */
class ErrorBoundary extends Component<React.PropsWithChildren<ErrorBoundaryProps>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<ErrorBoundaryProps>) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };

    // Bind methods
    this.handleRetry = this.handleRetry.bind(this);
  }

  /**
   * Static method to derive error state from caught errors
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state to trigger fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  /**
   * Lifecycle method called after an error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Format error message with i18n support
    const formattedMessage = formatErrorMessage(
      ErrorCode.INTERNAL_SERVER_ERROR,
      error.message,
      { locale: navigator.language }
    );

    // Update component state
    this.setState({
      error: new Error(formattedMessage),
      errorInfo
    });

    // Call external error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error caught by ErrorBoundary:', {
        error,
        errorInfo,
        componentStack: errorInfo.componentStack
      });
    }
  }

  /**
   * Handles retry attempts when errors occur
   */
  handleRetry(): void {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  /**
   * Renders either the error UI or the child components
   */
  render(): React.ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided, otherwise show default error UI
      return fallback || (
        <div
          role="alert"
          aria-live="polite"
          className="error-boundary"
          data-testid="error-boundary"
        >
          <div className="error-boundary__content">
            <h2 className="error-boundary__title">
              Something went wrong
            </h2>
            <p className="error-boundary__message">
              {error?.message || 'An unexpected error occurred'}
            </p>
            
            {/* Show retry button */}
            <button
              onClick={this.handleRetry}
              className="error-boundary__retry-button"
              aria-label="Retry loading the component"
            >
              Try Again
            </button>

            {/* Show detailed error info in development */}
            {process.env.NODE_ENV !== 'production' && errorInfo && (
              <details className="error-boundary__details">
                <summary>Error Details</summary>
                <pre>
                  {error?.toString()}
                  {'\n'}
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    // If no error occurred, render children normally
    return children;
  }
}

export default ErrorBoundary;