"""
Report Generator Service Module

Provides comprehensive exercise analysis report generation with support for multiple formats,
caching, and asynchronous processing. Implements robust error handling, validation, and monitoring.

Version: 1.0.0
"""

# External imports
import pandas as pd  # version: 2.0+
import jinja2  # version: 3.1+
from weasyprint import HTML  # version: 59.0+
import boto3  # version: 1.26+
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
import logging
from functools import lru_cache
from prometheus_client import Counter, Histogram  # version: 0.17+

# Internal imports
from ..models.report import ReportModel, ReportType, ReportStatus
from .gap_analyzer import GapAnalyzer
from .metric_processor import MetricProcessor

class ReportGenerator:
    """
    Enterprise-grade report generator implementing comprehensive analysis capabilities
    with support for multiple output formats and asynchronous processing.
    """

    def __init__(self, gap_analyzer: GapAnalyzer, metric_processor: MetricProcessor, config: Dict):
        """
        Initialize report generator with required dependencies and configuration.

        Args:
            gap_analyzer: Gap analysis service instance
            metric_processor: Metric processing service instance
            config: Service configuration parameters
        """
        # Initialize core dependencies
        self._gap_analyzer = gap_analyzer
        self._metric_processor = metric_processor
        self._logger = logging.getLogger(__name__)

        # Initialize Jinja2 environment with caching
        self._jinja_env = jinja2.Environment(
            loader=jinja2.FileSystemLoader(config['template_path']),
            autoescape=True,
            cache_size=200
        )

        # Initialize S3 client with retry configuration
        self._s3_client = boto3.client(
            's3',
            region_name=config['aws_region'],
            config=boto3.Config(
                retries={'max_attempts': 3},
                connect_timeout=5,
                read_timeout=10
            )
        )

        # Initialize template cache
        self._template_cache = {}

        # Initialize Prometheus metrics
        self._report_counter = Counter(
            'report_generation_total',
            'Total number of reports generated',
            ['report_type', 'format', 'status']
        )
        self._generation_time = Histogram(
            'report_generation_duration_seconds',
            'Time spent generating reports',
            ['report_type', 'format']
        )

        # Store configuration
        self._config = config
        self._bucket_name = config['s3_bucket']
        self._template_path = config['template_path']

    async def generate_report(
        self,
        organization_id: str,
        exercise_id: str,
        report_type: ReportType,
        format: str,
        created_by: str,
        options: Optional[Dict] = None
    ) -> ReportModel:
        """
        Asynchronously generate a new exercise analysis report with comprehensive error handling.

        Args:
            organization_id: Organization identifier
            exercise_id: Exercise identifier
            report_type: Type of report to generate
            format: Output format (PDF, HTML, JSON)
            created_by: User identifier who requested the report
            options: Additional report generation options

        Returns:
            ReportModel instance with generation status and file URL
        """
        try:
            # Create new report instance
            report = ReportModel(
                organization_id=organization_id,
                exercise_id=exercise_id,
                report_type=report_type,
                title=f"{report_type.value} Report - {exercise_id}",
                description=f"Comprehensive analysis report for exercise {exercise_id}",
                created_by=created_by,
                format=format
            )

            # Update status to generating
            report.update_status(ReportStatus.GENERATING)

            # Collect exercise metrics
            metrics = await self._collect_metrics(exercise_id, report_type)

            # Perform gap analysis
            gaps = await self._analyze_gaps(exercise_id, organization_id)

            # Generate report content based on type
            content = await self._generate_content(
                report_type=report_type,
                metrics=metrics,
                gaps=gaps,
                options=options
            )

            # Format report using template
            formatted_report = await self._format_report(
                content=content,
                template_name=f"{report_type.value.lower()}.html",
                format=format
            )

            # Upload to S3
            file_url = await self._upload_report(
                report_data=formatted_report,
                report_id=str(report.id),
                format=format
            )

            # Update report status and URL
            report.update_status(
                ReportStatus.COMPLETED,
                file_url=file_url,
                additional_metadata={'completion_time': datetime.utcnow().isoformat()}
            )

            # Update metrics
            self._report_counter.labels(
                report_type=report_type.value,
                format=format,
                status='success'
            ).inc()

            return report

        except Exception as e:
            self._logger.error(f"Error generating report: {str(e)}")
            if report:
                report.update_status(
                    ReportStatus.FAILED,
                    additional_metadata={'error': str(e)}
                )
            self._report_counter.labels(
                report_type=report_type.value,
                format=format,
                status='failed'
            ).inc()
            raise

    async def _collect_metrics(self, exercise_id: str, report_type: ReportType) -> Dict:
        """
        Collect and process exercise metrics based on report type.

        Args:
            exercise_id: Exercise identifier
            report_type: Type of report to generate

        Returns:
            Dictionary containing processed metrics
        """
        try:
            metrics = {}
            
            # Get time range for metrics
            end_time = datetime.utcnow()
            start_time = end_time - pd.Timedelta(days=30)  # Configurable period

            # Collect performance metrics
            metrics['performance'] = self._metric_processor.calculate_statistics(
                exercise_id=exercise_id,
                metric_type='response_time',
                start_time=start_time,
                end_time=end_time
            )

            # Generate time series data
            metrics['trends'] = self._metric_processor.generate_time_series(
                organization_id=exercise_id,
                metric_type='response_time',
                start_time=start_time,
                end_time=end_time,
                interval='1h'
            )

            return metrics

        except Exception as e:
            self._logger.error(f"Error collecting metrics: {str(e)}")
            raise

    async def _analyze_gaps(self, exercise_id: str, organization_id: str) -> List[Dict]:
        """
        Perform comprehensive gap analysis for the exercise.

        Args:
            exercise_id: Exercise identifier
            organization_id: Organization identifier

        Returns:
            List of identified gaps with recommendations
        """
        try:
            return self._gap_analyzer.analyze_exercise(
                exercise_id=exercise_id,
                organization_id=organization_id
            )
        except Exception as e:
            self._logger.error(f"Error analyzing gaps: {str(e)}")
            raise

    @lru_cache(maxsize=10)
    async def _get_template(self, template_name: str) -> jinja2.Template:
        """
        Retrieve and cache report template.

        Args:
            template_name: Name of template file

        Returns:
            Compiled Jinja2 template
        """
        try:
            if template_name not in self._template_cache:
                template = self._jinja_env.get_template(template_name)
                self._template_cache[template_name] = template
            return self._template_cache[template_name]
        except Exception as e:
            self._logger.error(f"Error loading template: {str(e)}")
            raise

    async def _format_report(
        self,
        content: Dict,
        template_name: str,
        format: str
    ) -> bytes:
        """
        Format report content using template and convert to requested format.

        Args:
            content: Report content
            template_name: Template file name
            format: Output format

        Returns:
            Formatted report as bytes
        """
        try:
            template = await self._get_template(template_name)
            html_content = template.render(**content)

            if format == 'HTML':
                return html_content.encode('utf-8')
            elif format == 'PDF':
                return HTML(string=html_content).write_pdf()
            elif format == 'JSON':
                return pd.json.dumps(content).encode('utf-8')
            else:
                raise ValueError(f"Unsupported format: {format}")

        except Exception as e:
            self._logger.error(f"Error formatting report: {str(e)}")
            raise

    async def _upload_report(self, report_data: bytes, report_id: str, format: str) -> str:
        """
        Upload generated report to S3 with retry logic.

        Args:
            report_data: Report content
            report_id: Unique report identifier
            format: File format extension

        Returns:
            S3 URL of uploaded report
        """
        try:
            key = f"reports/{report_id}/report.{format.lower()}"
            
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self._s3_client.put_object(
                    Bucket=self._bucket_name,
                    Key=key,
                    Body=report_data,
                    ContentType=f"application/{format.lower()}",
                    ServerSideEncryption='AES256'
                )
            )

            return f"https://{self._bucket_name}.s3.amazonaws.com/{key}"

        except Exception as e:
            self._logger.error(f"Error uploading report: {str(e)}")
            raise

    async def _generate_content(
        self,
        report_type: ReportType,
        metrics: Dict,
        gaps: List[Dict],
        options: Optional[Dict] = None
    ) -> Dict:
        """
        Generate comprehensive report content based on type and data.

        Args:
            report_type: Type of report to generate
            metrics: Collected metrics data
            gaps: Identified gaps and recommendations
            options: Additional content options

        Returns:
            Dictionary containing organized report content
        """
        try:
            content = {
                'metrics': metrics,
                'gaps': gaps,
                'generated_at': datetime.utcnow().isoformat(),
                'options': options or {}
            }

            if report_type == ReportType.EXERCISE_SUMMARY:
                content.update({
                    'performance_summary': self._summarize_performance(metrics),
                    'key_findings': self._extract_key_findings(gaps),
                    'recommendations': self._prioritize_recommendations(gaps)
                })
            elif report_type == ReportType.GAP_ANALYSIS:
                content.update({
                    'gap_categories': self._categorize_gaps(gaps),
                    'trend_analysis': self._analyze_trends(metrics),
                    'improvement_areas': self._identify_improvement_areas(gaps)
                })

            return content

        except Exception as e:
            self._logger.error(f"Error generating content: {str(e)}")
            raise

    def __del__(self):
        """Cleanup resources and connections."""
        try:
            self._template_cache.clear()
            self._jinja_env.cache.clear()
        except Exception as e:
            self._logger.error(f"Error during cleanup: {str(e)}")