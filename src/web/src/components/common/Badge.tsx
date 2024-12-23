import React from 'react'; // ^18.2.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { Badge as MuiBadge } from '@mui/material'; // ^5.0.0
import { colors } from '../../assets/styles/variables';

// Interface for Badge component props
interface BadgeProps {
  content?: string | number;
  variant?: 'default' | 'dot' | 'notification' | 'status';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
  size?: 'small' | 'medium' | 'large';
  max?: number;
  showZero?: boolean;
  invisible?: boolean;
  overlap?: 'rectangular' | 'circular';
  className?: string;
  children?: React.ReactNode;
  role?: string;
  'aria-label'?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
}

// Style utility function to get variant-specific styles
const getVariantStyles = (variant?: BadgeProps['variant'], size?: BadgeProps['size']) => {
  const baseStyles = {
    small: {
      fontSize: '0.75rem',
      minWidth: '16px',
      height: '16px',
    },
    medium: {
      fontSize: '0.875rem',
      minWidth: '20px',
      height: '20px',
    },
    large: {
      fontSize: '1rem',
      minWidth: '24px',
      height: '24px',
    },
  };

  const sizeStyles = size ? baseStyles[size] : baseStyles.medium;

  switch (variant) {
    case 'dot':
      return {
        '& .MuiBadge-badge': {
          ...sizeStyles,
          minWidth: '8px',
          height: '8px',
          padding: 0,
          borderRadius: '50%',
        },
      };
    case 'notification':
      return {
        '& .MuiBadge-badge': {
          ...sizeStyles,
          right: '-3px',
          top: '3px',
          boxShadow: '0 0 0 2px #fff',
        },
      };
    case 'status':
      return {
        '& .MuiBadge-badge': {
          ...sizeStyles,
          minWidth: '8px',
          height: '8px',
          padding: 0,
          borderRadius: '50%',
        },
      };
    default:
      return {
        '& .MuiBadge-badge': {
          ...sizeStyles,
        },
      };
  }
};

// Styled wrapper for MUI Badge with enhanced accessibility and theming
const StyledBadge = styled(MuiBadge, {
  shouldForwardProp: (prop) => 
    !['customSize', 'customVariant'].includes(prop as string),
})<{ customSize?: BadgeProps['size']; customVariant?: BadgeProps['variant'] }>(
  ({ theme, color = 'primary', customSize, customVariant }) => ({
    '& .MuiBadge-badge': {
      padding: '0 6px',
      borderRadius: '12px',
      fontWeight: 600,
      textAlign: 'center',
      transition: 'all 0.2s ease-in-out',
      userSelect: 'none',
      color: theme.palette.common.white,
      backgroundColor: colors[color as keyof typeof colors].main,
      
      // Ensure high contrast for accessibility
      '@media (forced-colors: active)': {
        outline: '1px solid transparent',
      },
    },

    // Apply variant-specific styles
    ...getVariantStyles(customVariant, customSize),

    // Reduced motion preference support
    '@media (prefers-reduced-motion: reduce)': {
      '& .MuiBadge-badge': {
        transition: 'none',
      },
    },

    // RTL support
    '[dir="rtl"] &': {
      '& .MuiBadge-badge': {
        right: 'auto',
        left: customVariant === 'notification' ? '-3px' : undefined,
      },
    },
  })
);

// Memoized Badge component
const Badge = React.memo<BadgeProps>(({
  content,
  variant = 'default',
  color = 'primary',
  size = 'medium',
  max = 99,
  showZero = false,
  invisible = false,
  overlap = 'rectangular',
  className,
  children,
  role = 'status',
  'aria-label': ariaLabel,
  'aria-live': ariaLive = 'polite',
  ...props
}) => {
  // Determine if badge should be visible
  const isVisible = !invisible && (showZero || content !== 0);

  // Format content for screen readers
  const getAriaLabel = () => {
    if (ariaLabel) return ariaLabel;
    if (typeof content === 'number' && content > max) {
      return `${content} notifications, maximum shown is ${max}`;
    }
    return `${content} notifications`;
  };

  return (
    <StyledBadge
      badgeContent={content}
      color={color}
      max={max}
      invisible={!isVisible}
      overlap={overlap}
      className={`${className || ''} ${variant}-variant`}
      customSize={size}
      customVariant={variant}
      role={role}
      aria-label={getAriaLabel()}
      aria-live={ariaLive}
      {...props}
    >
      {children}
    </StyledBadge>
  );
});

// Display name for debugging
Badge.displayName = 'Badge';

export default Badge;