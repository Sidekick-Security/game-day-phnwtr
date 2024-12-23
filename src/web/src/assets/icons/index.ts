import { SvgIcon } from '@mui/material'; // ^5.0.0
import { styled, useTheme } from '@mui/material/styles'; // ^5.0.0
import type { Theme } from '@mui/material/styles';

// Icon size constants
export const ICON_SIZES = {
  small: '1.25rem',
  medium: '1.5rem',
  large: '2rem'
} as const;

// Interface for icon props with comprehensive accessibility support
export interface IconProps {
  size?: keyof typeof ICON_SIZES;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'inherit';
  className?: string;
  ariaLabel: string;
  focusable?: boolean;
  role?: 'img' | 'presentation';
  tabIndex?: number;
  highContrast?: boolean;
}

// Default props for consistent icon behavior
export const DEFAULT_ICON_PROPS: Partial<IconProps> = {
  size: 'medium',
  focusable: true,
  role: 'img',
  tabIndex: 0
};

// Custom hook for computing icon styles based on theme and props
export const useIconStyles = (props: IconProps) => {
  const theme = useTheme();
  
  return {
    fontSize: ICON_SIZES[props.size || 'medium'],
    color: props.color ? theme.palette[props.color].main : 'inherit',
    filter: props.highContrast ? 'contrast(1.5)' : 'none',
    transition: theme.transitions.create(['opacity', 'filter'], {
      duration: theme.transitions.duration.shorter
    })
  };
};

// Enhanced base styled component for accessible icon styling
export const StyledSvgIcon = styled(SvgIcon, {
  shouldForwardProp: (prop) => 
    !['size', 'highContrast'].includes(prop as string)
})<IconProps>(({ theme, size = 'medium', highContrast }) => ({
  fontSize: ICON_SIZES[size],
  transition: theme.transitions.create(['opacity', 'filter'], {
    duration: theme.transitions.duration.shorter
  }),
  '&:hover': {
    opacity: 0.8
  },
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  },
  '@media (forced-colors: active)': {
    forcedColorAdjust: 'auto'
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none'
  },
  touchAction: 'manipulation',
  minWidth: '48px',
  minHeight: '48px',
  '@media (pointer: fine)': {
    minWidth: '24px',
    minHeight: '24px'
  },
  ...(highContrast && {
    filter: 'contrast(1.5)'
  })
}));

// Dashboard icon component
export const DashboardIcon: React.FC<IconProps> = (props) => (
  <StyledSvgIcon {...DEFAULT_ICON_PROPS} {...props}>
    <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
  </StyledSvgIcon>
);

// Exercise management icon component
export const ExerciseIcon: React.FC<IconProps> = (props) => (
  <StyledSvgIcon {...DEFAULT_ICON_PROPS} {...props}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
  </StyledSvgIcon>
);

// Analytics icon component
export const AnalyticsIcon: React.FC<IconProps> = (props) => (
  <StyledSvgIcon {...DEFAULT_ICON_PROPS} {...props}>
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
  </StyledSvgIcon>
);

// Export all icons with their types for strong typing support
export type { IconProps };
export { DashboardIcon, ExerciseIcon, AnalyticsIcon };