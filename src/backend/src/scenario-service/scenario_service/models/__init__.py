"""
Scenario Service Models Package

This package provides core data models for the GameDay Platform's scenario service,
implementing enterprise-grade exercise scenario management with comprehensive validation
and type safety.

Version: 1.0.0
"""

from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from scenario_service.models.scenario import Scenario, Inject

# Configure package-level logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Define package version
__version__ = '1.0.0'

# Define public API
__all__ = ['Scenario', 'Inject']

def _validate_imports() -> bool:
    """
    Validates that all required model classes are properly imported and initialized.
    Used during package initialization to ensure integrity of the models package.

    Returns:
        bool: True if all imports are valid, raises ImportError otherwise
    """
    try:
        # Validate Scenario class
        required_scenario_attrs = [
            'id', 'title', 'description', 'type', 'complexity_level',
            'duration_minutes', 'injects', 'compliance_mappings',
            'organization_context'
        ]
        for attr in required_scenario_attrs:
            if not hasattr(Scenario, attr):
                raise ImportError(f"Scenario class missing required attribute: {attr}")

        # Validate Inject class
        required_inject_attrs = [
            'id', 'title', 'description', 'type', 'sequence_number',
            'delay_minutes', 'content'
        ]
        for attr in required_inject_attrs:
            if not hasattr(Inject, attr):
                raise ImportError(f"Inject class missing required attribute: {attr}")

        # Validate class methods
        required_scenario_methods = [
            'add_inject', 'validate_compliance', 'generate_timeline'
        ]
        for method in required_scenario_methods:
            if not hasattr(Scenario, method):
                raise ImportError(f"Scenario class missing required method: {method}")

        logger.info("Model imports validated successfully")
        return True

    except Exception as e:
        logger.error(f"Model import validation failed: {str(e)}")
        raise ImportError(f"Failed to validate model imports: {str(e)}")

# Validate imports on package initialization
_validate_imports()

# Package initialization timestamp
logger.info(
    f"Scenario service models package initialized at "
    f"{datetime.utcnow().isoformat()}"
)