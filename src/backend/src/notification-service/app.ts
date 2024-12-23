/**
 * @fileoverview Main application entry point for the GameDay Platform notification service.
 * Implements an enterprise-grade Express server with comprehensive security, monitoring,
 * and high availability features for handling multi-channel exercise notifications.
 * @version 1.0.0
 */

import express from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import mongoose from 'mongoose'; // v7.0.0
import compression from 'compression'; // v1.7.4
import rateLimit from 'express-rate-limit'; // v7.1.0
import { Container } from 'inversify'; // v6.0.1
import { InversifyExpressServer } from 'inversify-express-utils'; // v6.3.2
import * as client from 'prom-client'; // v14.2.0
import winston from 'winston'; // v3.11.0

import { NotificationController } from './controllers/notification.controller';
import { databaseConfig } from './config/database';
import { errorHandler } from '../shared/middleware/error-handler.middleware';
import Logger from '../shared/utils/logger.util';
import { Environment } from '../shared/types/config.types';

/**
 * Initialize Express application with comprehensive security and monitoring
 */
async function initializeApp(): Promise<express.Application> {
  // Initialize logger
  const logger = Logger.getInstance({
    serviceName: 'notification-service',
    environment: process.env.NODE_ENV || 'development'
  });

  // Initialize metrics collection
  const register = new client.Registry();
  client.collectDefaultMetrics({ register });

  // Initialize dependency injection container
  const container = new Container();
  container.bind('Logger').toConstantValue(logger);
  container.bind('NotificationController').to(NotificationController);

  // Create InversifyExpress server
  const server = new InversifyExpressServer(container);

  server.setConfig((app) => {
    // Security middleware
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    app.use(cors({
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
      credentials: true,
      maxAge: 86400 // 24 hours
    }));

    // Rate limiting
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later'
    }));

    // Body parsing and compression
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    app.use(compression());

    // Request logging
    app.use((req, res, next) => {
      const correlationId = req.headers['x-correlation-id'] as string;
      logger.setCorrelationId(correlationId);
      logger.info('Incoming request', {
        method: req.method,
        url: req.url,
        correlationId
      });
      next();
    });

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version
      });
    });

    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });
  });

  // Error handling
  server.setErrorConfig((app) => {
    app.use(errorHandler);
  });

  return server.build();
}

/**
 * Connect to MongoDB with enhanced error handling and monitoring
 */
async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(`mongodb://${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.name}`, {
      ...databaseConfig.options
    });

    Logger.getInstance({
      serviceName: 'notification-service',
      environment: process.env.NODE_ENV || 'development'
    }).info('Successfully connected to MongoDB');
  } catch (error) {
    Logger.getInstance({
      serviceName: 'notification-service',
      environment: process.env.NODE_ENV || 'development'
    }).error('Failed to connect to MongoDB', error as Error);
    process.exit(1);
  }
}

/**
 * Configure graceful shutdown handlers
 */
function setupGracefulShutdown(app: express.Application, server: any): void {
  const signals = ['SIGTERM', 'SIGINT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      const logger = Logger.getInstance({
        serviceName: 'notification-service',
        environment: process.env.NODE_ENV || 'development'
      });

      logger.info(`${signal} received, starting graceful shutdown`);

      // Stop accepting new requests
      server.close(async () => {
        try {
          // Close database connection
          await mongoose.connection.close();
          logger.info('Database connection closed');

          // Cleanup other resources
          await client.register.clear();
          logger.info('Metrics cleared');

          logger.info('Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown', error as Error);
          process.exit(1);
        }
      });
    });
  });
}

// Initialize and start the application
async function startServer() {
  try {
    const app = await initializeApp();
    await connectDatabase();

    const port = process.env.PORT || 3003;
    const server = app.listen(port, () => {
      Logger.getInstance({
        serviceName: 'notification-service',
        environment: process.env.NODE_ENV || 'development'
      }).info(`Notification service listening on port ${port}`);
    });

    setupGracefulShutdown(app, server);
  } catch (error) {
    Logger.getInstance({
      serviceName: 'notification-service',
      environment: process.env.NODE_ENV || 'development'
    }).error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

// Export for testing
export { initializeApp, connectDatabase };