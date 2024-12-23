import React from 'react'; // ^18.2.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { useMediaQuery } from '@mui/material'; // ^5.0.0
import { 
  Card as MuiCard, 
  CardHeader, 
  CardContent, 
  CardActions 
} from '@mui/material'; // ^5.0.0
import { defaultTheme } from '../../assets/styles/theme';
import { Button } from './Button';

// Constants for card configuration
const CARD_TRANSITION_DURATION = '0.3s';
const CARD_BORDER_RADIUS = '8px';
const CARD_DEFAULT_ELEVATION = 1;
const CARD_MIN_TOUCH_TARGET = '44px';
const CARD_FOCUS_VISIBLE_OUTLINE = '2px solid';

// Type definitions for card props
interface CardProps {
  variant?: 'outlined' | 'elevated';
  elevation?: number;
  title?: React.ReactNode;
  subheader?: React.ReactNode;
  actions?: React.ReactNode[];
  children?: React.ReactNode;
  hoverable?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  error?: boolean;
  ariaLabel?: string;
  ariaDescribedby?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
}

// Style generation function with accessibility considerations
const getCardStyles = (props: CardProps, theme = defaultTheme, prefersReducedMotion: boolean) => {
  const { variant = 'elevated', elevation = CARD_DEFAULT_ELEVATION, hoverable, fullWidth, error } = props;

  return {
    position: 'relative',
    width: fullWidth ? '100%' : 'auto',
    borderRadius: CARD_BORDER_RADIUS,
    backgroundColor: error ? theme.palette.error.light : theme.palette.background.paper,
    border: variant === 'outlined' ? `1px solid ${theme.palette.divider}` : 'none',
    boxShadow: variant === 'elevated' ? theme.shadows[elevation] : 'none',
    transition: prefersReducedMotion ? 'none' : `all ${CARD_TRANSITION_DURATION} ease-in-out`,
    cursor: hoverable ? 'pointer' : 'default',

    // Ensure sufficient touch target size for mobile
    minHeight: CARD_MIN_TOUCH_TARGET,

    // High contrast mode support
    '@media (forced-colors: active)': {
      borderColor: 'CanvasText',
      '&:focus-visible': {
        outline: '2px solid ButtonText',
      },
    },

    // Hover state with motion consideration
    ...(hoverable && !prefersReducedMotion && {
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[elevation + 1],
      },
    }),

    // Focus visible styles for keyboard navigation
    '&:focus-visible': {
      outline: `${CARD_FOCUS_VISIBLE_OUTLINE} ${theme.palette.primary.main}`,
      outlineOffset: '2px',
    },

    // Error state styles
    ...(error && {
      borderColor: theme.palette.error.main,
      '&:focus-visible': {
        outlineColor: theme.palette.error.main,
      },
    }),
  };
};

// Styled card component with accessibility enhancements
const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => 
    !['hoverable', 'fullWidth', 'error', 'ariaLabel', 'ariaDescribedby'].includes(prop as string),
})<CardProps>(({ theme, ...props }) => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return getCardStyles(props, theme, prefersReducedMotion);
});

// Main card component with accessibility and interaction handling
export const Card = React.memo<CardProps>(({
  variant = 'elevated',
  elevation = CARD_DEFAULT_ELEVATION,
  title,
  subheader,
  actions,
  children,
  hoverable = false,
  fullWidth = false,
  loading = false,
  error = false,
  ariaLabel,
  ariaDescribedby,
  onClick,
  className,
  ...props
}) => {
  // Keyboard interaction handler
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (hoverable && onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
    }
  };

  return (
    <StyledCard
      variant={variant}
      elevation={elevation}
      hoverable={hoverable}
      fullWidth={fullWidth}
      error={error}
      onClick={hoverable ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={hoverable ? 'button' : undefined}
      tabIndex={hoverable ? 0 : undefined}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-disabled={loading}
      aria-busy={loading}
      className={className}
      {...props}
    >
      {/* Card Header with semantic HTML */}
      {(title || subheader) && (
        <CardHeader
          title={title}
          subheader={subheader}
          titleTypographyProps={{
            variant: 'h6',
            component: 'h2',
            color: error ? 'error' : 'textPrimary',
          }}
          subheaderTypographyProps={{
            variant: 'body2',
            color: error ? 'error' : 'textSecondary',
          }}
        />
      )}

      {/* Card Content with loading state */}
      <CardContent>
        {loading ? (
          <div role="alert" aria-busy="true">
            Loading...
          </div>
        ) : (
          children
        )}
      </CardContent>

      {/* Card Actions with keyboard navigation */}
      {actions && actions.length > 0 && (
        <CardActions>
          {actions.map((action, index) => (
            <React.Fragment key={index}>
              {React.isValidElement(action) && action.type === Button
                ? React.cloneElement(action, {
                    disabled: loading,
                    size: 'small',
                    tabIndex: hoverable ? -1 : 0,
                  })
                : action}
            </React.Fragment>
          ))}
        </CardActions>
      )}
    </StyledCard>
  );
});

Card.displayName = 'Card';

export type { CardProps };