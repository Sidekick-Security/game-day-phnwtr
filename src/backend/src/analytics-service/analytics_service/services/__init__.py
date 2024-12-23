"""
Analytics Service Business Logic Layer Entry Point

Provides comprehensive analytics capabilities including real-time gap analysis,
metric processing, and report generation. Implements a facade pattern for simplified
access to analytics services while ensuring proper initialization and monitoring.

Version: 1.0.0
"""

# External imports with versions
import logging  # version: 3.11+
from opentelemetry import trace  # version: 1.20.0
from typing import Dict, Any, Optional
from datetime import datetime

# Internal imports
from .gap_analyzer import GapAnalyzer
from .metric_processor import MetricProcessor
from .report_generator import ReportGenerator

# Module version
__version__ = "1.0.0"

# Define public exports
__all__ = ["GapAnalyzer", "MetricProcessor", "ReportGenerator", "initialize_services"]

# Configure module-level logger
logger = logging.getLogger(__name__)

# Initialize OpenTelemetry tracer
tracer = trace.get_tracer(__name__)

@tracer.start_as_current_span("initialize_services")
def initialize_services(config: Dict[str, Any]) -> bool:
    """
    Initialize analytics services with proper configuration and monitoring.
    
    Performs comprehensive initialization of all analytics service components
    including gap analysis, metric processing, and report generation capabilities.
    
    Args:
        config: Service configuration dictionary containing all required parameters
        
    Returns:
        bool: True if initialization successful, False otherwise
        
    Raises:
        ValueError: If required configuration parameters are missing
        RuntimeError: If service initialization fails
    """
    try:
        logger.info("Initializing analytics services...")
        
        # Validate required configuration
        required_configs = [
            'metrics', 'database', 'service', 'logger',
            'template_path', 'aws_region', 's3_bucket'
        ]
        
        for required in required_configs:
            if required not in config:
                raise ValueError(f"Missing required configuration: {required}")
        
        # Initialize metric processor first as it's a dependency
        logger.debug("Initializing MetricProcessor...")
        metric_processor = MetricProcessor()
        
        # Initialize gap analyzer with metric processor dependency
        logger.debug("Initializing GapAnalyzer...")
        gap_analyzer = GapAnalyzer(
            metric_processor=metric_processor,
            ml_config=config.get('ml_config'),
            cache_config=config.get('cache_config')
        )
        
        # Initialize report generator with all dependencies
        logger.debug("Initializing ReportGenerator...")
        report_generator = ReportGenerator(
            gap_analyzer=gap_analyzer,
            metric_processor=metric_processor,
            config={
                'template_path': config['template_path'],
                'aws_region': config['aws_region'],
                's3_bucket': config['s3_bucket']
            }
        )
        
        # Verify service health
        logger.info("Verifying service health...")
        health_checks = [
            metric_processor is not None,
            gap_analyzer is not None,
            report_generator is not None
        ]
        
        if not all(health_checks):
            raise RuntimeError("Service health check failed")
        
        # Log successful initialization with service versions
        logger.info(
            "Analytics services initialized successfully",
            extra={
                'service_versions': {
                    'analytics_service': __version__,
                    'metric_processor': getattr(metric_processor, '__version__', 'unknown'),
                    'gap_analyzer': getattr(gap_analyzer, '__version__', 'unknown'),
                    'report_generator': getattr(report_generator, '__version__', 'unknown')
                },
                'initialization_time': datetime.utcnow().isoformat()
            }
        )
        
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize analytics services: {str(e)}")
        # Re-raise exception for proper error handling
        raise RuntimeError(f"Analytics services initialization failed: {str(e)}")