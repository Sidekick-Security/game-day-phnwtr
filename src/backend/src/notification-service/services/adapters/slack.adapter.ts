/**
 * @fileoverview Slack adapter implementation for sending notifications through Slack Web API
 * with support for rich formatting, rate limiting, error handling, and delivery tracking.
 * @version 1.0.0
 */

import { WebClient, ErrorCode, ChatPostMessageResponse } from '@slack/web-api'; // v6.8.0
import { Logger } from 'winston'; // v3.8.0
import Bottleneck from 'bottleneck'; // v2.19.5
import { injectable, inject } from 'inversify';
import { INotification, NotificationPriority, NotificationStatus } from '../../interfaces/notification.interface';

/**
 * Configuration for retry attempts with exponential backoff
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

/**
 * Detailed delivery status tracking
 */
interface DeliveryStatus {
  notificationId: string;
  status: NotificationStatus;
  attempts: number;
  lastAttempt: Date;
  error?: string;
  messageTs?: string;
}

/**
 * Result of delivery attempt
 */
interface DeliveryResult {
  success: boolean;
  status: NotificationStatus;
  messageTs?: string;
  error?: string;
}

/**
 * Slack-specific message blocks
 */
interface SlackBlocks {
  blocks: any[];
  text: string;
  thread_ts?: string;
}

@injectable()
export class SlackAdapter {
  private readonly slackClient: WebClient;
  private readonly rateLimiter: Bottleneck;
  private readonly retryConfigs: Map<NotificationPriority, RetryConfig>;
  private readonly deliveryTracker: Map<string, DeliveryStatus>;

  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('Config') private readonly config: any
  ) {
    // Initialize Slack client with token
    this.slackClient = new WebClient(config.slack.token);

    // Configure rate limiter based on Slack's tier limits
    this.rateLimiter = new Bottleneck({
      maxConcurrent: 1,
      minTime: 1000 / config.slack.rateLimit.messagesPerSecond
    });

    // Initialize retry configurations
    this.retryConfigs = new Map([
      [NotificationPriority.HIGH, { maxAttempts: 5, initialDelay: 1000, maxDelay: 10000, backoffFactor: 2 }],
      [NotificationPriority.MEDIUM, { maxAttempts: 3, initialDelay: 2000, maxDelay: 20000, backoffFactor: 2 }],
      [NotificationPriority.LOW, { maxAttempts: 2, initialDelay: 5000, maxDelay: 30000, backoffFactor: 2 }]
    ]);

    this.deliveryTracker = new Map();
    this.validateConnection();
  }

  /**
   * Validates Slack API connection and token
   */
  private async validateConnection(): Promise<void> {
    try {
      await this.slackClient.auth.test();
      this.logger.info('Slack adapter connection validated successfully');
    } catch (error) {
      this.logger.error('Slack adapter connection validation failed', { error });
      throw new Error('Failed to validate Slack connection');
    }
  }

  /**
   * Sends notification to Slack with retry logic and delivery tracking
   */
  public async sendNotification(notification: INotification): Promise<DeliveryResult> {
    const deliveryStatus: DeliveryStatus = {
      notificationId: notification.id,
      status: NotificationStatus.PENDING,
      attempts: 0,
      lastAttempt: new Date()
    };
    this.deliveryTracker.set(notification.id, deliveryStatus);

    try {
      const retryConfig = this.retryConfigs.get(notification.priority)!;
      const formattedMessage = await this.formatSlackMessage(notification.content, notification.priority);

      // Use rate limiter for API calls
      const result = await this.rateLimiter.schedule(() => this.attemptDelivery(
        notification,
        formattedMessage,
        retryConfig
      ));

      return result;
    } catch (error) {
      this.logger.error('Failed to send Slack notification', {
        notificationId: notification.id,
        error
      });

      return {
        success: false,
        status: NotificationStatus.FAILED,
        error: error.message
      };
    }
  }

  /**
   * Attempts to deliver notification with retry logic
   */
  private async attemptDelivery(
    notification: INotification,
    message: SlackBlocks,
    retryConfig: RetryConfig
  ): Promise<DeliveryResult> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        const result = await this.slackClient.chat.postMessage({
          channel: notification.recipients[0],
          ...message,
          metadata: {
            event_type: 'gameday_notification',
            event_payload: {
              notification_id: notification.id,
              exercise_id: notification.exerciseId
            }
          }
        });

        if (result.ok) {
          this.updateDeliveryStatus(notification.id, {
            status: NotificationStatus.DELIVERED,
            messageTs: result.ts
          });

          return {
            success: true,
            status: NotificationStatus.DELIVERED,
            messageTs: result.ts
          };
        }
      } catch (error) {
        lastError = error;
        const delay = Math.min(
          retryConfig.initialDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
          retryConfig.maxDelay
        );

        this.logger.warn('Slack delivery attempt failed, retrying', {
          notificationId: notification.id,
          attempt,
          delay,
          error
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    this.updateDeliveryStatus(notification.id, {
      status: NotificationStatus.FAILED,
      error: lastError?.message
    });

    return {
      success: false,
      status: NotificationStatus.FAILED,
      error: lastError?.message
    };
  }

  /**
   * Formats notification content into Slack blocks format
   */
  private async formatSlackMessage(
    content: INotification['content'],
    priority: NotificationPriority
  ): Promise<SlackBlocks> {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: content.title
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: content.message
        }
      }
    ];

    // Add priority-based styling
    if (priority === NotificationPriority.HIGH) {
      blocks.unshift({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🚨 *High Priority Notification*'
          }
        ]
      });
    }

    // Add exercise-specific metadata if available
    if (content.data?.exerciseDetails) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Exercise:* ${content.data.exerciseDetails}`
          }
        ]
      });
    }

    return {
      blocks,
      text: content.title // Fallback text
    };
  }

  /**
   * Updates delivery status tracking
   */
  private updateDeliveryStatus(
    notificationId: string,
    update: Partial<DeliveryStatus>
  ): void {
    const current = this.deliveryTracker.get(notificationId);
    if (current) {
      this.deliveryTracker.set(notificationId, {
        ...current,
        ...update,
        lastAttempt: new Date()
      });
    }
  }

  /**
   * Retrieves current delivery status for a notification
   */
  public getDeliveryStatus(notificationId: string): DeliveryStatus | undefined {
    return this.deliveryTracker.get(notificationId);
  }
}