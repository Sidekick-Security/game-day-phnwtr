/**
 * NotificationSettings Component
 * Manages user notification preferences across multiple channels with enhanced error handling
 * and accessibility features.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Switch,
  FormGroup,
  FormControlLabel,
  CircularProgress,
  Alert,
  Typography,
  Divider,
  Box,
  Tooltip,
  IconButton,
} from '@mui/material'; // ^5.14.0
import InfoIcon from '@mui/icons-material/Info';
import ErrorIcon from '@mui/icons-material/Error';

import {
  NotificationChannel,
  NotificationPriority
} from '../../types/notification.types';
import { useNotification } from '../../hooks/useNotification';
import { NotificationService } from '../../services/notification.service';

// Initialize notification service
const notificationService = new NotificationService();

interface ChannelState {
  enabled: boolean;
  loading: boolean;
  error: string | null;
}

interface NotificationSettingsProps {
  className?: string;
  onSettingsChange?: (settings: Record<NotificationChannel, boolean>) => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  className,
  onSettingsChange
}) => {
  // Channel preferences state with loading and error states
  const [channelStates, setChannelStates] = useState<Record<NotificationChannel, ChannelState>>({
    [NotificationChannel.IN_APP]: { enabled: true, loading: false, error: null },
    [NotificationChannel.EMAIL]: { enabled: true, loading: false, error: null },
    [NotificationChannel.TEAMS]: { enabled: false, loading: false, error: null },
    [NotificationChannel.SLACK]: { enabled: false, loading: false, error: null }
  });

  // Priority preferences state
  const [priorityPreferences, setPriorityPreferences] = useState<Record<NotificationPriority, boolean>>({
    [NotificationPriority.HIGH]: true,
    [NotificationPriority.MEDIUM]: true,
    [NotificationPriority.LOW]: true
  });

  // Global error state
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Hook for notification management
  const { error: hookError, isLoading } = useNotification();

  /**
   * Handles toggling notification channels with optimistic updates
   */
  const handleChannelToggle = useCallback(async (
    channel: NotificationChannel,
    enabled: boolean
  ) => {
    // Update state optimistically
    setChannelStates(prev => ({
      ...prev,
      [channel]: { ...prev[channel], enabled, loading: true, error: null }
    }));

    try {
      // Prepare new preferences
      const newPreferences = Object.entries(channelStates).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: key === channel ? enabled : value.enabled
        }),
        {} as Record<NotificationChannel, boolean>
      );

      // Validate preferences
      await notificationService.validatePreferences(newPreferences);
      
      // Update preferences on server
      await notificationService.updateNotificationPreferences(newPreferences);

      // Notify parent component if callback provided
      onSettingsChange?.(newPreferences);

      setGlobalError(null);
    } catch (error) {
      // Revert optimistic update on error
      setChannelStates(prev => ({
        ...prev,
        [channel]: {
          ...prev[channel],
          enabled: !enabled,
          error: error instanceof Error ? error.message : 'Failed to update channel preferences'
        }
      }));

      setGlobalError('Failed to update notification preferences');
    } finally {
      // Clear loading state
      setChannelStates(prev => ({
        ...prev,
        [channel]: { ...prev[channel], loading: false }
      }));
    }
  }, [channelStates, onSettingsChange]);

  /**
   * Handles toggling notification priorities
   */
  const handlePriorityToggle = useCallback(async (
    priority: NotificationPriority,
    enabled: boolean
  ) => {
    setPriorityPreferences(prev => ({
      ...prev,
      [priority]: enabled
    }));

    try {
      // Additional priority-specific logic here
      // For now, we just update the local state
    } catch (error) {
      setPriorityPreferences(prev => ({
        ...prev,
        [priority]: !enabled
      }));
      setGlobalError('Failed to update priority preferences');
    }
  }, []);

  /**
   * Channel descriptions for tooltips
   */
  const channelDescriptions = useMemo(() => ({
    [NotificationChannel.IN_APP]: 'Notifications within the GameDay Platform interface',
    [NotificationChannel.EMAIL]: 'Email notifications for important updates',
    [NotificationChannel.TEAMS]: 'Notifications via Microsoft Teams integration',
    [NotificationChannel.SLACK]: 'Notifications via Slack integration'
  }), []);

  /**
   * Priority descriptions for tooltips
   */
  const priorityDescriptions = useMemo(() => ({
    [NotificationPriority.HIGH]: 'Critical updates requiring immediate attention',
    [NotificationPriority.MEDIUM]: 'Important updates that should be addressed soon',
    [NotificationPriority.LOW]: 'Informational updates and minor notifications'
  }), []);

  // Effect to handle hook errors
  useEffect(() => {
    if (hookError) {
      setGlobalError(hookError instanceof Error ? hookError.message : 'An error occurred');
    }
  }, [hookError]);

  return (
    <Card className={className} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Notification Preferences
      </Typography>
      
      {globalError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={() => setGlobalError(null)}
            >
              <ErrorIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {globalError}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Notification Channels
        </Typography>
        <FormGroup>
          {Object.entries(channelStates).map(([channel, state]) => (
            <FormControlLabel
              key={channel}
              control={
                <Switch
                  checked={state.enabled}
                  onChange={(e) => handleChannelToggle(channel as NotificationChannel, e.target.checked)}
                  disabled={state.loading || isLoading}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {channel}
                  <Tooltip title={channelDescriptions[channel as NotificationChannel]}>
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {state.loading && <CircularProgress size={16} sx={{ ml: 1 }} />}
                </Box>
              }
            />
          ))}
        </FormGroup>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Priority Levels
        </Typography>
        <FormGroup>
          {Object.entries(priorityPreferences).map(([priority, enabled]) => (
            <FormControlLabel
              key={priority}
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => handlePriorityToggle(priority as NotificationPriority, e.target.checked)}
                  disabled={isLoading}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {priority}
                  <Tooltip title={priorityDescriptions[priority as NotificationPriority]}>
                    <IconButton size="small" sx={{ ml: 1 }}>
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
          )}
        </FormGroup>
      </Box>
    </Card>
  );
};

export default NotificationSettings;