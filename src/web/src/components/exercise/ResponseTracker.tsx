/**
 * ResponseTracker Component
 * Displays and tracks participant responses during exercise execution with real-time updates
 * and WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import { format, formatDistance } from 'date-fns';
import { styled } from '@mui/material/styles';

import Table from '../common/Table';
import { IExerciseResponse, IExerciseInject } from '../../interfaces/exercise.interface';
import { ExerciseService } from '../../services/exercise.service';

// Constants for component configuration
const POLLING_INTERVAL = 5000; // 5 seconds
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_VIRTUALIZE_THRESHOLD = 100;

// Styled components for enhanced accessibility
const ResponseContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

// Interface definitions
interface ResponseTrackerProps {
  exerciseId: string;
  injectId: string | null;
  refreshInterval?: number;
  onResponseUpdate?: (response: IExerciseResponse) => void;
  virtualizeThreshold?: number;
  retryAttempts?: number;
}

// Custom hook for response polling
const useResponsePolling = (
  exerciseId: string,
  interval: number,
  retryAttempts: number
) => {
  const [responses, setResponses] = useState<IExerciseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const exerciseService = new ExerciseService();
  const pollingRef = useRef<NodeJS.Timeout>();

  const fetchResponses = useCallback(async () => {
    try {
      const data = await exerciseService.getExerciseResponses(exerciseId);
      setResponses(data);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      if (retryCount < retryAttempts) {
        setRetryCount(prev => prev + 1);
      } else {
        setError(err as Error);
      }
    } finally {
      setLoading(false);
    }
  }, [exerciseId, retryAttempts, retryCount]);

  useEffect(() => {
    fetchResponses();
    pollingRef.current = setInterval(fetchResponses, interval);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [fetchResponses, interval]);

  return { responses, loading, error };
};

// Table columns configuration
const getTableColumns = (exerciseService: ExerciseService) => [
  {
    id: 'submittedAt',
    label: 'Time',
    sortable: true,
    format: (value: Date) => format(new Date(value), 'HH:mm:ss'),
    width: '120px',
  },
  {
    id: 'content',
    label: 'Response',
    sortable: false,
    width: '40%',
  },
  {
    id: 'validationStatus',
    label: 'Status',
    sortable: true,
    width: '120px',
    renderCell: (row: IExerciseResponse) => (
      <Box
        component="span"
        sx={{
          color: row.validation.isValid ? 'success.main' : 'error.main',
          fontWeight: 'medium',
        }}
        role="status"
        aria-label={`Validation status: ${row.validation.isValid ? 'Valid' : 'Invalid'}`}
      >
        {row.validation.isValid ? 'Valid' : 'Invalid'}
      </Box>
    ),
  },
  {
    id: 'lastUpdated',
    label: 'Last Updated',
    sortable: true,
    format: (value: Date) => formatDistance(new Date(value), new Date(), { addSuffix: true }),
    width: '150px',
  },
];

/**
 * ResponseTracker Component
 * Displays real-time exercise responses with accessibility support
 */
const ResponseTracker: React.FC<ResponseTrackerProps> = memo(({
  exerciseId,
  injectId,
  refreshInterval = POLLING_INTERVAL,
  onResponseUpdate,
  virtualizeThreshold = DEFAULT_VIRTUALIZE_THRESHOLD,
  retryAttempts = MAX_RETRY_ATTEMPTS,
}) => {
  const exerciseService = new ExerciseService();
  const { responses, loading, error } = useResponsePolling(
    exerciseId,
    refreshInterval,
    retryAttempts
  );

  // Filter responses by inject if specified
  const filteredResponses = injectId
    ? responses.filter(response => response.injectId === injectId)
    : responses;

  // Handle response updates
  useEffect(() => {
    if (onResponseUpdate && responses.length > 0) {
      onResponseUpdate(responses[responses.length - 1]);
    }
  }, [responses, onResponseUpdate]);

  return (
    <ResponseContainer
      role="region"
      aria-label="Exercise Responses"
      aria-busy={loading}
    >
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          role="alert"
        >
          Error loading responses: {error.message}
        </Alert>
      )}

      {loading && responses.length === 0 ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress
            size={40}
            aria-label="Loading responses"
          />
        </Box>
      ) : (
        <>
          <Typography
            variant="h6"
            component="h2"
            sx={{ px: 2, py: 1.5 }}
            id="response-tracker-title"
          >
            Response Tracking
          </Typography>

          <Table
            columns={getTableColumns(exerciseService)}
            data={filteredResponses}
            loading={loading}
            virtualScroll={filteredResponses.length > virtualizeThreshold}
            stickyHeader
            maxHeight="600px"
            ariaLabel="Exercise responses table"
            ariaDescribedBy="response-tracker-title"
          />

          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              {`${filteredResponses.length} responses`}
              {loading && ' • Updating...'}
            </Typography>
          </Box>
        </>
      )}
    </ResponseContainer>
  );
});

ResponseTracker.displayName = 'ResponseTracker';

export default ResponseTracker;