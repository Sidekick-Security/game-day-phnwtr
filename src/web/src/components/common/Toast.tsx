import React from 'react'; // ^18.2.0
import { Snackbar, Alert, AlertColor } from '@mui/material'; // ^5.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { INotification } from '../../interfaces/notification.interface';
import { NotificationType } from '../../types/notification.types';
import { defaultTheme } from '../../assets/styles/theme';

/**
 * Props interface for the Toast component with comprehensive accessibility support
 */
interface ToastProps {
  /** The message to display in the toast */
  message: string;
  /** The type of notification determining the toast appearance */
  type: NotificationType;
  /** Controls the visibility of the toast */
  open: boolean;
  /** Callback function when the toast is closed */
  onClose: () => void;
  /** Duration in milliseconds to auto-hide the toast (optional) */
  autoHideDuration?: number;
  /** Position of the toast on the screen (optional) */
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  /** Enable reduced motion for accessibility (optional) */
  enableReducedMotion?: boolean;
  /** ARIA role for screen readers (optional) */
  role?: string;
  /** ARIA label for screen readers (optional) */
  ariaLabel?: string;
}

/**
 * Maps notification types to Material-UI Alert severity levels
 */
const getSeverity = (type: NotificationType): AlertColor => {
  switch (type) {
    case NotificationType.EXERCISE_START:
    case NotificationType.EXERCISE_RESUMED:
      return 'success';
    case NotificationType.EXERCISE_END:
    case NotificationType.EXERCISE_PAUSED:
      return 'info';
    case NotificationType.RESPONSE_REQUIRED:
      return 'warning';
    case NotificationType.SYSTEM_ALERT:
      return 'error';
    default:
      return 'info';
  }
};

/**
 * Styled Snackbar component with enhanced accessibility and RTL support
 */
const StyledSnackbar = styled(Snackbar)(({ theme }) => ({
  '& .MuiSnackbar-root': {
    zIndex: theme.zIndex?.snackbar || 1400,
  },
  '& .MuiSnackbar-anchorOriginTopRight': {
    top: theme.spacing(3),
    right: theme.spacing(3),
    [theme.breakpoints.down('sm')]: {
      top: theme.spacing(2),
      right: theme.spacing(2),
    },
  },
  '@media (prefers-reduced-motion: reduce)': {
    '& .MuiSnackbar-root': {
      transition: 'none',
    },
  },
  [theme.direction === 'rtl' ? 'left' : 'right']: theme.spacing(3),
}));

/**
 * Styled Alert component with Material Design 3.0 styling
 */
const StyledAlert = styled(Alert)(({ theme }) => ({
  borderRadius: theme.shape.borderRadius,
  padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
  alignItems: 'center',
  '& .MuiAlert-icon': {
    marginRight: theme.spacing(1),
    marginTop: 0,
  },
  '& .MuiAlert-message': {
    padding: 0,
    fontWeight: theme.typography.fontWeightMedium,
  },
  '& .MuiAlert-action': {
    marginLeft: theme.spacing(2),
    padding: 0,
    alignItems: 'center',
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

/**
 * Toast notification component with comprehensive accessibility support
 * and Material Design 3.0 styling
 */
const Toast: React.FC<ToastProps> = React.memo(({
  message,
  type,
  open,
  onClose,
  autoHideDuration = 6000,
  anchorOrigin = {
    vertical: 'top',
    horizontal: 'right',
  },
  enableReducedMotion = false,
  role = 'alert',
  ariaLabel,
}) => {
  const severity = getSeverity(type);
  const transitionDuration = enableReducedMotion ? 0 : 300;

  return (
    <StyledSnackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      TransitionProps={{
        timeout: transitionDuration,
      }}
    >
      <StyledAlert
        onClose={onClose}
        severity={severity}
        variant="filled"
        elevation={6}
        role={role}
        aria-label={ariaLabel || message}
        sx={{
          minWidth: '280px',
          maxWidth: '500px',
          width: 'auto',
        }}
      >
        {message}
      </StyledAlert>
    </StyledSnackbar>
  );
});

// Display name for debugging
Toast.displayName = 'Toast';

export default Toast;