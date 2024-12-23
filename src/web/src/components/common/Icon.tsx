import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles'; // ^5.0.0
import { SvgIcon } from '@mui/material'; // ^5.0.0
import {
  DashboardIcon,
  ExerciseIcon,
  AnalyticsIcon,
  IconProps,
  StyledSvgIcon,
  DEFAULT_ICON_PROPS
} from '../../assets/icons';

// Icon mapping type for type safety
type IconMap = {
  [key: string]: React.ComponentType<IconProps>;
};

// Comprehensive icon mapping with all available icons
const ICON_MAP: IconMap = {
  dashboard: DashboardIcon,
  exercise: ExerciseIcon,
  analytics: AnalyticsIcon,
  // Add additional icons as needed
};

// Enhanced IconProps interface extending base IconProps
interface EnhancedIconProps extends IconProps {
  name: string; // Required name prop for icon selection
}

// StyledIcon component with enhanced accessibility and touch targets
const StyledIcon = styled(StyledSvgIcon, {
  shouldForwardProp: (prop) => 
    !['name'].includes(prop as string)
})<EnhancedIconProps>(({ theme }) => ({
  // Additional styles specific to this implementation
  '&[data-interactive="true"]': {
    cursor: 'pointer',
    '&:hover': {
      transform: 'scale(1.05)',
    },
  },
  // Enhanced touch target sizes for mobile
  '@media (max-width: 768px)': {
    minWidth: '44px',
    minHeight: '44px',
  },
  // Reduced motion preferences
  '@media (prefers-reduced-motion: reduce)': {
    transform: 'none',
    transition: 'none',
  },
}));

/**
 * Enhanced Icon component with comprehensive accessibility and theme support
 * Implements Material Design 3.0 principles and WCAG 2.1 Level AA compliance
 *
 * @param props - Enhanced icon properties including accessibility options
 * @returns Rendered accessible icon component
 */
const Icon: React.FC<EnhancedIconProps> = ({
  name,
  size = DEFAULT_ICON_PROPS.size,
  color,
  className,
  ariaLabel,
  focusable = DEFAULT_ICON_PROPS.focusable,
  role = DEFAULT_ICON_PROPS.role,
  tabIndex = DEFAULT_ICON_PROPS.tabIndex,
  highContrast = false,
  ...rest
}) => {
  // Memoized icon component selection
  const IconComponent = useMemo(() => {
    const component = ICON_MAP[name];
    if (!component) {
      console.warn(`Icon "${name}" not found. Falling back to dashboard icon.`);
      return ICON_MAP.dashboard;
    }
    return component;
  }, [name]);

  return (
    <StyledIcon
      as={IconComponent}
      size={size}
      color={color}
      className={className}
      aria-label={ariaLabel}
      focusable={focusable}
      role={role}
      tabIndex={tabIndex}
      data-high-contrast={highContrast}
      data-testid={`icon-${name}`}
      {...rest}
    />
  );
};

/**
 * Helper function to safely retrieve icon component by name
 * Includes type checking and development warnings
 *
 * @param name - Icon name to retrieve
 * @returns Corresponding icon component or fallback
 */
const getIconByName = (name: string): React.ComponentType<IconProps> => {
  const component = ICON_MAP[name];
  if (!component && process.env.NODE_ENV === 'development') {
    console.warn(`Icon "${name}" not found in icon map.`);
  }
  return component || ICON_MAP.dashboard;
};

export default Icon;
export { getIconByName };
export type { EnhancedIconProps };