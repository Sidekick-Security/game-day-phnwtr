import React, { useCallback, useRef, useState } from 'react'; // v18.2.0
import { Tooltip as MuiTooltip } from '@mui/material'; // v5.0.0
import { styled, useTheme } from '@mui/material/styles'; // v5.0.0
import { useMediaQuery } from '@mui/material'; // v5.0.0
import { defaultTheme } from '../../assets/styles/theme';
import ErrorBoundary from './ErrorBoundary';

// Constants for tooltip timing and behavior
const TOOLTIP_SHOW_DELAY = 200;
const TOOLTIP_HIDE_DELAY = 100;
const TOOLTIP_TOUCH_DELAY = 1500;
const TOOLTIP_Z_INDEX = defaultTheme.zIndex?.tooltip || 1500;

// Interface for tooltip props with accessibility support
interface TooltipProps {
  /** Content to display in the tooltip */
  title: React.ReactNode;
  /** Element that triggers the tooltip */
  children: React.ReactNode;
  /** Position of the tooltip relative to the element */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Additional CSS classes */
  className?: string;
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Whether tooltip is disabled */
  disabled?: boolean;
  /** Whether tooltip is interactive */
  interactive?: boolean;
  /** Callback when tooltip opens */
  onOpen?: () => void;
  /** Callback when tooltip closes */
  onClose?: () => void;
}

// Styled tooltip component with enhanced accessibility
const StyledTooltip = styled(MuiTooltip)(({ theme }) => ({
  '& .MuiTooltip-tooltip': {
    backgroundColor: theme.palette.grey[800],
    color: theme.palette.common.white,
    fontSize: theme.typography.body2.fontSize,
    padding: theme.spacing(1, 1.5),
    borderRadius: theme.shape.borderRadius,
    maxWidth: 300,
    wordWrap: 'break-word',
    boxShadow: theme.shadows[2],
    zIndex: TOOLTIP_Z_INDEX,
    
    // High contrast mode support
    '@media (forced-colors: active)': {
      border: '1px solid currentColor',
    },
    
    // Reduced motion support
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  },
  
  // Arrow styling
  '& .MuiTooltip-arrow': {
    color: theme.palette.grey[800],
  },
  
  // Focus visible styles for accessibility
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

/**
 * Enhanced tooltip component with accessibility features and error handling
 */
const Tooltip: React.FC<TooltipProps> = ({
  title,
  children,
  placement = 'top',
  className,
  delay = TOOLTIP_SHOW_DELAY,
  disabled = false,
  interactive = false,
  onOpen,
  onClose,
}) => {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const theme = useTheme();
  const isTouchDevice = useMediaQuery('(pointer: coarse)');
  
  // Handle tooltip open with delay
  const handleTooltipOpen = useCallback(() => {
    if (disabled || !title) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setOpen(true);
      onOpen?.();
    }, isTouchDevice ? TOOLTIP_TOUCH_DELAY : delay);
  }, [disabled, title, delay, isTouchDevice, onOpen]);
  
  // Handle tooltip close with cleanup
  const handleTooltipClose = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setTimeout(() => {
      setOpen(false);
      onClose?.();
    }, TOOLTIP_HIDE_DELAY);
  }, [onClose]);
  
  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <StyledTooltip
        open={open}
        title={title}
        placement={placement}
        className={className}
        onOpen={handleTooltipOpen}
        onClose={handleTooltipClose}
        enterDelay={isTouchDevice ? TOOLTIP_TOUCH_DELAY : delay}
        leaveDelay={TOOLTIP_HIDE_DELAY}
        arrow
        interactive={interactive}
        PopperProps={{
          sx: { zIndex: TOOLTIP_Z_INDEX },
        }}
        componentsProps={{
          tooltip: {
            role: 'tooltip',
            'aria-live': 'polite',
            sx: {
              visibility: disabled ? 'hidden' : 'visible',
            },
          },
          popper: {
            modifiers: [
              {
                name: 'preventOverflow',
                enabled: true,
                options: {
                  boundary: 'viewport',
                  padding: 8,
                },
              },
            ],
          },
        }}
      >
        <span>
          {React.cloneElement(React.Children.only(children) as React.ReactElement, {
            'aria-describedby': open ? 'tooltip' : undefined,
            onMouseEnter: handleTooltipOpen,
            onMouseLeave: handleTooltipClose,
            onFocus: handleTooltipOpen,
            onBlur: handleTooltipClose,
            onTouchStart: isTouchDevice ? handleTooltipOpen : undefined,
            onTouchEnd: isTouchDevice ? handleTooltipClose : undefined,
          })}
        </span>
      </StyledTooltip>
    </ErrorBoundary>
  );
};

export default Tooltip;