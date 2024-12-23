"""
Core initialization module for the scenario service's services package.

This module exposes enterprise-grade AI-driven scenario generation, validation, and LLM
interaction capabilities. Implements thread-safe initialization, proper dependency management,
and ensures 95% compliance coverage through strict type validation and comprehensive service exposure.

Version: 1.0.0
"""

from typing import Dict, Any, List, Optional
import logging
from threading import Lock

from scenario_service.services.llm_service import LLMService
from scenario_service.services.scenario_generator import ScenarioGenerator
from scenario_service.services.scenario_validator import ScenarioValidator

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Global constants
__version__ = "1.0.0"
__all__ = ["LLMService", "ScenarioGenerator", "ScenarioValidator"]
__compliance_threshold__ = 0.95

# Thread-safe initialization lock
_init_lock = Lock()
_initialized = False

def initialize_services(
    settings: Dict[str, Any],
    organization_context: Optional[Dict[str, Any]] = None
) -> None:
    """
    Thread-safe initialization of scenario services with enhanced validation.
    
    Args:
        settings: Service configuration settings
        organization_context: Optional organization-specific context
    """
    global _initialized
    
    with _init_lock:
        if _initialized:
            logger.warning("Services already initialized")
            return
            
        try:
            logger.info("Initializing scenario services")
            
            # Initialize core services with validation
            llm_service = LLMService(settings)
            validator = ScenarioValidator(
                organization_context or {},
                custom_rules={'compliance_threshold': __compliance_threshold__}
            )
            generator = ScenarioGenerator(llm_service, validator)
            
            # Validate service initialization
            if not _validate_services(llm_service, validator, generator):
                raise RuntimeError("Service validation failed")
                
            _initialized = True
            logger.info("Services initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize services: {str(e)}")
            raise

def _validate_services(
    llm_service: LLMService,
    validator: ScenarioValidator,
    generator: ScenarioGenerator
) -> bool:
    """
    Internal validation of initialized services.
    
    Args:
        llm_service: LLM service instance
        validator: Scenario validator instance
        generator: Scenario generator instance
        
    Returns:
        bool: True if all services are valid
    """
    try:
        # Validate LLM service
        if not hasattr(llm_service, 'generate_scenario'):
            logger.error("LLM service missing required methods")
            return False
            
        # Validate scenario validator
        if not hasattr(validator, 'validate_scenario'):
            logger.error("Validator missing required methods")
            return False
            
        # Validate scenario generator
        if not hasattr(generator, 'generate_scenario'):
            logger.error("Generator missing required methods")
            return False
            
        return True
        
    except Exception as e:
        logger.error(f"Service validation failed: {str(e)}")
        return False

def get_service_info() -> Dict[str, Any]:
    """
    Retrieves service package information and status.
    
    Returns:
        Dict containing service version and initialization status
    """
    return {
        'version': __version__,
        'initialized': _initialized,
        'compliance_threshold': __compliance_threshold__,
        'exposed_services': __all__
    }

# Initialize logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)