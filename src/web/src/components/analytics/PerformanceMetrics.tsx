import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert, Skeleton } from '@mui/material';
import { useTheme, styled } from '@mui/material/styles';
import dayjs from 'dayjs'; // ^1.11.0

import Chart from '../common/Chart';
import { MetricType, IMetric } from '../../types/analytics.types';
import { AnalyticsService } from '../../services/analytics.service';

// Constants
const REFRESH_INTERVAL_DEFAULT = 30000; // 30 seconds
const RETRY_ATTEMPTS = 3;
const CACHE_TTL = 300000; // 5 minutes
const TREND_WINDOW_DAYS = 30;

// Styled Components
const MetricsContainer = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  width: '100%',
  padding: theme.spacing(2),
}));

const MetricCard = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  transition: 'box-shadow 0.3s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[3],
  },
}));

// Interfaces
interface PerformanceMetricsProps {
  organizationId: string;
  exerciseId?: string;
  refreshInterval?: number;
  onError?: (error: Error) => void;
}

interface MetricsCache {
  data: IMetric[];
  timestamp: number;
}

// Component
export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  organizationId,
  exerciseId,
  refreshInterval = REFRESH_INTERVAL_DEFAULT,
  onError,
}) => {
  const theme = useTheme();
  const analyticsService = useMemo(() => new AnalyticsService(), []);

  // State
  const [metrics, setMetrics] = useState<IMetric[]>([]);
  const [trends, setTrends] = useState<Array<{ timestamp: string; [key: string]: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Cache reference
  const metricsCache = useMemo<MetricsCache>(() => ({ data: [], timestamp: 0 }), []);

  // Fetch metrics with retry mechanism
  const fetchMetricsWithRetry = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      const response = await analyticsService.getMetrics(
        organizationId,
        exerciseId,
        undefined,
        1,
        10
      );

      if (!response?.metrics) {
        throw new Error('Invalid metrics data received');
      }

      setMetrics(response.metrics);
      metricsCache.data = response.metrics;
      metricsCache.timestamp = Date.now();
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (retryCount < RETRY_ATTEMPTS) {
        setTimeout(() => {
          fetchMetricsWithRetry(retryCount + 1);
        }, Math.pow(2, retryCount) * 1000);
      } else {
        const error = err as Error;
        setError(error);
        onError?.(error);
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId, exerciseId, analyticsService, onError]);

  // Fetch historical trends with caching
  const fetchHistoricalTrendsWithCache = useCallback(async () => {
    try {
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(TREND_WINDOW_DAYS, 'day').format('YYYY-MM-DD');

      const response = await analyticsService.getHistoricalTrends(
        organizationId,
        MetricType.RESPONSE_TIME,
        startDate,
        endDate,
        true
      );

      const formattedTrends = response.data.map(item => ({
        timestamp: dayjs(item.timestamp).format('MMM DD'),
        value: item.value,
      }));

      setTrends(formattedTrends);
    } catch (err) {
      console.error('Error fetching historical trends:', err);
    }
  }, [organizationId, analyticsService]);

  // Format metric value with proper units and localization
  const formatMetricValue = useCallback((value: number, metricType: MetricType): string => {
    const formatter = new Intl.NumberFormat(navigator.language, {
      maximumFractionDigits: 2,
    });

    switch (metricType) {
      case MetricType.RESPONSE_TIME:
        return `${formatter.format(value)}s`;
      case MetricType.COMPLIANCE_COVERAGE:
        return `${formatter.format(value)}%`;
      default:
        return formatter.format(value);
    }
  }, []);

  // Calculate trend direction and percentage
  const calculateTrend = useCallback((current: number, previous: number): {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  } => {
    if (!previous) return { direction: 'stable', percentage: 0 };
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      percentage: Math.abs(change),
    };
  }, []);

  // Effect for data fetching and refresh interval
  useEffect(() => {
    const fetchData = async () => {
      // Check cache validity
      if (
        Date.now() - metricsCache.timestamp < CACHE_TTL &&
        metricsCache.data.length > 0
      ) {
        setMetrics(metricsCache.data);
        setLoading(false);
      } else {
        await fetchMetricsWithRetry();
      }
      await fetchHistoricalTrendsWithCache();
    };

    fetchData();
    const intervalId = setInterval(fetchData, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    organizationId,
    exerciseId,
    refreshInterval,
    fetchMetricsWithRetry,
    fetchHistoricalTrendsWithCache,
  ]);

  // Render loading state
  if (loading && !metrics.length) {
    return (
      <MetricsContainer>
        {[1, 2, 3].map((key) => (
          <MetricCard key={key}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={48} />
            <Skeleton variant="rectangular" height={200} />
          </MetricCard>
        ))}
      </MetricsContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <Alert 
        severity="error"
        action={
          <Typography variant="caption">
            Last updated: {lastUpdated?.toLocaleString() || 'Never'}
          </Typography>
        }
      >
        Error loading metrics: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <MetricsContainer>
        {metrics.map((metric) => {
          const trend = calculateTrend(
            metric.value,
            trends[trends.length - 2]?.value || 0
          );

          return (
            <MetricCard
              key={metric.id}
              role="region"
              aria-label={`${metric.metric_type} metric`}
            >
              <Typography variant="h6" color="textSecondary" gutterBottom>
                {metric.metric_type.replace(/_/g, ' ')}
              </Typography>
              <Typography variant="h4" component="div" gutterBottom>
                {formatMetricValue(metric.value, metric.metric_type)}
              </Typography>
              <Typography
                variant="body2"
                color={trend.direction === 'up' ? 'success.main' : 'error.main'}
              >
                {trend.direction !== 'stable' && (
                  <>
                    {trend.direction === 'up' ? '↑' : '↓'} {trend.percentage.toFixed(1)}%
                  </>
                )}
              </Typography>
              <Chart
                data={trends}
                type="line"
                dataKeys={['value']}
                xAxisKey="timestamp"
                height={200}
                colors={[theme.palette.primary.main]}
                tooltipFormatter={(value) => formatMetricValue(value, metric.metric_type)}
                ariaLabel={`${metric.metric_type} trend chart`}
              />
            </MetricCard>
          );
        })}
      </MetricsContainer>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Typography variant="caption" color="textSecondary">
          Last updated: {lastUpdated?.toLocaleString() || 'Never'}
        </Typography>
      </Box>
    </Box>
  );
};

export default PerformanceMetrics;