/**
 * ExerciseControl Page Component Tests
 * Comprehensive test suite for exercise management functionality
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { axe } from '@axe-core/react';
import ExerciseControlPage from '../../src/pages/ExerciseControl';
import { ExerciseStatus, ParticipantStatus } from '../../src/types/exercise.types';

// Mock hooks
vi.mock('../../src/hooks/useExercise');
vi.mock('../../src/hooks/useWebSocket');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock data
const mockExercise = {
  id: 'exercise-123',
  title: 'Security Incident Response',
  status: ExerciseStatus.SCHEDULED,
  participants: [
    {
      id: 'participant-1',
      userId: 'user-1',
      status: ParticipantStatus.ACTIVE,
      role: 'PARTICIPANT'
    },
    {
      id: 'participant-2',
      userId: 'user-2',
      status: ParticipantStatus.INACTIVE,
      role: 'PARTICIPANT'
    }
  ],
  metrics: {
    completionRate: 0.45,
    responseTime: 120,
    participationRate: 0.8
  }
};

const mockMetrics = {
  completionRate: 0.45,
  responseTime: 120,
  participationRate: 0.8,
  complianceCoverage: 0.92
};

/**
 * Helper function to render component with providers
 */
const renderWithProviders = (
  ui: React.ReactElement,
  { route = '/exercises/exercise-123' } = {}
) => {
  return render(
    <Provider store={vi.fn()}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/exercises/:exerciseId" element={ui} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('ExerciseControl Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('should render loading state correctly', () => {
      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({ loading: true });

      renderWithProviders(<ExerciseControlPage />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByLabelText('Loading exercise data')).toBeInTheDocument();
    });

    test('should render error state correctly', () => {
      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({ 
        loading: false, 
        error: new Error('Failed to load exercise') 
      });

      renderWithProviders(<ExerciseControlPage />);
      
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load exercise');
    });

    test('should render exercise details when loaded', () => {
      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({ 
        loading: false, 
        error: null,
        exercise: mockExercise,
        metrics: mockMetrics
      });

      renderWithProviders(<ExerciseControlPage />);
      
      expect(screen.getByText(mockExercise.title)).toBeInTheDocument();
      expect(screen.getByText('45% Complete')).toBeInTheDocument();
    });
  });

  describe('Exercise Control', () => {
    test('should handle exercise start correctly', async () => {
      const startExercise = vi.fn();
      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({
        loading: false,
        exercise: mockExercise,
        startExercise
      });

      renderWithProviders(<ExerciseControlPage />);
      
      const startButton = screen.getByLabelText('Start exercise');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(startExercise).toHaveBeenCalled();
      });
    });

    test('should handle exercise pause correctly', async () => {
      const pauseExercise = vi.fn();
      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({
        loading: false,
        exercise: { ...mockExercise, status: ExerciseStatus.IN_PROGRESS },
        pauseExercise
      });

      renderWithProviders(<ExerciseControlPage />);
      
      const pauseButton = screen.getByLabelText('Pause exercise');
      fireEvent.click(pauseButton);

      await waitFor(() => {
        expect(pauseExercise).toHaveBeenCalled();
      });
    });

    test('should handle exercise completion correctly', async () => {
      const completeExercise = vi.fn();
      const navigate = vi.fn();
      vi.spyOn(require('react-router-dom'), 'useNavigate').mockReturnValue(navigate);

      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({
        loading: false,
        exercise: mockExercise,
        completeExercise
      });

      renderWithProviders(<ExerciseControlPage />);
      
      const completeButton = screen.getByLabelText('Complete exercise');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(completeExercise).toHaveBeenCalled();
        expect(navigate).toHaveBeenCalledWith(`/exercises/${mockExercise.id}/summary`);
      });
    });
  });

  describe('Real-time Updates', () => {
    test('should handle WebSocket connection correctly', () => {
      const useWebSocketMock = vi.spyOn(require('../../src/hooks/useWebSocket'), 'default');
      const mockSubscribe = vi.fn();
      
      useWebSocketMock.mockReturnValue({
        connectionState: 'connected',
        subscribe: mockSubscribe
      });

      renderWithProviders(<ExerciseControlPage />);

      expect(mockSubscribe).toHaveBeenCalledWith('exercise.update', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('metrics.update', expect.any(Function));
    });

    test('should update metrics on WebSocket message', async () => {
      const useWebSocketMock = vi.spyOn(require('../../src/hooks/useWebSocket'), 'default');
      const monitorMetrics = vi.fn();
      
      useWebSocketMock.mockReturnValue({
        connectionState: 'connected',
        lastMessage: JSON.stringify({ type: 'METRICS_UPDATE', data: mockMetrics })
      });

      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({
        loading: false,
        exercise: mockExercise,
        metrics: mockMetrics,
        monitorMetrics
      });

      renderWithProviders(<ExerciseControlPage />);

      await waitFor(() => {
        expect(monitorMetrics).toHaveBeenCalled();
        expect(screen.getByText('45% Complete')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('should meet WCAG 2.1 Level AA standards', async () => {
      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({
        loading: false,
        exercise: mockExercise,
        metrics: mockMetrics
      });

      const { container } = renderWithProviders(<ExerciseControlPage />);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should support keyboard navigation', () => {
      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({
        loading: false,
        exercise: mockExercise,
        metrics: mockMetrics
      });

      renderWithProviders(<ExerciseControlPage />);
      
      const startButton = screen.getByLabelText('Start exercise');
      startButton.focus();
      expect(document.activeElement).toBe(startButton);

      fireEvent.keyDown(startButton, { key: 'Tab' });
      const pauseButton = screen.getByLabelText('Pause exercise');
      expect(document.activeElement).toBe(pauseButton);
    });
  });

  describe('Error Handling', () => {
    test('should display error notification on exercise completion failure', async () => {
      const completeExercise = vi.fn().mockRejectedValue(new Error('Failed to complete exercise'));
      
      const useExerciseMock = vi.spyOn(require('../../src/hooks/useExercise'), 'default');
      useExerciseMock.mockReturnValue({
        loading: false,
        exercise: mockExercise,
        completeExercise
      });

      renderWithProviders(<ExerciseControlPage />);
      
      const completeButton = screen.getByLabelText('Complete exercise');
      fireEvent.click(completeButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to complete exercise')).toBeInTheDocument();
      });
    });
  });
});