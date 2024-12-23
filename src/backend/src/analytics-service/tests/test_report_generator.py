"""
Comprehensive test suite for ReportGenerator service validating report generation functionality,
asynchronous processing, error handling, and monitoring capabilities.

Version: 1.0.0
"""

# External imports
import pytest  # version: 7.0+
import pytest_asyncio  # version: 0.21+
from unittest.mock import Mock, AsyncMock, patch  # python3.11+
import boto3  # version: 1.26+
import asyncio
from datetime import datetime, timedelta
import json
from prometheus_client import REGISTRY

# Internal imports
from analytics_service.services.report_generator import ReportGenerator
from analytics_service.models.report import ReportModel, ReportType, ReportStatus
from analytics_service.services.gap_analyzer import GapAnalyzer
from analytics_service.services.metric_processor import MetricProcessor

@pytest.fixture
def mock_config():
    """Fixture providing test configuration."""
    return {
        'template_path': '/tmp/templates',
        'aws_region': 'us-east-1',
        's3_bucket': 'test-reports-bucket'
    }

@pytest.fixture
def mock_metrics_data():
    """Fixture providing test metrics data."""
    return {
        'mean': 150.0,
        'p95': 250.0,
        'anomaly_count': 2,
        'trend_slope': -0.5,
        'compliance_coverage': 0.85
    }

@pytest.fixture
def mock_gaps_data():
    """Fixture providing test gap analysis data."""
    return [
        {
            'id': 'GAP_001',
            'type': 'PROCESS',
            'title': 'Response Time Gap',
            'description': 'High response times detected',
            'severity': 'HIGH',
            'affected_areas': ['Incident Response']
        }
    ]

class TestReportGenerator:
    """
    Comprehensive test suite for ReportGenerator service functionality including
    async operations, error handling, and monitoring.
    """

    @pytest.fixture(autouse=True)
    async def setup(self, mock_config):
        """Set up test environment with comprehensive mocking."""
        # Create mock instances
        self._gap_analyzer_mock = Mock(spec=GapAnalyzer)
        self._metric_processor_mock = Mock(spec=MetricProcessor)
        self._s3_client_mock = Mock(spec=boto3.client('s3'))
        self._monitoring_client_mock = Mock()

        # Configure mock responses
        self._gap_analyzer_mock.analyze_exercise = AsyncMock()
        self._metric_processor_mock.calculate_statistics = AsyncMock()
        
        # Initialize report generator
        self._report_generator = ReportGenerator(
            gap_analyzer=self._gap_analyzer_mock,
            metric_processor=self._metric_processor_mock,
            config=mock_config
        )
        
        # Replace S3 client with mock
        self._report_generator._s3_client = self._s3_client_mock

    @pytest.mark.asyncio
    async def test_generate_report_async(self, mock_metrics_data, mock_gaps_data):
        """Test asynchronous report generation with status transitions and monitoring."""
        # Setup test data
        org_id = "test-org-001"
        exercise_id = "test-exercise-001"
        report_type = ReportType.EXERCISE_SUMMARY
        format = "PDF"
        created_by = "test-user"

        # Configure mock responses
        self._metric_processor_mock.calculate_statistics.return_value = mock_metrics_data
        self._gap_analyzer_mock.analyze_exercise.return_value = mock_gaps_data
        self._s3_client_mock.put_object.return_value = {'ETag': 'test-etag'}

        # Generate report
        report = await self._report_generator.generate_report(
            organization_id=org_id,
            exercise_id=exercise_id,
            report_type=report_type,
            format=format,
            created_by=created_by
        )

        # Verify report generation
        assert isinstance(report, ReportModel)
        assert report.organization_id == org_id
        assert report.exercise_id == exercise_id
        assert report.report_type == report_type
        assert report.status == ReportStatus.COMPLETED
        assert report.file_url is not None

        # Verify mock calls
        self._metric_processor_mock.calculate_statistics.assert_called_once()
        self._gap_analyzer_mock.analyze_exercise.assert_called_once()
        self._s3_client_mock.put_object.assert_called_once()

        # Verify metrics
        report_counter = REGISTRY.get_sample_value(
            'report_generation_total',
            {'report_type': report_type.value, 'format': format, 'status': 'success'}
        )
        assert report_counter == 1

    @pytest.mark.asyncio
    async def test_generate_report_error_handling(self):
        """Test error handling during report generation."""
        # Setup error simulation
        self._metric_processor_mock.calculate_statistics.side_effect = Exception("Metric processing failed")

        # Attempt report generation
        with pytest.raises(Exception) as exc_info:
            await self._report_generator.generate_report(
                organization_id="test-org",
                exercise_id="test-exercise",
                report_type=ReportType.EXERCISE_SUMMARY,
                format="PDF",
                created_by="test-user"
            )

        # Verify error handling
        assert "Metric processing failed" in str(exc_info.value)
        
        # Verify error metrics
        error_counter = REGISTRY.get_sample_value(
            'report_generation_total',
            {'report_type': ReportType.EXERCISE_SUMMARY.value, 'format': 'PDF', 'status': 'failed'}
        )
        assert error_counter == 1

    def test_report_format_validation(self, mock_metrics_data, mock_gaps_data):
        """Test report format generation and validation."""
        # Test PDF format
        content = {
            'metrics': mock_metrics_data,
            'gaps': mock_gaps_data,
            'generated_at': datetime.utcnow().isoformat()
        }

        # Verify PDF generation
        pdf_result = asyncio.run(self._report_generator._format_report(
            content=content,
            template_name="exercise_summary.html",
            format="PDF"
        ))
        assert isinstance(pdf_result, bytes)
        assert len(pdf_result) > 0

        # Verify HTML generation
        html_result = asyncio.run(self._report_generator._format_report(
            content=content,
            template_name="exercise_summary.html",
            format="HTML"
        ))
        assert isinstance(html_result, bytes)
        assert b"<!DOCTYPE html>" in html_result

        # Test invalid format
        with pytest.raises(ValueError) as exc_info:
            asyncio.run(self._report_generator._format_report(
                content=content,
                template_name="exercise_summary.html",
                format="INVALID"
            ))
        assert "Unsupported format" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_performance_metrics(self, mock_metrics_data, mock_gaps_data):
        """Test report generation performance metrics."""
        # Configure performance test data
        large_content = {
            'metrics': mock_metrics_data * 100,  # Simulate large dataset
            'gaps': mock_gaps_data * 50
        }

        # Measure generation time
        start_time = datetime.utcnow()
        
        report = await self._report_generator.generate_report(
            organization_id="test-org",
            exercise_id="test-exercise",
            report_type=ReportType.EXERCISE_SUMMARY,
            format="PDF",
            created_by="test-user"
        )

        generation_time = (datetime.utcnow() - start_time).total_seconds()

        # Verify performance metrics
        assert generation_time < 5.0  # Maximum allowed generation time
        
        # Verify histogram metrics
        histogram = REGISTRY.get_sample_value(
            'report_generation_duration_seconds_bucket',
            {'report_type': ReportType.EXERCISE_SUMMARY.value, 'format': 'PDF', 'le': '5.0'}
        )
        assert histogram is not None

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Clean up test artifacts and reset mocks."""
    yield
    # Cleanup operations after all tests
    try:
        import shutil
        shutil.rmtree('/tmp/templates', ignore_errors=True)
    except Exception as e:
        print(f"Cleanup error: {str(e)}")