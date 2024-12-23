"""
Metric Processor Service Module

Provides comprehensive metric processing and analysis capabilities for exercise performance data
with advanced statistical analysis, time-series generation, and metric aggregation features.

Version: 1.0.0
"""

# External imports with versions
import numpy as np  # numpy==1.24.0
import pandas as pd  # pandas==2.0.0
import influxdb_client  # influxdb-client==1.36.0
from influxdb_client.client.write_api import SYNCHRONOUS
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
import logging
from functools import lru_cache

# Internal imports
from ..models.metric import MetricModel
from ..config import Config, MetricsConfig

class MetricProcessor:
    """
    Enterprise-grade metric processor for analyzing exercise performance data with
    advanced statistical capabilities and optimized data handling.
    """

    def __init__(self):
        """Initialize metric processor with enhanced connection management and configuration."""
        # Load configuration
        config = Config.get_config()
        self._config = config.metrics
        
        # Setup logging
        self._logger = logging.getLogger(__name__)
        
        # Initialize InfluxDB client with connection pooling
        self._influxdb_client = influxdb_client.InfluxDBClient(
            url=f"http://{self._config.influxdb_host}:{self._config.influxdb_port}",
            token=self._config.influxdb_token.get_secret_value(),
            org=self._config.influxdb_org,
            enable_gzip=True
        )
        
        # Initialize connection pools and cache
        self._connection_pool = {}
        self._cache = {}
        
        # Initialize write API with batching
        self._write_api = self._influxdb_client.write_api(
            write_options=SYNCHRONOUS,
            batch_size=self._config.batch_size,
            flush_interval=self._config.flush_interval_seconds * 1000
        )

    def calculate_statistics(
        self,
        exercise_id: str,
        metric_type: str,
        start_time: datetime,
        end_time: datetime
    ) -> Dict[str, float]:
        """
        Calculate comprehensive statistical metrics with advanced analysis features.
        
        Args:
            exercise_id: Unique identifier for the exercise
            metric_type: Type of metric to analyze
            start_time: Start of analysis period
            end_time: End of analysis period
            
        Returns:
            Dictionary containing calculated statistics
        """
        try:
            # Retrieve metrics from MongoDB
            metrics = MetricModel.get_metrics_by_timerange(
                start_time=start_time,
                end_time=end_time,
                organization_id=exercise_id,
                metric_type=metric_type
            )
            
            # Convert to numpy array for efficient computation
            values = np.array([m.value for m in metrics])
            
            if len(values) == 0:
                return {
                    "count": 0,
                    "error": "No metrics found for the specified period"
                }
            
            # Calculate basic statistics
            stats = {
                "count": len(values),
                "mean": float(np.mean(values)),
                "median": float(np.median(values)),
                "std": float(np.std(values)),
                "min": float(np.min(values)),
                "max": float(np.max(values))
            }
            
            # Calculate percentiles
            percentiles = [75, 90, 95, 99]
            for p in percentiles:
                stats[f"p{p}"] = float(np.percentile(values, p))
            
            # Calculate trend analysis
            if len(values) > 1:
                x = np.arange(len(values))
                coeffs = np.polyfit(x, values, 1)
                stats["trend_slope"] = float(coeffs[0])
                stats["trend_intercept"] = float(coeffs[1])
            
            # Detect anomalies using Z-score
            z_scores = np.abs((values - stats["mean"]) / stats["std"])
            stats["anomaly_count"] = int(np.sum(z_scores > 3))
            
            return stats
            
        except Exception as e:
            self._logger.error(f"Error calculating statistics: {str(e)}")
            raise

    def generate_time_series(
        self,
        organization_id: str,
        metric_type: str,
        start_time: datetime,
        end_time: datetime,
        interval: str = "1h"
    ) -> pd.DataFrame:
        """
        Generate advanced time series data with multiple analysis features.
        
        Args:
            organization_id: Organization identifier
            metric_type: Type of metric to analyze
            start_time: Start of time series
            end_time: End of time series
            interval: Time series interval
            
        Returns:
            DataFrame containing time series data with analysis
        """
        try:
            # Query metrics from InfluxDB
            query = f'''
                from(bucket: "{self._config.influxdb_bucket}")
                |> range(start: {start_time.isoformat()}, stop: {end_time.isoformat()})
                |> filter(fn: (r) => r["organization_id"] == "{organization_id}")
                |> filter(fn: (r) => r["metric_type"] == "{metric_type}")
                |> aggregateWindow(every: {interval}, fn: mean)
                |> yield(name: "mean")
            '''
            
            result = self._influxdb_client.query_api().query_data_frame(query)
            
            if result.empty:
                return pd.DataFrame()
            
            # Process time series data
            df = pd.DataFrame(result)
            df.set_index('_time', inplace=True)
            
            # Calculate rolling statistics
            df['rolling_mean'] = df['_value'].rolling(window=3).mean()
            df['rolling_std'] = df['_value'].rolling(window=3).std()
            
            # Calculate exponential moving average
            df['ema'] = df['_value'].ewm(span=5).mean()
            
            # Detect trend changes
            df['trend_change'] = df['_value'].diff().apply(np.sign)
            
            return df
            
        except Exception as e:
            self._logger.error(f"Error generating time series: {str(e)}")
            raise

    def store_metric(
        self,
        organization_id: str,
        exercise_id: str,
        metric_type: str,
        value: float,
        metadata: Dict = None
    ) -> bool:
        """
        Store metrics with enhanced validation and batch processing.
        
        Args:
            organization_id: Organization identifier
            exercise_id: Exercise identifier
            metric_type: Type of metric
            value: Metric value
            metadata: Additional metric metadata
            
        Returns:
            Success status
        """
        try:
            # Create metric document
            metric = MetricModel(
                organization_id=organization_id,
                exercise_id=exercise_id,
                metric_type=metric_type,
                value=value,
                metadata=metadata or {},
                timestamp=datetime.utcnow()
            )
            
            # Store in MongoDB
            metric.save()
            
            # Store in InfluxDB
            point = influxdb_client.Point("exercise_metrics")\
                .tag("organization_id", organization_id)\
                .tag("exercise_id", exercise_id)\
                .tag("metric_type", metric_type)\
                .field("value", value)\
                .time(metric.timestamp)
                
            self._write_api.write(
                bucket=self._config.influxdb_bucket,
                record=point
            )
            
            return True
            
        except Exception as e:
            self._logger.error(f"Error storing metric: {str(e)}")
            raise

    @lru_cache(maxsize=100)
    def aggregate_metrics(
        self,
        organization_id: str,
        metric_type: str,
        dimensions: List[str],
        start_time: datetime,
        end_time: datetime
    ) -> Dict[str, pd.DataFrame]:
        """
        Perform multi-dimensional metric aggregation with caching.
        
        Args:
            organization_id: Organization identifier
            metric_type: Type of metric to aggregate
            dimensions: Aggregation dimensions
            start_time: Start of aggregation period
            end_time: End of aggregation period
            
        Returns:
            Dictionary of aggregated metrics by dimension
        """
        try:
            results = {}
            
            # Retrieve base metrics
            metrics = MetricModel.get_metrics_by_timerange(
                start_time=start_time,
                end_time=end_time,
                organization_id=organization_id,
                metric_type=metric_type
            )
            
            # Convert to DataFrame for efficient aggregation
            df = pd.DataFrame([m.to_dict() for m in metrics])
            
            if df.empty:
                return results
                
            # Perform dimensional aggregation
            for dimension in dimensions:
                if dimension in df.columns:
                    agg_df = df.groupby(dimension).agg({
                        'value': ['count', 'mean', 'std', 'min', 'max'],
                        'timestamp': ['min', 'max']
                    })
                    results[dimension] = agg_df
                    
            return results
            
        except Exception as e:
            self._logger.error(f"Error aggregating metrics: {str(e)}")
            raise

    def __del__(self):
        """Cleanup connections and resources."""
        try:
            if hasattr(self, '_write_api'):
                self._write_api.close()
            if hasattr(self, '_influxdb_client'):
                self._influxdb_client.close()
        except Exception as e:
            self._logger.error(f"Error during cleanup: {str(e)}")