"""
Unit test suite for MetricProcessor service class.
Validates statistical calculations, time series generation, storage operations,
and multi-dimensional metric aggregation with extensive edge case coverage.

Version: 1.0.0
"""

# External imports with versions
import pytest  # pytest==7.0.0
import mongomock  # mongomock==4.1.0
import numpy as np  # numpy==1.24.0
import pandas as pd  # pandas==2.0.0
from freezegun import freeze_time  # freezegun==1.2.0
from datetime import datetime, timedelta
from typing import Dict, List

# Internal imports
from ..analytics_service.services.metric_processor import MetricProcessor
from ..analytics_service.models.metric import MetricModel
from . import TEST_CONFIG

class TestMetricProcessor:
    """
    Comprehensive test suite for MetricProcessor service with extensive validation scenarios.
    """

    @pytest.fixture(autouse=True)
    def setup_method(self):
        """Initialize test environment with mock databases and test data."""
        # Initialize mock MongoDB
        self.mongo_client = mongomock.MongoClient()
        self.db = self.mongo_client.analytics_test
        
        # Initialize MetricProcessor instance
        self.processor = MetricProcessor()
        
        # Setup test data
        self.test_org_id = "test_org_123"
        self.test_exercise_id = "exercise_456"
        self.test_timestamp = datetime.utcnow()
        
        # Generate test metrics data
        self.test_metrics = {
            'response_time': np.random.normal(5.0, 1.0, 100),
            'compliance_coverage': np.random.uniform(75, 100, 100),
            'participant_engagement': np.random.uniform(0, 10, 100)
        }

    @pytest.mark.unit
    def test_calculate_statistics(self):
        """Test statistical metrics calculation with comprehensive validation."""
        # Store test metrics
        for value in self.test_metrics['response_time']:
            self.processor.store_metric(
                organization_id=self.test_org_id,
                exercise_id=self.test_exercise_id,
                metric_type='response_time',
                value=float(value),
                metadata={'unit': 'seconds'}
            )

        # Calculate statistics
        stats = self.processor.calculate_statistics(
            exercise_id=self.test_exercise_id,
            metric_type='response_time',
            start_time=self.test_timestamp - timedelta(hours=1),
            end_time=self.test_timestamp + timedelta(hours=1)
        )

        # Validate basic statistics
        assert 'mean' in stats
        assert 'median' in stats
        assert 'std' in stats
        assert 'min' in stats
        assert 'max' in stats
        assert 'count' in stats
        
        # Validate statistical accuracy
        np.testing.assert_allclose(
            stats['mean'],
            np.mean(self.test_metrics['response_time']),
            rtol=1e-2
        )
        
        # Validate percentiles
        assert 'p75' in stats
        assert 'p90' in stats
        assert 'p95' in stats
        assert 'p99' in stats
        
        # Validate trend analysis
        assert 'trend_slope' in stats
        assert 'trend_intercept' in stats
        
        # Test edge cases
        with pytest.raises(Exception):
            self.processor.calculate_statistics(
                exercise_id="nonexistent",
                metric_type='response_time',
                start_time=self.test_timestamp,
                end_time=self.test_timestamp
            )

    @pytest.mark.unit
    @freeze_time("2024-01-15 12:00:00")
    def test_generate_time_series(self):
        """Test time series generation with various intervals and validations."""
        # Store test time series data
        timestamps = pd.date_range(
            start=self.test_timestamp - timedelta(days=7),
            end=self.test_timestamp,
            freq='1H'
        )
        
        for timestamp in timestamps:
            self.processor.store_metric(
                organization_id=self.test_org_id,
                exercise_id=self.test_exercise_id,
                metric_type='compliance_coverage',
                value=float(np.random.uniform(75, 100)),
                metadata={'timestamp': timestamp}
            )

        # Generate time series
        df = self.processor.generate_time_series(
            organization_id=self.test_org_id,
            metric_type='compliance_coverage',
            start_time=self.test_timestamp - timedelta(days=7),
            end_time=self.test_timestamp,
            interval='1h'
        )

        # Validate DataFrame structure
        assert isinstance(df, pd.DataFrame)
        assert not df.empty
        assert '_value' in df.columns
        assert 'rolling_mean' in df.columns
        assert 'rolling_std' in df.columns
        assert 'ema' in df.columns
        assert 'trend_change' in df.columns
        
        # Validate time series consistency
        assert df.index.is_monotonic_increasing
        assert not df.index.has_duplicates
        
        # Test different intervals
        hourly_df = self.processor.generate_time_series(
            organization_id=self.test_org_id,
            metric_type='compliance_coverage',
            start_time=self.test_timestamp - timedelta(days=1),
            end_time=self.test_timestamp,
            interval='1h'
        )
        
        daily_df = self.processor.generate_time_series(
            organization_id=self.test_org_id,
            metric_type='compliance_coverage',
            start_time=self.test_timestamp - timedelta(days=7),
            end_time=self.test_timestamp,
            interval='1d'
        )
        
        assert len(hourly_df) > len(daily_df)

    @pytest.mark.unit
    def test_store_metric(self):
        """Test metric storage operations with validation and error handling."""
        # Test successful storage
        success = self.processor.store_metric(
            organization_id=self.test_org_id,
            exercise_id=self.test_exercise_id,
            metric_type='participant_engagement',
            value=8.5,
            metadata={'session_duration': 3600}
        )
        assert success is True
        
        # Verify storage in MongoDB
        stored_metric = MetricModel.objects(
            organization_id=self.test_org_id,
            exercise_id=self.test_exercise_id
        ).first()
        assert stored_metric is not None
        assert stored_metric.value == 8.5
        
        # Test invalid metric type
        with pytest.raises(ValueError):
            self.processor.store_metric(
                organization_id=self.test_org_id,
                exercise_id=self.test_exercise_id,
                metric_type='invalid_type',
                value=10.0
            )
        
        # Test invalid value range
        with pytest.raises(ValueError):
            self.processor.store_metric(
                organization_id=self.test_org_id,
                exercise_id=self.test_exercise_id,
                metric_type='compliance_coverage',
                value=150.0  # Invalid percentage
            )

    @pytest.mark.unit
    def test_aggregate_metrics(self):
        """Test multi-dimensional metric aggregation with various grouping strategies."""
        # Store test metrics with different dimensions
        dimensions = ['team', 'role', 'region']
        teams = ['security', 'operations', 'management']
        roles = ['analyst', 'engineer', 'manager']
        regions = ['us-east', 'us-west', 'eu-central']
        
        for team in teams:
            for role in roles:
                for region in regions:
                    self.processor.store_metric(
                        organization_id=self.test_org_id,
                        exercise_id=self.test_exercise_id,
                        metric_type='response_time',
                        value=float(np.random.normal(5.0, 1.0)),
                        metadata={
                            'team': team,
                            'role': role,
                            'region': region
                        }
                    )

        # Perform aggregation
        results = self.processor.aggregate_metrics(
            organization_id=self.test_org_id,
            metric_type='response_time',
            dimensions=dimensions,
            start_time=self.test_timestamp - timedelta(hours=1),
            end_time=self.test_timestamp + timedelta(hours=1)
        )

        # Validate aggregation results
        assert isinstance(results, dict)
        assert all(dim in results for dim in dimensions)
        
        # Validate team dimension aggregation
        team_agg = results['team']
        assert isinstance(team_agg, pd.DataFrame)
        assert len(team_agg) == len(teams)
        assert all(col in team_agg.columns for col in [('value', 'mean'), ('value', 'std')])
        
        # Validate role dimension aggregation
        role_agg = results['role']
        assert isinstance(role_agg, pd.DataFrame)
        assert len(role_agg) == len(roles)
        
        # Test aggregation with invalid dimension
        results_invalid = self.processor.aggregate_metrics(
            organization_id=self.test_org_id,
            metric_type='response_time',
            dimensions=['invalid_dimension'],
            start_time=self.test_timestamp - timedelta(hours=1),
            end_time=self.test_timestamp + timedelta(hours=1)
        )
        assert len(results_invalid) == 0