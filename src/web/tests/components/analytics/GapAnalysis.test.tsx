import React from 'react'; // ^18.2.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // ^14.0.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { vi } from 'vitest'; // ^0.34.0
import { axe, toHaveNoViolations } from 'jest-axe'; // ^4.7.0

import { GapAnalysis } from '../../../../src/components/analytics/GapAnalysis';
import { IGapAnalysisResponse, IAnalyticsService } from '../../../../src/interfaces/analytics.interface';
import { GapType, GapSeverity, GapStatus } from '../../../../src/types/analytics.types';
import { ErrorCode } from '../../../../src/constants/error.constants';

// Extend expect matchers for accessibility testing
expect.extend(toHaveNoViolations);

// Mock the analytics service
vi.mock('../../../../src/interfaces/analytics.interface', () => ({
  IAnalyticsService: {
    getGapAnalysis: vi.fn()
  }
}));

// Test data constants
const TEST_ORG_ID = 'test-org-123';
const TEST_EXERCISE_ID = 'test-exercise-456';

// Mock gap analysis data
const mockGapAnalysisData: IGapAnalysisResponse = {
  gaps: [
    {
      id: 'gap-1',
      organization_id: TEST_ORG_ID,
      exercise_id: TEST_EXERCISE_ID,
      gap_type: GapType.PROCESS,
      title: 'Critical Process Gap',
      description: 'Missing incident escalation procedure',
      severity: GapSeverity.CRITICAL,
      status: GapStatus.OPEN,
      affected_areas: ['Incident Response'],
      compliance_frameworks: ['SOC2', 'ISO27001'],
      identified_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      metrics: [],
      recommendations: [],
      resolution_details: { steps: [], evidence: [], notes: [] },
      created_by: 'user-1',
      updated_by: 'user-1'
    },
    {
      id: 'gap-2',
      organization_id: TEST_ORG_ID,
      exercise_id: TEST_EXERCISE_ID,
      gap_type: GapType.TECHNOLOGY,
      title: 'High Priority Tech Gap',
      description: 'Backup system not configured',
      severity: GapSeverity.HIGH,
      status: GapStatus.IN_PROGRESS,
      affected_areas: ['Business Continuity'],
      compliance_frameworks: ['SOC2'],
      identified_at: '2024-01-15T11:00:00Z',
      updated_at: '2024-01-15T11:00:00Z',
      metrics: [],
      recommendations: [],
      resolution_details: { steps: [], evidence: [], notes: [] },
      created_by: 'user-1',
      updated_by: 'user-1'
    }
  ],
  statistics: {
    [GapType.PEOPLE]: 1,
    [GapType.PROCESS]: 2,
    [GapType.TECHNOLOGY]: 1,
    [GapType.COMPLIANCE]: 0
  },
  critical_count: 1,
  compliance_impact: {
    affected_frameworks: ['SOC2', 'ISO27001'],
    coverage_impact: 15,
    risk_level: GapSeverity.HIGH,
    remediation_priority: 1,
    compliance_citations: []
  }
};

// Test IDs for component elements
const testIds = {
  gapList: 'gap-analysis-list',
  loadingSpinner: 'loading-spinner',
  errorAlert: 'error-alert',
  retryButton: 'retry-button'
};

