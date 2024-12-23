/**
 * @fileoverview REST API controller for managing exercise-related notifications
 * Implements secure, scalable notification delivery with comprehensive monitoring
 * @version 1.0.0
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { controller, httpPost, httpGet } from 'inversify-express-utils';
import rateLimit from 'express-rate-limit';
import compression from 'compression';

import { INotification } from '../interfaces/notification.interface';
import { NotificationService } from '../services/notification.service';
import { NotificationModel } from '../models/notification.model';
import { errorHandler, GameDayError, ErrorSeverity } from '../../shared/middleware/error-handler.middleware';
import { ErrorCode, ErrorType } from '../../shared/constants/error-codes';
import { HttpStatus } from '../../shared/constants/http-status';
import Logger from '../../shared/utils/logger.util';

// Rate limiting configurations
const createNotificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many notification requests, please try again later'
});

const getNotificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Too many status requests, please try again later'
});

/**
 * Controller for managing exercise notifications with real-time delivery tracking
 */
@injectable()
@controller('/api/v1/notifications')
export class NotificationController {
  constructor(
    @inject('NotificationService') private readonly notificationService: NotificationService,
    @inject('Logger') private readonly logger: Logger
  ) {}

  /**
   * Creates and queues a new notification with validation and rate limiting
   * @route POST /api/v1/notifications
   */
  @httpPost('/')
  @rateLimit(createNotificationLimiter)
  @compression()
  public async createNotification(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string || '';
    this.logger.setCorrelationId(correlationId);

    try {
      const notification: INotification = req.body;

      // Validate notification payload
      if (!notification.type || !notification.channel || !notification.recipients) {
        throw new GameDayError(
          'Invalid notification payload',
          ErrorCode.VALIDATION_ERROR,
          ErrorType.VALIDATION,
          ErrorSeverity.LOW,
          { notification }
        );
      }

      // Create notification record
      const createdNotification = await NotificationModel.create({
        ...notification,
        correlationId
      });

      // Queue notification for delivery
      const queued = await this.notificationService.sendNotification(createdNotification);

      if (!queued) {
        throw new GameDayError(
          'Failed to queue notification',
          ErrorCode.INTERNAL_SERVER_ERROR,
          ErrorType.INTERNAL,
          ErrorSeverity.HIGH,
          { notificationId: createdNotification.id }
        );
      }

      this.logger.info('Notification created and queued', {
        notificationId: createdNotification.id,
        type: notification.type,
        channel: notification.channel
      });

      return res.status(HttpStatus.CREATED).json({
        status: 'success',
        data: {
          id: createdNotification.id,
          status: createdNotification.status,
          correlationId
        }
      });

    } catch (error) {
      return errorHandler(error, req, res, () => {});
    }
  }

  /**
   * Retrieves notification status by ID with real-time tracking
   * @route GET /api/v1/notifications/:id
   */
  @httpGet('/:id')
  @rateLimit(getNotificationLimiter)
  @compression()
  public async getNotification(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string || '';
    this.logger.setCorrelationId(correlationId);

    try {
      const notificationId = req.params.id;

      // Retrieve notification from database
      const notification = await NotificationModel.findById(notificationId);

      if (!notification) {
        throw new GameDayError(
          `Notification not found: ${notificationId}`,
          ErrorCode.RESOURCE_NOT_FOUND,
          ErrorType.NOT_FOUND,
          ErrorSeverity.LOW,
          { notificationId }
        );
      }

      // Get real-time delivery status
      const currentStatus = await this.notificationService.getNotificationStatus(notification.id);

      this.logger.info('Notification status retrieved', {
        notificationId,
        status: currentStatus
      });

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          id: notification.id,
          type: notification.type,
          channel: notification.channel,
          status: currentStatus,
          createdAt: notification.createdAt,
          updatedAt: notification.updatedAt,
          metadata: notification.metadata
        }
      });

    } catch (error) {
      return errorHandler(error, req, res, () => {});
    }
  }

  /**
   * Retrieves all notifications for an exercise with status tracking
   * @route GET /api/v1/notifications/exercise/:exerciseId
   */
  @httpGet('/exercise/:exerciseId')
  @rateLimit(getNotificationLimiter)
  @compression()
  public async getExerciseNotifications(req: Request, res: Response): Promise<Response> {
    const correlationId = req.headers['x-correlation-id'] as string || '';
    this.logger.setCorrelationId(correlationId);

    try {
      const { exerciseId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      // Validate pagination parameters
      const pageNum = parseInt(page as string, 10);
      const limitNum = Math.min(parseInt(limit as string, 10), 100);

      // Retrieve notifications with pagination
      const notifications = await NotificationModel.find({ exerciseId })
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();

      // Get total count for pagination
      const total = await NotificationModel.countDocuments({ exerciseId });

      this.logger.info('Exercise notifications retrieved', {
        exerciseId,
        count: notifications.length,
        page: pageNum,
        limit: limitNum
      });

      return res.status(HttpStatus.OK).json({
        status: 'success',
        data: {
          notifications,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
        }
      });

    } catch (error) {
      return errorHandler(error, req, res, () => {});
    }
  }
}