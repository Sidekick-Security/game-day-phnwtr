/**
 * @fileoverview Font configuration for GameDay Platform web interface
 * @version 1.0.0
 * 
 * Implements Material Design 3.0 typography system with enterprise customization
 * support and WCAG 2.1 Level AA compliance. Provides standardized font families,
 * weights, and sizes for consistent typography across the platform.
 */

/**
 * Primary font stack optimized for cross-platform rendering and accessibility.
 * Uses Inter as the primary font with comprehensive system font fallbacks.
 */
export const primaryFont = "'Inter var', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'"

/**
 * Secondary font stack for headings and emphasis.
 * Maintains consistency with primary font while providing distinct visual hierarchy.
 */
export const secondaryFont = "'Inter var', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

/**
 * Monospace font stack for code and technical content.
 * Optimized for readability in technical scenarios with consistent character width.
 */
export const monoFont = "'Roboto Mono', 'SF Mono', 'Fira Code', 'Consolas', 'Monaco', monospace"

/**
 * Standardized font weights following Material Design specifications.
 * Values chosen to ensure proper rendering across different font weights
 * and maintain WCAG 2.1 Level AA compliance for contrast ratios.
 */
export const fontWeights = Object.freeze({
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700
})

/**
 * WCAG-compliant font size scale using relative units (rem).
 * Provides consistent sizing across the application while maintaining
 * accessibility and supporting user font size preferences.
 * 
 * Base size (md) is 1rem = 16px in most browsers
 */
export const fontSizes = Object.freeze({
  xs: '0.75rem',  // 12px
  sm: '0.875rem', // 14px
  md: '1rem',     // 16px
  lg: '1.125rem', // 18px
  xl: '1.25rem'   // 20px
})