describe('GapAnalysis', () => {
  // Set up test environment
  const user = userEvent.setup();
  const mockOnGapClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (IAnalyticsService.getGapAnalysis as jest.Mock).mockResolvedValue(mockGapAnalysisData);
  });

  // Basic rendering and data loading tests
  it('should render loading state initially', () => {
    render(
      <GapAnalysis
        organizationId={TEST_ORG_ID}
        exerciseId={TEST_EXERCISE_ID}
        onGapClick={mockOnGapClick}
        pageSize={20}
        sortField="severity"
        sortDirection="desc"
        filterCriteria={{}}
        highContrastMode={false}
      />
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading gap analysis/i)).toBeInTheDocument();
  });

  it('should render gap data successfully', async () => {
    render(
      <GapAnalysis
        organizationId={TEST_ORG_ID}
        exerciseId={TEST_EXERCISE_ID}
        onGapClick={mockOnGapClick}
        pageSize={20}
        sortField="severity"
        sortDirection="desc"
        filterCriteria={{}}
        highContrastMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Critical Process Gap')).toBeInTheDocument();
      expect(screen.getByText('High Priority Tech Gap')).toBeInTheDocument();
    });

    expect(screen.getByText(/missing incident escalation procedure/i)).toBeInTheDocument();
  });

  // Accessibility tests
  it('should meet accessibility standards', async () => {
    const { container } = render(
      <GapAnalysis
        organizationId={TEST_ORG_ID}
        exerciseId={TEST_EXERCISE_ID}
        onGapClick={mockOnGapClick}
        pageSize={20}
        sortField="severity"
        sortDirection="desc"
        filterCriteria={{}}
        highContrastMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  // Interaction tests
  it('should handle gap click events', async () => {
    render(
      <GapAnalysis
        organizationId={TEST_ORG_ID}
        exerciseId={TEST_EXERCISE_ID}
        onGapClick={mockOnGapClick}
        pageSize={20}
        sortField="severity"
        sortDirection="desc"
        filterCriteria={{}}
        highContrastMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Critical Process Gap')).toBeInTheDocument();
    });

    const gapItem = screen.getByText('Critical Process Gap').closest('li');
    expect(gapItem).toBeInTheDocument();

    if (gapItem) {
      await user.click(gapItem);
      expect(mockOnGapClick).toHaveBeenCalledWith(mockGapAnalysisData.gaps[0]);
    }
  });

  // Error handling tests
  it('should handle API errors gracefully', async () => {
    const error = new Error('Failed to fetch gap analysis');
    (IAnalyticsService.getGapAnalysis as jest.Mock).mockRejectedValue(error);

    render(
      <GapAnalysis
        organizationId={TEST_ORG_ID}
        exerciseId={TEST_EXERCISE_ID}
        onGapClick={mockOnGapClick}
        pageSize={20}
        sortField="severity"
        sortDirection="desc"
        filterCriteria={{}}
        highContrastMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to fetch gap analysis/i)).toBeInTheDocument();
    });
  });

  // High contrast mode tests
  it('should render correctly in high contrast mode', async () => {
    render(
      <GapAnalysis
        organizationId={TEST_ORG_ID}
        exerciseId={TEST_EXERCISE_ID}
        onGapClick={mockOnGapClick}
        pageSize={20}
        sortField="severity"
        sortDirection="desc"
        filterCriteria={{}}
        highContrastMode={true}
      />
    );

    await waitFor(() => {
      const severityChips = screen.getAllByRole('status');
      severityChips.forEach(chip => {
        expect(chip).toHaveStyle({ backgroundColor: expect.any(String) });
      });
    });
  });

  // Filter criteria tests
  it('should handle filter criteria changes', async () => {
    const filterCriteria = {
      severity: [GapSeverity.CRITICAL],
      status: [GapStatus.OPEN]
    };

    render(
      <GapAnalysis
        organizationId={TEST_ORG_ID}
        exerciseId={TEST_EXERCISE_ID}
        onGapClick={mockOnGapClick}
        pageSize={20}
        sortField="severity"
        sortDirection="desc"
        filterCriteria={filterCriteria}
        highContrastMode={false}
      />
    );

    await waitFor(() => {
      expect(IAnalyticsService.getGapAnalysis).toHaveBeenCalledWith(
        TEST_ORG_ID,
        TEST_EXERCISE_ID,
        undefined,
        true
      );
    });
  });

  // Virtual list tests
  it('should implement virtual scrolling correctly', async () => {
    const { container } = render(
      <GapAnalysis
        organizationId={TEST_ORG_ID}
        exerciseId={TEST_EXERCISE_ID}
        onGapClick={mockOnGapClick}
        pageSize={20}
        sortField="severity"
        sortDirection="desc"
        filterCriteria={{}}
        highContrastMode={false}
      />
    );

    await waitFor(() => {
      const virtualList = container.querySelector('.ReactVirtualized__List');
      expect(virtualList).toBeInTheDocument();
    });
  });
});