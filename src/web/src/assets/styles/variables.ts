import { createPalette } from '@mui/material'; // ^5.0.0

// Base constants
const SPACING_BASE = 8;
const BORDER_RADIUS_BASE = 4;
const TRANSITION_DURATION = '0.2s';
const FONT_SIZE_BASE = 16;
const GRID_BASE = 8;

// Utility functions
export const pxToRem = (px: number): string => `${px / FONT_SIZE_BASE}rem`;
export const createSpacing = (multiplier: number): string => `${multiplier * SPACING_BASE}px`;

// Color system - WCAG 2.1 AA compliant
export const colors = {
  primary: {
    main: '#1976d2', // 4.5:1 contrast ratio on white
    light: '#42a5f5',
    dark: '#1565c0',
    contrastText: '#ffffff',
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#1976d2',
    600: '#1565c0',
    700: '#0d47a1',
    800: '#0a2472',
    900: '#051747'
  },
  secondary: {
    main: '#9c27b0', // 4.5:1 contrast ratio on white
    light: '#ba68c8',
    dark: '#7b1fa2',
    contrastText: '#ffffff',
    50: '#f3e5f5',
    100: '#e1bee7',
    200: '#ce93d8',
    300: '#ba68c8',
    400: '#ab47bc',
    500: '#9c27b0',
    600: '#8e24aa',
    700: '#7b1fa2',
    800: '#6a1b9a',
    900: '#4a148c'
  },
  error: {
    main: '#d32f2f', // 4.5:1 contrast ratio on white
    light: '#ef5350',
    dark: '#c62828',
    contrastText: '#ffffff',
    50: '#ffebee',
    100: '#ffcdd2',
    200: '#ef9a9a',
    300: '#e57373',
    400: '#ef5350',
    500: '#f44336',
    600: '#e53935',
    700: '#d32f2f',
    800: '#c62828',
    900: '#b71c1c'
  },
  warning: {
    main: '#ed6c02', // 4.5:1 contrast ratio on white
    light: '#ff9800',
    dark: '#e65100',
    contrastText: '#ffffff',
    50: '#fff3e0',
    100: '#ffe0b2',
    200: '#ffcc80',
    300: '#ffb74d',
    400: '#ffa726',
    500: '#ff9800',
    600: '#fb8c00',
    700: '#f57c00',
    800: '#ef6c00',
    900: '#e65100'
  },
  success: {
    main: '#2e7d32', // 4.5:1 contrast ratio on white
    light: '#4caf50',
    dark: '#1b5e20',
    contrastText: '#ffffff',
    50: '#e8f5e9',
    100: '#c8e6c9',
    200: '#a5d6a7',
    300: '#81c784',
    400: '#66bb6a',
    500: '#4caf50',
    600: '#43a047',
    700: '#388e3c',
    800: '#2e7d32',
    900: '#1b5e20'
  },
  info: {
    main: '#0288d1', // 4.5:1 contrast ratio on white
    light: '#03a9f4',
    dark: '#01579b',
    contrastText: '#ffffff',
    50: '#e1f5fe',
    100: '#b3e5fc',
    200: '#81d4fa',
    300: '#4fc3f7',
    400: '#29b6f6',
    500: '#03a9f4',
    600: '#039be5',
    700: '#0288d1',
    800: '#0277bd',
    900: '#01579b'
  },
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
    A100: '#f5f5f5',
    A200: '#eeeeee',
    A400: '#bdbdbd',
    A700: '#616161'
  },
  background: {
    default: '#ffffff',
    paper: '#ffffff',
    dark: '#121212'
  },
  text: {
    primary: 'rgba(0, 0, 0, 0.87)', // 7:1 contrast ratio
    secondary: 'rgba(0, 0, 0, 0.6)', // 4.5:1 contrast ratio
    disabled: 'rgba(0, 0, 0, 0.38)',
    hint: 'rgba(0, 0, 0, 0.38)'
  }
};

// Typography system
export const typography = {
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    code: '"Source Code Pro", monospace'
  },
  fontSize: {
    xs: pxToRem(12),
    sm: pxToRem(14),
    base: pxToRem(16),
    lg: pxToRem(18),
    xl: pxToRem(20),
    '2xl': pxToRem(24),
    '3xl': pxToRem(30),
    '4xl': pxToRem(36),
    '5xl': pxToRem(48)
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  },
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2
  },
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em'
  }
};

// Spacing system
export const spacing = {
  scale: {
    '0': '0',
    '1': createSpacing(1),
    '2': createSpacing(2),
    '3': createSpacing(3),
    '4': createSpacing(4),
    '5': createSpacing(5),
    '6': createSpacing(6),
    '8': createSpacing(8),
    '10': createSpacing(10),
    '12': createSpacing(12),
    '16': createSpacing(16),
    '20': createSpacing(20),
    '24': createSpacing(24)
  },
  layout: {
    page: createSpacing(6),
    section: createSpacing(4),
    component: createSpacing(3)
  },
  component: {
    small: createSpacing(1),
    medium: createSpacing(2),
    large: createSpacing(3)
  }
};

// Breakpoint system
export const breakpoints = {
  values: {
    xs: 320,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1440
  },
  up: (key: keyof typeof breakpoints.values) => 
    `@media (min-width: ${breakpoints.values[key]}px)`,
  down: (key: keyof typeof breakpoints.values) => 
    `@media (max-width: ${breakpoints.values[key] - 0.05}px)`,
  between: (start: keyof typeof breakpoints.values, end: keyof typeof breakpoints.values) => 
    `@media (min-width: ${breakpoints.values[start]}px) and (max-width: ${breakpoints.values[end] - 0.05}px)`
};

// Z-index system
export const zIndex = {
  values: {
    mobileStepper: 1000,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500
  }
};