import React, { useCallback, useEffect, useState, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  useMediaQuery,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { defaultTheme } from '../../assets/styles/theme';
import { Button } from './Button';

// Constants for modal configuration
const MODAL_TRANSITION_DURATION = 225;
const MODAL_BACKDROP_OPACITY = 0.5;
const MODAL_Z_INDEX_BASE = 1300;
const REDUCED_MOTION_DURATION = 0;

// Interface for modal props with accessibility and customization options
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  loading?: boolean;
  requireConfirmation?: boolean;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  fullScreen?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

// Styled components with enhanced accessibility and animations
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    margin: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[24],
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
  '& .MuiBackdrop-root': {
    backgroundColor: `rgba(0, 0, 0, ${MODAL_BACKDROP_OPACITY})`,
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  '& .MuiTypography-root': {
    fontWeight: theme.typography.fontWeightMedium,
  },
}));

const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(2),
  overflowY: 'auto',
  '&:first-of-type': {
    paddingTop: theme.spacing(2),
  },
}));

const StyledDialogActions = styled(DialogActions)(({ theme }) => ({
  padding: theme.spacing(2),
  '& > :not(:first-of-type)': {
    marginLeft: theme.spacing(2),
  },
}));

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  loading = false,
  requireConfirmation = false,
  maxWidth = 'sm',
  fullScreen = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) => {
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const preferredReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Generate unique IDs for accessibility
  const titleId = ariaLabelledBy || `modal-title-${React.useId()}`;
  const contentId = ariaDescribedBy || `modal-content-${React.useId()}`;

  // Focus trap management
  useEffect(() => {
    if (open && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length) {
        (focusableElements[0] as HTMLElement).focus();
      }
    }
  }, [open]);

  // Handle close with confirmation
  const handleClose = useCallback(async (force = false) => {
    if (!force && requireConfirmation && !isClosing) {
      setIsConfirmationOpen(true);
      return;
    }

    setIsClosing(true);
    try {
      await onClose();
    } finally {
      setIsClosing(false);
      setIsConfirmationOpen(false);
    }
  }, [requireConfirmation, isClosing, onClose]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && !disableEscapeKeyDown) {
      event.preventDefault();
      handleClose();
    }
  }, [handleClose, disableEscapeKeyDown]);

  // Confirmation dialog content
  const confirmationDialog = (
    <Box>
      <Typography>Are you sure you want to close this dialog?</Typography>
      <StyledDialogActions>
        <Button
          variant="outlined"
          onClick={() => setIsConfirmationOpen(false)}
          aria-label="Cancel closing the dialog"
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => handleClose(true)}
          aria-label="Confirm closing the dialog"
        >
          Confirm
        </Button>
      </StyledDialogActions>
    </Box>
  );

  return (
    <StyledDialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick' && !disableBackdropClick) {
          handleClose();
        }
      }}
      maxWidth={maxWidth}
      fullScreen={fullScreen}
      ref={modalRef}
      aria-labelledby={titleId}
      aria-describedby={contentId}
      transitionDuration={preferredReducedMotion ? REDUCED_MOTION_DURATION : MODAL_TRANSITION_DURATION}
      onKeyDown={handleKeyDown}
      keepMounted={false}
      disableEscapeKeyDown={disableEscapeKeyDown}
    >
      <StyledDialogTitle id={titleId}>
        <Typography variant="h6" component="h2">
          {title}
        </Typography>
        <IconButton
          aria-label="Close dialog"
          onClick={() => handleClose()}
          size="large"
          edge="end"
          sx={{ marginRight: -1 }}
        >
          <CloseIcon />
        </IconButton>
      </StyledDialogTitle>

      <StyledDialogContent id={contentId}>
        {isConfirmationOpen ? confirmationDialog : children}
      </StyledDialogContent>

      {actions && !isConfirmationOpen && (
        <StyledDialogActions>
          {React.Children.map(actions, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, {
                disabled: loading || child.props.disabled,
              });
            }
            return child;
          })}
        </StyledDialogActions>
      )}
    </StyledDialog>
  );
};

export type { ModalProps };