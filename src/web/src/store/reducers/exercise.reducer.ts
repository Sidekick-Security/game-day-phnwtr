/**
 * Exercise Management Redux Reducer
 * Handles comprehensive exercise state management including AI scenarios,
 * real-time monitoring, and compliance validation.
 * @version 1.0.0
 */

import { createReducer, PayloadAction, createEntityAdapter } from '@reduxjs/toolkit'; // ^1.9.0
import {
  ExerciseActionTypes,
} from '../actions/exercise.actions';
import {
  IExercise,
  IExerciseInject,
  IExerciseParticipant,
  IExerciseResponse,
  IComplianceValidation,
  IExerciseMetrics
} from '../../interfaces/exercise.interface';
import {
  ExerciseType,
  ExerciseStatus,
  ParticipantStatus
} from '../../types/exercise.types';

/**
 * Exercise state interface with comprehensive tracking capabilities
 */
interface IExerciseState {
  exercises: IExercise[];
  activeExercise: IExercise | null;
  loading: boolean;
  error: string | null;
  aiScenarioStatus: 'IDLE' | 'GENERATING' | 'COMPLETED' | 'ERROR';
  complianceValidation: {
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ERROR';
    results: IComplianceValidation[];
  };
  realTimeMetrics: IExerciseMetrics;
  participantActivity: Record<string, {
    lastActive: Date;
    status: ParticipantStatus;
    responseCount: number;
  }>;
}

/**
 * Initial state configuration
 */
const initialState: IExerciseState = {
  exercises: [],
  activeExercise: null,
  loading: false,
  error: null,
  aiScenarioStatus: 'IDLE',
  complianceValidation: {
    status: 'PENDING',
    results: []
  },
  realTimeMetrics: {
    responseTime: 0,
    completionRate: 0,
    participationRate: 0,
    complianceCoverage: 0
  },
  participantActivity: {}
};

/**
 * Entity adapter for normalized exercise state management
 */
const exerciseAdapter = createEntityAdapter<IExercise>({
  selectId: (exercise) => exercise.id,
  sortComparer: (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
});

/**
 * Exercise reducer with comprehensive state management
 */
export const exerciseReducer = createReducer(initialState, (builder) => {
  builder
    // Exercise Creation with AI
    .addCase(ExerciseActionTypes.CREATE_EXERCISE_WITH_AI, (state, action: PayloadAction<{ exercise: IExercise; useAI: boolean }>) => {
      state.loading = true;
      state.error = null;
      if (action.payload.useAI) {
        state.aiScenarioStatus = 'GENERATING';
      }
    })
    .addCase(`${ExerciseActionTypes.CREATE_EXERCISE_WITH_AI}_FULFILLED`, (state, action: PayloadAction<IExercise>) => {
      state.loading = false;
      state.exercises.push(action.payload);
      state.aiScenarioStatus = 'COMPLETED';
    })
    .addCase(`${ExerciseActionTypes.CREATE_EXERCISE_WITH_AI}_REJECTED`, (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
      state.aiScenarioStatus = 'ERROR';
    })

    // Exercise Control
    .addCase(ExerciseActionTypes.START_EXERCISE, (state, action: PayloadAction<string>) => {
      const exercise = state.exercises.find(e => e.id === action.payload);
      if (exercise) {
        exercise.status = ExerciseStatus.IN_PROGRESS;
        exercise.actualStart = new Date();
        state.activeExercise = exercise;
      }
    })
    .addCase(ExerciseActionTypes.PAUSE_EXERCISE, (state, action: PayloadAction<string>) => {
      const exercise = state.exercises.find(e => e.id === action.payload);
      if (exercise) {
        exercise.status = ExerciseStatus.PAUSED;
      }
    })
    .addCase(ExerciseActionTypes.RESUME_EXERCISE, (state, action: PayloadAction<string>) => {
      const exercise = state.exercises.find(e => e.id === action.payload);
      if (exercise) {
        exercise.status = ExerciseStatus.IN_PROGRESS;
      }
    })
    .addCase(ExerciseActionTypes.COMPLETE_EXERCISE, (state, action: PayloadAction<string>) => {
      const exercise = state.exercises.find(e => e.id === action.payload);
      if (exercise) {
        exercise.status = ExerciseStatus.COMPLETED;
        exercise.actualEnd = new Date();
        state.activeExercise = null;
      }
    })

    // Real-time Monitoring
    .addCase(ExerciseActionTypes.UPDATE_EXERCISE_METRICS, (state, action: PayloadAction<IExerciseMetrics>) => {
      state.realTimeMetrics = action.payload;
    })
    .addCase(ExerciseActionTypes.UPDATE_PARTICIPANT_STATUS, (state, action: PayloadAction<{
      exerciseId: string;
      participantId: string;
      status: ParticipantStatus;
    }>) => {
      state.participantActivity[action.payload.participantId] = {
        ...state.participantActivity[action.payload.participantId],
        lastActive: new Date(),
        status: action.payload.status
      };
    })

    // Compliance Validation
    .addCase(ExerciseActionTypes.VALIDATE_COMPLIANCE, (state) => {
      state.complianceValidation.status = 'IN_PROGRESS';
    })
    .addCase(`${ExerciseActionTypes.VALIDATE_COMPLIANCE}_FULFILLED`, (state, action: PayloadAction<IComplianceValidation>) => {
      state.complianceValidation.status = 'COMPLETED';
      state.complianceValidation.results.push(action.payload);
    })
    .addCase(`${ExerciseActionTypes.VALIDATE_COMPLIANCE}_REJECTED`, (state, action: PayloadAction<string>) => {
      state.complianceValidation.status = 'ERROR';
      state.error = action.payload;
    })

    // Exercise Response Management
    .addCase(ExerciseActionTypes.RECORD_RESPONSE, (state, action: PayloadAction<{
      exerciseId: string;
      response: IExerciseResponse;
    }>) => {
      const exercise = state.exercises.find(e => e.id === action.payload.exerciseId);
      if (exercise) {
        const participantId = action.payload.response.participantId;
        state.participantActivity[participantId] = {
          ...state.participantActivity[participantId],
          lastActive: new Date(),
          responseCount: (state.participantActivity[participantId]?.responseCount || 0) + 1
        };
      }
    })

    // Error Handling
    .addCase(ExerciseActionTypes.SET_ERROR, (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    })
    .addCase(ExerciseActionTypes.CLEAR_ERROR, (state) => {
      state.error = null;
    });
});

// Export the reducer
export default exerciseReducer;