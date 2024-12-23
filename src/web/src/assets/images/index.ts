// Image Assets Index v1.0.0
// Implements Material Design 3.0 principles for GameDay Platform
// Supports responsive design and theme variations

// Type definitions for image management
type ImageFormat = 'webp' | 'png' | 'svg';

type BreakpointSize = 'mobile' | 'tablet' | 'desktop' | 'large';

type ExerciseType = 'security' | 'businessContinuity' | 'compliance' | 'crisis' | 'technicalRecovery';

type EmptyStateType = 'noExercises' | 'noResults' | 'noAnalytics' | 'noTeam' | 'offline';

// Global constants
const IMAGE_BASE_PATH = '/assets/images/';
const SUPPORTED_IMAGE_FORMATS: ImageFormat[] = ['webp', 'png', 'svg'];

// Utility functions for image path management
const getImagePath = (imageName: string, format: ImageFormat = 'webp'): string => {
  if (!imageName) {
    throw new Error('Image name is required');
  }

  if (!SUPPORTED_IMAGE_FORMATS.includes(format)) {
    throw new Error(`Unsupported image format: ${format}`);
  }

  return `${IMAGE_BASE_PATH}${imageName}.${format}`;
};

const getResponsiveImagePath = (imageName: string, size: BreakpointSize): string => {
  const breakpointSizes = {
    mobile: '1x',
    tablet: '2x',
    desktop: '3x',
    large: '4x'
  };

  return getImagePath(`${imageName}@${breakpointSizes[size]}`);
};

// Logo exports with theme support
export const logoLight = getImagePath('gameday-logo-light', 'svg');
export const logoDark = getImagePath('gameday-logo-dark', 'svg');

// Default avatar placeholder
export const defaultAvatar = getImagePath('default-avatar', 'svg');

// Exercise type-specific icons
export const exerciseIcons: Record<ExerciseType, string> = {
  security: getImagePath('exercise-security', 'svg'),
  businessContinuity: getImagePath('exercise-business', 'svg'),
  compliance: getImagePath('exercise-compliance', 'svg'),
  crisis: getImagePath('exercise-crisis', 'svg'),
  technicalRecovery: getImagePath('exercise-technical', 'svg')
};

// Empty state illustrations
export const emptyStateImages: Record<EmptyStateType, string> = {
  noExercises: getImagePath('empty-exercises'),
  noResults: getImagePath('empty-results'),
  noAnalytics: getImagePath('empty-analytics'),
  noTeam: getImagePath('empty-team'),
  offline: getImagePath('empty-offline')
};

// Responsive image sets
const getResponsiveImageSet = (baseName: string) => ({
  mobile: getResponsiveImagePath(baseName, 'mobile'),
  tablet: getResponsiveImagePath(baseName, 'tablet'),
  desktop: getResponsiveImagePath(baseName, 'desktop'),
  large: getResponsiveImagePath(baseName, 'large')
});

// Export responsive logo variations
export const responsiveLogos = {
  light: getResponsiveImageSet('gameday-logo-light'),
  dark: getResponsiveImageSet('gameday-logo-dark')
};

// Export responsive exercise icons
export const responsiveExerciseIcons: Record<ExerciseType, Record<BreakpointSize, string>> = {
  security: getResponsiveImageSet('exercise-security'),
  businessContinuity: getResponsiveImageSet('exercise-business'),
  compliance: getResponsiveImageSet('exercise-compliance'),
  crisis: getResponsiveImageSet('exercise-crisis'),
  technicalRecovery: getResponsiveImageSet('exercise-technical')
};

// Export responsive empty state images
export const responsiveEmptyStateImages: Record<EmptyStateType, Record<BreakpointSize, string>> = {
  noExercises: getResponsiveImageSet('empty-exercises'),
  noResults: getResponsiveImageSet('empty-results'),
  noAnalytics: getResponsiveImageSet('empty-analytics'),
  noTeam: getResponsiveImageSet('empty-team'),
  offline: getResponsiveImageSet('empty-offline')
};

// Export utility functions for custom image handling
export { getImagePath, getResponsiveImagePath };

// Export types for type-safe usage
export type { ImageFormat, BreakpointSize, ExerciseType, EmptyStateType };