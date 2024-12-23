import React, { useCallback, useMemo } from 'react'; // ^18.2.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { useMediaQuery } from '@mui/material'; // ^5.0.0
import { Card } from '../common/Card';
import ProgressBar from '../common/ProgressBar';
import ErrorBoundary from '../common/ErrorBoundary';
import { formatErrorMessage } from '../../utils/error.utils';
import { ErrorCode } from '../../constants/error.constants';

// Constants for component configuration
const CARD_MIN_WIDTH = '320px';
const CARD_MAX_WIDTH = '400px';
const LOADING_TIMEOUT = 5000;
const MIN_TOUCH_TARGET = '44px';

// Exercise type enumeration
export enum ExerciseType {
  SECURITY_INCIDENT = 'SECURITY_INCIDENT',
  BUSINESS_CONTINUITY = 'BUSINESS_CONTINUITY',
  COMPLIANCE_VALIDATION = 'COMPLIANCE_VALIDATION',
  CRISIS_MANAGEMENT = 'CRISIS_MANAGEMENT',
  TECHNICAL_RECOVERY = 'TECHNICAL_RECOVERY'
}

// Exercise status enumeration
export enum ExerciseStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED'
}

// Props interface with comprehensive type definitions
interface ExerciseCardProps {
  id: string;
  title: string;
  type: ExerciseType;
  status: ExerciseStatus;
  progress: number;
  participantCount: number;
  onClick?: () => void;
  onContinue: (id: string) => Promise<void>;
  isLoading?: boolean;
  error?: Error | null;
  className?: string;
  ariaLabel?: string;
}

// Styled components with accessibility and responsiveness
const StyledCard = styled(Card, {
  shouldForwardProp: (prop) => !['isClickable'].includes(String(prop))
})<{ isClickable?: boolean }>(({ theme, isClickable }) => ({
  minWidth: CARD_MIN_WIDTH,
  maxWidth: CARD_MAX_WIDTH,
  margin: theme.spacing(1),
  cursor: isClickable ? 'pointer' : 'default',
  transition: theme.transitions.create(['transform', 'box-shadow']),
  
  '&:hover': isClickable ? {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4]
  } : {},

  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none'
  }
}));

const CardContent = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2)
}));

const StatusBadge = styled('span')<{ status: ExerciseStatus }>(({ theme, status }) => ({
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  fontSize: '0.875rem',
  fontWeight: 500,
  backgroundColor: (() => {
    switch (status) {
      case ExerciseStatus.IN_PROGRESS:
        return theme.palette.primary.main;
      case ExerciseStatus.COMPLETED:
        return theme.palette.success.main;
      case ExerciseStatus.PAUSED:
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  })(),
  color: theme.palette.common.white,
  minHeight: MIN_TOUCH_TARGET
}));

// Memoized ExerciseCard component
export const ExerciseCard: React.FC<ExerciseCardProps> = React.memo(({
  id,
  title,
  type,
  status,
  progress,
  participantCount,
  onClick,
  onContinue,
  isLoading = false,
  error = null,
  className,
  ariaLabel
}) => {
  // Responsive design hook
  const isMobile = useMediaQuery('(max-width:600px)');

  // Memoized error message formatting
  const errorMessage = useMemo(() => {
    if (error) {
      return formatErrorMessage(
        ErrorCode.INTERNAL_SERVER_ERROR,
        error.message,
        { locale: navigator.language }
      );
    }
    return null;
  }, [error]);

  // Continue button click handler with error handling
  const handleContinue = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;

    try {
      await onContinue(id);
    } catch (err) {
      console.error('Failed to continue exercise:', err);
    }
  }, [id, isLoading, onContinue]);

  return (
    <ErrorBoundary
      fallback={
        <div role="alert" className="error-state">
          {errorMessage || 'An error occurred while displaying the exercise card.'}
        </div>
      }
    >
      <StyledCard
        variant="elevated"
        elevation={2}
        isClickable={Boolean(onClick)}
        onClick={onClick}
        className={className}
        aria-label={ariaLabel || `Exercise: ${title}`}
        aria-busy={isLoading}
        error={Boolean(error)}
      >
        <CardContent>
          <div>
            <h3 style={{ margin: 0, fontSize: isMobile ? '1rem' : '1.25rem' }}>
              {title}
            </h3>
            <p style={{ margin: '0.5rem 0', color: 'text.secondary' }}>
              {type.replace(/_/g, ' ')}
            </p>
          </div>

          <StatusBadge
            status={status}
            role="status"
            aria-label={`Status: ${status.replace(/_/g, ' ').toLowerCase()}`}
          >
            {status.replace(/_/g, ' ')}
          </StatusBadge>

          <ProgressBar
            value={progress}
            showLabel
            size={isMobile ? 'small' : 'medium'}
            variant={progress === 100 ? 'success' : 'default'}
            label={`Progress: ${progress}%`}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span aria-label={`${participantCount} participants`}>
              👥 {participantCount} {participantCount === 1 ? 'Participant' : 'Participants'}
            </span>
            
            {status !== ExerciseStatus.COMPLETED && (
              <button
                onClick={handleContinue}
                disabled={isLoading}
                aria-busy={isLoading}
                style={{ minHeight: MIN_TOUCH_TARGET }}
              >
                {isLoading ? 'Loading...' : 'Continue'}
              </button>
            )}
          </div>

          {error && (
            <div role="alert" aria-live="polite" className="error-message">
              {errorMessage}
            </div>
          )}
        </CardContent>
      </StyledCard>
    </ErrorBoundary>
  );
});

ExerciseCard.displayName = 'ExerciseCard';

export type { ExerciseCardProps };