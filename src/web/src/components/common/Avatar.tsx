import React, { useState, useCallback } from 'react';
import { styled } from '@mui/material/styles';
import { Avatar as MuiAvatar } from '@mui/material';
import { defaultTheme } from '../../assets/styles/theme';
import Icon from './Icon';

// Avatar size configuration with touch-friendly dimensions
const AVATAR_SIZES = {
  small: '32px',
  medium: '40px',
  large: '48px'
} as const;

// Interface for Avatar component props
interface AvatarProps {
  src?: string;
  alt: string;
  size?: keyof typeof AVATAR_SIZES;
  variant?: 'circular' | 'rounded' | 'square';
  name: string;
  className?: string;
  onClick?: () => void;
  tabIndex?: number;
  ariaLabel?: string;
  highContrast?: boolean;
}

// Enhanced styled Avatar component with accessibility features
const StyledAvatar = styled(MuiAvatar, {
  shouldForwardProp: (prop) => 
    !['size', 'highContrast'].includes(prop as string)
})<{ 
  size: keyof typeof AVATAR_SIZES; 
  highContrast?: boolean;
}>(({ theme, size, highContrast }) => ({
  width: AVATAR_SIZES[size],
  height: AVATAR_SIZES[size],
  fontSize: size === 'small' ? '1rem' : size === 'medium' ? '1.25rem' : '1.5rem',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  transition: 'all 0.2s ease-in-out',
  
  // Enhanced touch targets for mobile
  '@media (max-width: 600px)': {
    minWidth: '44px',
    minHeight: '44px',
  },

  // Interactive states
  '&:hover': {
    cursor: 'pointer',
    opacity: 0.8,
  },

  // Focus states for keyboard navigation
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  // High contrast mode support
  ...(highContrast && {
    border: '2px solid currentColor',
    filter: 'contrast(1.5)',
  }),

  // Forced colors mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
    forcedColorAdjust: 'none',
  },

  // Reduced motion preferences
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

/**
 * Extracts initials from a user's name
 * @param name - Full name to extract initials from
 * @returns Formatted initials (max 2 characters)
 */
const getInitials = (name: string): string => {
  const sanitizedName = name.trim();
  const nameParts = sanitizedName.split(/\s+/);
  
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  }
  
  return sanitizedName.slice(0, 2).toUpperCase();
};

/**
 * Avatar component with comprehensive accessibility support
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 */
const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  size = 'medium',
  variant = 'circular',
  name,
  className,
  onClick,
  tabIndex = 0,
  ariaLabel,
  highContrast = false,
}) => {
  const [imgError, setImgError] = useState(false);
  
  // Handle image load errors
  const handleError = useCallback(() => {
    setImgError(true);
  }, []);

  // Generate initials as fallback
  const initials = getInitials(name);

  // Determine content based on image availability
  const content = (!src || imgError) ? initials : undefined;

  // Configure accessibility attributes
  const accessibilityProps = {
    role: 'img',
    'aria-label': ariaLabel || `Avatar for ${name}`,
    tabIndex,
    onClick: onClick ? onClick : undefined,
  };

  return (
    <StyledAvatar
      src={!imgError ? src : undefined}
      alt={alt}
      variant={variant}
      size={size}
      className={className}
      highContrast={highContrast}
      onError={handleError}
      {...accessibilityProps}
    >
      {content || (
        <Icon
          name="dashboard"
          size={size}
          ariaLabel={`Default avatar for ${name}`}
          color="inherit"
        />
      )}
    </StyledAvatar>
  );
};

export default Avatar;