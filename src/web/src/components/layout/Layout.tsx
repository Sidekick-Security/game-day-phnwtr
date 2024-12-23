import React, { useState, useCallback, useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

import AppBar from './AppBar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '../../hooks/useAuth';
import ErrorBoundary from '../common/ErrorBoundary';

// Layout component props interface
interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  role?: string;
}

// Styled root container with enhanced accessibility
const LayoutRoot = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  position: 'relative',
  overflow: 'hidden',
  transition: theme.transitions.create(['background-color'], {
    duration: theme.transitions.duration.standard,
  }),
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
  '@media print': {
    backgroundColor: '#ffffff',
  },
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
  },
}));

// Styled main content container with responsive design
const MainContent = styled(Container)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: 64, // AppBar height
  marginLeft: {
    sm: 240, // Sidebar width
    xs: 0,
  },
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.easeOut,
    duration: theme.transitions.duration.standard,
  }),
  maxWidth: {
    xs: '100%',
    sm: '540px',
    md: '720px',
    lg: '1140px',
    xl: '1440px',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
  '@media print': {
    margin: 0,
    padding: theme.spacing(2),
  },
}));

/**
 * Enhanced Layout component with comprehensive security and accessibility features
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const Layout: React.FC<LayoutProps> = ({
  children,
  className,
  role = 'main',
}) => {
  // Hooks for theme, auth, and responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  // Handle sidebar state with performance optimization
  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Close sidebar on mobile when route changes
  const handleSidebarClose = useCallback(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  // Update sidebar state on screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  // Track layout interactions for analytics
  useEffect(() => {
    if (window.analytics) {
      window.analytics.track('Layout Rendered', {
        isMobile,
        sidebarOpen,
        userId: user?.id,
        timestamp: new Date().toISOString(),
      });
    }
  }, [isMobile, sidebarOpen, user]);

  // Error boundary handler
  const handleError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('Layout Error:', error, errorInfo);
    // Additional error reporting logic here
  }, []);

  return (
    <ErrorBoundary onError={handleError}>
      <LayoutRoot className={className}>
        {isAuthenticated && (
          <>
            <AppBar
              title="GameDay Platform"
              onMenuClick={handleSidebarToggle}
              aria-label="Main navigation"
            />
            <Sidebar
              open={sidebarOpen}
              onClose={handleSidebarClose}
              onToggle={handleSidebarToggle}
            />
          </>
        )}

        <MainContent
          component="main"
          role={role}
          aria-label="Main content"
          sx={{
            marginLeft: {
              sm: isAuthenticated ? (sidebarOpen ? 240 : 0) : 0,
              xs: 0,
            },
          }}
        >
          {children}
        </MainContent>

        <Footer
          showLegalLinks={true}
          aria-label="Footer"
        />
      </LayoutRoot>
    </ErrorBoundary>
  );
};

// Memoize the Layout component for performance
export default React.memo(Layout);