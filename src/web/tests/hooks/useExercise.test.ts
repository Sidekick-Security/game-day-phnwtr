/**
 * Test suite for useExercise hook
 * Validates exercise management functionality including CRUD operations,
 * real-time monitoring, and compliance validation.
 * @version 1.0.0
 */

import { renderHook, act, cleanup } from '@testing-library/react-hooks'; // ^8.0.1
import { Provider } from 'react-redux'; // ^9.0.0
import { configureStore } from '@reduxjs/toolkit'; // ^1.9.0
import MockWebSocket from 'jest-websocket-mock'; // ^2.4.0
import { jest, describe, it, beforeEach, afterEach, expect } from '@jest/globals'; // ^29.7.0

import { useExercise } from '../../src/hooks/useExercise';
import { ExerciseService } from '../../src/services/exercise.service';
import { WebSocketService } from '../../src/services/websocket.service';
import { ExerciseStatus, ExerciseType } from '../../src/types/exercise.types';
import { exerciseReducer } from '../../src/store/reducers/exercise.reducer';

// Mock implementations
jest.mock('../../src/services/exercise.service');
jest.mock('../../src/services/websocket.service');

// Test constants
const TEST_EXERCISE_ID = 'test-exercise-123';
const MOCK_WS_URL = 'ws://localhost:1234';
const MOCK_EXERCISE = {
  id: TEST_EXERCISE_ID,
  title: 'Test Exercise',
  type: ExerciseType.SECURITY_INCIDENT,
  status: ExerciseStatus.DRAFT,
  isAiEnabled: true,
  participants: [],
  metrics: {
    responseTime: 0,
    completionRate: 0,
    participationRate: 0
  }
};

describe('useExercise Hook', () => {
  let mockStore: any;
  let mockWebSocketServer: MockWebSocket;
  let mockExerciseService: jest.Mocked<ExerciseService>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;

  beforeEach(() => {
    // Setup Redux store
    mockStore = configureStore({
      reducer: {
        exercise: exerciseReducer
      }
    });

    // Setup WebSocket mock server
    mockWebSocketServer = new MockWebSocket(MOCK_WS_URL);

    // Setup service mocks
    mockExerciseService = new ExerciseService() as jest.Mocked<ExerciseService>;
    mockWebSocketService = new WebSocketService() as jest.Mocked<WebSocketService>;

    // Configure default mock implementations
    mockExerciseService.getExercise.mockResolvedValue(MOCK_EXERCISE);
    mockExerciseService.createExerciseWithAI.mockResolvedValue(MOCK_EXERCISE);
    mockExerciseService.updateExerciseStatus.mockResolvedValue();
    mockExerciseService.validateCompliance.mockResolvedValue({
      isCompliant: true,
      frameworks: ['SOC2'],
      gaps: []
    });
  });

  afterEach(() => {
    cleanup();
    mockWebSocketServer.close();
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(
      () => useExercise(TEST_EXERCISE_ID),
      {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      }
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.exercise).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should fetch exercise data on mount', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useExercise(TEST_EXERCISE_ID),
      {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      }
    );

    await waitForNextUpdate();

    expect(mockExerciseService.getExercise).toHaveBeenCalledWith(TEST_EXERCISE_ID);
    expect(result.current.exercise).toEqual(MOCK_EXERCISE);
    expect(result.current.loading).toBe(false);
  });

  it('should handle exercise creation with AI', async () => {
    const { result } = renderHook(
      () => useExercise(TEST_EXERCISE_ID),
      {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      }
    );

    const newExerciseData = {
      title: 'New AI Exercise',
      type: ExerciseType.SECURITY_INCIDENT,
      isAiEnabled: true
    };

    await act(async () => {
      await result.current.createExercise(newExerciseData, true);
    });

    expect(mockExerciseService.createExerciseWithAI).toHaveBeenCalledWith(
      newExerciseData,
      true
    );
    expect(result.current.exercise).toEqual(MOCK_EXERCISE);
  });

  it('should handle real-time metrics monitoring', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useExercise(TEST_EXERCISE_ID, { enableRealTimeMetrics: true }),
      {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      }
    );

    const mockMetrics = {
      responseTime: 120,
      completionRate: 0.75,
      participationRate: 0.85
    };

    await act(async () => {
      mockWebSocketServer.send(JSON.stringify(mockMetrics));
    });

    await waitForNextUpdate();

    expect(result.current.metrics).toEqual(mockMetrics);
  });

  it('should validate exercise compliance', async () => {
    const { result } = renderHook(
      () => useExercise(TEST_EXERCISE_ID),
      {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      }
    );

    const frameworks = ['SOC2', 'ISO27001'];

    await act(async () => {
      await result.current.validateCompliance(frameworks);
    });

    expect(mockExerciseService.validateCompliance).toHaveBeenCalledWith(
      TEST_EXERCISE_ID,
      frameworks
    );
  });

  it('should handle exercise lifecycle operations', async () => {
    const { result } = renderHook(
      () => useExercise(TEST_EXERCISE_ID),
      {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      }
    );

    // Test start exercise
    await act(async () => {
      await result.current.startExercise();
    });
    expect(mockExerciseService.updateExerciseStatus).toHaveBeenCalledWith(
      TEST_EXERCISE_ID,
      ExerciseStatus.IN_PROGRESS
    );

    // Test pause exercise
    await act(async () => {
      await result.current.pauseExercise();
    });
    expect(mockExerciseService.updateExerciseStatus).toHaveBeenCalledWith(
      TEST_EXERCISE_ID,
      ExerciseStatus.PAUSED
    );
  });

  it('should handle WebSocket reconnection', async () => {
    const { result, waitForNextUpdate } = renderHook(
      () => useExercise(TEST_EXERCISE_ID, { autoReconnect: true }),
      {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      }
    );

    // Simulate WebSocket disconnection
    mockWebSocketServer.close();
    await waitForNextUpdate();

    // Simulate reconnection
    mockWebSocketServer = new MockWebSocket(MOCK_WS_URL);
    await waitForNextUpdate();

    expect(result.current.error).toBeNull();
  });

  it('should cleanup resources on unmount', async () => {
    const { result, unmount } = renderHook(
      () => useExercise(TEST_EXERCISE_ID),
      {
        wrapper: ({ children }) => (
          <Provider store={mockStore}>{children}</Provider>
        )
      }
    );

    await act(async () => {
      result.current.cleanup();
    });

    unmount();

    expect(mockExerciseService.dispose).toHaveBeenCalled();
  });
});