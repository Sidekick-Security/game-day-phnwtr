import React, { useCallback, useRef } from 'react';
import { styled } from '@mui/material/styles'; // ^5.0.0
import { Tabs as MuiTabs, Tab as MuiTab, useMediaQuery } from '@mui/material'; // ^5.0.0
import { defaultTheme } from '../../assets/styles/theme';

// Constants for component configuration
const TAB_TRANSITION_DURATION = '0.2s';
const TAB_MIN_WIDTH = '90px';
const TAB_MAX_WIDTH = '360px';
const TAB_MOBILE_HEIGHT = '48px';
const TAB_DESKTOP_HEIGHT = '64px';

// Interface definitions
interface TabsProps {
  value: number;
  onChange: (event: React.SyntheticEvent, newValue: number) => void;
  variant?: 'standard' | 'contained' | 'scrollable';
  orientation?: 'horizontal' | 'vertical';
  centered?: boolean;
  scrollButtons?: 'auto' | true | false;
  allowScrollButtonsMobile?: boolean;
  visibleScrollbar?: boolean;
  'aria-label'?: string;
  TabIndicatorProps?: React.ComponentProps<typeof MuiTabs>['TabIndicatorProps'];
  children: React.ReactNode;
}

interface TabProps {
  label: string | React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: 'top' | 'bottom' | 'start' | 'end';
  disabled?: boolean;
  wrapped?: boolean;
  touchRippleColor?: string;
}

// Generate accessibility props for tabs and panels
const a11yProps = (index: number, orientation: 'horizontal' | 'vertical' = 'horizontal') => ({
  id: `tab-${index}`,
  'aria-controls': `tabpanel-${index}`,
  role: 'tab',
  tabIndex: 0,
  'aria-orientation': orientation,
  'aria-selected': false,
});

// Styled components with comprehensive styling and accessibility
const StyledTabs = styled(MuiTabs, {
  shouldForwardProp: (prop) => 
    !['visibleScrollbar', 'touchRippleColor'].includes(prop as string),
})(({ theme, orientation, variant }) => ({
  minHeight: 'unset',
  position: 'relative',
  transition: `all ${TAB_TRANSITION_DURATION} ease-in-out`,

  // Base styles
  '& .MuiTabs-flexContainer': {
    gap: theme.spacing(1),
    ...(orientation === 'vertical' && {
      flexDirection: 'column',
    }),
  },

  // Indicator styles
  '& .MuiTabs-indicator': {
    transition: `all ${TAB_TRANSITION_DURATION}`,
    backgroundColor: theme.palette.primary.main,
    ...(orientation === 'vertical' && {
      right: 'auto',
      width: 3,
    }),
  },

  // Scroll buttons
  '& .MuiTabs-scrollButtons': {
    '&.Mui-disabled': {
      opacity: 0.3,
    },
    '& svg': {
      fontSize: '1.5rem',
      transition: `all ${TAB_TRANSITION_DURATION}`,
    },
  },

  // Variant-specific styles
  ...(variant === 'contained' && {
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
    padding: theme.spacing(1),
  }),

  // Responsive styles
  [theme.breakpoints.up('sm')]: {
    minHeight: TAB_DESKTOP_HEIGHT,
  },

  // Accessibility focus styles
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

const StyledTab = styled(MuiTab, {
  shouldForwardProp: (prop) => 
    !['touchRippleColor'].includes(prop as string),
})(({ theme }) => ({
  minWidth: TAB_MIN_WIDTH,
  maxWidth: TAB_MAX_WIDTH,
  minHeight: TAB_MOBILE_HEIGHT,
  padding: theme.spacing(1, 2),
  transition: `all ${TAB_TRANSITION_DURATION}`,
  textTransform: 'none',
  fontWeight: theme.typography.fontWeightMedium,
  fontSize: theme.typography.body1.fontSize,
  color: theme.palette.text.secondary,

  '&:hover': {
    color: theme.palette.text.primary,
    opacity: 1,
  },

  '&.Mui-selected': {
    color: theme.palette.primary.main,
    fontWeight: theme.typography.fontWeightBold,
  },

  '&.Mui-disabled': {
    opacity: 0.5,
  },

  // Responsive styles
  [theme.breakpoints.up('sm')]: {
    minHeight: TAB_DESKTOP_HEIGHT,
  },

  // Accessibility styles
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

/**
 * A highly configurable, accessible tab navigation component following Material Design 3.0
 * principles. Supports horizontal and vertical orientations, multiple variants, and
 * comprehensive keyboard navigation.
 */
export const Tabs: React.FC<TabsProps> = ({
  value,
  onChange,
  variant = 'standard',
  orientation = 'horizontal',
  centered = false,
  scrollButtons = 'auto',
  allowScrollButtonsMobile = false,
  visibleScrollbar = false,
  'aria-label': ariaLabel,
  TabIndicatorProps,
  children,
}) => {
  const tabsRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery(defaultTheme.breakpoints.down('sm'));

  // Handle tab change with keyboard navigation
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    if (event.type === 'keydown') {
      const keyEvent = event as React.KeyboardEvent;
      if (!['Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(keyEvent.key)) {
        return;
      }
    }
    onChange(event, newValue);
  }, [onChange]);

  return (
    <StyledTabs
      ref={tabsRef}
      value={value}
      onChange={handleTabChange}
      variant={variant}
      orientation={orientation}
      centered={centered}
      scrollButtons={scrollButtons}
      allowScrollButtonsMobile={allowScrollButtonsMobile}
      visibleScrollbar={visibleScrollbar}
      aria-label={ariaLabel}
      TabIndicatorProps={{
        ...TabIndicatorProps,
        style: {
          ...TabIndicatorProps?.style,
          transition: `all ${TAB_TRANSITION_DURATION}`,
        },
      }}
      TabScrollButtonProps={{
        'aria-label': orientation === 'horizontal' ? 'Scroll tabs horizontally' : 'Scroll tabs vertically',
      }}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return null;

        return React.cloneElement(child, {
          ...child.props,
          ...a11yProps(index, orientation),
        });
      })}
    </StyledTabs>
  );
};

/**
 * Individual tab component with enhanced styling and accessibility features.
 */
export const Tab: React.FC<TabProps> = styled(MuiTab, {
  shouldForwardProp: (prop) => 
    !['touchRippleColor'].includes(prop as string),
})(({ theme }) => ({
  // Inherit styles from StyledTab
  ...StyledTab,
}));

export type { TabsProps, TabProps };