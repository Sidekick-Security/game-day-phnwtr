import React from 'react'; // ^18.2.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { Button as MuiButton, CircularProgress } from '@mui/material'; // ^5.0.0
import { defaultTheme } from '../../assets/styles/theme';

// Constants for button configuration
const BUTTON_TRANSITION_DURATION = '0.2s';
const BUTTON_MIN_WIDTH = '64px';
const BUTTON_LOADING_SIZE = '20px';
const BUTTON_TOUCH_TARGET_MIN = '44px';

// Type definitions for button props
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'warning' | 'success';
  fullWidth?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  tooltipText?: string;
  ariaLabel?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
}

// Style generation function for button variants
const getButtonStyles = (props: ButtonProps, theme = defaultTheme) => {
  const { variant = 'contained', size = 'medium', color = 'primary', disabled, loading } = props;

  // Base styles with accessibility considerations
  const baseStyles = {
    minWidth: BUTTON_MIN_WIDTH,
    minHeight: BUTTON_TOUCH_TARGET_MIN,
    position: 'relative',
    fontFamily: theme.typography.fontFamily,
    fontWeight: theme.typography.button?.fontWeight || 500,
    letterSpacing: '0.02em',
    textTransform: 'none',
    transition: `all ${BUTTON_TRANSITION_DURATION} ease-in-out`,
    
    // Enhanced focus styles for accessibility
    '&:focus-visible': {
      outline: `2px solid ${theme.palette[color]?.main}`,
      outlineOffset: '2px',
      boxShadow: 'none',
    },

    // High contrast mode support
    '@media (forced-colors: active)': {
      border: '2px solid transparent',
      '&:focus-visible': {
        outline: '2px solid ButtonText',
      },
    },

    // Reduced motion support
    '@media (prefers-reduced-motion: reduce)': {
      transition: 'none',
    },
  };

  // Size-specific styles
  const sizeStyles = {
    small: {
      padding: theme.spacing(1, 2),
      fontSize: theme.typography.pxToRem(13),
    },
    medium: {
      padding: theme.spacing(1.5, 3),
      fontSize: theme.typography.pxToRem(14),
    },
    large: {
      padding: theme.spacing(2, 4),
      fontSize: theme.typography.pxToRem(16),
    },
  };

  // Loading state styles
  const loadingStyles = loading ? {
    color: 'transparent',
    pointerEvents: 'none',
    '& .MuiCircularProgress-root': {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginTop: -BUTTON_LOADING_SIZE / 2,
      marginLeft: -BUTTON_LOADING_SIZE / 2,
    },
  } : {};

  return {
    ...baseStyles,
    ...sizeStyles[size],
    ...loadingStyles,
  };
};

// Enhanced styled button component
const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => 
    !['loading', 'tooltipText', 'ariaLabel'].includes(prop as string),
})<ButtonProps>(({ theme, ...props }) => getButtonStyles(props, theme));

// Main button component with accessibility and loading state handling
export const Button = React.memo<ButtonProps>(({
  children,
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  startIcon,
  endIcon,
  tooltipText,
  ariaLabel,
  onClick,
  ...props
}) => {
  // Click handler with loading state management
  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading || !onClick) return;
    
    try {
      await onClick(event);
    } catch (error) {
      console.error('Button click handler error:', error);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event as unknown as React.MouseEvent<HTMLButtonElement>);
    }
  };

  return (
    <StyledButton
      variant={variant}
      size={size}
      color={color}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      title={tooltipText}
      startIcon={!loading && startIcon}
      endIcon={!loading && endIcon}
      {...props}
    >
      {children}
      {loading && (
        <CircularProgress
          size={BUTTON_LOADING_SIZE}
          color={variant === 'contained' ? 'inherit' : color}
          aria-hidden="true"
        />
      )}
    </StyledButton>
  );
});

Button.displayName = 'Button';

// Export button types for external use
export type { ButtonProps };