"""
Scenario Controller Module

Provides enterprise-grade REST API endpoints for AI-driven scenario generation,
validation, and management with comprehensive error handling and compliance validation.

Version: 1.0.0
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator
import logging
from datetime import datetime
from prometheus_client import Counter, Histogram  # prometheus-client v0.17+

from scenario_service.services.scenario_generator import ScenarioGenerator
from scenario_service.services.scenario_validator import ScenarioValidator
from scenario_service.models.scenario import SCENARIO_TYPES, Scenario
from scenario_service.utils.compliance import validate_compliance_mapping

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Initialize metrics
SCENARIO_REQUESTS = Counter(
    'scenario_generation_requests_total',
    'Total number of scenario generation requests'
)
GENERATION_TIME = Histogram(
    'scenario_generation_duration_seconds',
    'Time spent generating scenarios'
)
VALIDATION_TIME = Histogram(
    'scenario_validation_duration_seconds',
    'Time spent validating scenarios'
)

# Initialize router with prefix and tags
router = APIRouter(
    prefix="/api/v1/scenarios",
    tags=["scenarios"]
)

class ScenarioRequest(BaseModel):
    """Enhanced request model for scenario generation with validation."""
    
    scenario_type: str = Field(..., description="Type of scenario to generate")
    organization_context: Dict[str, Any] = Field(..., description="Organization-specific context")
    compliance_frameworks: List[str] = Field(..., description="Required compliance frameworks")
    complexity_level: Optional[int] = Field(
        default=2,
        ge=1,
        le=5,
        description="Scenario complexity level (1-5)"
    )
    minimum_confidence_score: Optional[float] = Field(
        default=0.85,
        ge=0.0,
        le=1.0,
        description="Minimum AI confidence score"
    )
    type_specific_parameters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Type-specific configuration parameters"
    )

    @validator('scenario_type')
    def validate_scenario_type(cls, v):
        """Validate scenario type against supported types."""
        if v not in SCENARIO_TYPES:
            raise ValueError(f"Invalid scenario type: {v}")
        return v

    @validator('compliance_frameworks')
    def validate_frameworks(cls, v):
        """Validate compliance frameworks."""
        supported_frameworks = ['soc2', 'gdpr', 'hipaa', 'iso27001']
        invalid_frameworks = [f for f in v if f not in supported_frameworks]
        if invalid_frameworks:
            raise ValueError(f"Unsupported compliance frameworks: {invalid_frameworks}")
        return v

@router.post("/generate")
async def generate_scenario(
    request: ScenarioRequest,
    background_tasks: BackgroundTasks,
    confidence_threshold: Optional[float] = Query(0.95, ge=0.0, le=1.0)
) -> Dict[str, Any]:
    """
    Generate a new AI-driven exercise scenario with comprehensive validation.

    Args:
        request: Scenario generation request parameters
        background_tasks: FastAPI background tasks
        confidence_threshold: Minimum confidence threshold for generation

    Returns:
        Dict containing generated scenario and validation results
    """
    generation_start = datetime.utcnow()
    SCENARIO_REQUESTS.inc()

    logger.info(
        f"Generating {request.scenario_type} scenario with "
        f"complexity {request.complexity_level}"
    )

    try:
        # Initialize services
        validator = ScenarioValidator(
            organization_context=request.organization_context
        )
        generator = ScenarioGenerator(
            validator=validator,
            config={
                'confidence_threshold': confidence_threshold,
                'compliance_threshold': 0.95
            }
        )

        # Generate scenario with validation
        with GENERATION_TIME.time():
            scenario, generation_results = await generator.generate_scenario(
                scenario_type=request.scenario_type,
                organization_context=request.organization_context,
                compliance_frameworks=request.compliance_frameworks,
                complexity_level=request.complexity_level
            )

        # Validate generated scenario
        with VALIDATION_TIME.time():
            is_valid, validation_results = validator.validate_scenario(scenario)

        if not is_valid:
            raise HTTPException(
                status_code=422,
                detail={
                    'message': 'Generated scenario failed validation',
                    'validation_results': validation_results
                }
            )

        # Schedule background compliance validation
        background_tasks.add_task(
            validate_compliance_mapping,
            scenario.compliance_mappings,
            request.compliance_frameworks[0],
            validation_level='strict'
        )

        # Calculate metrics
        generation_time = (datetime.utcnow() - generation_start).total_seconds()
        
        response = {
            'scenario': scenario.dict(),
            'validation_results': validation_results,
            'generation_results': generation_results,
            'metadata': {
                'generation_time_seconds': generation_time,
                'compliance_score': validation_results['compliance_score'],
                'ai_confidence': validation_results.get('ai_confidence', 1.0),
                'generated_at': generation_start.isoformat()
            }
        }

        logger.info(
            f"Successfully generated scenario in {generation_time:.2f}s with "
            f"compliance score {validation_results['compliance_score']:.2f}"
        )

        return JSONResponse(
            status_code=201,
            content=response
        )

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail={'message': str(e)}
        )
    except Exception as e:
        logger.error(f"Scenario generation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={'message': 'Internal server error during scenario generation'}
        )

@router.post("/{scenario_id}/validate")
async def validate_scenario(
    scenario_id: str,
    scenario: Scenario,
    compliance_framework: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """
    Validate an existing scenario against compliance requirements.

    Args:
        scenario_id: Unique scenario identifier
        scenario: Scenario data to validate
        compliance_framework: Optional specific framework to validate against

    Returns:
        Dict containing validation results
    """
    validation_start = datetime.utcnow()

    logger.info(f"Validating scenario {scenario_id}")

    try:
        # Initialize validator
        validator = ScenarioValidator(
            organization_context=scenario.organization_context
        )

        # Perform validation
        with VALIDATION_TIME.time():
            is_valid, validation_results = validator.validate_scenario(scenario)

        # Validate specific compliance framework if provided
        if compliance_framework:
            compliance_valid, compliance_results = validator.validate_compliance_requirements(
                scenario,
                compliance_framework
            )
            validation_results['compliance_validation'] = compliance_results

        validation_time = (datetime.utcnow() - validation_start).total_seconds()

        response = {
            'is_valid': is_valid,
            'validation_results': validation_results,
            'metadata': {
                'validation_time_seconds': validation_time,
                'validated_at': validation_start.isoformat()
            }
        }

        logger.info(
            f"Validation completed in {validation_time:.2f}s - "
            f"Valid: {is_valid}"
        )

        return response

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail={'message': str(e)}
        )
    except Exception as e:
        logger.error(f"Validation failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={'message': 'Internal server error during validation'}
        )

@router.post("/{scenario_id}/regenerate")
async def regenerate_injects(
    scenario_id: str,
    scenario: Scenario,
    complexity_level: Optional[int] = Query(None),
    compliance_focus: Optional[List[str]] = Query(None)
) -> Dict[str, Any]:
    """
    Regenerate injects for an existing scenario with enhanced validation.

    Args:
        scenario_id: Unique scenario identifier
        scenario: Existing scenario data
        complexity_level: Optional new complexity level
        compliance_focus: Optional compliance controls to focus on

    Returns:
        Dict containing regenerated scenario with new injects
    """
    regeneration_start = datetime.utcnow()

    logger.info(f"Regenerating injects for scenario {scenario_id}")

    try:
        # Initialize services
        validator = ScenarioValidator(
            organization_context=scenario.organization_context
        )
        generator = ScenarioGenerator(validator=validator)

        # Regenerate injects
        with GENERATION_TIME.time():
            success, new_injects, validation_results = await generator.regenerate_injects(
                scenario,
                complexity_level,
                compliance_focus
            )

        if not success:
            raise HTTPException(
                status_code=422,
                detail={
                    'message': 'Failed to regenerate valid injects',
                    'validation_results': validation_results
                }
            )

        regeneration_time = (datetime.utcnow() - regeneration_start).total_seconds()

        response = {
            'scenario_id': scenario_id,
            'new_injects': [inject.dict() for inject in new_injects],
            'validation_results': validation_results,
            'metadata': {
                'regeneration_time_seconds': regeneration_time,
                'regenerated_at': regeneration_start.isoformat()
            }
        }

        logger.info(
            f"Successfully regenerated injects in {regeneration_time:.2f}s"
        )

        return response

    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(
            status_code=422,
            detail={'message': str(e)}
        )
    except Exception as e:
        logger.error(f"Inject regeneration failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={'message': 'Internal server error during inject regeneration'}
        )