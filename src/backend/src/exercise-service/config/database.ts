/**
 * MongoDB database configuration for Exercise Service
 * Implements enterprise-grade connection settings with enhanced security and high availability
 * @version 1.0.0
 * @package @gameday/exercise-service
 */

import { config } from 'dotenv'; // v16.3.1
import { IDatabaseConfig } from '../../shared/interfaces/config.interface';
import { Environment } from '../../shared/types/config.types';

// Load environment variables
config();

/**
 * Default MongoDB connection options with enterprise-grade settings
 * Implements security best practices and performance optimizations
 */
const DEFAULT_DB_OPTIONS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  retryWrites: true,
  w: 'majority',
  wtimeout: 10000,
  maxPoolSize: 100,
  minPoolSize: 10,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 30000,
  serverSelectionTimeoutMS: 20000,
  heartbeatFrequencyMS: 10000,
  replicaSet: 'rs0',
  readPreference: 'primaryPreferred',
  authSource: 'admin',
  ssl: true,
  sslValidate: true,
  compressors: 'snappy,zlib'
};

/**
 * Retrieves environment-specific MongoDB configuration
 * Implements different settings based on deployment environment
 * @param env - Current deployment environment
 * @returns IDatabaseConfig - Environment-specific database configuration
 */
const getDatabaseConfig = (env: Environment): IDatabaseConfig => {
  // Validate required environment variables
  const requiredEnvVars = [
    'MONGODB_HOST',
    'MONGODB_PORT',
    'MONGODB_DATABASE',
    'MONGODB_USER',
    'MONGODB_PASSWORD'
  ];

  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });

  // Base configuration
  const baseConfig: IDatabaseConfig = {
    host: process.env.MONGODB_HOST!,
    port: parseInt(process.env.MONGODB_PORT!, 10),
    name: process.env.MONGODB_DATABASE!,
    username: process.env.MONGODB_USER!,
    password: process.env.MONGODB_PASSWORD!,
    options: { ...DEFAULT_DB_OPTIONS }
  };

  // Environment-specific configurations
  switch (env) {
    case Environment.PRODUCTION:
      return {
        ...baseConfig,
        options: {
          ...baseConfig.options,
          maxPoolSize: 200,
          minPoolSize: 20,
          readPreference: 'primaryPreferred',
          retryWrites: true,
          w: 'majority',
          // Production-specific security settings
          ssl: true,
          sslValidate: true,
          sslCA: process.env.MONGODB_CA_CERT,
          authMechanism: 'SCRAM-SHA-256',
          // High availability settings
          replicaSet: process.env.MONGODB_REPLICA_SET || 'rs0',
          readConcernLevel: 'majority',
          // Monitoring and logging
          loggerLevel: 'warn',
          monitoring: true
        }
      };

    case Environment.STAGING:
      return {
        ...baseConfig,
        options: {
          ...baseConfig.options,
          maxPoolSize: 150,
          minPoolSize: 15,
          // Staging-specific settings
          retryWrites: true,
          w: 'majority',
          ssl: true,
          monitoring: true
        }
      };

    case Environment.DEVELOPMENT:
      return {
        ...baseConfig,
        options: {
          ...baseConfig.options,
          maxPoolSize: 50,
          minPoolSize: 5,
          // Development-specific settings
          ssl: false,
          monitoring: true,
          loggerLevel: 'debug'
        }
      };

    default:
      throw new Error(`Invalid environment: ${env}`);
  }
};

/**
 * Current environment database configuration
 * Exports configured database settings based on current environment
 */
export const databaseConfig = getDatabaseConfig(
  (process.env.NODE_ENV as Environment) || Environment.DEVELOPMENT
);