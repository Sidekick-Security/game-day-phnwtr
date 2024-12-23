/**
 * @fileoverview Main application configuration for Exercise Service implementing
 * comprehensive middleware stack, routing, WebSocket support, and graceful shutdown.
 * @version 1.0.0
 */

import express, { Express, Request, Response } from 'express'; // v4.18.2
import cors from 'cors'; // v2.8.5
import helmet from 'helmet'; // v7.0.0
import compression from 'compression'; // v1.7.4
import { Server } from 'http';
import { Server as SocketServer } from 'socket.io'; // v4.7.2
import rateLimit from 'express-rate-limit'; // v6.9.0

// Import routes
import exerciseRouter from './routes/exercise.routes';
import injectRouter from './routes/inject.routes';
import participantRouter from './routes/participant.routes';
import responseRouter from './routes/response.routes';

// Import middleware
import { errorHandler } from '../shared/middleware/error-handler.middleware';
import { loggerMiddleware } from '../shared/middleware/logger.middleware';

// Constants
const PORT = process.env.PORT || 3000;
const API_VERSION = 'v1';
const API_BASE_PATH = `/api/${API_VERSION}`;
const MAX_REQUEST_SIZE = '10mb';
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;
const CORS_ORIGINS = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds

/**
 * Configures Express application middleware stack with enhanced security and monitoring
 * @param app Express application instance
 */
function configureMiddleware(app: Express): void {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true
  }));

  // CORS configuration
  app.use(cors({
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    credentials: true,
    maxAge: 86400 // 24 hours
  }));

  // Request parsing and compression
  app.use(compression());
  app.use(express.json({ limit: MAX_REQUEST_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_SIZE }));

  // Logging middleware
  app.use(loggerMiddleware);

  // Rate limiting
  app.use(rateLimit({
    windowMs: RATE_LIMIT_WINDOW,
    max: RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });
}

/**
 * Configures API routes with versioning and proper middleware
 * @param app Express application instance
 */
function configureRoutes(app: Express): void {
  // Mount API routes
  app.use(`${API_BASE_PATH}/exercises`, exerciseRouter);
  app.use(`${API_BASE_PATH}/injects`, injectRouter);
  app.use(`${API_BASE_PATH}/participants`, participantRouter);
  app.use(`${API_BASE_PATH}/responses`, responseRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      status: 'error',
      message: 'Resource not found',
      path: req.path
    });
  });

  // Global error handler
  app.use(errorHandler);
}

/**
 * Configures WebSocket server with authentication and event handling
 * @param httpServer HTTP server instance
 * @returns Configured Socket.IO server
 */
function configureWebSocket(httpServer: Server): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: CORS_ORIGINS,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    // Implement token validation
    next();
  });

  // Connection handling
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join exercise room
    socket.on('join-exercise', (exerciseId: string) => {
      socket.join(`exercise:${exerciseId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Configures graceful shutdown handling
 * @param app Express application instance
 * @param httpServer HTTP server instance
 */
function configureGracefulShutdown(app: Express, httpServer: Server): void {
  const shutdown = async () => {
    console.log('Received shutdown signal');

    // Stop accepting new requests
    httpServer.close(() => {
      console.log('HTTP server closed');
    });

    // Wait for existing requests to complete
    setTimeout(() => {
      console.log('Forcing process termination');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT);

    try {
      // Cleanup tasks
      // Close database connections, clear caches, etc.
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Initialize Express application
const app = express();
configureMiddleware(app);
configureRoutes(app);

// Create HTTP server
const httpServer = new Server(app);
const io = configureWebSocket(httpServer);

// Configure graceful shutdown
configureGracefulShutdown(app, httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Exercise Service listening on port ${PORT}`);
});

export default app;