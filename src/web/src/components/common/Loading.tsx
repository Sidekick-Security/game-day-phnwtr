import React from 'react'; // ^18.2.0
import { CircularProgress, Box } from '@mui/material'; // ^5.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { defaultTheme } from '../../assets/styles/theme';

// Loading size configurations in pixels
const LOADING_SIZES = {
  small: 24,
  medium: 40,
  large: 56,
} as const;

// Z-index for overlay positioning
const OVERLAY_Z_INDEX = defaultTheme.zIndex.modal - 1;

interface LoadingProps {
  /** Size variant of the loading indicator */
  size?: keyof typeof LOADING_SIZES;
  /** Whether to show the loading indicator with a background overlay */
  overlay?: boolean;
  /** Whether to display the loading indicator in fullscreen mode */
  fullscreen?: boolean;
  /** Optional message to display below the loading indicator */
  message?: string;
  /** Color variant of the loading indicator */
  color?: 'primary' | 'secondary' | 'inherit';
  /** Optional className for additional styling */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

// Styled container for the loading indicator
const LoadingContainer = styled(Box, {
  shouldForwardProp: (prop) => 
    !['overlay', 'fullscreen'].includes(prop as string),
})<{
  overlay?: boolean;
  fullscreen?: boolean;
}>(({ theme, overlay, fullscreen }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  ...(overlay && {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: OVERLAY_Z_INDEX,
    '@media (prefers-color-scheme: dark)': {
      backgroundColor: 'rgba(18, 18, 18, 0.7)',
    },
  }),
  ...(fullscreen && {
    position: 'fixed',
    width: '100vw',
    height: '100vh',
  }),
  // Respect reduced motion preferences
  '@media (prefers-reduced-motion: reduce)': {
    '& .MuiCircularProgress-root': {
      animation: 'none',
      '& .MuiCircularProgress-circle': {
        animation: 'none',
        strokeDasharray: '80px, 200px',
        strokeDashoffset: 0,
      },
    },
  },
}));

// Styled message text
const LoadingMessage = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
  color: theme.palette.text.secondary,
  fontSize: theme.typography.body2.fontSize,
  textAlign: 'center',
  maxWidth: '80%',
}));

/**
 * Loading component that provides visual feedback during asynchronous operations
 * with support for different sizes, variants, and accessibility features.
 */
const Loading: React.FC<LoadingProps> = React.memo(({
  size = 'medium',
  overlay = false,
  fullscreen = false,
  message,
  color = 'primary',
  className,
  style,
}) => {
  // Get the numeric size value from LOADING_SIZES
  const loadingSize = LOADING_SIZES[size];

  return (
    <LoadingContainer
      overlay={overlay}
      fullscreen={fullscreen}
      className={className}
      style={style}
      role="progressbar"
      aria-busy="true"
      aria-label={message || 'Loading content'}
    >
      <CircularProgress
        size={loadingSize}
        color={color}
        aria-hidden="true" // Hide from screen readers as we use aria-label on container
      />
      {message && (
        <LoadingMessage role="status">
          {message}
        </LoadingMessage>
      )}
    </LoadingContainer>
  );
});

// Display name for debugging
Loading.displayName = 'Loading';

export default Loading;