import React, { useCallback, useRef, useEffect } from 'react';
import { Dialog as MuiDialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'; // ^5.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { useMediaQuery } from '@mui/material'; // ^5.0.0
import { Button } from './Button';
import { defaultTheme } from '../../assets/styles/theme';

// Constants for dialog configuration
const DIALOG_TRANSITION_DURATION = 225;
const DIALOG_MIN_WIDTH = '280px';
const DIALOG_MAX_HEIGHT = 'calc(100vh - 64px)';
const DIALOG_MOBILE_PADDING = '16px';
const DIALOG_DESKTOP_PADDING = '24px';

// Interface for dialog props with accessibility support
interface DialogProps {
  open: boolean;
  title?: string | React.ReactNode;
  content: React.ReactNode;
  actions?: React.ReactNode[];
  onClose?: () => void;
  onConfirm?: () => void | Promise<void>;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  fullScreen?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

// Enhanced styled dialog with responsive design and accessibility features
const StyledDialog = styled(MuiDialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    minWidth: DIALOG_MIN_WIDTH,
    maxHeight: DIALOG_MAX_HEIGHT,
    margin: theme.spacing(2),
    padding: 0,
    overflowY: 'auto',
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(1),
      width: `calc(100% - ${theme.spacing(2)})`,
    },
  },
  '& .MuiDialogTitle-root': {
    padding: theme.spacing(2, 3),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(2),
    },
  },
  '& .MuiDialogContent-root': {
    padding: DIALOG_DESKTOP_PADDING,
    [theme.breakpoints.down('sm')]: {
      padding: DIALOG_MOBILE_PADDING,
    },
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(2, 3),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1, 2),
    },
    '& > :not(:first-of-type)': {
      marginLeft: theme.spacing(1),
    },
  },
}));

export const Dialog: React.FC<DialogProps> = ({
  open,
  title,
  content,
  actions,
  onClose,
  onConfirm,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) => {
  const dialogTitleId = ariaLabelledBy || 'dialog-title';
  const dialogContentId = ariaDescribedBy || 'dialog-content';
  const previousFocus = useRef<HTMLElement | null>(null);
  const isMobile = useMediaQuery(defaultTheme.breakpoints.down('sm'));

  // Store the element that had focus before dialog opened
  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
    } else if (previousFocus.current) {
      previousFocus.current.focus();
    }
  }, [open]);

  // Enhanced close handler with accessibility support
  const handleClose = useCallback((
    event: React.MouseEvent | React.KeyboardEvent,
    reason?: 'backdropClick' | 'escapeKeyDown'
  ) => {
    if (
      (reason === 'backdropClick' && disableBackdropClick) ||
      (reason === 'escapeKeyDown' && disableEscapeKeyDown)
    ) {
      return;
    }

    if (onClose) {
      onClose();
    }
  }, [onClose, disableBackdropClick, disableEscapeKeyDown]);

  // Enhanced confirm handler with loading state
  const handleConfirm = useCallback(async () => {
    if (onConfirm) {
      try {
        await onConfirm();
        if (onClose) {
          onClose();
        }
      } catch (error) {
        console.error('Dialog confirmation error:', error);
      }
    }
  }, [onConfirm, onClose]);

  // Default actions if none provided
  const defaultActions = (
    <>
      <Button
        variant="text"
        onClick={handleClose}
        color="primary"
        aria-label="Cancel dialog"
      >
        Cancel
      </Button>
      {onConfirm && (
        <Button
          variant="contained"
          onClick={handleConfirm}
          color="primary"
          aria-label="Confirm dialog"
        >
          Confirm
        </Button>
      )}
    </>
  );

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen || isMobile}
      aria-labelledby={dialogTitleId}
      aria-describedby={dialogContentId}
      TransitionProps={{
        timeout: DIALOG_TRANSITION_DURATION,
      }}
    >
      {title && (
        <DialogTitle id={dialogTitleId}>
          {title}
        </DialogTitle>
      )}
      <DialogContent id={dialogContentId}>
        {content}
      </DialogContent>
      <DialogActions>
        {actions || defaultActions}
      </DialogActions>
    </StyledDialog>
  );
};

Dialog.displayName = 'Dialog';

export type { DialogProps };