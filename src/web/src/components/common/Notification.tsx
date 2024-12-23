import React, { memo, useCallback, useEffect } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Paper, Typography, IconButton, useMediaQuery } from '@mui/material';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

// Internal imports
import {
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus
} from '../../types/notification.types';
import {
  INotification,
  INotificationContent
} from '../../interfaces/notification.interface';
import Icon from './Icon';

// Props interface with accessibility enhancements
interface NotificationProps {
  notification: INotification;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
  className?: string;
  role?: string;
  autoAnnounce?: boolean;
}

// Styled components with Material Design 3.0 principles
const NotificationContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  display: 'flex',
  alignItems: 'flex-start',
  gap: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  transition: theme.transitions.create(['transform', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  position: 'relative',
  minHeight: '64px',
  touchAction: 'manipulation',
  
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-1px)',
  },

  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    transform: 'none',
  },

  '@media (hover: none)': {
    '&:hover': {
      transform: 'none',
      boxShadow: theme.shadows[2],
    },
  },
}));

const NotificationContent = styled('div')(({ theme }) => ({
  flex: 1,
  minWidth: 0, // Prevents flex item from overflowing
}));

const NotificationActions = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(1),
  marginLeft: 'auto',
}));

// Helper function to get notification icon based on type
const getNotificationIcon = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.EXERCISE_START:
      return 'exercise';
    case NotificationType.SYSTEM_ALERT:
      return 'warning';
    default:
      return 'notification';
  }
};

// Helper function to get priority-based styles
const getPriorityStyles = (priority: NotificationPriority, theme: any) => {
  switch (priority) {
    case NotificationPriority.HIGH:
      return {
        borderLeft: `4px solid ${theme.palette.error.main}`,
        backgroundColor: theme.palette.error.light,
      };
    case NotificationPriority.MEDIUM:
      return {
        borderLeft: `4px solid ${theme.palette.warning.main}`,
        backgroundColor: theme.palette.warning.light,
      };
    default:
      return {
        borderLeft: `4px solid ${theme.palette.info.main}`,
        backgroundColor: theme.palette.info.light,
      };
  }
};

// Animation variants
const notificationVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -100 },
};

/**
 * Enhanced Notification component with accessibility and animation features
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const Notification = memo(({
  notification,
  onRead,
  onArchive,
  className,
  role = 'alert',
  autoAnnounce = true,
}: NotificationProps) => {
  const theme = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Handlers
  const handleRead = useCallback(() => {
    onRead(notification.id);
  }, [notification.id, onRead]);

  const handleArchive = useCallback(() => {
    onArchive(notification.id);
  }, [notification.id, onArchive]);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handleRead();
    }
  }, [handleRead]);

  // Screen reader announcement
  useEffect(() => {
    if (autoAnnounce && notification.status === NotificationStatus.UNREAD) {
      const announcement = `New notification: ${notification.content.title}`;
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'polite');
      announcer.textContent = announcement;
      document.body.appendChild(announcer);
      
      return () => {
        document.body.removeChild(announcer);
      };
    }
  }, [notification, autoAnnounce]);

  const priorityStyles = getPriorityStyles(notification.priority, theme);
  const iconName = getNotificationIcon(notification.type);

  return (
    <AnimatePresence>
      <motion.div
        initial={shouldReduceMotion ? false : "initial"}
        animate="animate"
        exit="exit"
        variants={notificationVariants}
        transition={{ type: "spring", stiffness: 100, damping: 15 }}
      >
        <NotificationContainer
          className={className}
          role={role}
          aria-live={notification.priority === NotificationPriority.HIGH ? 'assertive' : 'polite'}
          aria-atomic="true"
          tabIndex={0}
          onKeyPress={handleKeyPress}
          sx={priorityStyles}
          elevation={notification.status === NotificationStatus.UNREAD ? 3 : 1}
        >
          <Icon
            name={iconName}
            size={isMobile ? "large" : "medium"}
            ariaLabel={`${notification.type} notification`}
            color={notification.priority === NotificationPriority.HIGH ? "error" : "primary"}
          />

          <NotificationContent>
            <Typography
              variant="subtitle1"
              component="h3"
              gutterBottom
              sx={{ fontWeight: notification.status === NotificationStatus.UNREAD ? 600 : 400 }}
            >
              {notification.content.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {notification.content.message}
            </Typography>
            {notification.metadata.exerciseId && (
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Exercise ID: {notification.metadata.exerciseId}
              </Typography>
            )}
          </NotificationContent>

          <NotificationActions>
            {notification.status === NotificationStatus.UNREAD && (
              <IconButton
                onClick={handleRead}
                aria-label="Mark as read"
                size={isMobile ? "large" : "medium"}
                color="primary"
              >
                <Icon name="checkmark" ariaLabel="Mark as read" />
              </IconButton>
            )}
            <IconButton
              onClick={handleArchive}
              aria-label="Archive notification"
              size={isMobile ? "large" : "medium"}
              color="default"
            >
              <Icon name="archive" ariaLabel="Archive" />
            </IconButton>
          </NotificationActions>
        </NotificationContainer>
      </motion.div>
    </AnimatePresence>
  );
});

Notification.displayName = 'Notification';

export default Notification;