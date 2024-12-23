import React, { useCallback, useState, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { 
  AppBar as MuiAppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  useMediaQuery,
  Menu,
  MenuItem,
  Divider,
  Box
} from '@mui/material'; // ^5.0.0

import Avatar from '../common/Avatar';
import Button from '../common/Button';
import Icon from '../common/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth.types';

// Interface for AppBar props with accessibility requirements
interface AppBarProps {
  title: string;
  onMenuClick: () => void;
  className?: string;
  ariaLabel?: string;
  testId?: string;
}

// Enhanced styled AppBar with theme support and accessibility features
const StyledAppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => !['ariaLabel'].includes(prop as string),
})(({ theme }) => ({
  position: 'fixed',
  zIndex: theme.zIndex.appBar,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[2],
  transition: theme.transitions.create(['background-color']),
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
}));

// Responsive toolbar with enhanced styling
const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(0, 2),
  minHeight: {
    xs: '56px',
    sm: '64px',
  },
  gap: theme.spacing(2),
}));

// User menu items with role-based access control
const USER_MENU_ITEMS = [
  { label: 'Profile', icon: 'user', roles: [UserRole.SYSTEM_ADMIN, UserRole.EXERCISE_ADMIN, UserRole.FACILITATOR, UserRole.PARTICIPANT] },
  { label: 'Settings', icon: 'settings', roles: [UserRole.SYSTEM_ADMIN, UserRole.EXERCISE_ADMIN] },
  { label: 'Help', icon: 'help', roles: ['*'] },
];

/**
 * Enterprise-grade AppBar component with comprehensive accessibility support
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const AppBar: React.FC<AppBarProps> = ({
  title,
  onMenuClick,
  className,
  ariaLabel = 'Main navigation',
  testId = 'app-bar',
}) => {
  // Hooks for theme, auth, and responsive design
  const { theme, themeMode, setThemeMode, prefersReducedMotion } = useTheme();
  const { user, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // User menu state management
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Keyboard navigation handlers
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setAnchorEl(null);
      setIsMenuOpen(false);
    }
  }, []);

  // Menu handlers with security considerations
  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setIsMenuOpen(true);
  }, []);

  const handleMenuClose = useCallback(() => {
    setAnchorEl(null);
    setIsMenuOpen(false);
  }, []);

  // Secure logout handler
  const handleLogout = useCallback(async () => {
    try {
      handleMenuClose();
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout]);

  // Theme toggle with animation consideration
  const handleThemeToggle = useCallback(() => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  }, [themeMode, setThemeMode]);

  // Effect for handling keyboard navigation
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown as any);
    return () => {
      document.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [handleKeyDown]);

  return (
    <StyledAppBar 
      position="fixed" 
      className={className}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      <StyledToolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="Open menu"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <Icon name="menu" ariaLabel="Menu" />
        </IconButton>

        <Typography
          variant="h6"
          component="h1"
          sx={{ flexGrow: 1 }}
          aria-label={`${title} application`}
        >
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            color="inherit"
            aria-label={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}
            onClick={handleThemeToggle}
            sx={{ 
              transition: prefersReducedMotion ? 'none' : 'all 0.2s',
            }}
          >
            <Icon 
              name={themeMode === 'light' ? 'darkMode' : 'lightMode'} 
              ariaLabel={`${themeMode === 'light' ? 'Dark' : 'Light'} mode`}
            />
          </IconButton>

          {user && (
            <>
              <Button
                aria-controls={isMenuOpen ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
                onClick={handleMenuOpen}
                startIcon={
                  <Avatar
                    src={user.profileUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    name={`${user.firstName} ${user.lastName}`}
                    size="small"
                  />
                }
                variant="text"
                color="inherit"
              >
                {!isMobile && `${user.firstName} ${user.lastName}`}
              </Button>

              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                MenuListProps={{
                  'aria-label': 'User account menu',
                  role: 'menu',
                }}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                {USER_MENU_ITEMS.map((item) => (
                  item.roles.includes('*') || item.roles.includes(user.role) ? (
                    <MenuItem
                      key={item.label}
                      onClick={handleMenuClose}
                      role="menuitem"
                    >
                      <Icon name={item.icon} ariaLabel={item.label} size="small" />
                      <Typography sx={{ ml: 1 }}>{item.label}</Typography>
                    </MenuItem>
                  ) : null
                ))}
                <Divider />
                <MenuItem onClick={handleLogout} role="menuitem">
                  <Icon name="logout" ariaLabel="Logout" size="small" />
                  <Typography sx={{ ml: 1 }}>Logout</Typography>
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </StyledToolbar>
    </StyledAppBar>
  );
};

export default AppBar;