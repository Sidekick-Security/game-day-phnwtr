import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Container, Grid, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { FileDownload } from '@mui/icons-material';

// Internal components
import MetricsCard from '../components/analytics/MetricsCard';
import GapAnalysis from '../components/analytics/GapAnalysis';
import HistoricalTrends from '../components/analytics/HistoricalTrends';
import PerformanceMetrics from '../components/analytics/PerformanceMetrics';

// Services and utilities
import { analyticsService } from '../services/analytics.service';
import { MetricType, GapType } from '../types/analytics.types';

// Constants
const REFRESH_INTERVAL = 30000; // 30 seconds
const INITIAL_PAGE_SIZE = 10;

interface AnalyticsPageProps {
  organizationId: string;
  exerciseId?: string;
  refreshInterval?: number;
}

export const Analytics: React.FC<AnalyticsPageProps> = ({
  organizationId,
  exerciseId,
  refreshInterval = REFRESH_INTERVAL,
}) => {
  const theme = useTheme();

  // State management
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [reportGenerating, setReportGenerating] = useState<boolean>(false);

  // Date range for historical data
  const dateRange = useMemo(() => ({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString()
  }), []);

  // Error handling callback
  const handleError = useCallback((error: Error) => {
    console.error('Analytics Error:', error);
    setError(error);
    setLoading(false);
  }, []);

  // Report generation handler
  const handleReportGeneration = useCallback(async () => {
    try {
      setReportGenerating(true);
      const reportBlob = await analyticsService.generateReport(
        organizationId,
        exerciseId,
        'pdf',
        false
      );

      // Create download URL and trigger download
      const url = window.URL.createObjectURL(reportBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${new Date().toISOString()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      handleError(err as Error);
    } finally {
      setReportGenerating(false);
    }
  }, [organizationId, exerciseId, handleError]);

  // Initial data loading effect
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Initial data loading is handled by child components
        setError(null);
      } catch (err) {
        handleError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [organizationId, exerciseId, handleError]);

  // Render error state
  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert 
          severity="error"
          sx={{ mt: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        >
          {error.message}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Page Header */}
      <Box
        sx={{
          py: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{ fontWeight: theme.typography.fontWeightBold }}
        >
          Analytics Dashboard
        </Typography>

        <Button
          variant="contained"
          startIcon={reportGenerating ? <CircularProgress size={20} /> : <FileDownload />}
          onClick={handleReportGeneration}
          disabled={reportGenerating}
          aria-label="Generate analytics report"
        >
          {reportGenerating ? 'Generating...' : 'Generate Report'}
        </Button>
      </Box>

      {/* Performance Metrics Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Performance Metrics
        </Typography>
        <PerformanceMetrics
          organizationId={organizationId}
          exerciseId={exerciseId}
          refreshInterval={refreshInterval}
          onError={handleError}
        />
      </Box>

      {/* Gap Analysis Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Gap Analysis
        </Typography>
        <GapAnalysis
          organizationId={organizationId}
          exerciseId={exerciseId}
          pageSize={INITIAL_PAGE_SIZE}
          sortField="severity"
          sortDirection="desc"
          filterCriteria={{}}
          onGapClick={() => {}}
          highContrastMode={false}
        />
      </Box>

      {/* Historical Trends Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Historical Trends
        </Typography>
        <Grid container spacing={3}>
          {Object.values(MetricType).map((metricType) => (
            <Grid item xs={12} md={6} key={metricType}>
              <HistoricalTrends
                organizationId={organizationId}
                metricType={metricType}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                showTrendIndicator
              />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.8)',
            zIndex: theme.zIndex.modal,
          }}
        >
          <CircularProgress size={60} />
        </Box>
      )}
    </Container>
  );
};

export default Analytics;