import React, { useCallback, useEffect, useMemo } from 'react';
import { styled } from '@mui/material/styles'; // ^5.0.0
import { Typography, Box, Tooltip, CircularProgress } from '@mui/material'; // ^5.0.0
import { TrendingUp, TrendingDown, Error } from '@mui/icons-material'; // ^5.0.0
import { useTranslation } from 'react-i18next'; // ^13.0.0

import { Card } from '../common/Card';
import Chart from '../common/Chart';
import { MetricType } from '../../types/analytics.types';
import ErrorBoundary from '../common/ErrorBoundary';

// Constants for styling and animations
const TREND_ICON_SIZE = 20;
const UPDATE_ANIMATION_DURATION = '0.3s';
const CHART_HEIGHT = 100;

// Styled components with accessibility considerations
const StyledMetricValue = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: theme.typography.fontWeightBold,
  lineHeight: 1.2,
  marginBottom: theme.spacing(1),
  transition: `all ${UPDATE_ANIMATION_DURATION} ease-in-out`,
}));

const TrendIndicator = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'trend',
})<{ trend: number }>(({ theme, trend }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  color: trend > 0 ? theme.palette.success.main : 
         trend < 0 ? theme.palette.error.main : 
         theme.palette.text.secondary,
  transition: `color ${UPDATE_ANIMATION_DURATION} ease-in-out`,
}));

// Props interface with comprehensive type definitions
interface MetricsCardProps {
  title: string;
  metricType: MetricType;
  value: number;
  trend: number;
  unit: string;
  historicalData?: Array<{ timestamp: string; value: number }>;
  isLoading?: boolean;
  error?: Error | null;
  updateInterval?: number;
  onError?: (error: Error) => void;
}

// Utility function to format metric values based on type and locale
const formatValue = (value: number, unit: string, locale: string): string => {
  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    style: unit === 'PERCENTAGE' ? 'percent' : 'decimal',
  });

  const formattedValue = unit === 'PERCENTAGE' ? 
    formatter.format(value / 100) :
    `${formatter.format(value)}${unit === 'SECONDS' ? 's' : ''}`;

  return formattedValue;
};

// Utility function to get trend color based on direction
const getTrendColor = (trend: number, theme: any): string => {
  if (trend === 0) return theme.palette.text.secondary;
  return trend > 0 ? theme.palette.success.main : theme.palette.error.main;
};

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  metricType,
  value,
  trend,
  unit,
  historicalData = [],
  isLoading = false,
  error = null,
  updateInterval = 0,
  onError,
}) => {
  const { t } = useTranslation();
  
  // Memoized chart data transformation
  const chartData = useMemo(() => {
    return historicalData.map(({ timestamp, value }) => ({
      time: new Date(timestamp).toLocaleTimeString(),
      value,
    }));
  }, [historicalData]);

  // Error handling callback
  const handleError = useCallback((error: Error) => {
    console.error(`Metrics Card Error (${metricType}):`, error);
    onError?.(error);
  }, [metricType, onError]);

  // Auto-update effect
  useEffect(() => {
    if (updateInterval > 0 && !isLoading && !error) {
      const timer = setInterval(() => {
        // Trigger update logic here if needed
      }, updateInterval);

      return () => clearInterval(timer);
    }
  }, [updateInterval, isLoading, error]);

  // Render metric content based on state
  const renderContent = () => {
    if (error) {
      return (
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          color="error.main"
          role="alert"
        >
          <Error />
          <Typography variant="body2">
            {t('metrics.error', 'Failed to load metric')}
          </Typography>
        </Box>
      );
    }

    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" p={2}>
          <CircularProgress size={24} aria-label={t('common.loading')} />
        </Box>
      );
    }

    return (
      <>
        <StyledMetricValue aria-label={`${title}: ${formatValue(value, unit, navigator.language)}`}>
          {formatValue(value, unit, navigator.language)}
        </StyledMetricValue>

        <TrendIndicator
          trend={trend}
          role="status"
          aria-live="polite"
        >
          {trend !== 0 && (
            <Tooltip title={t('metrics.trend', 'Trend')}>
              {trend > 0 ? (
                <TrendingUp sx={{ fontSize: TREND_ICON_SIZE }} />
              ) : (
                <TrendingDown sx={{ fontSize: TREND_ICON_SIZE }} />
              )}
            </Tooltip>
          )}
          <Typography variant="body2">
            {trend > 0 ? '+' : ''}{formatValue(trend, unit, navigator.language)}
          </Typography>
        </TrendIndicator>

        {historicalData.length > 0 && (
          <Box mt={2} height={CHART_HEIGHT}>
            <Chart
              type="line"
              data={chartData}
              dataKeys={['value']}
              xAxisKey="time"
              height={CHART_HEIGHT}
              ariaLabel={`${title} trend chart`}
            />
          </Box>
        )}
      </>
    );
  };

  return (
    <ErrorBoundary onError={handleError}>
      <Card
        variant="outlined"
        title={title}
        aria-label={`${title} metric card`}
      >
        {renderContent()}
      </Card>
    </ErrorBoundary>
  );
};

export default MetricsCard;