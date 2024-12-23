/**
 * MongoDB Database Configuration for Notification Service
 * Implements enterprise-grade database configuration with enhanced security,
 * high availability, and performance optimizations
 * @version 1.0.0
 * @package @gameday/notification-service
 */

import { config } from 'dotenv'; // v16.0.0
import { IDatabaseConfig } from '../../shared/interfaces/config.interface';
import { Environment } from '../../shared/types/config.types';

// Load environment variables if not already loaded
if (!process.env.NODE_ENV) {
  config();
}

/**
 * Retrieves environment-specific MongoDB configuration with enhanced security
 * and performance optimizations
 * @returns {IDatabaseConfig} Configured database settings
 * @throws {Error} If required environment variables are missing
 */
const getDatabaseConfig = (): IDatabaseConfig => {
  // Validate required environment variables
  const requiredEnvVars = [
    'MONGODB_HOST',
    'MONGODB_PORT',
    'MONGODB_DATABASE',
    'MONGODB_USER',
    'MONGODB_PASSWORD',
    'MONGODB_REPLICA_SET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  const environment = process.env.NODE_ENV as Environment;
  const isProd = environment === Environment.PRODUCTION;

  // Base configuration
  const baseConfig: IDatabaseConfig = {
    host: process.env.MONGODB_HOST!,
    port: parseInt(process.env.MONGODB_PORT!, 10),
    name: process.env.MONGODB_DATABASE!,
    username: process.env.MONGODB_USER!,
    password: process.env.MONGODB_PASSWORD!,
    replicaSet: process.env.MONGODB_REPLICA_SET!,
    authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
    ssl: isProd,
    retryWrites: true,
    poolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10),
    options: {
      // Connection options
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '50', 10),
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
      maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '60000', 10),
      
      // Write concern options
      w: isProd ? 'majority' : 1,
      wtimeoutMS: parseInt(process.env.MONGODB_WRITE_TIMEOUT || '5000', 10),
      journal: isProd,

      // Read concern options
      readPreference: isProd ? 'primaryPreferred' : 'primary',
      readConcern: isProd ? 'majority' : 'local',

      // Connection timeout options
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT || '20000', 10),
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '30000', 10),

      // Heartbeat options
      heartbeatFrequencyMS: parseInt(process.env.MONGODB_HEARTBEAT_FREQUENCY || '10000', 10),

      // Monitoring options
      monitorCommands: isProd,
      
      // Security options
      ssl: isProd,
      sslValidate: isProd,
      sslCA: process.env.MONGODB_SSL_CA,
      authMechanism: isProd ? 'SCRAM-SHA-256' : 'SCRAM-SHA-1',
      
      // Compression options
      compressors: isProd ? ['snappy', 'zlib'] : undefined,
      
      // Application name for monitoring
      appName: 'gameday-notification-service',
    }
  };

  // Environment-specific configurations
  if (isProd) {
    // Production-specific enhancements
    baseConfig.options = {
      ...baseConfig.options,
      autoEncryption: {
        keyVaultNamespace: 'encryption.__keyVault',
        kmsProviders: {
          aws: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        }
      },
      retryReads: true,
      directConnection: false,
      loadBalanced: true
    };
  } else {
    // Development-specific settings
    baseConfig.options = {
      ...baseConfig.options,
      directConnection: true,
      retryReads: false
    };
  }

  return baseConfig;
};

/**
 * Exported database configuration with environment-specific optimizations
 * @type {IDatabaseConfig}
 */
export const databaseConfig = getDatabaseConfig();