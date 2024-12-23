import { useCallback, useState, useEffect } from 'react'; // ^18.2.0
import { useMediaQuery } from '@mui/material'; // ^5.0.0
import { defaultTheme, darkTheme, lightTheme } from '../assets/styles/theme';
import { createOrganizationTheme } from '../../config/theme.config';

// Constants
const THEME_STORAGE_KEY = 'theme_mode';
const HIGH_CONTRAST_STORAGE_KEY = 'high_contrast_enabled';
const DEFAULT_THEME_MODE = 'system';
const TRANSITION_DURATION = 300;

// Types
type ThemeMode = 'light' | 'dark' | 'system';

interface ThemePreferences {
  mode: ThemeMode;
  highContrast: boolean;
}

interface UseThemeReturn {
  theme: typeof defaultTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isHighContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  prefersReducedMotion: boolean;
}

/**
 * Custom hook for managing theme state and preferences with accessibility support
 * @param organizationId - Optional organization ID for custom theming
 * @param initialHighContrast - Initial high contrast mode state
 * @returns Theme management object containing current theme, mode, and accessibility preferences
 */
export const useTheme = (
  organizationId?: string,
  initialHighContrast: boolean = false
): UseThemeReturn => {
  // System preference detection
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // State management
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const savedMode = localStorage.getItem(THEME_STORAGE_KEY);
    return (savedMode as ThemeMode) || DEFAULT_THEME_MODE;
  });

  const [isHighContrast, setHighContrastState] = useState<boolean>(() => {
    const savedPreference = localStorage.getItem(HIGH_CONTRAST_STORAGE_KEY);
    return savedPreference ? JSON.parse(savedPreference) : initialHighContrast;
  });

  // Theme calculation based on current mode and preferences
  const calculateTheme = useCallback(() => {
    const effectiveMode = themeMode === 'system' ? (prefersDarkMode ? 'dark' : 'light') : themeMode;
    
    let baseTheme = effectiveMode === 'dark' ? darkTheme : lightTheme;

    if (organizationId) {
      try {
        baseTheme = createOrganizationTheme(
          baseTheme,
          organizationId,
          isHighContrast
        );
      } catch (error) {
        console.error('Failed to create organization theme:', error);
        // Fallback to default theme if organization theme creation fails
        baseTheme = isHighContrast ? darkTheme : defaultTheme;
      }
    }

    // Apply high contrast modifications if needed
    if (isHighContrast && !organizationId) {
      baseTheme = {
        ...baseTheme,
        palette: {
          ...baseTheme.palette,
          primary: {
            ...baseTheme.palette.primary,
            main: effectiveMode === 'dark' ? '#ffffff' : '#000000',
          },
          text: {
            primary: effectiveMode === 'dark' ? '#ffffff' : '#000000',
            secondary: effectiveMode === 'dark' ? '#ffffff' : '#000000',
          },
          background: {
            default: effectiveMode === 'dark' ? '#000000' : '#ffffff',
            paper: effectiveMode === 'dark' ? '#121212' : '#ffffff',
          },
        },
        components: {
          ...baseTheme.components,
          MuiButton: {
            styleOverrides: {
              root: {
                border: `3px solid ${effectiveMode === 'dark' ? '#ffffff' : '#000000'}`,
                '&:focus-visible': {
                  outline: `4px solid ${effectiveMode === 'dark' ? '#ffffff' : '#000000'}`,
                  outlineOffset: '2px',
                },
              },
            },
          },
        },
      };
    }

    return baseTheme;
  }, [themeMode, prefersDarkMode, isHighContrast, organizationId]);

  // Memoized theme state
  const [theme, setTheme] = useState(calculateTheme());

  // Theme mode setter with transition handling
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  // High contrast mode setter
  const setHighContrast = useCallback((enabled: boolean) => {
    setHighContrastState(enabled);
    localStorage.setItem(HIGH_CONTRAST_STORAGE_KEY, JSON.stringify(enabled));
  }, []);

  // Effect for handling theme updates
  useEffect(() => {
    const newTheme = calculateTheme();
    
    // Apply smooth transition unless reduced motion is preferred
    if (!prefersReducedMotion) {
      document.body.style.transition = `background-color ${TRANSITION_DURATION}ms ease-in-out`;
    } else {
      document.body.style.transition = 'none';
    }

    setTheme(newTheme);

    // Cleanup transition style
    return () => {
      document.body.style.transition = '';
    };
  }, [calculateTheme, prefersReducedMotion]);

  // Effect for system preference changes
  useEffect(() => {
    if (themeMode === 'system') {
      setTheme(calculateTheme());
    }
  }, [prefersDarkMode, themeMode, calculateTheme]);

  return {
    theme,
    themeMode,
    setThemeMode,
    isHighContrast,
    setHighContrast,
    prefersReducedMotion,
  };
};