/**
 * @fileoverview Defines secure routing configuration for participant management endpoints
 * with comprehensive RBAC, caching, rate limiting, and monitoring features.
 * @version 1.0.0
 */

import { Router } from 'express'; // v4.18.2
import { container } from 'inversify'; // v6.0.1
import rateLimit from 'express-rate-limit'; // v6.7.0
import cache from 'express-cache-middleware'; // v1.0.0
import { ParticipantController } from '../controllers/participant.controller';
import { IParticipant } from '../interfaces/participant.interface';
import { authenticate, authorize, validate, monitor } from '../../shared/middleware';

/**
 * Rate limit configurations per endpoint category
 */
const RATE_LIMITS = {
  CREATE: { windowMs: 60000, max: 100 }, // 100 requests per minute
  BULK: { windowMs: 60000, max: 50 },    // 50 requests per minute
  READ: { windowMs: 60000, max: 200 },   // 200 requests per minute
  UPDATE: { windowMs: 60000, max: 150 }, // 150 requests per minute
  DELETE: { windowMs: 60000, max: 50 }   // 50 requests per minute
};

/**
 * Cache configurations for read operations
 */
const CACHE_CONFIG = {
  PARTICIPANT_LIST: { ttl: 300 }, // 5 minutes
  STATS: { ttl: 60 }             // 1 minute
};

/**
 * Configures and returns the router with participant management routes
 * @returns Configured Express router
 */
export function configureParticipantRoutes(): Router {
  const router = Router();
  const participantController = container.get<ParticipantController>(ParticipantController);

  // Participant creation endpoints
  router.post('/',
    authenticate(),
    authorize(['EXERCISE_ADMIN', 'FACILITATOR']),
    validate('createParticipant'),
    rateLimit(RATE_LIMITS.CREATE),
    monitor('participant.create'),
    participantController.createParticipant
  );

  router.post('/bulk',
    authenticate(),
    authorize(['EXERCISE_ADMIN']),
    validate('createBulkParticipants'),
    rateLimit(RATE_LIMITS.BULK),
    monitor('participant.createBulk'),
    participantController.createBulkParticipants
  );

  // Participant retrieval endpoints
  router.get('/exercise/:exerciseId',
    authenticate(),
    authorize(['EXERCISE_ADMIN', 'FACILITATOR', 'PARTICIPANT']),
    rateLimit(RATE_LIMITS.READ),
    cache(CACHE_CONFIG.PARTICIPANT_LIST),
    monitor('participant.list'),
    participantController.getExerciseParticipants
  );

  // Status management endpoints
  router.put('/:participantId/status',
    authenticate(),
    authorize(['EXERCISE_ADMIN', 'FACILITATOR']),
    validate('updateParticipantStatus'),
    rateLimit(RATE_LIMITS.UPDATE),
    monitor('participant.updateStatus'),
    participantController.updateParticipantStatus
  );

  // Role management endpoints
  router.put('/:participantId/role',
    authenticate(),
    authorize(['EXERCISE_ADMIN']),
    validate('updateParticipantRole'),
    rateLimit(RATE_LIMITS.UPDATE),
    monitor('participant.updateRole'),
    participantController.updateParticipantRole
  );

  // Participant removal endpoint
  router.delete('/:participantId',
    authenticate(),
    authorize(['EXERCISE_ADMIN']),
    validate('removeParticipant'),
    rateLimit(RATE_LIMITS.DELETE),
    monitor('participant.remove'),
    participantController.removeParticipant
  );

  // Analytics endpoints
  router.get('/exercise/:exerciseId/stats',
    authenticate(),
    authorize(['EXERCISE_ADMIN', 'FACILITATOR']),
    rateLimit(RATE_LIMITS.READ),
    cache(CACHE_CONFIG.STATS),
    monitor('participant.stats'),
    participantController.getParticipantStats
  );

  // Notification preferences endpoint
  router.put('/:participantId/notifications',
    authenticate(),
    authorize(['EXERCISE_ADMIN', 'FACILITATOR', 'PARTICIPANT']),
    validate('updateNotificationPreferences'),
    rateLimit(RATE_LIMITS.UPDATE),
    monitor('participant.updateNotifications'),
    participantController.updateNotificationPreferences
  );

  // Error handling middleware
  router.use(errorHandler);

  return router;
}

/**
 * Error handling middleware for participant routes
 */
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // Log error details
  console.error('Participant route error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: (err as any).errors
      }
    });
    return;
  }

  if (err.name === 'ConcurrencyError') {
    res.status(409).json({
      success: false,
      error: {
        code: 'CONCURRENCY_ERROR',
        message: err.message,
        details: {
          entityId: (err as any).entityId,
          version: (err as any).version
        }
      }
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: {}
    }
  });
}

// Export configured router
export const participantRouter = configureParticipantRoutes();