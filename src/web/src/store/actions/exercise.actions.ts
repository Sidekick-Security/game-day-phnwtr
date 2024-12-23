/**
 * Exercise Management Redux Actions
 * Provides comprehensive action creators for exercise lifecycle management
 * including AI-driven scenarios, real-time monitoring, and compliance validation.
 * @version 1.0.0
 */

import { createAction, createAsyncThunk } from '@reduxjs/toolkit'; // ^1.9.0
import {
  IExercise,
  IExerciseInject,
  IExerciseParticipant,
  IExerciseResponse,
  IExerciseMetrics,
  IComplianceValidation
} from '../../interfaces/exercise.interface';
import {
  ExerciseType,
  ExerciseStatus,
  InjectType,
  InjectStatus,
  ParticipantRole,
  ParticipantStatus
} from '../../types/exercise.types';
import { ExerciseService } from '../../services/exercise.service';

// Initialize exercise service
const exerciseService = new ExerciseService();

/**
 * Exercise action type constants
 */
export enum ExerciseActionTypes {
  // Exercise Creation and Management
  CREATE_EXERCISE_WITH_AI = 'exercise/createWithAI',
  UPDATE_EXERCISE = 'exercise/update',
  DELETE_EXERCISE = 'exercise/delete',
  
  // Exercise Control
  START_EXERCISE = 'exercise/start',
  PAUSE_EXERCISE = 'exercise/pause',
  RESUME_EXERCISE = 'exercise/resume',
  COMPLETE_EXERCISE = 'exercise/complete',
  
  // Real-time Monitoring
  UPDATE_EXERCISE_METRICS = 'exercise/updateMetrics',
  UPDATE_PARTICIPANT_STATUS = 'exercise/updateParticipantStatus',
  DELIVER_INJECT = 'exercise/deliverInject',
  RECORD_RESPONSE = 'exercise/recordResponse',
  
  // Compliance and Validation
  VALIDATE_COMPLIANCE = 'exercise/validateCompliance',
  UPDATE_COMPLIANCE_STATUS = 'exercise/updateComplianceStatus',
  
  // Exercise State Management
  SET_LOADING = 'exercise/setLoading',
  SET_ERROR = 'exercise/setError',
  CLEAR_ERROR = 'exercise/clearError'
}

/**
 * Creates a new exercise with AI-driven scenario generation
 */
export const createExerciseWithAI = createAsyncThunk<IExercise, {
  exercise: Partial<IExercise>,
  useAI: boolean
}>(
  ExerciseActionTypes.CREATE_EXERCISE_WITH_AI,
  async ({ exercise, useAI }, { rejectWithValue }) => {
    try {
      return await exerciseService.createExerciseWithAI(exercise, useAI);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Monitors exercise metrics in real-time
 */
export const monitorExerciseMetrics = createAsyncThunk<IExerciseMetrics, string>(
  ExerciseActionTypes.UPDATE_EXERCISE_METRICS,
  async (exerciseId, { dispatch }) => {
    const metricsSubscription = exerciseService.monitorExerciseMetrics(exerciseId)
      .subscribe({
        next: (metrics) => {
          dispatch(updateExerciseMetrics(metrics));
        },
        error: (error) => {
          dispatch(setError(error.message));
        }
      });

    // Return initial metrics
    return await new Promise<IExerciseMetrics>((resolve) => {
      metricsSubscription.add(() => resolve);
    });
  }
);

/**
 * Validates exercise compliance against specified frameworks
 */
export const validateCompliance = createAsyncThunk<IComplianceValidation, {
  exerciseId: string,
  frameworks: string[]
}>(
  ExerciseActionTypes.VALIDATE_COMPLIANCE,
  async ({ exerciseId, frameworks }, { rejectWithValue }) => {
    try {
      return await exerciseService.validateCompliance(exerciseId, frameworks);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Updates exercise status with real-time sync
 */
export const updateExerciseStatus = createAsyncThunk<void, {
  exerciseId: string,
  status: ExerciseStatus
}>(
  'exercise/updateStatus',
  async ({ exerciseId, status }, { rejectWithValue }) => {
    try {
      await exerciseService.updateExerciseStatus(exerciseId, status);
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

/**
 * Synchronous action creators
 */
export const updateExerciseMetrics = createAction<IExerciseMetrics>(
  ExerciseActionTypes.UPDATE_EXERCISE_METRICS
);

export const updateParticipantStatus = createAction<{
  exerciseId: string,
  participantId: string,
  status: ParticipantStatus
}>(ExerciseActionTypes.UPDATE_PARTICIPANT_STATUS);

export const deliverInject = createAction<{
  exerciseId: string,
  inject: IExerciseInject
}>(ExerciseActionTypes.DELIVER_INJECT);

export const recordResponse = createAction<{
  exerciseId: string,
  response: IExerciseResponse
}>(ExerciseActionTypes.RECORD_RESPONSE);

export const setLoading = createAction<boolean>(
  ExerciseActionTypes.SET_LOADING
);

export const setError = createAction<string | null>(
  ExerciseActionTypes.SET_ERROR
);

export const clearError = createAction(
  ExerciseActionTypes.CLEAR_ERROR
);

/**
 * Type definitions for action payloads
 */
export interface ExerciseMetricsPayload {
  exerciseId: string;
  metrics: IExerciseMetrics;
}

export interface ComplianceValidationPayload {
  exerciseId: string;
  validation: IComplianceValidation;
}

export interface ParticipantStatusPayload {
  exerciseId: string;
  participantId: string;
  status: ParticipantStatus;
}

export interface InjectDeliveryPayload {
  exerciseId: string;
  inject: IExerciseInject;
}

export interface ResponseRecordPayload {
  exerciseId: string;
  response: IExerciseResponse;
}

// Export all action types for reducer consumption
export type ExerciseActions = 
  | ReturnType<typeof createExerciseWithAI>
  | ReturnType<typeof monitorExerciseMetrics>
  | ReturnType<typeof validateCompliance>
  | ReturnType<typeof updateExerciseStatus>
  | ReturnType<typeof updateExerciseMetrics>
  | ReturnType<typeof updateParticipantStatus>
  | ReturnType<typeof deliverInject>
  | ReturnType<typeof recordResponse>
  | ReturnType<typeof setLoading>
  | ReturnType<typeof setError>
  | ReturnType<typeof clearError>;