import React, { useCallback, useEffect } from 'react';
import { styled } from '@mui/material/styles';
import { Snackbar as MuiSnackbar, Alert as MuiAlert, useMediaQuery } from '@mui/material';
import { lightTheme } from '../../assets/styles/theme';

// Version comments for external dependencies
// @mui/material: ^5.0.0
// react: ^18.2.0

interface SnackbarProps {
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  autoHideDuration?: number | null;
  onClose?: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  open: boolean;
  disableWindowBlur?: boolean;
  role?: 'alert' | 'status';
  className?: string;
}

// Styled components with enhanced accessibility and responsive design
const StyledSnackbar = styled(MuiSnackbar)(({ theme }) => ({
  margin: theme.spacing(1),
  maxWidth: {
    xs: '90vw',
    sm: '400px',
    md: '600px'
  },
  minWidth: {
    xs: '280px',
    sm: '300px'
  },
  zIndex: theme.zIndex.snackbar,
  '& .MuiSnackbarContent-root': {
    width: '100%'
  }
}));

const StyledAlert = styled(MuiAlert)(({ theme }) => ({
  width: '100%',
  boxShadow: '0px 3px 5px rgba(0, 0, 0, 0.2)',
  borderRadius: theme.shape.borderRadius,
  fontSize: '14px',
  lineHeight: 1.5,
  '& .MuiAlert-icon': {
    marginRight: theme.spacing(1.5),
    fontSize: '20px',
    opacity: 0.9
  },
  '& .MuiAlert-action': {
    padding: theme.spacing(0.5, 0),
    marginLeft: theme.spacing(2)
  },
  '& .MuiAlert-message': {
    padding: theme.spacing(1, 0),
    color: theme.palette.text.primary
  },
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  }
}));

// Calculate snackbar position based on prop and screen size
const getSnackbarPosition = (
  position: SnackbarProps['position'] = 'bottom-center',
  isMobile: boolean
): { 
  vertical: 'top' | 'bottom';
  horizontal: 'left' | 'right' | 'center';
  transform?: string;
} => {
  const [vertical = 'bottom', horizontal = 'center'] = position.split('-');
  
  // Adjust position for mobile devices
  if (isMobile) {
    return {
      vertical: vertical as 'top' | 'bottom',
      horizontal: 'center',
    };
  }

  return {
    vertical: vertical as 'top' | 'bottom',
    horizontal: horizontal as 'left' | 'right' | 'center',
  };
};

// Custom hook for managing snackbar lifecycle
const useSnackbarLifecycle = (
  open: boolean,
  onClose?: () => void,
  autoHideDuration?: number | null,
  disableWindowBlur?: boolean
) => {
  const handleClose = useCallback((event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    onClose?.();
  }, [onClose]);

  const handleExited = useCallback(() => {
    // Cleanup after exit animation
  }, []);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (open && autoHideDuration && !disableWindowBlur) {
      const handleWindowBlur = () => {
        clearTimeout(timeoutId);
      };

      const handleWindowFocus = () => {
        if (open) {
          timeoutId = setTimeout(handleClose, autoHideDuration);
        }
      };

      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);

      return () => {
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
        clearTimeout(timeoutId);
      };
    }
  }, [open, autoHideDuration, disableWindowBlur, handleClose]);

  return { handleClose, handleExited };
};

const Snackbar: React.FC<SnackbarProps> = ({
  message,
  severity = 'info',
  autoHideDuration = 6000,
  onClose,
  position = 'bottom-center',
  open,
  disableWindowBlur = false,
  role = 'alert',
  className
}) => {
  const isMobile = useMediaQuery(lightTheme.breakpoints.down('sm'));
  const { vertical, horizontal } = getSnackbarPosition(position, isMobile);
  const { handleClose, handleExited } = useSnackbarLifecycle(
    open,
    onClose,
    autoHideDuration,
    disableWindowBlur
  );

  return (
    <StyledSnackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical, horizontal }}
      TransitionProps={{ onExited: handleExited }}
      className={className}
    >
      <StyledAlert
        onClose={handleClose}
        severity={severity}
        variant="filled"
        role={role}
        elevation={6}
        // Ensure screen readers announce the message appropriately
        aria-live={severity === 'error' ? 'assertive' : 'polite'}
      >
        {message}
      </StyledAlert>
    </StyledSnackbar>
  );
};

export default Snackbar;