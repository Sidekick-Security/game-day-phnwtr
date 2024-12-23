import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { styled } from '@mui/material/styles';
import { 
  Tabs, 
  Tab, 
  Box, 
  Paper, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import { useMediaQuery } from '@mui/material';

import Layout from '../components/layout/Layout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { UserRole } from '../types/auth.types';

// Lazy loaded settings components for better performance
const ProfileSettings = React.lazy(() => import('../components/settings/ProfileSettings'));
const OrganizationSettings = React.lazy(() => import('../components/settings/OrganizationSettings'));
const TeamSettings = React.lazy(() => import('../components/settings/TeamSettings'));
const NotificationSettings = React.lazy(() => import('../components/settings/NotificationSettings'));
const IntegrationSettings = React.lazy(() => import('../components/settings/IntegrationSettings'));

// Settings tabs configuration with role-based access control
const SETTINGS_TABS = [
  {
    id: 'profile',
    label: 'Profile',
    requiredRole: UserRole.PARTICIPANT,
    analyticsId: 'settings_profile_tab',
    ariaLabel: 'Profile settings tab',
    component: ProfileSettings
  },
  {
    id: 'organization',
    label: 'Organization',
    requiredRole: UserRole.SYSTEM_ADMIN,
    analyticsId: 'settings_org_tab',
    ariaLabel: 'Organization settings tab',
    component: OrganizationSettings
  },
  {
    id: 'teams',
    label: 'Teams',
    requiredRole: UserRole.EXERCISE_ADMIN,
    analyticsId: 'settings_teams_tab',
    ariaLabel: 'Team settings tab',
    component: TeamSettings
  },
  {
    id: 'notifications',
    label: 'Notifications',
    requiredRole: UserRole.PARTICIPANT,
    analyticsId: 'settings_notifications_tab',
    ariaLabel: 'Notification settings tab',
    component: NotificationSettings
  },
  {
    id: 'integrations',
    label: 'Integrations',
    requiredRole: UserRole.SYSTEM_ADMIN,
    analyticsId: 'settings_integrations_tab',
    ariaLabel: 'Integration settings tab',
    component: IntegrationSettings
  }
] as const;

// Styled components with enhanced accessibility
const StyledTabs = styled(Tabs)(({ theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(3),
  '& .MuiTabs-indicator': {
    backgroundColor: theme.palette.primary.main,
  },
  '& .MuiTab-root': {
    minHeight: 48,
    '&.Mui-selected': {
      color: theme.palette.primary.main,
    },
    '&.Mui-focusVisible': {
      backgroundColor: theme.palette.action.focus,
    },
  },
}));

const SettingsContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
}));

/**
 * Enhanced Settings page component with comprehensive error handling,
 * role-based access control, and accessibility features
 */
const Settings: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.theme.breakpoints.down('sm'));
  const { user, checkPermission } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Filter tabs based on user role and permissions
  const availableTabs = useMemo(() => {
    return SETTINGS_TABS.filter(tab => {
      return user?.role && (
        user.role === UserRole.SYSTEM_ADMIN || 
        user.role <= tab.requiredRole
      );
    });
  }, [user]);

  // Enhanced tab change handler with analytics and error handling
  const handleTabChange = useCallback(async (event: React.SyntheticEvent, newValue: number) => {
    try {
      const selectedTab = availableTabs[newValue];
      
      // Check permissions for the selected tab
      const hasPermission = await checkPermission({
        role: user?.role || UserRole.OBSERVER,
        resource: 'settings',
        action: selectedTab.id
      });

      if (!hasPermission) {
        throw new Error('Insufficient permissions to access this section');
      }

      // Track tab change in analytics
      if (window.analytics) {
        window.analytics.track('Settings Tab Changed', {
          tabId: selectedTab.id,
          analyticsId: selectedTab.analyticsId,
          userId: user?.id,
          timestamp: new Date().toISOString()
        });
      }

      setActiveTab(newValue);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Settings tab change error:', err);
    }
  }, [availableTabs, checkPermission, user]);

  // Error boundary handler
  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Settings error:', error, errorInfo);
    setError('An error occurred while loading settings');
  }, []);

  const ActiveComponent = availableTabs[activeTab]?.component;

  return (
    <Layout>
      <ErrorBoundary onError={handleError}>
        <Box
          component="main"
          role="main"
          aria-label="Settings page"
        >
          <SettingsContainer>
            {error && (
              <Alert 
                severity="error" 
                onClose={() => setError(null)}
                sx={{ marginBottom: 2 }}
              >
                {error}
              </Alert>
            )}

            <StyledTabs
              value={activeTab}
              onChange={handleTabChange}
              variant={isMobile ? 'scrollable' : 'standard'}
              scrollButtons={isMobile ? 'auto' : false}
              aria-label="Settings navigation tabs"
              role="navigation"
            >
              {availableTabs.map((tab) => (
                <Tab
                  key={tab.id}
                  label={tab.label}
                  id={`settings-tab-${tab.id}`}
                  aria-controls={`settings-tabpanel-${tab.id}`}
                  aria-label={tab.ariaLabel}
                />
              ))}
            </StyledTabs>

            <Box
              role="tabpanel"
              id={`settings-tabpanel-${availableTabs[activeTab]?.id}`}
              aria-labelledby={`settings-tab-${availableTabs[activeTab]?.id}`}
            >
              <Suspense
                fallback={
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    minHeight={200}
                  >
                    <CircularProgress aria-label="Loading settings content" />
                  </Box>
                }
              >
                {ActiveComponent && <ActiveComponent />}
              </Suspense>
            </Box>
          </SettingsContainer>
        </Box>
      </ErrorBoundary>
    </Layout>
  );
};

export default Settings;