/**
 * Main Dashboard Component
 * Implements Material Design 3.0 principles with real-time exercise monitoring,
 * metrics display, and comprehensive accessibility features.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'; // ^18.2.0
import { 
  Grid, 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Alert 
} from '@mui/material'; // ^5.0.0
import { Add as AddIcon, Refresh as RefreshIcon } from '@mui/icons-material'; // ^5.0.0
import { styled } from '@mui/material/styles'; // ^5.0.0
import { useNavigate } from 'react-router-dom'; // ^6.0.0

// Internal components
import { ExerciseCard } from '../components/exercise/ExerciseCard';
import { MetricsCard } from '../components/analytics/MetricsCard';
import ErrorBoundary from '../components/common/ErrorBoundary';

// Hooks and utilities
import { useExercise } from '../hooks/useExercise';
import { ExerciseType, ExerciseStatus } from '../types/exercise.types';
import { MetricType, MetricUnit } from '../types/analytics.types';

// Styled components with accessibility considerations
const DashboardContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  overflowY: 'auto',
  position: 'relative',
  '&:focus': {
    outline: 'none',
  },
}));

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontWeight: 600,
  marginBottom: theme.spacing(2),
  color: theme.palette.text.primary,
}));

const LoadingOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: theme.zIndex.modal,
}));

// Dashboard component with error boundary and performance optimizations
const Dashboard: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  // Exercise management hook
  const {
    exercises,
    loading,
    error,
    metrics,
    createExercise,
    retryFetch
  } = useExercise('dashboard');

  // Memoized active exercises filtering
  const activeExercises = useMemo(() => 
    exercises?.filter(exercise => 
      exercise.status !== ExerciseStatus.COMPLETED && 
      exercise.status !== ExerciseStatus.ARCHIVED
    ) || [], 
    [exercises]
  );

  // Handle exercise creation with error handling
  const handleCreateExercise = useCallback(async () => {
    try {
      setIsCreating(true);
      await navigate('/exercises/create');
    } catch (err) {
      console.error('Failed to navigate to exercise creation:', err);
    } finally {
      setIsCreating(false);
    }
  }, [navigate]);

  // Handle exercise continuation with validation
  const handleExerciseContinue = useCallback(async (exerciseId: string) => {
    try {
      await navigate(`/exercises/${exerciseId}/control`);
    } catch (err) {
      console.error('Failed to navigate to exercise control:', err);
    }
  }, [navigate]);

  // Handle retry of failed data fetching
  const handleRetry = useCallback(async () => {
    await retryFetch();
  }, [retryFetch]);

  // Render loading state
  if (loading) {
    return (
      <LoadingOverlay>
        <CircularProgress 
          size={40} 
          aria-label="Loading dashboard content"
        />
      </LoadingOverlay>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" onClick={handleRetry}>
              Retry
            </Button>
          }
        >
          Failed to load dashboard content. Please try again.
        </Alert>
      }
    >
      <DashboardContainer role="main" aria-label="Dashboard">
        {/* Active Exercises Section */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <SectionTitle variant="h5">Active Exercises</SectionTitle>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateExercise}
                disabled={isCreating}
                aria-busy={isCreating}
              >
                Create Exercise
              </Button>
            </Box>
          </Grid>

          {/* Exercise Cards */}
          {activeExercises.map((exercise) => (
            <Grid item xs={12} sm={6} md={4} key={exercise.id}>
              <ExerciseCard
                id={exercise.id}
                title={exercise.title}
                type={exercise.type}
                status={exercise.status}
                progress={exercise.metrics.completionRate}
                participantCount={exercise.participants.length}
                onContinue={handleExerciseContinue}
                ariaLabel={`Exercise: ${exercise.title}`}
              />
            </Grid>
          ))}

          {/* Empty state */}
          {activeExercises.length === 0 && !loading && (
            <Grid item xs={12}>
              <Alert severity="info">
                No active exercises. Create one to get started.
              </Alert>
            </Grid>
          )}
        </Grid>

        {/* Metrics Section */}
        <Grid container spacing={3} mt={4}>
          <Grid item xs={12}>
            <SectionTitle variant="h5">Performance Metrics</SectionTitle>
          </Grid>

          {/* Response Time Metric */}
          <Grid item xs={12} sm={6} md={4}>
            <MetricsCard
              title="Average Response Time"
              metricType={MetricType.RESPONSE_TIME}
              value={metrics?.responseTime || 0}
              trend={5}
              unit={MetricUnit.SECONDS}
              historicalData={[]}
              isLoading={loading}
              error={error}
            />
          </Grid>

          {/* Compliance Coverage Metric */}
          <Grid item xs={12} sm={6} md={4}>
            <MetricsCard
              title="Compliance Coverage"
              metricType={MetricType.COMPLIANCE_COVERAGE}
              value={metrics?.complianceCoverage || 0}
              trend={3}
              unit={MetricUnit.PERCENTAGE}
              historicalData={[]}
              isLoading={loading}
              error={error}
            />
          </Grid>

          {/* Exercise Completion Metric */}
          <Grid item xs={12} sm={6} md={4}>
            <MetricsCard
              title="Exercise Completion Rate"
              metricType={MetricType.EXERCISE_COMPLETION}
              value={metrics?.completionRate || 0}
              trend={-2}
              unit={MetricUnit.PERCENTAGE}
              historicalData={[]}
              isLoading={loading}
              error={error}
            />
          </Grid>
        </Grid>

        {/* Recent Activity Section */}
        <Grid container spacing={3} mt={4}>
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <SectionTitle variant="h5">Recent Activity</SectionTitle>
              <Button
                startIcon={<RefreshIcon />}
                onClick={handleRetry}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Grid>

          {/* Activity content would go here */}
        </Grid>
      </DashboardContainer>
    </ErrorBoundary>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;