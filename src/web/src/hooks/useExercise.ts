/**
 * Custom React hook for managing exercise state and operations
 * Provides comprehensive exercise lifecycle management including CRUD operations,
 * real-time metrics monitoring, compliance validation, participant management,
 * and AI-driven scenario coordination.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from 'react-use-websocket'; // ^4.5.0
import { debounce } from 'lodash'; // ^4.17.21

import {
  IExercise,
  IExerciseInject,
  IExerciseParticipant,
  IExerciseResponse,
  IExerciseMetrics,
  IComplianceValidation
} from '../interfaces/exercise.interface';

import { ExerciseService } from '../services/exercise.service';
import {
  monitorExerciseMetrics,
  validateExerciseCompliance
} from '../store/actions/exercise.actions';

// Constants for configuration
const METRIC_UPDATE_INTERVAL = 5000; // 5 seconds
const WEBSOCKET_RETRY_ATTEMPTS = 3;

// Exercise service instance
const exerciseService = new ExerciseService();

/**
 * Hook options interface
 */
interface UseExerciseOptions {
  enableRealTimeMetrics?: boolean;
  enableComplianceValidation?: boolean;
  autoReconnect?: boolean;
  metricsInterval?: number;
}

/**
 * Hook return interface
 */
interface UseExerciseReturn {
  // Exercise state
  exercise: IExercise | null;
  loading: boolean;
  error: Error | null;
  
  // Metrics and compliance
  metrics: IExerciseMetrics | null;
  complianceStatus: IComplianceValidation | null;
  
  // Core operations
  createExercise: (data: Partial<IExercise>, useAI?: boolean) => Promise<IExercise>;
  updateExercise: (data: Partial<IExercise>) => Promise<void>;
  deleteExercise: () => Promise<void>;
  
  // Exercise control
  startExercise: () => Promise<void>;
  pauseExercise: () => Promise<void>;
  resumeExercise: () => Promise<void>;
  completeExercise: () => Promise<void>;
  
  // Real-time operations
  monitorMetrics: () => void;
  validateCompliance: (frameworks: string[]) => Promise<IComplianceValidation>;
  generateAIScenario: () => Promise<void>;
  
  // Participant management
  updateParticipantStatus: (participantId: string, status: string) => Promise<void>;
  
  // Cleanup
  cleanup: () => void;
}

/**
 * Custom hook for comprehensive exercise management
 */
export function useExercise(
  exerciseId: string,
  options: UseExerciseOptions = {}
): UseExerciseReturn {
  // Default options
  const {
    enableRealTimeMetrics = true,
    enableComplianceValidation = true,
    autoReconnect = true,
    metricsInterval = METRIC_UPDATE_INTERVAL
  } = options;

  // State management
  const [exercise, setExercise] = useState<IExercise | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [metrics, setMetrics] = useState<IExerciseMetrics | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<IComplianceValidation | null>(null);

  // Refs for cleanup
  const metricsInterval = useRef<NodeJS.Timeout>();
  const wsRetryCount = useRef<number>(0);

  // WebSocket setup for real-time metrics
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    `${process.env.VITE_WS_URL}/exercises/${exerciseId}/metrics`,
    {
      shouldReconnect: () => autoReconnect && wsRetryCount.current < WEBSOCKET_RETRY_ATTEMPTS,
      reconnectInterval: 3000,
      onOpen: () => {
        console.info('WebSocket connection established');
        wsRetryCount.current = 0;
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
        wsRetryCount.current++;
      }
    }
  );

  /**
   * Fetches exercise data with error handling
   */
  const fetchExercise = useCallback(async () => {
    try {
      setLoading(true);
      const data = await exerciseService.getExercise(exerciseId);
      setExercise(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  /**
   * Creates a new exercise with optional AI scenario generation
   */
  const createExercise = async (
    data: Partial<IExercise>,
    useAI: boolean = false
  ): Promise<IExercise> => {
    try {
      setLoading(true);
      const newExercise = await exerciseService.createExerciseWithAI(data, useAI);
      setExercise(newExercise);
      return newExercise;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates exercise with debounced save
   */
  const updateExercise = debounce(async (data: Partial<IExercise>): Promise<void> => {
    try {
      setLoading(true);
      await exerciseService.updateExerciseStatus(exerciseId, data.status!);
      setExercise(prev => prev ? { ...prev, ...data } : null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, 1000);

  /**
   * Initiates real-time metrics monitoring
   */
  const monitorMetrics = useCallback(() => {
    if (!enableRealTimeMetrics) return;

    const subscription = exerciseService.monitorExerciseMetrics(exerciseId)
      .subscribe({
        next: (newMetrics) => setMetrics(newMetrics),
        error: (err) => setError(err)
      });

    return () => subscription.unsubscribe();
  }, [exerciseId, enableRealTimeMetrics]);

  /**
   * Validates exercise compliance against specified frameworks
   */
  const validateCompliance = async (
    frameworks: string[]
  ): Promise<IComplianceValidation> => {
    try {
      const validation = await exerciseService.validateCompliance(exerciseId, frameworks);
      setComplianceStatus(validation);
      return validation;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  /**
   * Exercise lifecycle control methods
   */
  const startExercise = async (): Promise<void> => {
    await updateExercise({ status: 'IN_PROGRESS' });
    monitorMetrics();
  };

  const pauseExercise = async (): Promise<void> => {
    await updateExercise({ status: 'PAUSED' });
  };

  const resumeExercise = async (): Promise<void> => {
    await updateExercise({ status: 'IN_PROGRESS' });
  };

  const completeExercise = async (): Promise<void> => {
    await updateExercise({ status: 'COMPLETED' });
  };

  /**
   * Cleanup function for subscriptions and intervals
   */
  const cleanup = useCallback(() => {
    if (metricsInterval.current) {
      clearInterval(metricsInterval.current);
    }
    exerciseService.dispose();
  }, []);

  // Initial setup and cleanup
  useEffect(() => {
    fetchExercise();
    if (enableRealTimeMetrics) {
      monitorMetrics();
    }
    return cleanup;
  }, [exerciseId, enableRealTimeMetrics]);

  // WebSocket message handler
  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const metricsData = JSON.parse(lastMessage.data);
        setMetrics(metricsData);
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    }
  }, [lastMessage]);

  return {
    // State
    exercise,
    loading,
    error,
    metrics,
    complianceStatus,

    // Core operations
    createExercise,
    updateExercise,
    deleteExercise: async () => {
      /* Implementation pending based on service method */
    },

    // Exercise control
    startExercise,
    pauseExercise,
    resumeExercise,
    completeExercise,

    // Real-time operations
    monitorMetrics,
    validateCompliance,
    generateAIScenario: async () => {
      /* Implementation pending based on service method */
    },

    // Participant management
    updateParticipantStatus: async () => {
      /* Implementation pending based on service method */
    },

    // Cleanup
    cleanup
  };
}