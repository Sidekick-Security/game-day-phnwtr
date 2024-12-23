import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Box, Typography, CircularProgress, Tooltip, IconButton } from '@mui/material'; // ^5.0.0
import { useTheme, alpha } from '@mui/material/styles'; // ^5.0.0
import dayjs from 'dayjs'; // ^1.11.0
import Chart from '../common/Chart';
import { analyticsService } from '../../services/analytics.service';
import { MetricType } from '../../types/analytics.types';

// Constants for chart configuration
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;
const DEFAULT_HEIGHT = 300;
const MIN_DATA_POINTS = 2;

interface HistoricalTrendsProps {
  organizationId: string;
  metricType: MetricType;
  startDate: string;
  endDate: string;
  height?: number;
  showTrendIndicator?: boolean;
  onDataPointClick?: (date: string, value: number) => void;
}

/**
 * HistoricalTrends Component
 * Visualizes historical trends data with interactive charts and accessibility features
 * @version 1.0.0
 */
export const HistoricalTrends: React.FC<HistoricalTrendsProps> = ({
  organizationId,
  metricType,
  startDate,
  endDate,
  height = DEFAULT_HEIGHT,
  showTrendIndicator = true,
  onDataPointClick,
}) => {
  const theme = useTheme();
  const [trendsData, setTrendsData] = useState<Array<{ date: string; value: number; trend: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);

  /**
   * Formats trend data for visualization
   */
  const formatTrendData = useCallback((data: Array<{ timestamp: string; value: number }>) => {
    if (!data || data.length < MIN_DATA_POINTS) return [];

    return data
      .sort((a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf())
      .map((item, index, array) => {
        const trend = index > 0 
          ? ((item.value - array[index - 1].value) / array[index - 1].value) * 100 
          : 0;

        return {
          date: dayjs(item.timestamp).format('MMM D, YYYY'),
          value: item.value,
          trend,
        };
      });
  }, []);

  /**
   * Formats tooltip values based on metric type
   */
  const formatTooltipValue = useCallback((value: number) => {
    switch (metricType) {
      case MetricType.RESPONSE_TIME:
        return `${value.toFixed(2)}s`;
      case MetricType.COMPLIANCE_COVERAGE:
      case MetricType.EXERCISE_COMPLETION:
        return `${value.toFixed(1)}%`;
      default:
        return value.toFixed(1);
    }
  }, [metricType]);

  /**
   * Fetches and processes historical trends data
   */
  const fetchTrendsData = useCallback(async () => {
    try {
      const response = await analyticsService.getHistoricalTrends(
        organizationId,
        metricType,
        startDate,
        endDate,
        true // Include seasonality analysis
      );

      const formattedData = formatTrendData(response.data);
      setTrendsData(formattedData);
      setError(null);
      retryCount.current = 0;
    } catch (err) {
      setError('Failed to load trends data');
      
      // Implement retry logic
      if (retryCount.current < RETRY_ATTEMPTS) {
        retryCount.current += 1;
        setTimeout(() => {
          fetchTrendsData();
        }, RETRY_DELAY * retryCount.current);
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId, metricType, startDate, endDate, formatTrendData]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchTrendsData();
  }, [fetchTrendsData]);

  /**
   * Memoized chart configuration
   */
  const chartConfig = useMemo(() => ({
    data: trendsData,
    type: 'line' as const,
    dataKeys: ['value'],
    xAxisKey: 'date',
    height,
    colors: [theme.palette.primary.main],
    tooltipFormatter: formatTooltipValue,
    ariaLabel: `Historical trends for ${metricType.toLowerCase().replace('_', ' ')}`,
  }), [trendsData, height, theme.palette.primary.main, formatTooltipValue, metricType]);

  /**
   * Renders trend indicator if enabled
   */
  const renderTrendIndicator = useCallback(() => {
    if (!showTrendIndicator || trendsData.length < 2) return null;

    const lastTrend = trendsData[trendsData.length - 1]?.trend || 0;
    const trendColor = lastTrend > 0 
      ? theme.palette.success.main 
      : lastTrend < 0 
        ? theme.palette.error.main 
        : theme.palette.grey[500];

    return (
      <Typography
        variant="body2"
        sx={{ 
          color: trendColor,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
        role="status"
        aria-label={`Trend ${lastTrend > 0 ? 'increasing' : lastTrend < 0 ? 'decreasing' : 'stable'}`}
      >
        {lastTrend > 0 ? '↑' : lastTrend < 0 ? '↓' : '→'}
        {Math.abs(lastTrend).toFixed(1)}%
      </Typography>
    );
  }, [showTrendIndicator, trendsData, theme]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height={height}
        role="alert"
        aria-busy="true"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height={height}
        role="alert"
      >
        <Typography color="error" gutterBottom>
          {error}
        </Typography>
        <IconButton
          onClick={() => fetchTrendsData()}
          aria-label="Retry loading trends data"
          sx={{ mt: 1 }}
        >
          ↻ Retry
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        bgcolor: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        p: 2,
        boxShadow: theme.shadows[1],
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6" component="h2">
          {metricType.replace('_', ' ').toLowerCase()}
        </Typography>
        {renderTrendIndicator()}
      </Box>
      
      <Chart {...chartConfig} />
      
      {trendsData.length < MIN_DATA_POINTS && (
        <Typography
          color="text.secondary"
          textAlign="center"
          mt={2}
          role="alert"
        >
          Insufficient data points for trend visualization
        </Typography>
      )}
    </Box>
  );
};

export default HistoricalTrends;