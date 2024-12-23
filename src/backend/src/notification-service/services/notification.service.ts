/**
 * @fileoverview Core notification service implementation for GameDay Platform
 * Handles multi-channel notification delivery with priority queuing and tracking
 * @version 1.0.0
 */

import { Queue, Job } from 'bull'; // v4.10.0
import { Logger } from 'winston'; // v3.8.0
import { injectable, inject } from 'inversify'; // v6.0.1
import { Counter, Histogram } from 'prom-client'; // v14.0.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0

import { 
  INotification, 
  NotificationStatus, 
  NotificationType,
  NotificationChannel,
  NotificationPriority 
} from '../interfaces/notification.interface';
import { TeamsAdapter } from './adapters/teams.adapter';
import { SlackAdapter } from './adapters/slack.adapter';
import { queueConfig } from '../config/queue';

/**
 * Enhanced notification service with multi-channel delivery, priority queuing,
 * and comprehensive monitoring capabilities
 */
@injectable()
export class NotificationService {
  private readonly notificationQueue: Queue;
  private readonly deliveryMetrics: {
    attemptCounter: Counter;
    deliveryLatency: Histogram;
    failureCounter: Counter;
  };

  constructor(
    @inject('TeamsAdapter') private readonly teamsAdapter: TeamsAdapter,
    @inject('SlackAdapter') private readonly slackAdapter: SlackAdapter,
    @inject('Logger') private readonly logger: Logger,
    @inject('Config') private readonly config: any
  ) {
    // Initialize Bull queue with enhanced configuration
    this.notificationQueue = new Queue('notifications', {
      redis: {
        host: queueConfig.host,
        port: queueConfig.port,
        password: queueConfig.password,
        tls: queueConfig.redis.enableTLS ? {} : undefined
      },
      defaultJobOptions: {
        attempts: queueConfig.defaultJobRetries,
        timeout: queueConfig.defaultJobTimeout,
        removeOnComplete: queueConfig.removeOnComplete,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      },
      settings: {
        stalledInterval: 30000,
        maxStalledCount: 2
      }
    });

    // Initialize metrics
    this.initializeMetrics();
    
    // Set up queue processors and event handlers
    this.setupQueueHandlers();
  }

  /**
   * Initializes Prometheus metrics for monitoring
   */
  private initializeMetrics(): void {
    this.deliveryMetrics = {
      attemptCounter: new Counter({
        name: 'notification_delivery_attempts_total',
        help: 'Total number of notification delivery attempts',
        labelNames: ['channel', 'type', 'priority']
      }),
      deliveryLatency: new Histogram({
        name: 'notification_delivery_latency_seconds',
        help: 'Notification delivery latency in seconds',
        labelNames: ['channel', 'type', 'priority'],
        buckets: [0.1, 0.5, 1, 2, 5, 10]
      }),
      failureCounter: new Counter({
        name: 'notification_delivery_failures_total',
        help: 'Total number of notification delivery failures',
        labelNames: ['channel', 'type', 'priority', 'error_type']
      })
    };
  }

  /**
   * Sets up Bull queue event handlers and processors
   */
  private setupQueueHandlers(): void {
    this.notificationQueue.on('error', (error) => {
      this.logger.error('Queue error occurred', { error });
    });

    this.notificationQueue.on('failed', (job, error) => {
      this.handleFailedJob(job, error);
    });

    this.notificationQueue.process(async (job) => {
      return this.processNotification(job.data as INotification);
    });
  }

  /**
   * Queues a notification for delivery with priority handling
   * @param notification The notification to be delivered
   * @returns Promise resolving to queuing success status
   */
  public async sendNotification(notification: INotification): Promise<boolean> {
    const correlationId = notification.correlationId || uuidv4();

    try {
      this.logger.info('Queueing notification for delivery', {
        correlationId,
        type: notification.type,
        channel: notification.channel,
        priority: notification.priority
      });

      // Add to queue with priority
      const job = await this.notificationQueue.add(
        notification,
        {
          priority: this.getPriorityLevel(notification.priority),
          jobId: correlationId,
          attempts: this.getRetryAttempts(notification.priority)
        }
      );

      return !!job.id;
    } catch (error) {
      this.logger.error('Failed to queue notification', {
        correlationId,
        error,
        notification
      });
      return false;
    }
  }

