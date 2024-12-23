/**
 * Queue Configuration for Notification Service
 * Configures Bull queue settings with Redis backend for reliable notification delivery
 * @version 1.0.0
 * @package @gameday/notification-service
 */

import { Queue } from 'bull'; // ^4.10.0
import { config } from 'dotenv'; // ^16.0.0
import { Environment } from '../../shared/types/config.types';

// Load environment variables if not already loaded
if (!process.env.NODE_ENV) {
  config();
}

/**
 * Enhanced interface for queue configuration with advanced features
 * Includes support for clustering, TLS, and advanced job management
 */
export interface IQueueConfig {
  /** Redis host address */
  host: string;
  /** Redis port number */
  port: number;
  /** Redis password */
  password: string;
  /** Default number of job retry attempts */
  defaultJobRetries: number;
  /** Default job timeout in milliseconds */
  defaultJobTimeout: number;
  /** Enable exponential backoff for retries */
  retryBackoff: boolean;
  /** Remove completed jobs flag */
  removeOnComplete: boolean;
  /** Queue name prefix for isolation */
  prefix: string;
  /** Rate limiter configuration */
  limiter: {
    /** Maximum number of jobs processed */
    max: number;
    /** Duration window in milliseconds */
    duration: number;
  };
  /** Redis connection configuration */
  redis: {
    /** Enable TLS for secure connections */
    enableTLS: boolean;
    /** Enable Redis cluster mode */
    enableCluster: boolean;
    /** Redis sentinel configuration */
    sentinels?: Array<{ host: string; port: number }>;
  };
  /** Additional Bull queue options */
  options: Record<string, any>;
}

/**
 * Retrieves enhanced Bull queue configuration based on environment
 * Implements production-ready settings for security, reliability, and monitoring
 * @returns {IQueueConfig} Enhanced queue configuration object
 */
const getQueueConfig = (): IQueueConfig => {
  const environment = process.env.NODE_ENV as Environment;
  const isProduction = environment === Environment.PRODUCTION;

  // Base configuration with secure defaults
  const config: IQueueConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
    defaultJobRetries: 3,
    defaultJobTimeout: 5000, // 5 seconds
    retryBackoff: true,
    removeOnComplete: true,
    prefix: 'gameday:notification:',
    limiter: {
      max: 1000, // Maximum 1000 jobs
      duration: 60000, // Per minute
    },
    redis: {
      enableTLS: isProduction,
      enableCluster: isProduction,
      sentinels: isProduction ? [
        {
          host: process.env.REDIS_SENTINEL_HOST_1 || '',
          port: parseInt(process.env.REDIS_SENTINEL_PORT_1 || '26379', 10),
        },
        {
          host: process.env.REDIS_SENTINEL_HOST_2 || '',
          port: parseInt(process.env.REDIS_SENTINEL_PORT_2 || '26379', 10),
        },
        {
          host: process.env.REDIS_SENTINEL_HOST_3 || '',
          port: parseInt(process.env.REDIS_SENTINEL_PORT_3 || '26379', 10),
        },
      ] : undefined,
    },
    options: {
      // Advanced Bull queue options
      settings: {
        stalledInterval: 30000, // Check for stalled jobs every 30 seconds
        maxStalledCount: 2, // Maximum number of times a job can be marked as stalled
        lockDuration: 30000, // Lock duration for jobs
      },
      // Redis connection options
      redis: {
        connectTimeout: 10000, // Connection timeout
        keepAlive: 5000, // Keep-alive interval
        family: 4, // IP version (4/6)
        maxRetriesPerRequest: 3, // Maximum retries per request
        enableReadyCheck: true, // Enable ready check
        autoResendUnfulfilledCommands: true, // Auto-resend unfulfilled commands
      },
      // Metrics and monitoring
      metrics: {
        collectMetrics: true, // Enable metrics collection
        metricPrefix: 'bull_notification_', // Metrics prefix
      },
      // Job management
      defaultJobOptions: {
        attempts: 3, // Default retry attempts
        backoff: {
          type: 'exponential', // Exponential backoff
          delay: 1000, // Initial delay
        },
        removeOnComplete: {
          age: 24 * 3600, // Remove completed jobs after 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Remove failed jobs after 7 days
        },
      },
    },
  };

  return config;
};

// Export the queue configuration
export const queueConfig = getQueueConfig();