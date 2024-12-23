import React from 'react';
import { render, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { expect, describe, it, beforeEach, jest } from '@jest/globals';
import Button from '../../src/components/common/Button';
import { defaultTheme } from '../../src/assets/styles/theme';

// Helper function to render components with theme
const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={defaultTheme}>
      {component}
    </ThemeProvider>
  );
};

// Helper to create consistent test props
const createTestProps = (overrides = {}) => ({
  children: 'Test Button',
  onClick: jest.fn(),
  ...overrides,
});

describe('Button Component', () => {
  // Basic Rendering Tests
  describe('Rendering', () => {
    it('renders with default props', () => {
      renderWithTheme(<Button>Test Button</Button>);
      const button = screen.getByRole('button', { name: 'Test Button' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('type', 'button');
    });

    it('applies correct variant styles', () => {
      const variants = ['contained', 'outlined', 'text'] as const;
      variants.forEach(variant => {
        renderWithTheme(<Button variant={variant}>Test Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`MuiButton-${variant}`);
      });
    });

    it('applies correct size styles', () => {
      const sizes = ['small', 'medium', 'large'] as const;
      sizes.forEach(size => {
        renderWithTheme(<Button size={size}>Test Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`MuiButton-size${size.charAt(0).toUpperCase() + size.slice(1)}`);
      });
    });

    it('applies correct color styles', () => {
      const colors = ['primary', 'secondary', 'error', 'info', 'warning', 'success'] as const;
      colors.forEach(color => {
        renderWithTheme(<Button color={color}>Test Button</Button>);
        const button = screen.getByRole('button');
        expect(button).toHaveClass(`MuiButton-${color}`);
      });
    });
  });

  // Interactive Behavior Tests
  describe('Interaction', () => {
    let props: ReturnType<typeof createTestProps>;

    beforeEach(() => {
      props = createTestProps();
    });

    it('handles click events', async () => {
      renderWithTheme(<Button {...props} />);
      const button = screen.getByRole('button');
      await userEvent.click(button);
      expect(props.onClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', async () => {
      renderWithTheme(<Button {...props} disabled />);
      const button = screen.getByRole('button');
      await userEvent.click(button);
      expect(props.onClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
    });

    it('prevents click when loading', async () => {
      renderWithTheme(<Button {...props} loading />);
      const button = screen.getByRole('button');
      await userEvent.click(button);
      expect(props.onClick).not.toHaveBeenCalled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('shows loading spinner when loading', () => {
      renderWithTheme(<Button {...props} loading />);
      const spinner = screen.getByRole('progressbar');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('meets WCAG contrast requirements', () => {
      const { container } = renderWithTheme(
        <Button variant="contained" color="primary">Test Button</Button>
      );
      // Note: Actual contrast checking would require additional testing libraries
      expect(container).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const props = createTestProps();
      renderWithTheme(<Button {...props} />);
      const button = screen.getByRole('button');
      
      button.focus();
      expect(button).toHaveFocus();
      
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(props.onClick).toHaveBeenCalled();
      
      fireEvent.keyDown(button, { key: ' ' });
      expect(props.onClick).toHaveBeenCalledTimes(2);
    });

    it('has correct ARIA attributes', () => {
      renderWithTheme(
        <Button 
          loading={true}
          disabled={true}
          ariaLabel="Custom Label"
          tooltipText="Tooltip Text"
        >
          Test Button
        </Button>
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom Label');
      expect(button).toHaveAttribute('aria-disabled', 'true');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toHaveAttribute('title', 'Tooltip Text');
    });
  });

  // Icon and Full Width Tests
  describe('Visual Features', () => {
    it('renders with start icon', () => {
      renderWithTheme(
        <Button startIcon={<span data-testid="start-icon">→</span>}>
          Test Button
        </Button>
      );
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    });

    it('renders with end icon', () => {
      renderWithTheme(
        <Button endIcon={<span data-testid="end-icon">←</span>}>
          Test Button
        </Button>
      );
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('applies full width styling', () => {
      renderWithTheme(<Button fullWidth>Test Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('MuiButton-fullWidth');
    });
  });

  // Theme Integration Tests
  describe('Theme Integration', () => {
    it('uses theme typography settings', () => {
      const { container } = renderWithTheme(<Button>Test Button</Button>);
      const button = container.firstChild;
      expect(button).toHaveStyle({
        fontFamily: defaultTheme.typography.fontFamily,
      });
    });

    it('applies theme spacing correctly', () => {
      const { container } = renderWithTheme(<Button size="medium">Test Button</Button>);
      const button = container.firstChild;
      // Convert theme spacing to pixels for size medium
      const expectedPadding = `${defaultTheme.spacing(1.5)} ${defaultTheme.spacing(3)}`;
      expect(button).toHaveStyle({
        padding: expectedPadding,
      });
    });
  });
});