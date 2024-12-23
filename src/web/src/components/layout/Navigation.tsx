/**
 * Navigation Component for GameDay Platform
 * Implements Material Design 3.0 principles with enhanced role-based access control,
 * accessibility features, and responsive design.
 * @version 1.0.0
 */

import React, { useMemo, useCallback } from 'react';
import { List, ListItem, ListItemIcon, ListItemText, useTheme } from '@mui/material'; // ^5.0.0
import { useLocation, useNavigate } from 'react-router-dom'; // ^6.0.0
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import ExtensionIcon from '@mui/icons-material/Extension';
import AddIcon from '@mui/icons-material/Add';

import { MAIN_ROUTES, EXERCISE_ROUTES } from '../../constants/routes.constants';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth.types';

// Interface definitions
interface NavigationProps {
  onItemClick?: () => void;
  className?: string;
  customItems?: NavigationItem[];
}

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: UserRole[];
  children?: NavigationItem[];
  permissions?: string[];
  analyticsId: string;
}

/**
 * Default navigation items with role-based access control
 */
const defaultNavigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: MAIN_ROUTES.DASHBOARD,
    icon: <DashboardIcon />,
    roles: [
      UserRole.SYSTEM_ADMIN,
      UserRole.EXERCISE_ADMIN,
      UserRole.FACILITATOR,
      UserRole.PARTICIPANT,
      UserRole.OBSERVER
    ],
    analyticsId: 'nav_dashboard'
  },
  {
    id: 'exercises',
    label: 'Exercises',
    path: EXERCISE_ROUTES.LIST,
    icon: <ExtensionIcon />,
    roles: [
      UserRole.SYSTEM_ADMIN,
      UserRole.EXERCISE_ADMIN,
      UserRole.FACILITATOR,
      UserRole.PARTICIPANT
    ],
    children: [
      {
        id: 'create-exercise',
        label: 'Create Exercise',
        path: EXERCISE_ROUTES.CREATE,
        icon: <AddIcon />,
        roles: [UserRole.SYSTEM_ADMIN, UserRole.EXERCISE_ADMIN],
        permissions: ['exercise.create'],
        analyticsId: 'nav_exercise_create'
      }
    ],
    analyticsId: 'nav_exercises'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    path: MAIN_ROUTES.ANALYTICS,
    icon: <AssessmentIcon />,
    roles: [UserRole.SYSTEM_ADMIN, UserRole.EXERCISE_ADMIN, UserRole.FACILITATOR],
    permissions: ['analytics.view'],
    analyticsId: 'nav_analytics'
  },
  {
    id: 'settings',
    label: 'Settings',
    path: MAIN_ROUTES.SETTINGS,
    icon: <SettingsIcon />,
    roles: [UserRole.SYSTEM_ADMIN, UserRole.EXERCISE_ADMIN],
    permissions: ['settings.manage'],
    analyticsId: 'nav_settings'
  }
];

/**
 * Enhanced Navigation component with role-based filtering and analytics
 */
export const Navigation: React.FC<NavigationProps> = ({
  onItemClick,
  className,
  customItems
}) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, checkPermission } = useAuth();

  /**
   * Filter navigation items based on user role and permissions
   */
  const filteredItems = useMemo(() => {
    if (!isAuthenticated || !user) return [];

    const filterItem = async (item: NavigationItem): Promise<boolean> => {
      const hasRole = item.roles.includes(user.role);
      const hasPermission = !item.permissions || 
        await Promise.all(item.permissions.map(p => checkPermission({ 
          role: user.role,
          resource: p.split('.')[0],
          action: p.split('.')[1]
        })))
        .then(results => results.every(Boolean));

      return hasRole && hasPermission;
    };

    const filterItems = async (items: NavigationItem[]): Promise<NavigationItem[]> => {
      const filteredResults = await Promise.all(
        items.map(async item => {
          const allowed = await filterItem(item);
          if (!allowed) return null;

          if (item.children) {
            const filteredChildren = await filterItems(item.children);
            return filteredChildren.length > 0 
              ? { ...item, children: filteredChildren }
              : null;
          }

          return item;
        })
      );

      return filteredResults.filter((item): item is NavigationItem => item !== null);
    };

    return filterItems(customItems || defaultNavigationItems);
  }, [isAuthenticated, user, customItems, checkPermission]);

  /**
   * Handle navigation with analytics tracking
   */
  const handleNavigation = useCallback((path: string, analyticsId: string) => {
    // Track navigation event
    if (window.analytics) {
      window.analytics.track('Navigation Click', {
        navigationId: analyticsId,
        path,
        timestamp: new Date().toISOString()
      });
    }

    navigate(path);
    onItemClick?.();
  }, [navigate, onItemClick]);

  /**
   * Check if navigation item is active
   */
  const isItemActive = useCallback((path: string, item: NavigationItem): boolean => {
    if (location.pathname === path) return true;
    if (item.children) {
      return item.children.some(child => location.pathname === child.path);
    }
    return false;
  }, [location]);

  /**
   * Render navigation item with children
   */
  const renderNavigationItem = (item: NavigationItem) => {
    const isActive = isItemActive(item.path, item);

    return (
      <React.Fragment key={item.id}>
        <ListItem
          button
          onClick={() => handleNavigation(item.path, item.analyticsId)}
          selected={isActive}
          sx={{
            borderRadius: 1,
            mb: 0.5,
            color: isActive ? theme.palette.primary.main : 'inherit',
            '&.Mui-selected': {
              backgroundColor: theme.palette.action.selected
            }
          }}
          aria-label={item.label}
        >
          <ListItemIcon sx={{ color: isActive ? theme.palette.primary.main : 'inherit' }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.label} />
        </ListItem>
        {item.children && isActive && (
          <List component="div" disablePadding sx={{ pl: 4 }}>
            {item.children.map(child => renderNavigationItem(child))}
          </List>
        )}
      </React.Fragment>
    );
  };

  if (!isAuthenticated) return null;

  return (
    <List
      component="nav"
      className={className}
      sx={{
        width: '100%',
        maxWidth: 360,
        bgcolor: 'background.paper',
        p: 2
      }}
      aria-label="main navigation"
    >
      {filteredItems.map(item => renderNavigationItem(item))}
    </List>
  );
};

export default Navigation;