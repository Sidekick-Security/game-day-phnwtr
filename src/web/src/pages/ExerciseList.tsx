/**
 * Exercise List Page Component
 * Displays a list of exercises with filtering, sorting, pagination, and real-time updates.
 * Implements Material Design 3.0 principles and comprehensive accessibility features.
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material'; // ^5.0.0
import { useVirtualizer } from '@tanstack/react-virtual'; // ^3.0.0

import { ExerciseList } from '../components/exercise/ExerciseList';
import { ExerciseService } from '../services/exercise.service';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { formatErrorMessage } from '../utils/error.utils';
import { ErrorCode } from '../constants/error.constants';
import { ExerciseType } from '../types/exercise.types';

// Constants
const PAGE_TITLE = 'Exercises';
const DEFAULT_PAGE_SIZE = 12;
const FILTER_DEBOUNCE_MS = 300;
const VIRTUAL_LIST_OVERSCAN = 5;

// Styled Components
const PageContainer = styled(Container)(({ theme }) => ({
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const HeaderContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}));

// Custom hook for managing exercise list state and operations
const useExerciseList = () => {
  const dispatch = useDispatch();
  const exerciseService = new ExerciseService();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [exercises, setExercises] = useState([]);

  // Initialize WebSocket connection for real-time updates
  useEffect(() => {
    const subscription = exerciseService.subscribeToExerciseUpdates()
      .subscribe({
        next: (updatedExercises) => {
          setExercises(updatedExercises);
        },
        error: (err) => {
          setError(new Error(formatErrorMessage(
            ErrorCode.INTERNAL_SERVER_ERROR,
            err.message,
            { locale: navigator.language }
          )));
        }
      });

    return () => {
      subscription.unsubscribe();
      exerciseService.unsubscribeFromExerciseUpdates();
    };
  }, []);

  // Fetch initial exercise data
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const data = await exerciseService.getOrganizationExercises();
        setExercises(data);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  return { exercises, loading, error };
};

/**
 * Exercise List Page Component
 * Displays a paginated, filterable list of exercises with real-time updates
 */
const ExerciseListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Get exercise list state from custom hook
  const { exercises, loading, error } = useExerciseList();

  // Virtual list configuration for performance
  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: exercises.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200,
    overscan: VIRTUAL_LIST_OVERSCAN
  });

  // Event Handlers
  const handleExerciseClick = useCallback((exerciseId: string) => {
    navigate(`/exercises/${exerciseId}`);
  }, [navigate]);

  const handleContinueExercise = useCallback(async (exerciseId: string) => {
    try {
      // Implementation of continue exercise logic
      navigate(`/exercises/${exerciseId}/control`);
    } catch (err) {
      console.error('Failed to continue exercise:', err);
    }
  }, [navigate]);

  // Error handling
  const handleError = useCallback((error: Error) => {
    console.error('Exercise list error:', error);
  }, []);

  // Render loading state
  if (loading) {
    return (
      <PageContainer>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={40} aria-label="Loading exercises" />
        </Box>
      </PageContainer>
    );
  }

  return (
    <ErrorBoundary>
      <PageContainer>
        <HeaderContainer>
          <Typography 
            variant="h1" 
            component="h1"
            fontSize={isMobile ? '2rem' : '2.5rem'}
          >
            {PAGE_TITLE}
          </Typography>

          {error && (
            <Alert 
              severity="error" 
              onClose={() => handleError(error)}
              sx={{ mb: 2 }}
            >
              {error.message}
            </Alert>
          )}
        </HeaderContainer>

        <Box ref={parentRef} style={{ height: '80vh', overflow: 'auto' }}>
          <ExerciseList
            exercises={exercises}
            loading={loading}
            error={error}
            onExerciseClick={handleExerciseClick}
            onContinueExercise={handleContinueExercise}
            pageSize={DEFAULT_PAGE_SIZE}
            onError={handleError}
            ariaLabel="Exercise list"
          />
        </Box>
      </PageContainer>
    </ErrorBoundary>
  );
};

export default ExerciseListPage;