import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { defaultTheme } from '../../src/assets/styles/theme';
import Dashboard from '../../src/pages/Dashboard';
import { ExerciseType, ExerciseStatus } from '../../src/types/exercise.types';
import { MetricType, MetricUnit } from '../../src/types/analytics.types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock useExercise hook
jest.mock('../../src/hooks/useExercise', () => ({
  useExercise: jest.fn(() => ({
    exercises: mockExercises,
    loading: false,
    error: null,
    metrics: mockMetrics,
    createExercise: jest.fn(),
    retryFetch: jest.fn()
  }))
}));

// Mock WebSocket
const mockWebSocket = {
  send: jest.fn(),
  close: jest.fn()
};

global.WebSocket = jest.fn(() => mockWebSocket) as any;

// Test data
const mockExercises = [
  {
    id: 'exercise-1',
    title: 'Ransomware Response',
    type: ExerciseType.SECURITY_INCIDENT,
    status: ExerciseStatus.IN_PROGRESS,
    metrics: {
      completionRate: 60,
      responseTime: 85,
      participationRate: 92
    },
    participants: Array(12).fill({ id: 'user-1' }),
    lastUpdate: new Date().toISOString()
  },
  {
    id: 'exercise-2',
    title: 'Data Breach Simulation',
    type: ExerciseType.COMPLIANCE_VALIDATION,
    status: ExerciseStatus.SCHEDULED,
    metrics: {
      completionRate: 25,
      responseTime: 78,
      participationRate: 85
    },
    participants: Array(8).fill({ id: 'user-2' }),
    lastUpdate: new Date().toISOString()
  }
];

const mockMetrics = {
  responseTime: {
    type: MetricType.RESPONSE_TIME,
    value: 85,
    trend: 5,
    unit: MetricUnit.SECONDS
  },
  complianceCoverage: {
    type: MetricType.COMPLIANCE_COVERAGE,
    value: 92,
    trend: 3,
    unit: MetricUnit.PERCENTAGE
  }
};

// Test wrapper component
const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={defaultTheme}>
        <Dashboard />
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should render dashboard layout correctly', async () => {
    const { container } = renderDashboard();

    // Check main sections
    expect(screen.getByRole('main', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/active exercises/i)).toBeInTheDocument();
    expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
    expect(screen.getByText(/recent activity/i)).toBeInTheDocument();

    // Verify exercise cards
    const exerciseCards = screen.getAllByRole('article');
    expect(exerciseCards).toHaveLength(mockExercises.length);

    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should display exercise cards with correct information', () => {
    renderDashboard();

    mockExercises.forEach(exercise => {
      const card = screen.getByRole('article', { name: new RegExp(exercise.title, 'i') });
      
      // Verify card content
      expect(within(card).getByText(exercise.title)).toBeInTheDocument();
      expect(within(card).getByText(new RegExp(exercise.type.replace(/_/g, ' '), 'i'))).toBeInTheDocument();
      expect(within(card).getByText(`${exercise.participants.length} Participants`)).toBeInTheDocument();
      
      // Check progress bar
      const progressBar = within(card).getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', exercise.metrics.completionRate.toString());
    });
  });

  it('should handle exercise creation navigation', async () => {
    const { container } = renderDashboard();
    const createButton = screen.getByRole('button', { name: /create exercise/i });

    await userEvent.click(createButton);
    
    // Verify navigation attempt
    expect(window.location.pathname).toBe('/exercises/create');
  });

  it('should display metrics cards with real-time updates', async () => {
    renderDashboard();

    // Verify initial metrics
    const responseTimeCard = screen.getByText(/average response time/i).closest('article');
    const complianceCard = screen.getByText(/compliance coverage/i).closest('article');

    expect(within(responseTimeCard!).getByText('85s')).toBeInTheDocument();
    expect(within(complianceCard!).getByText('92%')).toBeInTheDocument();

    // Simulate WebSocket update
    const wsMessage = {
      responseTime: { value: 88, trend: 3 },
      complianceCoverage: { value: 94, trend: 2 }
    };
    
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(wsMessage)
    });
    
    mockWebSocket.onmessage?.(messageEvent);

    await waitFor(() => {
      expect(within(responseTimeCard!).getByText('88s')).toBeInTheDocument();
      expect(within(complianceCard!).getByText('94%')).toBeInTheDocument();
    });
  });

  it('should handle error states gracefully', async () => {
    // Mock error state
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockError = new Error('Failed to load dashboard data');
    
    jest.mocked(useExercise).mockImplementation(() => ({
      exercises: [],
      loading: false,
      error: mockError,
      metrics: null,
      createExercise: jest.fn(),
      retryFetch: jest.fn()
    }));

    renderDashboard();

    // Verify error message
    expect(screen.getByText(/failed to load dashboard data/i)).toBeInTheDocument();
    
    // Check retry button
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    await userEvent.click(retryButton);
    expect(useExercise().retryFetch).toHaveBeenCalled();
  });

  it('should be responsive across different screen sizes', () => {
    const { rerender } = renderDashboard();

    // Test mobile layout
    window.innerWidth = 375;
    window.dispatchEvent(new Event('resize'));
    rerender(
      <BrowserRouter>
        <ThemeProvider theme={defaultTheme}>
          <Dashboard />
        </ThemeProvider>
      </BrowserRouter>
    );
    
    // Verify mobile layout adjustments
    const exerciseCards = screen.getAllByRole('article');
    exerciseCards.forEach(card => {
      expect(card).toHaveStyle({ maxWidth: '100%' });
    });

    // Test desktop layout
    window.innerWidth = 1200;
    window.dispatchEvent(new Event('resize'));
    rerender(
      <BrowserRouter>
        <ThemeProvider theme={defaultTheme}>
          <Dashboard />
        </ThemeProvider>
      </BrowserRouter>
    );

    // Verify desktop layout adjustments
    const desktopCards = screen.getAllByRole('article');
    desktopCards.forEach(card => {
      expect(card).not.toHaveStyle({ maxWidth: '100%' });
    });
  });
});