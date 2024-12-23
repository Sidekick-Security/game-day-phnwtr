/**
 * @fileoverview MongoDB schema and model implementation for notifications with enhanced
 * delivery tracking, retry mechanisms, and performance optimizations.
 * @version 1.0.0
 */

import { Schema, model, index } from 'mongoose'; // v7.0.0
import { INotification, NotificationType, NotificationChannel, NotificationPriority, NotificationStatus } from '../interfaces/notification.interface';
import { IBaseEntity } from '../../shared/interfaces/base.interface';

/**
 * MongoDB schema definition for notifications with comprehensive validation
 * and optimized indexing for high-performance querying
 */
const notificationSchema = new Schema<INotification & IBaseEntity>({
  // Core notification fields
  type: {
    type: String,
    enum: Object.values(NotificationType),
    required: [true, 'Notification type is required'],
    index: true
  },
  channel: {
    type: String,
    enum: Object.values(NotificationChannel),
    required: [true, 'Delivery channel is required'],
    index: true
  },
  priority: {
    type: String,
    enum: Object.values(NotificationPriority),
    required: [true, 'Priority level is required'],
    index: true
  },
  recipients: {
    type: [String],
    required: [true, 'Recipients are required'],
    validate: {
      validator: (recipients: string[]) => recipients.length > 0,
      message: 'At least one recipient is required'
    }
  },

  // Content structure
  content: {
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: 200
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true
    },
    data: {
      type: Map,
      of: Schema.Types.Mixed,
      default: {}
    }
  },

  // Exercise reference and tracking
  exerciseId: {
    type: String,
    required: [true, 'Exercise ID is required'],
    index: true
  },

  // Delivery status tracking
  status: {
    type: String,
    enum: Object.values(NotificationStatus),
    default: NotificationStatus.PENDING,
    index: true
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  lastRetryAt: {
    type: Date,
    sparse: true
  },
  deliveredAt: {
    type: Date,
    sparse: true
  },

  // Metadata and tracking
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  versionKey: false,
  collection: 'notifications'
});

/**
 * Compound indexes for optimized querying patterns
 */
notificationSchema.index(
  { exerciseId: 1, type: 1 },
  { background: true, name: 'exercise_type_idx' }
);

notificationSchema.index(
  { status: 1, priority: -1 },
  { background: true, name: 'status_priority_idx' }
);

notificationSchema.index(
  { status: 1, retryCount: 1, lastRetryAt: 1 },
  { background: true, sparse: true, name: 'delivery_tracking_idx' }
);

/**
 * Pre-save middleware for data validation and timestamp management
 */
notificationSchema.pre('save', function(next) {
  // Update timestamps
  this.updatedAt = new Date();
  
  // Validate retry count
  if (this.retryCount > 5) {
    next(new Error('Maximum retry attempts exceeded'));
    return;
  }

  // Set deliveredAt timestamp when status changes to DELIVERED
  if (this.status === NotificationStatus.DELIVERED && !this.deliveredAt) {
    this.deliveredAt = new Date();
  }

  // Update lastRetryAt when retryCount increases
  if (this.isModified('retryCount') && this.retryCount > 0) {
    this.lastRetryAt = new Date();
  }

  next();
});

/**
 * Static methods for enhanced notification management
 */
notificationSchema.statics = {
  /**
   * Finds pending notifications ready for delivery
   * @param priority Optional priority filter
   * @returns Promise<INotification[]>
   */
  async findPendingNotifications(priority?: NotificationPriority): Promise<INotification[]> {
    const query: any = {
      status: NotificationStatus.PENDING,
      retryCount: { $lt: 5 }
    };
    
    if (priority) {
      query.priority = priority;
    }

    return this.find(query)
      .sort({ priority: -1, createdAt: 1 })
      .lean();
  },

  /**
   * Updates notification delivery status with proper tracking
   * @param id Notification ID
   * @param status New delivery status
   * @param metadata Optional delivery metadata
   */
  async updateDeliveryStatus(
    id: string,
    status: NotificationStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    const update: any = {
      status,
      updatedAt: new Date()
    };

    if (status === NotificationStatus.DELIVERED) {
      update.deliveredAt = new Date();
    }

    if (metadata) {
      update.$set = { metadata };
    }

    await this.updateOne({ _id: id }, update);
  },

  /**
   * Marks a notification for retry with proper tracking
   * @param id Notification ID
   */
  async markAsRetrying(id: string): Promise<void> {
    await this.updateOne(
      { _id: id, retryCount: { $lt: 5 } },
      {
        $inc: { retryCount: 1 },
        $set: {
          status: NotificationStatus.PENDING,
          lastRetryAt: new Date(),
          updatedAt: new Date()
        }
      }
    );
  }
};

/**
 * Notification model with enhanced delivery tracking capabilities
 */
export const NotificationModel = model<INotification>('Notification', notificationSchema);