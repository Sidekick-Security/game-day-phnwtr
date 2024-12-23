/**
 * Enterprise-grade Sidebar Component for GameDay Platform
 * Implements Material Design 3.0 principles with enhanced security and monitoring
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { 
  Drawer, 
  useMediaQuery, 
  useTheme,
  Box,
  IconButton,
  Divider
} from '@mui/material'; // ^5.0.0
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'; // ^5.0.0
import Navigation from './Navigation';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth.types';

// Constants for styling and responsiveness
const DRAWER_WIDTH = 280;
const DRAWER_WIDTH_MOBILE = '100%';
const TRANSITION_DURATION = 225;

// Enhanced styled drawer with enterprise features
const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    borderRight: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: TRANSITION_DURATION,
    }),
    [theme.breakpoints.down('sm')]: {
      width: DRAWER_WIDTH_MOBILE,
    },
    overflowX: 'hidden',
  },
  '& .MuiDrawer-paperAnchorLeft': {
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

// Enhanced header component for the drawer
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

// Interface definitions
interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
  className?: string;
}

/**
 * Enhanced Sidebar component with role-based access and monitoring
 * @param {SidebarProps} props - Component props
 * @returns {JSX.Element} Rendered sidebar component
 */
export const Sidebar: React.FC<SidebarProps> = ({
  open,
  onClose,
  onToggle,
  className
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated, user, checkPermission } = useAuth();

  // Track sidebar interactions for analytics
  useEffect(() => {
    if (window.analytics) {
      window.analytics.track('Sidebar State Change', {
        isOpen: open,
        isMobile,
        timestamp: new Date().toISOString(),
        userId: user?.id
      });
    }
  }, [open, isMobile, user]);

  /**
   * Handle navigation with security checks and analytics
   */
  const handleNavigation = useCallback(async (path: string) => {
    try {
      // Validate user permissions for the route
      const hasAccess = await checkPermission({
        role: user?.role || UserRole.OBSERVER,
        resource: 'navigation',
        action: 'access'
      });

      if (!hasAccess) {
        console.error('Navigation access denied:', path);
        return;
      }

      // Track navigation event
      if (window.analytics) {
        window.analytics.track('Navigation', {
          path,
          userId: user?.id,
          timestamp: new Date().toISOString()
        });
      }

      // Close sidebar on mobile after navigation
      if (isMobile) {
        onClose();
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [checkPermission, user, isMobile, onClose]);

  /**
   * Memoized drawer variant based on screen size and authentication
   */
  const drawerVariant = useMemo(() => {
    if (!isAuthenticated) return 'temporary';
    return isMobile ? 'temporary' : 'permanent';
  }, [isAuthenticated, isMobile]);

  if (!isAuthenticated) return null;

  return (
    <StyledDrawer
      variant={drawerVariant}
      open={open}
      onClose={onClose}
      className={className}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
      sx={{
        '& .MuiDrawer-paper': {
          width: isMobile ? DRAWER_WIDTH_MOBILE : DRAWER_WIDTH,
        },
      }}
    >
      <DrawerHeader>
        <IconButton 
          onClick={onToggle}
          aria-label={open ? 'Close sidebar' : 'Open sidebar'}
        >
          <ChevronLeftIcon />
        </IconButton>
      </DrawerHeader>
      
      <Divider />

      <Box
        role="navigation"
        aria-label="Main navigation"
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        <Navigation
          onItemClick={handleNavigation}
          className="sidebar-navigation"
        />
      </Box>

      <Divider />

      <Box
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {/* Additional footer content can be added here */}
      </Box>
    </StyledDrawer>
  );
};

export default Sidebar;