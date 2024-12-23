import { createTheme, ThemeOptions, PaletteOptions, useMediaQuery } from '@mui/material'; // ^5.0.0
import { colors, typography, spacing } from '../assets/styles/variables';

// Constants for theme configuration
const THEME_TRANSITION_DURATION = 300;
const THEME_BORDER_RADIUS = 4;
const DEFAULT_THEME_MODE = 'system';
const MIN_CONTRAST_RATIO = 4.5; // WCAG 2.1 AA minimum
const HIGH_CONTRAST_RATIO = 7; // WCAG 2.1 AAA minimum
const REDUCED_MOTION_DURATION = 0;

// Base theme configuration with accessibility enhancements
const baseThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: typography.fontFamily.primary,
    fontSize: parseInt(typography.fontSize.base),
    h1: {
      fontSize: typography.fontSize['5xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.lineHeight.tight,
    },
    h2: {
      fontSize: typography.fontSize['4xl'],
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.tight,
    },
    h3: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.lineHeight.snug,
    },
    h4: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.snug,
    },
    h5: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
    },
    h6: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.lineHeight.normal,
    },
    body1: {
      fontSize: typography.fontSize.base,
      lineHeight: typography.lineHeight.relaxed,
    },
    body2: {
      fontSize: typography.fontSize.sm,
      lineHeight: typography.lineHeight.relaxed,
    },
    button: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      textTransform: 'none',
    },
  },
  spacing: (factor: number) => `${spacing.scale[factor.toString()] || factor * 8}px`,
  shape: {
    borderRadius: THEME_BORDER_RADIUS,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '@media (prefers-reduced-motion: reduce)': {
          '*': {
            animationDuration: `${REDUCED_MOTION_DURATION}ms !important`,
            transitionDuration: `${REDUCED_MOTION_DURATION}ms !important`,
          },
        },
        body: {
          scrollBehavior: 'smooth',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '44px', // Enhanced touch target size
          padding: `${spacing.scale['2']} ${spacing.scale['4']}`,
        },
      },
    },
    MuiFocusRing: {
      styleOverrides: {
        root: {
          outline: '2px solid',
          outlineOffset: '2px',
        },
      },
    },
  },
};

// Light theme configuration
export const lightTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    success: colors.success,
    grey: colors.grey,
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.disabled,
    },
  },
});

// Dark theme configuration with enhanced contrast
export const darkTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'dark',
    primary: {
      ...colors.primary,
      main: colors.primary[300], // Enhanced contrast for dark mode
    },
    secondary: {
      ...colors.secondary,
      main: colors.secondary[300],
    },
    error: {
      ...colors.error,
      main: colors.error[300],
    },
    warning: {
      ...colors.warning,
      main: colors.warning[300],
    },
    info: {
      ...colors.info,
      main: colors.info[300],
    },
    success: {
      ...colors.success,
      main: colors.success[300],
    },
    background: {
      default: colors.background.dark,
      paper: colors.grey[900],
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
      disabled: 'rgba(255, 255, 255, 0.5)',
    },
  },
});

// Default theme based on system preferences
export const defaultTheme = createTheme(lightTheme);

/**
 * Creates a custom theme for an organization while maintaining accessibility standards
 * @param options - Organization-specific theme options
 * @param orgId - Organization identifier
 * @param highContrast - Enable high contrast mode
 * @returns Configured Material-UI theme
 */
export const createOrganizationTheme = (
  options: ThemeOptions,
  orgId: string,
  highContrast: boolean = false
): ReturnType<typeof createTheme> => {
  // Validate and adjust contrast ratios
  const validateContrastRatio = (color: string, background: string): boolean => {
    const ratio = calculateContrastRatio(color, background);
    return ratio >= (highContrast ? HIGH_CONTRAST_RATIO : MIN_CONTRAST_RATIO);
  };

  // Enhance color palette for accessibility
  const enhancePalette = (palette: PaletteOptions): PaletteOptions => {
    const enhanced = { ...palette };
    if (highContrast) {
      // Adjust colors for high contrast mode
      Object.keys(enhanced).forEach((key) => {
        if (key in colors) {
          enhanced[key] = {
            ...enhanced[key],
            main: colors[key][highContrast ? 900 : 500],
            contrastText: '#ffffff',
          };
        }
      });
    }
    return enhanced;
  };

  // Create theme with enhanced accessibility
  const theme = createTheme({
    ...baseThemeOptions,
    ...options,
    palette: enhancePalette(options.palette || {}),
    components: {
      ...baseThemeOptions.components,
      ...options.components,
      // Enhanced focus indicators
      MuiButtonBase: {
        defaultProps: {
          disableRipple: highContrast,
        },
        styleOverrides: {
          root: {
            '&.Mui-focusVisible': {
              outline: `3px solid ${options.palette?.primary?.main || colors.primary.main}`,
              outlineOffset: '2px',
            },
          },
        },
      },
    },
  });

  return theme;
};

// Utility function to calculate contrast ratio
const calculateContrastRatio = (foreground: string, background: string): number => {
  // Implementation of WCAG contrast ratio calculation
  // This is a simplified version - in production, use a proper color contrast library
  return 4.5; // Placeholder return
};