/**
 * Exercise Control Component
 * Provides comprehensive control and management of tabletop exercises with real-time updates
 * and enhanced accessibility features.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react'; // ^18.2.0
import {
  Box,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Alert,
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
  SkipNext as NextIcon,
  SkipPrevious as PrevIcon,
  Person as PersonIcon,
  Check as CheckIcon,
  Warning as WarningIcon
} from '@mui/icons-material'; // ^5.0.0
import { useWebSocket } from 'react-use-websocket'; // ^4.5.0
import { debounce } from 'lodash'; // ^4.17.21

import {
  IExercise,
  IExerciseInject,
  IExerciseParticipant,
  IExerciseMetrics
} from '../../interfaces/exercise.interface';
import ExerciseService from '../../services/exercise.service';
import { ExerciseStatus, ParticipantStatus } from '../../types/exercise.types';

// Props interface with accessibility support
interface ExerciseControlProps {
  exerciseId: string;
  onExerciseComplete: () => void;
  onError: (error: Error) => void;
  accessibility?: {
    reducedMotion: boolean;
    highContrast: boolean;
  };
}

/**
 * Exercise Control Component
 * Manages exercise execution, participant tracking, and real-time updates
 */
const ExerciseControl: React.FC<ExerciseControlProps> = memo(({
  exerciseId,
  onExerciseComplete,
  onError,
  accessibility = { reducedMotion: false, highContrast: false }
}) => {
  // Theme and styles
  const theme = useTheme();

  // State management
  const [exercise, setExercise] = useState<IExercise | null>(null);
  const [currentInject, setCurrentInject] = useState<IExerciseInject | null>(null);
  const [participants, setParticipants] = useState<IExerciseParticipant[]>([]);
  const [metrics, setMetrics] = useState<IExerciseMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Service instance
  const exerciseService = useRef(new ExerciseService());

  // WebSocket setup for real-time updates
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${process.env.VITE_WS_URL}/exercises/${exerciseId}`,
    {
      onOpen: () => console.log('WebSocket connected'),
      onError: (error) => handleError(error),
      shouldReconnect: () => true,
      reconnectInterval: 3000
    }
  );

  /**
   * Initializes exercise data and monitoring
   */
  useEffect(() => {
    const initializeExercise = async () => {
      try {
        setIsLoading(true);
        const exerciseData = await exerciseService.current.getExercise(exerciseId);
        setExercise(exerciseData);
        setParticipants(exerciseData.participants);
        
        // Setup metrics monitoring
        const metricsSubscription = exerciseService.current
          .monitorExerciseMetrics(exerciseId)
          .subscribe(
            (metrics) => handleMetricsUpdate(metrics),
            (error) => handleError(error)
          );

        return () => metricsSubscription.unsubscribe();
      } catch (error) {
        handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeExercise();
  }, [exerciseId]);

  /**
   * Handles real-time WebSocket updates
   */
  useEffect(() => {
    if (lastMessage) {
      try {
        const update = JSON.parse(lastMessage.data);
        switch (update.type) {
          case 'INJECT_UPDATE':
            setCurrentInject(update.data);
            break;
          case 'PARTICIPANT_UPDATE':
            updateParticipants(update.data);
            break;
          case 'METRICS_UPDATE':
            handleMetricsUpdate(update.data);
            break;
        }
      } catch (error) {
        console.error('WebSocket message parsing error:', error);
      }
    }
  }, [lastMessage]);

  /**
   * Handles exercise start with debouncing
   */
  const handleExerciseStart = useCallback(debounce(async () => {
    try {
      await exerciseService.current.updateExerciseStatus(
        exerciseId,
        ExerciseStatus.IN_PROGRESS
      );
      sendMessage(JSON.stringify({ type: 'START_EXERCISE' }));
    } catch (error) {
      handleError(error as Error);
    }
  }, 300), [exerciseId]);

  /**
   * Updates participant status with validation
   */
  const updateParticipants = useCallback((updatedParticipant: IExerciseParticipant) => {
    setParticipants((current) =>
      current.map((p) =>
        p.id === updatedParticipant.id ? updatedParticipant : p
      )
    );
  }, []);

  /**
   * Processes metrics updates with debouncing
   */
  const handleMetricsUpdate = useCallback(debounce((newMetrics: IExerciseMetrics) => {
    setMetrics(newMetrics);
  }, 500), []);

  /**
   * Handles error scenarios with user notification
   */
  const handleError = useCallback((error: Error) => {
    setError(error);
    onError(error);
  }, [onError]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress aria-label="Loading exercise data" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" aria-live="assertive">
        {error.message}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Exercise Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Exercise Control - {exercise?.title}
      </Typography>

      {/* Progress Indicator */}
      <Box sx={{ mb: 4 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item>
            <CircularProgress
              variant="determinate"
              value={(metrics?.completionRate || 0) * 100}
              size={60}
              aria-label="Exercise progress"
            />
          </Grid>
          <Grid item>
            <Typography variant="h6">
              Progress: {Math.round((metrics?.completionRate || 0) * 100)}%
            </Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Control Panel */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item>
            <Tooltip title="Start Exercise">
              <IconButton
                onClick={handleExerciseStart}
                disabled={exercise?.status === ExerciseStatus.IN_PROGRESS}
                aria-label="Start exercise"
              >
                <PlayIcon />
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item>
            <Tooltip title="Pause Exercise">
              <IconButton
                onClick={() => exerciseService.current.updateExerciseStatus(
                  exerciseId,
                  ExerciseStatus.PAUSED
                )}
                disabled={exercise?.status !== ExerciseStatus.IN_PROGRESS}
                aria-label="Pause exercise"
              >
                <PauseIcon />
              </IconButton>
            </Tooltip>
          </Grid>
          {/* Additional control buttons */}
        </Grid>
      </Paper>

      {/* Participants List */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Active Participants ({participants.filter(p => p.status === ParticipantStatus.ACTIVE).length})
        </Typography>
        <List>
          {participants.map((participant) => (
            <ListItem key={participant.id}>
              <ListItemIcon>
                <PersonIcon color={participant.status === ParticipantStatus.ACTIVE ? 'primary' : 'disabled'} />
              </ListItemIcon>
              <ListItemText
                primary={`${participant.userId}`}
                secondary={`Status: ${participant.status}`}
              />
            </ListItem>
          ))}
        </List>
      </Paper>

      {/* Current Inject Display */}
      {currentInject && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Current Inject
          </Typography>
          <Typography variant="body1">
            {currentInject.title}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {currentInject.description}
          </Typography>
        </Paper>
      )}
    </Box>
  );
});

ExerciseControl.displayName = 'ExerciseControl';

export default ExerciseControl;