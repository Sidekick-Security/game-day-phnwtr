import React, { useCallback, useEffect, useState, useMemo } from 'react'; // ^18.2.0
import { styled, useTheme } from '@mui/material/styles'; // ^5.0.0
import { 
  List, 
  ListItem, 
  Typography, 
  Chip, 
  CircularProgress, 
  Alert 
} from '@mui/material'; // ^5.0.0
import { useTranslation } from 'react-i18next'; // ^12.0.0
import { debounce } from 'lodash'; // ^4.17.21
import { VariableSizeList as VirtualList } from 'react-window'; // ^1.8.9

import { IGapAnalysisResponse, IAnalyticsService } from '../../interfaces/analytics.interface';
import { GapType, GapSeverity, GapStatus } from '../../types/analytics.types';
import { Card } from '../common/Card';
import ErrorBoundary from '../common/ErrorBoundary';

// Constants for styling and configuration
const SEVERITY_COLORS = {
  CRITICAL: { light: '#d32f2f', dark: '#ff5252', highContrast: '#ffffff' },
  HIGH: { light: '#ed6c02', dark: '#ff9800', highContrast: '#ffffff' },
  MEDIUM: { light: '#ed6c02', dark: '#ff9800', highContrast: '#ffffff' },
  LOW: { light: '#2e7d32', dark: '#4caf50', highContrast: '#ffffff' }
};

const STATUS_LABELS = {
  OPEN: { label: 'Open', ariaLabel: 'Open Gap' },
  IN_PROGRESS: { label: 'In Progress', ariaLabel: 'Gap In Progress' },
  RESOLVED: { label: 'Resolved', ariaLabel: 'Gap Resolved' },
  ACCEPTED: { label: 'Accepted Risk', ariaLabel: 'Gap Accepted as Risk' }
};

// Styled components with accessibility considerations
const StyledGapList = styled(List)(({ theme }) => ({
  width: '100%',
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
  '& .MuiListItem-root': {
    marginBottom: theme.spacing(2),
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: '2px'
    }
  }
}));

const SeverityChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'severity' && prop !== 'highContrastMode'
})<{ severity: GapSeverity; highContrastMode: boolean }>(({ theme, severity, highContrastMode }) => ({
  backgroundColor: highContrastMode 
    ? SEVERITY_COLORS[severity].highContrast 
    : SEVERITY_COLORS[severity][theme.palette.mode],
  color: highContrastMode ? SEVERITY_COLORS[severity][theme.palette.mode] : '#ffffff',
  fontWeight: 'bold',
  marginRight: theme.spacing(1)
}));

// Component interfaces
interface GapAnalysisProps {
  organizationId: string;
  exerciseId?: string;
  gapType?: GapType;
  onGapClick: (gap: IGap) => void;
  pageSize: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  filterCriteria: IGapFilter;
  highContrastMode: boolean;
}

interface IGapFilter {
  severity?: GapSeverity[];
  status?: GapStatus[];
  dateRange?: { start: string; end: string };
}

// Main component
export const GapAnalysis: React.FC<GapAnalysisProps> = React.memo(({
  organizationId,
  exerciseId,
  gapType,
  onGapClick,
  pageSize = 20,
  sortField = 'severity',
  sortDirection = 'desc',
  filterCriteria,
  highContrastMode = false
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [gapData, setGapData] = useState<IGapAnalysisResponse | null>(null);
  const [page, setPage] = useState(1);

  // Memoized virtual list configuration
  const listConfig = useMemo(() => ({
    itemSize: 100,
    overscanCount: 5,
    width: '100%',
    height: 600
  }), []);

  // Debounced fetch function
  const debouncedFetch = useCallback(
    debounce(async (
      orgId: string, 
      exId?: string, 
      type?: GapType, 
      filters?: IGapFilter, 
      currentPage: number = 1
    ) => {
      try {
        setLoading(true);
        const response = await IAnalyticsService.getGapAnalysis(
          orgId,
          exId,
          type,
          true
        );
        setGapData(response);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch gap analysis'));
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Effect for initial data fetch and updates
  useEffect(() => {
    debouncedFetch(organizationId, exerciseId, gapType, filterCriteria, page);
    return () => {
      debouncedFetch.cancel();
    };
  }, [organizationId, exerciseId, gapType, filterCriteria, page]);

  // Render functions
  const renderGapItem = useCallback(({ index, style }) => {
    const gap = gapData?.gaps[index];
    if (!gap) return null;

    return (
      <ListItem
        style={style}
        button
        onClick={() => onGapClick(gap)}
        aria-label={`${gap.title} - ${t(`severity.${gap.severity}`)} severity gap`}
        role="listitem"
      >
        <div>
          <SeverityChip
            severity={gap.severity}
            highContrastMode={highContrastMode}
            label={t(`severity.${gap.severity}`)}
            aria-label={`Severity: ${t(`severity.${gap.severity}`)}`}
          />
          <Typography variant="h6" component="h3">
            {gap.title}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {gap.description}
          </Typography>
          <Chip
            label={STATUS_LABELS[gap.status].label}
            aria-label={STATUS_LABELS[gap.status].ariaLabel}
            size="small"
            variant="outlined"
          />
        </div>
      </ListItem>
    );
  }, [gapData, highContrastMode, onGapClick, t]);

  // Error state
  if (error) {
    return (
      <Alert 
        severity="error" 
        aria-live="polite"
        role="alert"
      >
        {error.message}
      </Alert>
    );
  }

  // Loading state
  if (loading && !gapData) {
    return (
      <Card>
        <div role="status" aria-live="polite" style={{ textAlign: 'center', padding: theme.spacing(3) }}>
          <CircularProgress aria-label="Loading gap analysis data" />
          <Typography>Loading gap analysis...</Typography>
        </div>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <Card>
        {/* Summary section */}
        <Typography variant="h5" component="h2" gutterBottom>
          {t('gapAnalysis.title')}
        </Typography>
        
        {/* Statistics */}
        <div role="region" aria-label="Gap statistics">
          <Typography variant="subtitle1">
            {t('gapAnalysis.criticalGaps', { count: gapData?.critical_count || 0 })}
          </Typography>
        </div>

        {/* Virtualized gap list */}
        <StyledGapList
          role="list"
          aria-label="List of identified gaps"
        >
          <VirtualList
            height={listConfig.height}
            itemCount={gapData?.gaps.length || 0}
            itemSize={() => listConfig.itemSize}
            width={listConfig.width}
            overscanCount={listConfig.overscanCount}
          >
            {renderGapItem}
          </VirtualList>
        </StyledGapList>
      </Card>
    </ErrorBoundary>
  );
});

GapAnalysis.displayName = 'GapAnalysis';

export type { GapAnalysisProps, IGapFilter };