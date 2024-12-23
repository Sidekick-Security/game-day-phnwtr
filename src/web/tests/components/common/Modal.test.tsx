import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ThemeProvider } from '@mui/material';
import { defaultTheme } from '../../../src/assets/styles/theme';
import { Modal, ModalProps } from '../../../src/components/common/Modal';
import { Button } from '../../../src/components/common/Button';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Default test props
const defaultProps: ModalProps = {
  open: true,
  onClose: jest.fn(),
  title: 'Test Modal',
  children: <div>Modal content</div>,
};

// Helper function to render Modal with theme
const renderModal = (props: Partial<ModalProps> = {}) => {
  const mergedProps = { ...defaultProps, ...props };
  return render(
    <ThemeProvider theme={defaultTheme}>
      <Modal {...mergedProps} />
    </ThemeProvider>
  );
};

// Mock ResizeObserver for responsive tests
const mockResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
window.ResizeObserver = mockResizeObserver;

describe('Modal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Functionality', () => {
    it('renders correctly when open', () => {
      renderModal();
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Modal')).toBeInTheDocument();
      expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      renderModal({ open: false });
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', async () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      
      const closeButton = screen.getByLabelText('Close dialog');
      await userEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('handles confirmation dialog when requireConfirmation is true', async () => {
      const onClose = jest.fn();
      renderModal({ requireConfirmation: true, onClose });
      
      const closeButton = screen.getByLabelText('Close dialog');
      await userEvent.click(closeButton);
      
      // Confirmation dialog should appear
      expect(screen.getByText('Are you sure you want to close this dialog?')).toBeInTheDocument();
      
      // Click confirm
      const confirmButton = screen.getByText('Confirm');
      await userEvent.click(confirmButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders action buttons correctly', () => {
      const actions = [
        <Button key="cancel" onClick={jest.fn()}>Cancel</Button>,
        <Button key="submit" onClick={jest.fn()}>Submit</Button>
      ];
      
      renderModal({ actions });
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Submit')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('meets WCAG accessibility standards', async () => {
      const { container } = renderModal();
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('manages focus correctly', async () => {
      renderModal();
      
      // First focusable element should be focused
      const closeButton = screen.getByLabelText('Close dialog');
      expect(document.activeElement).toBe(closeButton);
    });

    it('traps focus within modal', async () => {
      renderModal();
      
      const dialog = screen.getByRole('dialog');
      const focusableElements = within(dialog).queryAllByRole('button');
      
      // Tab through all focusable elements
      for (let i = 0; i < focusableElements.length + 1; i++) {
        await userEvent.tab();
      }
      
      // Focus should cycle back to first element
      expect(document.activeElement).toBe(focusableElements[0]);
    });

    it('supports keyboard navigation', async () => {
      const onClose = jest.fn();
      renderModal({ onClose });
      
      // Test Escape key
      await userEvent.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalled();
    });

    it('has correct ARIA attributes', () => {
      renderModal();
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });
  });

  describe('Material Design Compliance', () => {
    it('applies correct theme styles', () => {
      renderModal();
      
      const dialog = screen.getByRole('dialog');
      const styles = window.getComputedStyle(dialog);
      
      expect(styles.borderRadius).toBe(`${defaultTheme.shape.borderRadius}px`);
    });

    it('handles responsive behavior', async () => {
      // Mock mobile viewport
      window.innerWidth = 320;
      window.innerHeight = 568;
      window.dispatchEvent(new Event('resize'));
      
      renderModal({ fullScreen: true });
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({ width: '100%', height: '100%' });
    });

    it('supports reduced motion preferences', () => {
      const mediaQuery = '(prefers-reduced-motion: reduce)';
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: query === mediaQuery,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }));
      
      renderModal();
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({ transition: 'none' });
    });
  });

  describe('Error Handling', () => {
    it('handles onClose errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const onClose = jest.fn().mockRejectedValue(new Error('Close error'));
      
      renderModal({ onClose });
      
      const closeButton = screen.getByLabelText('Close dialog');
      await userEvent.click(closeButton);
      
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});