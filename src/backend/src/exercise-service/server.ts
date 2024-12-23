/**
 * @fileoverview Enterprise-grade entry point for Exercise Service implementing secure
 * database connections, WebSocket server, graceful shutdown, and comprehensive monitoring.
 * @version 1.0.0
 */

import mongoose from 'mongoose'; // v7.5.0
import http from 'http';
import { WebSocketServer } from 'ws'; // v8.14.2
import helmet from 'helmet'; // v7.1.0
import rateLimit from 'express-rate-limit'; // v7.1.5
import app from './app';
import { databaseConfig } from './config/database';
import { Logger } from '../shared/utils/logger.util';

// Initialize logger
const logger = new Logger({ 
  serviceName: 'exercise-service',
  environment: process.env.NODE_ENV || 'development'
});

// Constants
const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT || '10000', 10);
const MONGODB_RECONNECT_INTERVAL = 5000;
const MONGODB_MAX_RETRIES = 5;

/**
 * Establishes secure connection to MongoDB with retry logic
 */
async function connectToDatabase(): Promise<void> {
  let retries = 0;

  while (retries < MONGODB_MAX_RETRIES) {
    try {
      await mongoose.connect(`mongodb://${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.name}`, {
        ...databaseConfig.options,
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000
      });

      logger.info('Successfully connected to MongoDB', {
        host: databaseConfig.host,
        database: databaseConfig.name
      });
      
      return;
    } catch (error) {
      retries++;
      logger.error('Failed to connect to MongoDB', error as Error, {
        retryAttempt: retries,
        maxRetries: MONGODB_MAX_RETRIES
      });

      if (retries === MONGODB_MAX_RETRIES) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, MONGODB_RECONNECT_INTERVAL));
    }
  }
}

/**
 * Configures and initializes WebSocket server with security features
 */
function setupWebSocketServer(httpServer: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ 
    server: httpServer,
    clientTracking: true,
    perMessageDeflate: true
  });

  // WebSocket connection handling
  wss.on('connection', (ws, req) => {
    const clientId = req.headers['x-client-id'] || 'unknown';
    logger.info('WebSocket client connected', { clientId });

    // Setup heartbeat
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        logger.debug('WebSocket message received', { clientId, messageType: message.type });
      } catch (error) {
        logger.error('Invalid WebSocket message', error as Error, { clientId });
      }
    });

    ws.on('close', () => {
      logger.info('WebSocket client disconnected', { clientId });
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error', error as Error, { clientId });
    });
  });

  // Implement heartbeat mechanism
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        logger.warn('Terminating inactive WebSocket connection');
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  return wss;
}

/**
 * Implements graceful shutdown handling
 */
async function handleShutdown(server: http.Server, wss: WebSocketServer): Promise<void> {
  logger.info('Initiating graceful shutdown');

  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close WebSocket connections
  wss.clients.forEach((client) => {
    client.close(1000, 'Server shutting down');
  });
  wss.close(() => {
    logger.info('WebSocket server closed');
  });

  // Close database connection
  try {
    await mongoose.disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection', error as Error);
  }

  // Force exit after timeout
  setTimeout(() => {
    logger.warn('Forcing process termination');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  process.exit(0);
}

/**
 * Initializes and starts the server with all components
 */
async function startServer(): Promise<http.Server> {
  try {
    // Connect to database
    await connectToDatabase();

    // Create HTTP server
    const server = http.createServer(app);

    // Setup WebSocket server
    const wss = setupWebSocketServer(server);

    // Start listening
    server.listen(PORT, () => {
      logger.info(`Exercise Service listening on port ${PORT}`);
    });

    // Setup shutdown handlers
    process.on('SIGTERM', () => handleShutdown(server, wss));
    process.on('SIGINT', () => handleShutdown(server, wss));

    return server;
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    process.exit(1);
  }
}

// Start the server
startServer().catch((error) => {
  logger.error('Fatal error during server startup', error as Error);
  process.exit(1);
});