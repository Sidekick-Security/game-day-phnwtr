/**
 * Redis configuration module for Exercise Service
 * Provides advanced Redis client configuration with clustering, sentinel support,
 * and robust error handling for managing exercise state and real-time updates
 * @version 1.0.0
 * @package @gameday/exercise-service
 */

import Redis from 'ioredis'; // v5.3.0
import { IRedisConfig } from '../../shared/interfaces/config.interface';
import { Environment } from '../../shared/types/config.types';

/**
 * Environment-specific Redis configuration
 * Includes clustering and sentinel settings for high availability
 */
export const redisConfig: IRedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || '',
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
  cluster: process.env.REDIS_CLUSTER_ENABLED === 'true',
  sentinels: [],
  maxRetries: 3,
  connectTimeout: 10000
};

/**
 * Creates and configures a Redis client with advanced features
 * @param config - Redis configuration options
 * @returns Configured Redis client instance
 */
export const createRedisClient = (config: IRedisConfig): Redis => {
  const env = process.env.NODE_ENV as Environment;
  
  // Base client options
  const clientOptions: Redis.RedisOptions = {
    host: config.host,
    port: config.port,
    password: config.password,
    retryStrategy: (times: number) => {
      if (times > config.maxRetries) {
        return null; // Stop retrying
      }
      return Math.min(times * 200, 2000); // Exponential backoff
    },
    connectTimeout: config.connectTimeout,
    enableReadyCheck: true,
    enableOfflineQueue: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true
  };

  let client: Redis;

  // Configure clustering for staging and production
  if (config.cluster && (env === Environment.STAGING || env === Environment.PRODUCTION)) {
    const clusterNodes = process.env.REDIS_CLUSTER_NODES?.split(',') || [];
    client = new Redis.Cluster(
      clusterNodes.map(node => {
        const [host, port] = node.split(':');
        return { host, port: parseInt(port, 10) };
      }),
      {
        redisOptions: clientOptions,
        clusterRetryStrategy: (times: number) => {
          if (times > config.maxRetries) {
            return null;
          }
          return Math.min(times * 500, 5000);
        },
        scaleReads: 'slave', // Read from replicas for better performance
        maxRedirections: 16,
        natMap: process.env.REDIS_NAT_MAP ? 
          JSON.parse(process.env.REDIS_NAT_MAP) : undefined
      }
    );
  } 
  // Configure sentinel for high availability
  else if (config.sentinels.length > 0 && env === Environment.PRODUCTION) {
    client = new Redis({
      ...clientOptions,
      sentinels: config.sentinels,
      name: 'mymaster', // Sentinel master name
      sentinelRetryStrategy: (times: number) => {
        if (times > config.maxRetries) {
          return null;
        }
        return Math.min(times * 300, 3000);
      },
      failoverDetector: true
    });
  } 
  // Standard Redis client for development or simple configurations
  else {
    client = new Redis(clientOptions);
  }

  // Configure event handlers
  client.on('connect', () => {
    console.info('Redis client connected successfully');
  });

  client.on('error', (error: Error) => {
    console.error('Redis client error:', error);
  });

  client.on('close', () => {
    console.warn('Redis client connection closed');
  });

  client.on('reconnecting', (delay: number) => {
    console.info(`Redis client reconnecting in ${delay}ms`);
  });

  // Production-specific monitoring
  if (env === Environment.PRODUCTION) {
    client.on('node error', (error: Error, node: { host: string; port: number }) => {
      console.error(`Redis node ${node.host}:${node.port} error:`, error);
    });

    client.on('ready', () => {
      // Initialize health monitoring
      setInterval(async () => {
        try {
          await client.ping();
        } catch (error) {
          console.error('Redis health check failed:', error);
        }
      }, 30000); // Check every 30 seconds
    });
  }

  // Configure client-side caching if available
  if (env === Environment.PRODUCTION && !config.cluster) {
    client.on('ready', () => {
      client.client('TRACKING', 'ON', 'REDIRECT', client.options.port)
        .catch(error => console.warn('Client tracking setup failed:', error));
    });
  }

  return client;
};

/**
 * Environment-specific Redis configuration factory
 * @returns Environment-specific Redis configuration
 */
export const getRedisConfig = (): IRedisConfig => {
  const env = process.env.NODE_ENV as Environment;
  
  switch (env) {
    case Environment.PRODUCTION:
      return {
        ...redisConfig,
        cluster: true,
        sentinels: [
          { host: 'sentinel-1', port: 26379 },
          { host: 'sentinel-2', port: 26379 },
          { host: 'sentinel-3', port: 26379 }
        ],
        maxRetries: 5,
        connectTimeout: 15000
      };
    
    case Environment.STAGING:
      return {
        ...redisConfig,
        cluster: true,
        sentinels: [
          { host: 'sentinel-1', port: 26379 },
          { host: 'sentinel-2', port: 26379 }
        ],
        maxRetries: 4,
        connectTimeout: 12000
      };
    
    default:
      return redisConfig;
  }
};

export default {
  redisConfig,
  createRedisClient,
  getRedisConfig
};