"""
Analytics service models package providing centralized access to MongoDB document models 
for metrics, gaps, and reports.

This module exports the core data models used throughout the analytics service for storing
and analyzing exercise data, performance metrics, identified gaps, and comprehensive reports.

Version: 1.0.0
"""

from typing import List, Type

# Import core document models
from .gap import GapModel, GapType, GapSeverity, GapStatus  # version: 0.27+
from .metric import MetricModel  # version: 0.24.0
from .report import ReportModel, ReportType, ReportStatus  # version: 0.27+

# Define explicit exports for better IDE support and documentation
__all__: List[str] = [
    # Core document models
    'GapModel',
    'MetricModel', 
    'ReportModel',
    
    # Enums and types
    'GapType',
    'GapSeverity',
    'GapStatus',
    'ReportType',
    'ReportStatus'
]

# Type aliases for enhanced type checking
GapModelType = Type[GapModel]
MetricModelType = Type[MetricModel]
ReportModelType = Type[ReportModel]

# Module metadata
__version__ = '1.0.0'
__author__ = 'GameDay Platform Team'
__maintainer__ = 'Analytics Service Team'

# Verify all models are properly initialized
def _validate_models() -> bool:
    """
    Internal validation to ensure all models are properly initialized.
    
    Returns:
        bool: True if all models are valid
    
    Raises:
        ImportError: If any required model is not properly initialized
    """
    required_models = [GapModel, MetricModel, ReportModel]
    for model in required_models:
        if not hasattr(model, '_meta'):
            raise ImportError(f"Model {model.__name__} not properly initialized")
    return True

# Perform model validation on import
_validate_models()