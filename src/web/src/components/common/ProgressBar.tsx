import React, { memo } from 'react';
import { styled } from '@mui/material/styles';
import { LinearProgress, Box, Typography } from '@mui/material';
import { colors } from '../../assets/styles/variables';

// Interface for component props with comprehensive TypeScript types
interface ProgressBarProps {
  value: number;
  variant?: 'default' | 'success' | 'error';
  showLabel?: boolean;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  animate?: boolean;
}

// Styled components for custom theming and layout
const ProgressContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  '&[dir="rtl"]': {
    transform: 'scaleX(-1)'
  }
}));

const StyledProgress = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== 'size' && prop !== 'customColor'
})<{ size?: string; customColor: string }>(({ theme, size, customColor }) => ({
  width: '100%',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.grey[200],
  '.MuiLinearProgress-bar': {
    backgroundColor: customColor,
    transition: 'transform 0.4s linear'
  },
  height: size === 'small' ? 4 : size === 'large' ? 12 : 8,
  '&.MuiLinearProgress-root': {
    overflow: 'hidden'
  },
  '@media (prefers-reduced-motion: reduce)': {
    '.MuiLinearProgress-bar': {
      transition: 'none'
    }
  }
}));

// Helper function to determine progress color based on value and variant
const getProgressColor = (value: number, variant?: string): string => {
  if (variant === 'success') return colors.success.main;
  if (variant === 'error') return colors.error.main;

  // Default color logic based on progress value
  if (value < 33) return colors.warning.main;
  if (value < 66) return colors.info.main;
  return colors.success.main;
};

// Memoized ProgressBar component for performance optimization
const ProgressBar: React.FC<ProgressBarProps> = memo(({
  value,
  variant = 'default',
  showLabel = false,
  label,
  size = 'medium',
  animate = true
}) => {
  // Ensure value is within valid range
  const normalizedValue = Math.min(Math.max(value, 0), 100);
  const progressColor = getProgressColor(normalizedValue, variant);
  
  // Determine label text
  const labelText = label || `${normalizedValue}% Complete`;

  return (
    <ProgressContainer
      role="progressbar"
      aria-valuenow={normalizedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      dir={document.dir} // Support RTL layouts
    >
      <StyledProgress
        variant={animate ? "determinate" : "determinate"}
        value={normalizedValue}
        size={size}
        customColor={progressColor}
        // Additional ARIA attributes for accessibility
        aria-label={labelText}
      />
      {showLabel && (
        <Typography
          variant="caption"
          color="textSecondary"
          align="center"
          sx={{
            marginTop: (theme) => theme.spacing(0.5),
            // Ensure label is not flipped in RTL mode
            transform: document.dir === 'rtl' ? 'scaleX(-1)' : 'none'
          }}
        >
          {labelText}
        </Typography>
      )}
    </ProgressContainer>
  );
});

// Display name for debugging purposes
ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;