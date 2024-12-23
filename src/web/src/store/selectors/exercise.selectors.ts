/**
 * Exercise Selectors
 * Implements memoized selectors for accessing and computing exercise-related state
 * with comprehensive TypeScript type safety and performance optimization.
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // ^2.0.0

import { ExerciseState } from '../reducers/exercise.reducer';
import {
  IExercise,
  IExerciseParticipant,
  IExerciseInject,
  IExerciseMetrics
} from '../../interfaces/exercise.interface';
import {
  ExerciseStatus,
  ParticipantStatus,
  InjectStatus
} from '../../types/exercise.types';

/**
 * Base selector to access the exercise state slice
 * @param state Root application state
 * @returns Exercise state slice
 */
export const selectExerciseState = (state: { exercise: ExerciseState }) => state.exercise;

/**
 * Selects all exercises with optional status filtering
 */
export const selectAllExercises = createSelector(
  [selectExerciseState],
  (exerciseState: ExerciseState): IExercise[] => {
    const exercises = Object.values(exerciseState.exercises);
    return exercises.sort((a, b) => 
      new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()
    );
  }
);

/**
 * Selects exercises filtered by status
 */
export const selectExercisesByStatus = createSelector(
  [selectAllExercises, (_: any, status: ExerciseStatus) => status],
  (exercises: IExercise[], status: ExerciseStatus): IExercise[] => 
    exercises.filter(exercise => exercise.status === status)
);

/**
 * Selects the currently active exercise with full details
 */
export const selectActiveExercise = createSelector(
  [selectExerciseState],
  (exerciseState: ExerciseState): IExercise | null => {
    if (!exerciseState.activeExerciseId) return null;
    const exercise = exerciseState.exercises[exerciseState.activeExerciseId];
    if (!exercise) return null;

    return {
      ...exercise,
      metrics: exerciseState.exerciseMetrics[exercise.id] || {
        responseTime: 0,
        completionRate: 0,
        participationRate: 0,
        complianceCoverage: 0
      }
    };
  }
);

/**
 * Selects active participants with computed metrics
 */
export const selectActiveParticipants = createSelector(
  [selectActiveExercise],
  (activeExercise: IExercise | null): IExerciseParticipant[] => {
    if (!activeExercise) return [];

    return activeExercise.participants
      .filter(participant => participant.status === ParticipantStatus.ACTIVE)
      .sort((a, b) => {
        // Sort by role first, then by name
        if (a.role !== b.role) {
          return a.role.localeCompare(b.role);
        }
        return a.userId.localeCompare(b.userId);
      });
  }
);

/**
 * Selects pending injects for the active exercise
 */
export const selectPendingInjects = createSelector(
  [selectActiveExercise],
  (activeExercise: IExercise | null): IExerciseInject[] => {
    if (!activeExercise) return [];

    return activeExercise.injects
      .filter(inject => inject.status !== InjectStatus.DELIVERED)
      .sort((a, b) => 
        new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
      );
  }
);

/**
 * Selects exercise metrics with computed values
 */
export const selectExerciseMetrics = createSelector(
  [selectActiveExercise],
  (activeExercise: IExercise | null): IExerciseMetrics | null => {
    if (!activeExercise) return null;

    return {
      ...activeExercise.metrics,
      participationRate: calculateParticipationRate(activeExercise),
      completionRate: calculateCompletionRate(activeExercise),
      responseTime: calculateAverageResponseTime(activeExercise)
    };
  }
);

/**
 * Helper function to calculate participation rate
 */
const calculateParticipationRate = (exercise: IExercise): number => {
  const activeParticipants = exercise.participants.filter(
    p => p.status === ParticipantStatus.ACTIVE
  ).length;
  return (activeParticipants / exercise.participants.length) * 100;
};

/**
 * Helper function to calculate completion rate
 */
const calculateCompletionRate = (exercise: IExercise): number => {
  const completedInjects = exercise.injects.filter(
    i => i.status === InjectStatus.COMPLETED
  ).length;
  return (completedInjects / exercise.injects.length) * 100;
};

/**
 * Helper function to calculate average response time
 */
const calculateAverageResponseTime = (exercise: IExercise): number => {
  const responseTimes = exercise.injects
    .filter(i => i.deliveredTime && i.responses.length > 0)
    .map(i => {
      const deliveryTime = new Date(i.deliveredTime!).getTime();
      const responseTime = new Date(i.responses[0].submittedAt).getTime();
      return responseTime - deliveryTime;
    });

  if (responseTimes.length === 0) return 0;
  return responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
};