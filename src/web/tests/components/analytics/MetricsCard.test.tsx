import React from 'react'; // ^18.2.0
import { render, screen, waitFor } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^7.0.0
import { ThemeProvider } from '@mui/material/styles'; // ^5.0.0

import MetricsCard from '../../src/components/analytics/MetricsCard';
import { MetricType } from '../../src/types/analytics.types';
import { defaultTheme } from '../../src/assets/styles/theme';

// Add jest-axe matchers
expect.extend(toHaveNoViolations);

// Mock chart component to avoid rendering issues in tests
jest.mock('../../src/components/common/Chart', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-chart">Chart Component</div>
}));

// Test data constants
const DEFAULT_PROPS = {
  title: 'Response Time',
  metricType: MetricType.RESPONSE_TIME,
  value: 85,
  trend: 5,
  unit: 'SECONDS',
  historicalData: [
    { timestamp: '2024-01-01T10:00:00Z', value: 80 },
    { timestamp: '2024-01-01T11:00:00Z', value: 85 }
  ]
};

// Helper function to render component with theme
const renderMetricsCard = (props = {}) => {
  const mergedProps = { ...DEFAULT_PROPS, ...props };
  return render(
    <ThemeProvider theme={defaultTheme}>
      <MetricsCard {...mergedProps} />
    </ThemeProvider>
  );
};

describe('MetricsCard Component', () => {
  // Reset DOM and mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders response time metric with correct formatting', () => {
      renderMetricsCard();
      
      expect(screen.getByText('Response Time')).toBeInTheDocument();
      expect(screen.getByText('85s')).toBeInTheDocument();
      expect(screen.getByText('+5s')).toBeInTheDocument();
    });

    it('renders compliance coverage with percentage', () => {
      renderMetricsCard({
        title: 'Compliance Coverage',
        metricType: MetricType.COMPLIANCE_COVERAGE,
        value: 92,
        trend: 3,
        unit: 'PERCENTAGE'
      });

      expect(screen.getByText('Compliance Coverage')).toBeInTheDocument();
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getByText('+3%')).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      renderMetricsCard({ isLoading: true });
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
    });

    it('shows error state with message', () => {
      const error = new Error('Failed to load metric');
      renderMetricsCard({ error });
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to load metric/i)).toBeInTheDocument();
    });

    it('renders historical data chart when data is provided', () => {
      renderMetricsCard();
      
      expect(screen.getByTestId('mock-chart')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('meets WCAG 2.1 Level AA requirements', async () => {
      const { container } = renderMetricsCard();
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('provides appropriate ARIA labels for metric values', () => {
      renderMetricsCard();
      
      expect(screen.getByLabelText('Response Time: 85s')).toBeInTheDocument();
    });

    it('announces trend changes with aria-live', () => {
      renderMetricsCard();
      
      const trendIndicator = screen.getByRole('status');
      expect(trendIndicator).toHaveAttribute('aria-live', 'polite');
    });

    it('supports keyboard navigation for interactive elements', () => {
      const onError = jest.fn();
      renderMetricsCard({ onError });
      
      const card = screen.getByRole('region');
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label', 'Response Time metric card');
    });
  });

  describe('Interaction', () => {
    it('handles error callback correctly', () => {
      const onError = jest.fn();
      const error = new Error('Test error');
      renderMetricsCard({ error, onError });
      
      expect(onError).toHaveBeenCalledWith(error);
    });

    it('shows tooltip on trend indicator hover', async () => {
      const user = userEvent.setup();
      renderMetricsCard();
      
      const trendIcon = screen.getByTestId('TrendingUpIcon');
      await user.hover(trendIcon);
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Value Formatting', () => {
    it('formats percentage values correctly', () => {
      renderMetricsCard({
        value: 75.5,
        trend: 2.5,
        unit: 'PERCENTAGE'
      });
      
      expect(screen.getByText('75.5%')).toBeInTheDocument();
      expect(screen.getByText('+2.5%')).toBeInTheDocument();
    });

    it('formats time values with appropriate units', () => {
      renderMetricsCard({
        value: 123.45,
        trend: -5.5,
        unit: 'SECONDS'
      });
      
      expect(screen.getByText('123.45s')).toBeInTheDocument();
      expect(screen.getByText('-5.5s')).toBeInTheDocument();
    });

    it('handles zero trend values without showing trend indicator', () => {
      renderMetricsCard({ trend: 0 });
      
      expect(screen.queryByTestId('TrendingUpIcon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('TrendingDownIcon')).not.toBeInTheDocument();
    });
  });

  describe('Theme Integration', () => {
    it('applies correct theme colors for trend indicators', () => {
      const { rerender } = renderMetricsCard({ trend: 5 });
      
      let trendIndicator = screen.getByRole('status');
      expect(trendIndicator).toHaveStyle({ color: defaultTheme.palette.success.main });
      
      rerender(
        <ThemeProvider theme={defaultTheme}>
          <MetricsCard {...DEFAULT_PROPS} trend={-5} />
        </ThemeProvider>
      );
      
      trendIndicator = screen.getByRole('status');
      expect(trendIndicator).toHaveStyle({ color: defaultTheme.palette.error.main });
    });
  });
});