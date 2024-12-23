/**
 * ExerciseControl Component Test Suite
 * Comprehensive tests for exercise management functionality with accessibility validation
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import ExerciseControl from '../../../../src/components/exercise/ExerciseControl';
import { ExerciseService } from '../../../../src/services/exercise.service';
import { ExerciseStatus, ParticipantStatus } from '../../../../src/types/exercise.types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock exercise service
jest.mock('../../../../src/services/exercise.service');

// Mock WebSocket
jest.mock('react-use-websocket', () => ({
  useWebSocket: jest.fn(() => ({
    sendMessage: jest.fn(),
    lastMessage: null,
    readyState: 1
  }))
}));

describe('ExerciseControl Component', () => {
  // Test data setup
  const mockExercise = {
    id: 'test-exercise-id',
    title: 'Test Exercise',
    status: ExerciseStatus.PENDING,
    participants: [
      {
        id: 'participant-1',
        userId: 'user-1',
        status: ParticipantStatus.ACTIVE,
        role: 'PARTICIPANT'
      }
    ],
    injects: [
      {
        id: 'inject-1',
        title: 'Initial Scenario',
        description: 'Test scenario description',
        status: 'PENDING'
      }
    ],
    metrics: {
      completionRate: 0.45,
      responseTime: 120,
      participationRate: 0.8
    }
  };

  // Props setup
  const defaultProps = {
    exerciseId: 'test-exercise-id',
    onExerciseComplete: jest.fn(),
    onError: jest.fn(),
    accessibility: {
      reducedMotion: false,
      highContrast: false
    }
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup ExerciseService mock implementations
    (ExerciseService as jest.Mock).mockImplementation(() => ({
      getExercise: jest.fn().mockResolvedValue(mockExercise),
      updateExerciseStatus: jest.fn().mockResolvedValue(undefined),
      monitorExerciseMetrics: jest.fn().mockReturnValue({
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        })
      })
    }));
  });

  it('renders exercise control panel with accessibility compliance', async () => {
    const { container } = render(<ExerciseControl {...defaultProps} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/Exercise Control - Test Exercise/i)).toBeInTheDocument();
    });

    // Verify accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('displays exercise progress and metrics correctly', async () => {
    render(<ExerciseControl {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Progress: 45%/i)).toBeInTheDocument();
    });

    // Verify metrics display
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Exercise progress');
  });

  it('handles exercise control actions with proper state updates', async () => {
    render(<ExerciseControl {...defaultProps} />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByLabelText('Start exercise')).toBeInTheDocument();
    });

    // Test start exercise action
    const startButton = screen.getByLabelText('Start exercise');
    await userEvent.click(startButton);

    await waitFor(() => {
      expect(ExerciseService.prototype.updateExerciseStatus)
        .toHaveBeenCalledWith('test-exercise-id', ExerciseStatus.IN_PROGRESS);
    });
  });

  it('displays participant list with correct status indicators', async () => {
    render(<ExerciseControl {...defaultProps} />);

    await waitFor(() => {
      const participantsList = screen.getByRole('list');
      expect(within(participantsList).getByText('user-1')).toBeInTheDocument();
      expect(screen.getByText(/Status: ACTIVE/i)).toBeInTheDocument();
    });
  });

  it('handles WebSocket updates correctly', async () => {
    const { rerender } = render(<ExerciseControl {...defaultProps} />);

    // Simulate WebSocket message for inject update
    const mockWebSocketMessage = {
      type: 'INJECT_UPDATE',
      data: {
        id: 'inject-2',
        title: 'New Inject',
        description: 'Updated scenario'
      }
    };

    // Update WebSocket mock with new message
    jest.mock('react-use-websocket', () => ({
      useWebSocket: jest.fn(() => ({
        sendMessage: jest.fn(),
        lastMessage: { data: JSON.stringify(mockWebSocketMessage) },
        readyState: 1
      }))
    }));

    // Rerender with new WebSocket data
    rerender(<ExerciseControl {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('New Inject')).toBeInTheDocument();
    });
  });

  it('handles error states appropriately', async () => {
    // Mock service error
    (ExerciseService as jest.Mock).mockImplementation(() => ({
      getExercise: jest.fn().mockRejectedValue(new Error('Failed to load exercise')),
      monitorExerciseMetrics: jest.fn().mockReturnValue({
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: jest.fn()
        })
      })
    }));

    render(<ExerciseControl {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load exercise');
      expect(defaultProps.onError).toHaveBeenCalled();
    });
  });

  it('supports keyboard navigation for accessibility', async () => {
    render(<ExerciseControl {...defaultProps} />);

    await waitFor(() => {
      const startButton = screen.getByLabelText('Start exercise');
      startButton.focus();
      expect(startButton).toHaveFocus();
    });

    // Test keyboard navigation
    fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
    expect(screen.getByLabelText('Pause exercise')).toHaveFocus();
  });

  it('cleans up resources on unmount', async () => {
    const { unmount } = render(<ExerciseControl {...defaultProps} />);

    // Verify subscription cleanup
    const unsubscribeSpy = jest.fn();
    (ExerciseService as jest.Mock).mockImplementation(() => ({
      monitorExerciseMetrics: jest.fn().mockReturnValue({
        subscribe: jest.fn().mockReturnValue({
          unsubscribe: unsubscribeSpy
        })
      })
    }));

    unmount();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});