  /**
   * Processes a queued notification through appropriate channel
   * @param notification The notification to process
   * @returns Promise resolving to delivery success status
   */
  private async processNotification(notification: INotification): Promise<boolean> {
    const startTime = Date.now();
    const correlationId = notification.correlationId || uuidv4();

    try {
      this.deliveryMetrics.attemptCounter.inc({
        channel: notification.channel,
        type: notification.type,
        priority: notification.priority
      });

      let success = false;
      switch (notification.channel) {
        case NotificationChannel.TEAMS:
          success = await this.teamsAdapter.sendNotification(notification);
          break;
        case NotificationChannel.SLACK:
          const result = await this.slackAdapter.sendNotification(notification);
          success = result.success;
          break;
        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      // Record delivery latency
      this.deliveryMetrics.deliveryLatency.observe(
        {
          channel: notification.channel,
          type: notification.type,
          priority: notification.priority
        },
        (Date.now() - startTime) / 1000
      );

      return success;
    } catch (error) {
      await this.handleDeliveryError(error, notification, correlationId);
      throw error;
    }
  }

  /**
   * Handles failed notification delivery jobs
   */
  private async handleFailedJob(job: Job, error: Error): Promise<void> {
    const notification = job.data as INotification;
    const correlationId = notification.correlationId || job.id;

    this.deliveryMetrics.failureCounter.inc({
      channel: notification.channel,
      type: notification.type,
      priority: notification.priority,
      error_type: this.classifyError(error)
    });

    this.logger.error('Notification delivery failed', {
      correlationId,
      error,
      attempts: job.attemptsMade,
      notification
    });
  }

  /**
   * Handles delivery errors with proper classification and metrics
   */
  private async handleDeliveryError(
    error: Error,
    notification: INotification,
    correlationId: string
  ): Promise<void> {
    const errorType = this.classifyError(error);

    this.deliveryMetrics.failureCounter.inc({
      channel: notification.channel,
      type: notification.type,
      priority: notification.priority,
      error_type: errorType
    });

    this.logger.error('Notification delivery error', {
      correlationId,
      error,
      errorType,
      notification
    });
  }

  /**
   * Maps notification priority to queue priority level
   */
  private getPriorityLevel(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.HIGH:
        return 1;
      case NotificationPriority.MEDIUM:
        return 2;
      case NotificationPriority.LOW:
        return 3;
      default:
        return 2;
    }
  }

  /**
   * Determines retry attempts based on notification priority
   */
  private getRetryAttempts(priority: NotificationPriority): number {
    switch (priority) {
      case NotificationPriority.HIGH:
        return 5;
      case NotificationPriority.MEDIUM:
        return 3;
      case NotificationPriority.LOW:
        return 2;
      default:
        return queueConfig.defaultJobRetries;
    }
  }

  /**
   * Classifies errors for proper handling and metrics
   */
  private classifyError(error: Error): string {
    if (error.message.includes('rate limit')) {
      return 'RATE_LIMIT';
    }
    if (error.message.includes('authentication')) {
      return 'AUTH_ERROR';
    }
    if (error.message.includes('timeout')) {
      return 'TIMEOUT';
    }
    if (error.message.includes('network')) {
      return 'NETWORK_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Retrieves the current status of a notification
   * @param correlationId The notification's correlation ID
   * @returns Current notification status
   */
  public async getNotificationStatus(correlationId: string): Promise<NotificationStatus> {
    const job = await this.notificationQueue.getJob(correlationId);
    
    if (!job) {
      return NotificationStatus.FAILED;
    }

    const state = await job.getState();
    switch (state) {
      case 'completed':
        return NotificationStatus.DELIVERED;
      case 'failed':
        return NotificationStatus.FAILED;
      case 'active':
      case 'waiting':
      case 'delayed':
        return NotificationStatus.PENDING;
      default:
        return NotificationStatus.FAILED;
    }
  }
}