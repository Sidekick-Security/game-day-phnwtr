/**
 * API Configuration for GameDay Platform
 * Centralizes API settings with comprehensive security, monitoring, and retry policies
 * @version 1.0.0
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'; // ^1.6.0
import {
  API_VERSION,
  API_TIMEOUT,
  API_ENDPOINTS
} from '../constants/api.constants';

/**
 * Environment-specific configuration interface
 */
interface ApiEnvironmentConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

/**
 * Security configuration interface
 */
interface SecurityConfig {
  headers: {
    'Content-Security-Policy': string;
    'X-Content-Type-Options': string;
    'X-Frame-Options': string;
    'X-XSS-Protection': string;
    'Strict-Transport-Security': string;
  };
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    maxAge: number;
  };
}

/**
 * Monitoring configuration interface
 */
interface MonitoringConfig {
  enableMetrics: boolean;
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  metricsEndpoint: string;
}

/**
 * Retrieves environment-specific configuration
 */
const getEnvironmentConfig = (): ApiEnvironmentConfig => ({
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3000',
  timeout: Number(process.env.VITE_API_TIMEOUT) || API_TIMEOUT,
  retryAttempts: Number(process.env.VITE_API_RETRY_ATTEMPTS) || 3,
  retryDelay: Number(process.env.VITE_API_RETRY_DELAY) || 1000,
});

/**
 * Configures security headers and policies
 */
const getSecurityConfig = (): SecurityConfig => ({
  headers: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  },
  cors: {
    allowedOrigins: [process.env.VITE_APP_URL || 'http://localhost:3000'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  },
});

/**
 * Configures monitoring and logging settings
 */
const getMonitoringConfig = (): MonitoringConfig => ({
  enableMetrics: true,
  enableLogging: true,
  logLevel: 'info',
  metricsEndpoint: '/metrics',
});

/**
 * Creates and configures Axios instance with interceptors
 */
const createAxiosInstance = (): AxiosInstance => {
  const envConfig = getEnvironmentConfig();
  const instance = axios.create({
    baseURL: `${envConfig.baseURL}/api/${API_VERSION}`,
    timeout: envConfig.timeout,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor for authentication and monitoring
  instance.interceptors.request.use(
    (config) => {
      // Add auth token if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Add request timestamp for monitoring
      config.metadata = { startTime: new Date() };
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling and monitoring
  instance.interceptors.response.use(
    (response) => {
      // Calculate request duration
      const duration = new Date().getTime() - response.config.metadata.startTime.getTime();
      // Log request metrics
      console.info(`API Call to ${response.config.url} completed in ${duration}ms`);
      return response;
    },
    async (error) => {
      const { config, response } = error;
      
      // Implement retry logic for specific error codes
      if (response && response.status >= 500 && config.retryCount < envConfig.retryAttempts) {
        config.retryCount = (config.retryCount || 0) + 1;
        await new Promise(resolve => setTimeout(resolve, envConfig.retryDelay));
        return instance(config);
      }
      
      return Promise.reject(error);
    }
  );

  return instance;
};

/**
 * Main API configuration object
 */
export const apiConfig = {
  version: API_VERSION,
  endpoints: API_ENDPOINTS,
  axiosInstance: createAxiosInstance(),
  security: getSecurityConfig(),
  monitoring: getMonitoringConfig(),
  
  // Retry configuration
  retryConfig: {
    maxAttempts: getEnvironmentConfig().retryAttempts,
    delayMs: getEnvironmentConfig().retryDelay,
    retryableStatuses: [408, 500, 502, 503, 504],
  },

  // Circuit breaker configuration
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    monitorIntervalMs: 10000,
  },

  // Rate limiting configuration
  rateLimit: {
    maxRequests: 100,
    perWindowMs: 60000,
    errorMessage: 'Too many requests, please try again later.',
  },

  // Cache configuration
  cache: {
    ttl: 300000, // 5 minutes
    maxSize: 100, // Maximum number of cached responses
    excludedEndpoints: ['/api/v1/exercises/create', '/api/v1/scenarios/generate'],
  },
};

/**
 * Export type definitions for type safety
 */
export type ApiConfig = typeof apiConfig;
export type SecurityConfiguration = typeof apiConfig.security;
export type MonitoringConfiguration = typeof apiConfig.monitoring;