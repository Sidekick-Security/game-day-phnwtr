/**
 * Exercise Control Page Component
 * Provides comprehensive interface for managing and monitoring tabletop exercises in real-time.
 * Implements WCAG 2.1 Level AA accessibility standards and real-time WebSocket updates.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  LinearProgress,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material'; // ^5.0.0
import {
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material'; // ^5.0.0

import ExerciseControl from '../components/exercise/ExerciseControl';
import useExercise from '../hooks/useExercise';
import useWebSocket from '../hooks/useWebSocket';
import { ExerciseStatus, ParticipantStatus } from '../types/exercise.types';
import { IExerciseMetrics } from '../interfaces/exercise.interface';

/**
 * Exercise Control Page Props Interface
 */
interface ExerciseControlPageProps {
  accessibility?: {
    reducedMotion: boolean;
    highContrast: boolean;
  };
}

/**
 * Exercise Control Page Component
 */
const ExerciseControlPage: React.FC<ExerciseControlPageProps> = ({
  accessibility = { reducedMotion: false, highContrast: false }
}) => {
  // Hooks and state management
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();

  // Exercise management hook
  const {
    exercise,
    loading,
    error,
    metrics,
    startExercise,
    pauseExercise,
    completeExercise,
    monitorMetrics,
    validateCompliance
  } = useExercise(exerciseId!, {
    enableRealTimeMetrics: true,
    enableComplianceValidation: true
  });

  // WebSocket connection for real-time updates
  const {
    connectionState,
    subscribe,
    unsubscribe,
    emit
  } = useWebSocket(`exercises/${exerciseId}/control`, {
    autoConnect: true,
    autoReconnect: true
  });

  // Local state management
  const [notification, setNotification] = useState<{
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
    open: boolean;
  }>({ message: '', severity: 'info', open: false });

  /**
   * Handles exercise completion with validation
   */
  const handleExerciseComplete = useCallback(async () => {
    try {
      await completeExercise();
      setNotification({
        message: 'Exercise completed successfully',
        severity: 'success',
        open: true
      });
      navigate(`/exercises/${exerciseId}/summary`);
    } catch (error: any) {
      setNotification({
        message: `Failed to complete exercise: ${error.message}`,
        severity: 'error',
        open: true
      });
    }
  }, [exerciseId, completeExercise, navigate]);

  /**
   * Handles WebSocket message processing
   */
  const handleWebSocketMessage = useCallback((message: any) => {
    try {
      const data = JSON.parse(message);
      switch (data.type) {
        case 'METRICS_UPDATE':
          monitorMetrics();
          break;
        case 'PARTICIPANT_UPDATE':
          // Handle participant status updates
          break;
        case 'INJECT_DELIVERY':
          // Handle new inject delivery
          break;
      }
    } catch (error) {
      console.error('WebSocket message parsing error:', error);
    }
  }, [monitorMetrics]);

  // Initialize WebSocket subscriptions
  useEffect(() => {
    if (connectionState === 'connected') {
      subscribe('exercise.update', handleWebSocketMessage);
      subscribe('metrics.update', handleWebSocketMessage);
    }

    return () => {
      unsubscribe('exercise.update', handleWebSocketMessage);
      unsubscribe('metrics.update', handleWebSocketMessage);
    };
  }, [connectionState, subscribe, unsubscribe, handleWebSocketMessage]);

  // Loading state
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        role="status"
        aria-label="Loading exercise data"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Alert 
          severity="error" 
          aria-live="assertive"
          sx={{ mt: 3 }}
        >
          {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Exercise Header */}
      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        aria-label={`Exercise Control - ${exercise?.title}`}
      >
        Exercise Control - {exercise?.title}
      </Typography>

      {/* Progress Indicator */}
      <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center">
              <CircularProgress
                variant="determinate"
                value={(metrics?.completionRate || 0) * 100}
                size={60}
                aria-label="Exercise progress"
              />
              <Typography variant="h6" sx={{ ml: 2 }}>
                {Math.round((metrics?.completionRate || 0) * 100)}% Complete
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={8}>
            <LinearProgress
              variant="determinate"
              value={(metrics?.completionRate || 0) * 100}
              sx={{ height: 10, borderRadius: 5 }}
              aria-label="Exercise progress bar"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Control Panel */}
      <Paper sx={{ p: 3, mb: 3 }} elevation={2}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Tooltip title={exercise?.status === ExerciseStatus.IN_PROGRESS ? 'Pause Exercise' : 'Start Exercise'}>
              <IconButton
                onClick={() => exercise?.status === ExerciseStatus.IN_PROGRESS ? pauseExercise() : startExercise()}
                aria-label={exercise?.status === ExerciseStatus.IN_PROGRESS ? 'Pause exercise' : 'Start exercise'}
                color="primary"
              >
                {exercise?.status === ExerciseStatus.IN_PROGRESS ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item>
            <Tooltip title="Complete Exercise">
              <IconButton
                onClick={handleExerciseComplete}
                aria-label="Complete exercise"
                color="secondary"
              >
                <StopIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Exercise Control Component */}
      <ExerciseControl
        exerciseId={exerciseId!}
        onExerciseComplete={handleExerciseComplete}
        onParticipantUpdate={() => {}}
        onInjectDelivery={() => {}}
      />

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          severity={notification.severity}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ExerciseControlPage;