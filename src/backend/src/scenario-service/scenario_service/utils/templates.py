"""
Advanced Template Management Module

This module provides comprehensive functionality for managing exercise scenario templates
with AI-driven customization, compliance validation, and dynamic inject generation capabilities.
Implements enterprise-grade template loading, validation, and rendering with strict compliance
framework alignment.

Version: 1.0.0
"""

from typing import Dict, List, Optional, Any, TypedDict, Tuple, Union
from pydantic import BaseModel, Field, validator
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape, Template
import logging
from datetime import datetime
from pathlib import Path

from scenario_service.utils.compliance import (
    ComplianceFramework,
    validate_compliance_mapping
)

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Global Constants
TEMPLATE_PATHS: Dict[str, str] = {
    'security_incident': 'templates/security/',
    'business_continuity': 'templates/bc/',
    'compliance_validation': 'templates/compliance/',
    'crisis_management': 'templates/crisis/',
    'technical_recovery': 'templates/recovery/'
}

DEFAULT_TEMPLATE_VARS: Dict[str, Any] = {
    'min_injects': 3,
    'max_injects': 10,
    'default_complexity': 2,
    'ai_assistance': True,
    'compliance_threshold': 0.95
}

# Type Definitions
class InjectTemplate(TypedDict):
    """Type definition for inject templates with AI support."""
    id: str
    title: str
    description: str
    type: str
    variables: Dict[str, Any]
    content: str
    ai_prompts: Optional[Dict[str, str]]
    compliance_controls: List[str]

class ScenarioData(TypedDict):
    """Type definition for rendered scenario data with validation."""
    id: str
    title: str
    description: str
    type: str
    injects: List[InjectTemplate]
    compliance_mappings: Dict[str, Any]
    metadata: Dict[str, Any]
    ai_context: Optional[Dict[str, Any]]
    validation_score: float

class ScenarioTemplate(BaseModel):
    """Enhanced data model representing a scenario template with AI-driven customization
    and strict compliance validation capabilities."""
    
    template_id: str = Field(..., description="Unique identifier for the template")
    name: str = Field(..., description="Template name")
    type: str = Field(..., description="Template type")
    description: str = Field(..., description="Template description")
    variables: Dict[str, Any] = Field(..., description="Template variables")
    compliance_mappings: Dict[str, Any] = Field(..., description="Compliance framework mappings")
    inject_templates: List[InjectTemplate] = Field(..., description="List of inject templates")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Template metadata")
    ai_prompts: Optional[Dict[str, str]] = Field(default=None, description="AI enhancement prompts")
    compliance_score: float = Field(default=0.0, description="Compliance validation score")

    @validator('type')
    def validate_template_type(cls, v):
        """Validate template type against supported types."""
        if v not in TEMPLATE_PATHS:
            raise ValueError(f"Unsupported template type: {v}")
        return v

    def render(
        self,
        custom_vars: Dict[str, Any],
        ai_context: Optional[Dict[str, Any]] = None
    ) -> ScenarioData:
        """Renders the template with provided variables and AI enhancements."""
        logger.info(f"Rendering template {self.template_id} with custom variables")

        # Initialize Jinja2 environment with security measures
        env = Environment(
            loader=FileSystemLoader(TEMPLATE_PATHS[self.type]),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True
        )

        # Merge and validate variables
        template_vars = {**DEFAULT_TEMPLATE_VARS, **self.variables, **custom_vars}
        
        # Process AI context if provided
        if ai_context and self.ai_prompts:
            template_vars['ai_enhanced'] = True
            template_vars['ai_context'] = ai_context
        
        # Render and validate injects
        rendered_injects: List[InjectTemplate] = []
        for inject in self.inject_templates:
            try:
                rendered_inject = self._render_inject(env, inject, template_vars)
                rendered_injects.append(rendered_inject)
            except Exception as e:
                logger.error(f"Failed to render inject {inject['id']}: {str(e)}")
                raise

        # Validate compliance mappings
        is_compliant, validation_results = validate_compliance_mapping(
            self.compliance_mappings,
            framework_id=self.metadata.get('compliance_framework', 'soc2'),
            validation_level='strict'
        )

        if not is_compliant:
            logger.warning(
                f"Template {self.template_id} failed compliance validation: "
                f"Score {validation_results['summary']['overall_score']:.2f}"
            )

        # Prepare scenario data
        scenario_data: ScenarioData = {
            'id': self.template_id,
            'title': self.name,
            'description': self.description,
            'type': self.type,
            'injects': rendered_injects,
            'compliance_mappings': validation_results,
            'metadata': {
                **self.metadata,
                'rendered_at': datetime.utcnow().isoformat(),
                'template_version': self.metadata.get('version', '1.0.0')
            },
            'ai_context': ai_context if ai_context else None,
            'validation_score': validation_results['summary']['overall_score']
        }

        return scenario_data

    def _render_inject(
        self,
        env: Environment,
        inject: InjectTemplate,
        variables: Dict[str, Any]
    ) -> InjectTemplate:
        """Internal method to render individual inject templates."""
        template = Template(inject['content'], environment=env)
        rendered_content = template.render(**variables)
        
        return {
            **inject,
            'content': rendered_content,
            'variables': {
                k: v for k, v in variables.items()
                if k in inject['variables']
            }
        }

