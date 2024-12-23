import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'; // ^2.7.0
import { useTheme } from '@mui/material/styles'; // ^5.0.0
import { Box, CircularProgress, Typography } from '@mui/material'; // ^5.0.0
import { theme } from '../../assets/styles/theme';

// Constants
const DEFAULT_CHART_HEIGHT = 300;
const DEFAULT_CHART_MARGIN = { top: 10, right: 30, left: 0, bottom: 0 };
const MINIMUM_DATA_POINTS = 2;
const MAXIMUM_DATA_POINTS = 1000;
const CHART_ANIMATION_DURATION = 300;

// Types and Interfaces
interface ChartProps {
  data: Array<Record<string, any>>;
  type: 'line' | 'bar' | 'area';
  dataKeys: string[];
  xAxisKey: string;
  height?: number;
  colors?: string[];
  tooltipFormatter?: (value: any, locale?: string) => string;
  ariaLabel: string;
}

// Styled components using Material-UI Box
const ChartContainer = React.memo(({ children, ...props }: any) => (
  <Box
    sx={{
      width: '100%',
      height: 'auto',
      p: theme.spacing(2),
      borderRadius: theme.shape.borderRadius,
      bgcolor: theme.palette.background.paper,
      '&:focus': {
        outline: `2px solid ${theme.palette.primary.main}`,
        outlineOffset: 2,
      },
    }}
    role="region"
    tabIndex={0}
    {...props}
  >
    {children}
  </Box>
));

const LoadingContainer = React.memo(({ children }: any) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 200,
    }}
  >
    {children}
  </Box>
));

// Helper functions
const getChartComponent = (type: string) => {
  switch (type) {
    case 'line':
      return LineChart;
    case 'bar':
      return BarChart;
    case 'area':
      return AreaChart;
    default:
      throw new Error(`Unsupported chart type: ${type}`);
  }
};

const formatTooltip = (
  value: any,
  formatter?: (value: any, locale?: string) => string,
  locale?: string
): string => {
  if (formatter) {
    return formatter(value, locale) || '';
  }
  
  if (typeof value === 'number') {
    return new Intl.NumberFormat(locale).format(value);
  }
  
  return String(value || '');
};

// Main Chart Component
export const Chart: React.FC<ChartProps> = React.memo(({
  data,
  type,
  dataKeys,
  xAxisKey,
  height = DEFAULT_CHART_HEIGHT,
  colors,
  tooltipFormatter,
  ariaLabel,
}) => {
  const muiTheme = useTheme();
  
  // Validate input data
  if (!Array.isArray(data) || data.length < MINIMUM_DATA_POINTS) {
    return (
      <ChartContainer>
        <Typography color="error" align="center">
          Insufficient data points for visualization
        </Typography>
      </ChartContainer>
    );
  }

  if (data.length > MAXIMUM_DATA_POINTS) {
    return (
      <ChartContainer>
        <Typography color="error" align="center">
          Data set exceeds maximum limit
        </Typography>
      </ChartContainer>
    );
  }

  // Get chart component based on type
  const ChartComponent = useMemo(() => getChartComponent(type), [type]);

  // Generate default colors if not provided
  const chartColors = colors || [
    muiTheme.palette.primary.main,
    muiTheme.palette.secondary.main,
    muiTheme.palette.error.main,
    muiTheme.palette.warning.main,
    muiTheme.palette.success.main,
    muiTheme.palette.info.main,
  ];

  // Render appropriate chart element based on type
  const renderChartElement = (dataKey: string, index: number) => {
    const color = chartColors[index % chartColors.length];
    const props = {
      key: dataKey,
      dataKey,
      stroke: color,
      fill: type === 'area' ? color : undefined,
      fillOpacity: type === 'area' ? 0.3 : undefined,
      animationDuration: CHART_ANIMATION_DURATION,
      dot: type === 'line' ? { strokeWidth: 2 } : undefined,
      activeDot: type === 'line' ? { r: 6, strokeWidth: 2 } : undefined,
    };

    switch (type) {
      case 'line':
        return <Line {...props} />;
      case 'bar':
        return <Bar {...props} />;
      case 'area':
        return <Area {...props} />;
      default:
        return null;
    }
  };

  return (
    <ChartContainer aria-label={ariaLabel}>
      {data ? (
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent
            data={data}
            margin={DEFAULT_CHART_MARGIN}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={muiTheme.palette.divider}
            />
            <XAxis
              dataKey={xAxisKey}
              stroke={muiTheme.palette.text.primary}
              tick={{ fill: muiTheme.palette.text.primary }}
            />
            <YAxis
              stroke={muiTheme.palette.text.primary}
              tick={{ fill: muiTheme.palette.text.primary }}
            />
            <Tooltip
              formatter={(value: any) =>
                formatTooltip(value, tooltipFormatter, navigator.language)
              }
              contentStyle={{
                backgroundColor: muiTheme.palette.background.paper,
                border: `1px solid ${muiTheme.palette.divider}`,
                borderRadius: muiTheme.shape.borderRadius,
              }}
            />
            <Legend
              wrapperStyle={{
                paddingTop: muiTheme.spacing(2),
              }}
            />
            {dataKeys.map((dataKey, index) => renderChartElement(dataKey, index))}
          </ChartComponent>
        </ResponsiveContainer>
      ) : (
        <LoadingContainer>
          <CircularProgress />
        </LoadingContainer>
      )}
    </ChartContainer>
  );
});

Chart.displayName = 'Chart';

export default Chart;