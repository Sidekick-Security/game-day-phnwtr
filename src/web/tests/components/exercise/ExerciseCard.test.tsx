import React from 'react'; // ^18.2.0
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { ThemeProvider } from '@mui/material/styles'; // ^5.0.0
import { vi, describe, it, expect, beforeEach } from 'vitest'; // ^0.34.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^4.7.0

import { ExerciseCard } from '../../src/components/exercise/ExerciseCard';
import { ExerciseType, ExerciseStatus } from '../../src/types/exercise.types';
import { defaultTheme } from '../../src/assets/styles/theme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Helper function to render component with theme
const renderWithTheme = (ui: React.ReactElement, options = {}) => {
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <ThemeProvider theme={defaultTheme}>
        {ui}
      </ThemeProvider>,
      options
    )
  };
};

// Test setup function with proper typing
const setup = (overrides = {}) => {
  const handlers = createMockHandlers();
  const defaultProps = {
    id: 'test-exercise-1',
    title: 'Test Exercise',
    type: ExerciseType.SECURITY_INCIDENT,
    status: ExerciseStatus.IN_PROGRESS,
    progress: 60,
    participantCount: 12,
    loading: false,
    error: '',
    ...handlers,
    ...overrides
  };
  
  return {
    props: defaultProps,
    handlers,
    ...renderWithTheme(<ExerciseCard {...defaultProps} />)
  };
};

// Create mock handlers
const createMockHandlers = () => ({
  onClick: vi.fn(),
  onContinue: vi.fn()
});

describe('ExerciseCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders exercise information correctly', () => {
      const { props } = setup();
      
      // Verify title
      expect(screen.getByRole('heading', { name: props.title })).toBeInTheDocument();
      
      // Verify exercise type
      expect(screen.getByText(props.type.replace(/_/g, ' '))).toBeInTheDocument();
      
      // Verify progress
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '60');
      
      // Verify participant count
      expect(screen.getByText(/12 Participants/)).toBeInTheDocument();
      
      // Verify status badge
      expect(screen.getByRole('status')).toHaveTextContent('IN PROGRESS');
    });

    it('renders different exercise types correctly', () => {
      const { rerender } = setup();
      
      const exerciseTypes = [
        ExerciseType.SECURITY_INCIDENT,
        ExerciseType.BUSINESS_CONTINUITY,
        ExerciseType.COMPLIANCE_VALIDATION
      ];

      exerciseTypes.forEach(type => {
        rerender(
          <ThemeProvider theme={defaultTheme}>
            <ExerciseCard {...setup().props} type={type} />
          </ThemeProvider>
        );
        expect(screen.getByText(type.replace(/_/g, ' '))).toBeInTheDocument();
      });
    });

    it('handles responsive layout', () => {
      const { container } = setup();
      expect(container.firstChild).toHaveStyle({
        minWidth: '320px',
        maxWidth: '400px'
      });
    });
  });

  describe('Interactions', () => {
    it('handles click events correctly', async () => {
      const { handlers, user } = setup();
      
      const card = screen.getByRole('button');
      await user.click(card);
      
      expect(handlers.onClick).toHaveBeenCalledTimes(1);
    });

    it('handles continue button click correctly', async () => {
      const { handlers, user } = setup();
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      expect(handlers.onContinue).toHaveBeenCalledTimes(1);
      expect(handlers.onContinue).toHaveBeenCalledWith('test-exercise-1');
    });

    it('prevents continue action when loading', async () => {
      const { handlers, user } = setup({ loading: true });
      
      const continueButton = screen.getByRole('button', { name: /loading/i });
      await user.click(continueButton);
      
      expect(handlers.onContinue).not.toHaveBeenCalled();
      expect(continueButton).toBeDisabled();
    });
  });

  describe('States', () => {
    it('displays loading state correctly', () => {
      setup({ loading: true });
      
      const continueButton = screen.getByRole('button', { name: /loading/i });
      expect(continueButton).toBeDisabled();
      expect(continueButton).toHaveAttribute('aria-busy', 'true');
    });

    it('displays error state correctly', () => {
      const errorMessage = 'Test error message';
      setup({ error: errorMessage });
      
      expect(screen.getByRole('alert')).toHaveTextContent(errorMessage);
    });

    it('hides continue button when exercise is completed', () => {
      setup({ status: ExerciseStatus.COMPLETED });
      
      expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets accessibility standards', async () => {
      const { container } = setup();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('provides proper ARIA labels', () => {
      const { props } = setup();
      
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        `Exercise: ${props.title}`
      );
      
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Status: in progress'
      );
      
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-label',
        'Progress: 60%'
      );
    });

    it('supports keyboard navigation', async () => {
      const { handlers, user } = setup();
      
      await user.tab();
      expect(screen.getByRole('button')).toHaveFocus();
      
      await user.keyboard('{enter}');
      expect(handlers.onClick).toHaveBeenCalled();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /continue/i })).toHaveFocus();
    });
  });

  describe('Theme Integration', () => {
    it('applies theme styles correctly', () => {
      const { container } = setup();
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({
        borderRadius: defaultTheme.shape.borderRadius
      });
    });

    it('handles theme transitions', () => {
      const { container } = setup();
      
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveStyle({
        transition: expect.stringContaining('transform')
      });
    });
  });
});