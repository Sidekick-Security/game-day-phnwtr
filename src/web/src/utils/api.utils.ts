/**
 * API Utilities for GameDay Platform
 * Provides enterprise-grade HTTP request handling with comprehensive security,
 * monitoring, and resilience features.
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'; // ^1.6.0
import CircuitBreaker from 'opossum'; // ^6.0.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

import { 
  API_VERSION, 
  API_TIMEOUT,
  API_ENDPOINTS 
} from '../constants/api.constants';

import { 
  apiConfig 
} from '../config/api.config';

// Types for enhanced error handling
interface ApiError extends Error {
  code: string;
  status: number;
  correlationId: string;
  timestamp: string;
  details?: any;
}

interface RequestMetadata {
  startTime: number;
  correlationId: string;
  retryCount: number;
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: apiConfig.circuitBreaker.resetTimeoutMs,
  errorThresholdPercentage: 50,
  resetTimeout: apiConfig.circuitBreaker.resetTimeoutMs,
};

// Rate limiting configuration
const RATE_LIMITER = {
  maxRequests: apiConfig.rateLimit.maxRequests,
  windowMs: apiConfig.rateLimit.perWindowMs,
  currentRequests: new Map<string, number>(),
};

/**
 * Creates and configures the main API client with comprehensive enterprise features
 */
export const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: `${apiConfig.axiosInstance.defaults.baseURL}`,
    timeout: API_TIMEOUT,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-API-Version': API_VERSION,
    },
  });

  // Request interceptor for authentication and correlation
  client.interceptors.request.use(
    (config) => {
      const correlationId = uuidv4();
      const metadata: RequestMetadata = {
        startTime: Date.now(),
        correlationId,
        retryCount: 0,
      };

      config.headers['X-Correlation-ID'] = correlationId;
      config.headers['X-Request-ID'] = uuidv4();
      
      // Apply security headers
      Object.assign(config.headers, apiConfig.security.headers);

      // Add auth token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Store metadata for monitoring
      config.metadata = metadata;

      // Apply rate limiting
      if (!checkRateLimit(config.url || '')) {
        return Promise.reject(new Error(apiConfig.rateLimit.errorMessage));
      }

      return config;
    },
    (error) => Promise.reject(handleApiError(error))
  );

  // Response interceptor for error handling and monitoring
  client.interceptors.response.use(
    (response) => {
      const duration = Date.now() - (response.config.metadata?.startTime || 0);
      logApiMetrics(response.config.url || '', duration, response.status);
      return response;
    },
    async (error) => {
      const enhancedError = handleApiError(error);
      
      // Implement retry logic for specific errors
      if (shouldRetry(error) && error.config.metadata.retryCount < apiConfig.retryConfig.maxAttempts) {
        error.config.metadata.retryCount++;
        const delay = calculateRetryDelay(error.config.metadata.retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        return client(error.config);
      }

      return Promise.reject(enhancedError);
    }
  );

  return client;
};

/**
 * Creates an API request with circuit breaker pattern and comprehensive error handling
 */
export const createApiRequest = async <T>(
  config: AxiosRequestConfig
): Promise<T> => {
  const breaker = new CircuitBreaker(
    async () => {
      const response = await apiClient(config);
      return response.data;
    },
    CIRCUIT_BREAKER_OPTIONS
  );

  breaker.on('success', () => {
    logApiMetrics(config.url || '', Date.now() - (config.metadata?.startTime || 0), 200);
  });

  breaker.on('failure', (error) => {
    logApiMetrics(config.url || '', Date.now() - (config.metadata?.startTime || 0), error.status || 500);
  });

  try {
    return await breaker.fire();
  } catch (error) {
    throw handleApiError(error);
  }
};

/**
 * Enhanced error handling with detailed categorization and logging
 */
export const handleApiError = (error: any): ApiError => {
  const correlationId = error.config?.headers?.['X-Correlation-ID'] || uuidv4();
  const timestamp = new Date().toISOString();

  let apiError: ApiError = {
    name: 'ApiError',
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    status: 500,
    correlationId,
    timestamp,
    stack: error.stack,
  };

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    apiError = {
      ...apiError,
      message: axiosError.response?.data?.message || axiosError.message,
      code: axiosError.response?.data?.code || 'API_ERROR',
      status: axiosError.response?.status || 500,
      details: axiosError.response?.data,
    };

    // Log error with appropriate severity
    console.error(`API Error [${correlationId}]:`, {
      url: axiosError.config?.url,
      method: axiosError.config?.method,
      status: apiError.status,
      message: apiError.message,
      timestamp,
    });
  }

  return apiError;
};

// Helper functions
const apiClient = createApiClient();

const checkRateLimit = (endpoint: string): boolean => {
  const now = Date.now();
  const requests = RATE_LIMITER.currentRequests.get(endpoint) || 0;
  
  if (requests >= RATE_LIMITER.maxRequests) {
    return false;
  }

  RATE_LIMITER.currentRequests.set(endpoint, requests + 1);
  setTimeout(() => {
    RATE_LIMITER.currentRequests.set(endpoint, requests - 1);
  }, RATE_LIMITER.windowMs);

  return true;
};

const shouldRetry = (error: AxiosError): boolean => {
  return (
    !error.response ||
    apiConfig.retryConfig.retryableStatuses.includes(error.response.status)
  );
};

const calculateRetryDelay = (retryCount: number): number => {
  return Math.min(
    apiConfig.retryConfig.delayMs * Math.pow(2, retryCount - 1),
    5000
  );
};

const logApiMetrics = (
  endpoint: string,
  duration: number,
  status: number
): void => {
  if (apiConfig.monitoring.enableMetrics) {
    console.info(`API Metrics [${endpoint}]:`, {
      duration,
      status,
      timestamp: new Date().toISOString(),
    });
  }
};

// Export configured instance and types
export type { ApiError, RequestMetadata };
export { apiClient };