/**
 * @fileoverview Server entry point for the GameDay Platform notification service.
 * Implements enterprise-grade server initialization with connection tracking,
 * health monitoring, and graceful shutdown capabilities.
 * @version 1.0.0
 */

import http from 'http'; // latest
import rateLimit from 'express-rate-limit'; // ^7.1.5
import app from './app';
import Logger from '../shared/utils/logger.util';

// Connection tracking map
const connections = new Map<string, http.Socket>();

/**
 * Initializes and starts the HTTP server with advanced configuration
 * including connection tracking and health monitoring
 */
async function startServer(): Promise<http.Server> {
  const logger = Logger.getInstance({
    serviceName: 'notification-service',
    environment: process.env.NODE_ENV || 'development'
  });

  try {
    const port = process.env.PORT || 3003;
    const server = http.createServer(app);

    // Configure keep-alive timeout
    server.keepAliveTimeout = process.env.KEEP_ALIVE_TIMEOUT 
      ? parseInt(process.env.KEEP_ALIVE_TIMEOUT, 10)
      : 300000; // 5 minutes

    // Set up connection tracking
    trackConnections(server);

    // Configure health check endpoint
    setupHealthCheck(app);

    // Error event handlers
    server.on('error', (error: Error) => {
      logger.error('Server error occurred', error);
      process.exit(1);
    });

    // Start listening
    await new Promise<void>((resolve) => {
      server.listen(port, () => {
        logger.info(`Notification service listening on port ${port}`, {
          port,
          environment: process.env.NODE_ENV,
          pid: process.pid
        });
        resolve();
      });
    });

    // Set up graceful shutdown
    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    logger.error('Failed to start server', error as Error);
    throw error;
  }
}

/**
 * Manages active connection tracking for graceful shutdown
 */
function trackConnections(server: http.Server): void {
  server.on('connection', (socket: http.Socket) => {
    const socketId = `${socket.remoteAddress}:${socket.remotePort}`;
    connections.set(socketId, socket);

    socket.on('close', () => {
      connections.delete(socketId);
    });
  });
}

/**
 * Configures health check endpoint and monitoring
 */
function setupHealthCheck(application: any): void {
  const healthCheckPath = '/health';
  
  application.get(healthCheckPath, (req: any, res: any) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'notification-service',
      version: process.env.npm_package_version
    });
  });
}

/**
 * Implements graceful shutdown with connection draining
 */
async function handleShutdown(server: http.Server): Promise<void> {
  const logger = Logger.getInstance({
    serviceName: 'notification-service',
    environment: process.env.NODE_ENV || 'development'
  });

  logger.info('Initiating graceful shutdown');

  // Stop accepting new connections
  server.close(() => {
    logger.info('Server closed, no longer accepting connections');
  });

  // Set shutdown timeout
  const shutdownTimeout = process.env.SHUTDOWN_TIMEOUT 
    ? parseInt(process.env.SHUTDOWN_TIMEOUT, 10)
    : 30000; // 30 seconds default

  try {
    // Drain existing connections
    const drainConnections = Array.from(connections.values()).map((socket) => {
      return new Promise<void>((resolve) => {
        socket.end(() => {
          socket.destroy();
          resolve();
        });
      });
    });

    // Wait for connections to drain with timeout
    await Promise.race([
      Promise.all(drainConnections),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Shutdown timeout')), shutdownTimeout)
      )
    ]);

    logger.info('Graceful shutdown completed', {
      connectionsCount: connections.size
    });

    process.exit(0);
  } catch (error) {
    logger.error('Forced shutdown due to timeout', error as Error);
    
    // Force close remaining connections
    connections.forEach((socket) => socket.destroy());
    
    process.exit(1);
  }
}

/**
 * Set up graceful shutdown handlers
 */
function setupGracefulShutdown(server: http.Server): void {
  const signals = ['SIGTERM', 'SIGINT'];
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      await handleShutdown(server);
    });
  });
}

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { startServer, handleShutdown };