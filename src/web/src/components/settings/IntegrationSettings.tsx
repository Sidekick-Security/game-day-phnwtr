import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Switch, 
  FormGroup, 
  FormControlLabel, 
  Alert, 
  CircularProgress 
} from '@mui/material';
import { styled } from '@mui/material/styles';

import { Button } from '../common/Button';
import { NotificationService } from '../../services/notification.service';
import ErrorBoundary from '../common/ErrorBoundary';
import { handleApiError } from '../../utils/api.utils';
import { NotificationChannel } from '../../types/notification.types';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  margin: theme.spacing(2),
  padding: theme.spacing(2),
  '& .MuiCardContent-root:last-child': {
    paddingBottom: theme.spacing(2),
  },
}));

const IntegrationContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}));

const IntegrationHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: theme.spacing(2),
}));

const LoadingOverlay = styled('div')({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  zIndex: 1,
});

// Integration service configuration
const INTEGRATION_SERVICES = [
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Teams integration for notifications and exercises',
    icon: 'teams-icon',
    healthCheck: '/api/v1/integrations/teams/health',
    requiredPermissions: ['integration:manage', 'teams:connect'],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Slack integration for notifications and exercises',
    icon: 'slack-icon',
    healthCheck: '/api/v1/integrations/slack/health',
    requiredPermissions: ['integration:manage', 'slack:connect'],
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Calendar integration for exercise scheduling',
    icon: 'calendar-icon',
    healthCheck: '/api/v1/integrations/gcal/health',
    requiredPermissions: ['integration:manage', 'calendar:connect'],
  },
  {
    id: 'outlook',
    name: 'Outlook',
    description: 'Outlook integration for exercise scheduling',
    icon: 'outlook-icon',
    healthCheck: '/api/v1/integrations/outlook/health',
    requiredPermissions: ['integration:manage', 'outlook:connect'],
  },
] as const;

interface IntegrationStatus {
  enabled: boolean;
  loading: boolean;
  error?: string;
  health?: 'healthy' | 'unhealthy';
}

interface IntegrationSettings {
  [key: string]: IntegrationStatus;
}

const IntegrationSettings: React.FC = () => {
  const [integrationSettings, setIntegrationSettings] = useState<IntegrationSettings>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const notificationService = new NotificationService();

  // Initialize integration settings
  useEffect(() => {
    const initializeIntegrations = async () => {
      try {
        const settings: IntegrationSettings = {};
        for (const service of INTEGRATION_SERVICES) {
          settings[service.id] = {
            enabled: false,
            loading: false,
            health: undefined,
          };
        }
        setIntegrationSettings(settings);
        await fetchIntegrationStatuses();
      } catch (error) {
        const apiError = handleApiError(error);
        setGlobalError(apiError.message);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeIntegrations();
  }, []);

  // Fetch current integration statuses
  const fetchIntegrationStatuses = async () => {
    try {
      const updatedSettings = { ...integrationSettings };
      
      for (const service of INTEGRATION_SERVICES) {
        const response = await fetch(service.healthCheck);
        const health = response.ok ? 'healthy' : 'unhealthy';
        
        updatedSettings[service.id] = {
          ...updatedSettings[service.id],
          health,
        };
      }
      
      setIntegrationSettings(updatedSettings);
    } catch (error) {
      const apiError = handleApiError(error);
      setGlobalError(apiError.message);
    }
  };

  // Handle integration toggle
  const handleIntegrationToggle = useCallback(async (serviceId: string, enabled: boolean) => {
    setIntegrationSettings(prev => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], loading: true, error: undefined },
    }));

    try {
      // Update integration status
      await notificationService.updateNotificationPreferences({
        ...Object.keys(NotificationChannel).reduce((acc, channel) => ({
          ...acc,
          [channel]: channel.toLowerCase() === serviceId ? enabled : false,
        }), {}),
      });

      // Update local state
      setIntegrationSettings(prev => ({
        ...prev,
        [serviceId]: {
          ...prev[serviceId],
          enabled,
          loading: false,
          error: undefined,
        },
      }));

      // Verify integration health after enabling
      if (enabled) {
        await fetchIntegrationStatuses();
      }
    } catch (error) {
      const apiError = handleApiError(error);
      setIntegrationSettings(prev => ({
        ...prev,
        [serviceId]: {
          ...prev[serviceId],
          loading: false,
          error: apiError.message,
        },
      }));
    }
  }, []);

  if (isInitializing) {
    return (
      <LoadingOverlay>
        <CircularProgress />
      </LoadingOverlay>
    );
  }

  return (
    <ErrorBoundary>
      <IntegrationContainer>
        {globalError && (
          <Alert severity="error" onClose={() => setGlobalError(null)}>
            {globalError}
          </Alert>
        )}

        <IntegrationHeader>
          <Typography variant="h5" component="h2">
            Integration Settings
          </Typography>
          <Button
            variant="outlined"
            onClick={() => fetchIntegrationStatuses()}
            aria-label="Refresh integration statuses"
          >
            Refresh Status
          </Button>
        </IntegrationHeader>

        {INTEGRATION_SERVICES.map((service) => (
          <StyledCard key={service.id}>
            <CardContent>
              {integrationSettings[service.id]?.loading && (
                <LoadingOverlay>
                  <CircularProgress size={24} />
                </LoadingOverlay>
              )}

              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={integrationSettings[service.id]?.enabled || false}
                      onChange={(e) => handleIntegrationToggle(service.id, e.target.checked)}
                      disabled={integrationSettings[service.id]?.loading}
                      color="primary"
                      inputProps={{
                        'aria-label': `Toggle ${service.name} integration`,
                      }}
                    />
                  }
                  label={
                    <Typography variant="subtitle1">
                      {service.name}
                      {integrationSettings[service.id]?.health && (
                        <Typography
                          component="span"
                          color={integrationSettings[service.id].health === 'healthy' ? 'success.main' : 'error.main'}
                          sx={{ ml: 1 }}
                        >
                          ({integrationSettings[service.id].health})
                        </Typography>
                      )}
                    </Typography>
                  }
                />
              </FormGroup>

              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {service.description}
              </Typography>

              {integrationSettings[service.id]?.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {integrationSettings[service.id].error}
                </Alert>
              )}
            </CardContent>
          </StyledCard>
        ))}
      </IntegrationContainer>
    </ErrorBoundary>
  );
};

export default IntegrationSettings;