def load_template(
    template_type: str,
    template_name: str,
    strict_mode: Optional[bool] = True
) -> ScenarioTemplate:
    """Loads and validates a scenario template with enhanced error handling."""
    logger.info(f"Loading template: {template_name} of type: {template_type}")

    if template_type not in TEMPLATE_PATHS:
        raise ValueError(f"Unsupported template type: {template_type}")

    template_path = Path(TEMPLATE_PATHS[template_type]) / f"{template_name}.yaml"
    
    try:
        with open(template_path, 'r') as f:
            template_data = yaml.safe_load(f)
    except Exception as e:
        logger.error(f"Failed to load template {template_name}: {str(e)}")
        raise

    # Validate and create template instance
    try:
        template = ScenarioTemplate(
            **template_data,
            metadata={
                'loaded_at': datetime.utcnow().isoformat(),
                'strict_mode': strict_mode
            }
        )
    except Exception as e:
        logger.error(f"Template validation failed: {str(e)}")
        raise

    return template

def customize_template(
    template: ScenarioTemplate,
    organization_context: Dict[str, Any],
    custom_vars: Optional[Dict[str, Any]] = None,
    ai_context: Optional[Dict[str, Any]] = None
) -> ScenarioData:
    """Customizes a template with organization context and AI enhancement."""
    logger.info(f"Customizing template {template.template_id} for organization")

    # Validate organization context
    required_fields = ['industry', 'size', 'region']
    missing_fields = [f for f in required_fields if f not in organization_context]
    if missing_fields:
        raise ValueError(f"Missing required organization context: {missing_fields}")

    # Merge custom variables
    template_vars = {
        **DEFAULT_TEMPLATE_VARS,
        **organization_context,
        **(custom_vars or {})
    }

    # Render template with customizations
    try:
        scenario_data = template.render(
            custom_vars=template_vars,
            ai_context=ai_context
        )
    except Exception as e:
        logger.error(f"Template customization failed: {str(e)}")
        raise

    return scenario_data

def validate_template(
    template: ScenarioTemplate,
    strict_mode: Optional[bool] = True,
    compliance_threshold: Optional[float] = DEFAULT_TEMPLATE_VARS['compliance_threshold']
) -> Tuple[bool, Dict[str, Any]]:
    """Performs comprehensive template validation with compliance scoring."""
    logger.info(f"Validating template {template.template_id}")

    validation_results = {
        'timestamp': datetime.utcnow().isoformat(),
        'template_id': template.template_id,
        'issues': [],
        'compliance_score': 0.0,
        'is_valid': False
    }

    # Validate basic structure
    if not template.inject_templates:
        validation_results['issues'].append("No inject templates defined")

    if not template.compliance_mappings:
        validation_results['issues'].append("Missing compliance mappings")

    # Validate compliance requirements
    try:
        is_compliant, compliance_results = validate_compliance_mapping(
            template.compliance_mappings,
            framework_id=template.metadata.get('compliance_framework', 'soc2'),
            validation_level='strict' if strict_mode else 'standard'
        )
        validation_results['compliance_score'] = compliance_results['summary']['overall_score']
        
        if not is_compliant:
            validation_results['issues'].append(
                f"Compliance score {validation_results['compliance_score']:.2f} "
                f"below threshold {compliance_threshold}"
            )
    except Exception as e:
        validation_results['issues'].append(f"Compliance validation failed: {str(e)}")

    # Validate AI prompts if present
    if template.ai_prompts:
        if not all(isinstance(v, str) for v in template.ai_prompts.values()):
            validation_results['issues'].append("Invalid AI prompt format")

    validation_results['is_valid'] = (
        len(validation_results['issues']) == 0 and
        validation_results['compliance_score'] >= compliance_threshold
    )

    return validation_results['is_valid'], validation_results