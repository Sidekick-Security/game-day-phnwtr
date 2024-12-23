"""
Scenario Service Utilities Module

This module provides comprehensive functionality for exercise scenario generation,
compliance validation, and template management. It serves as the main entry point
for accessing utility functions and classes used across the scenario service.

Version: 1.0.0
"""

from scenario_service.utils.compliance import (
    ComplianceFramework,
    ComplianceRequirement,
    validate_compliance_mapping,
    get_framework_requirements,
    calculate_compliance_score
)

from scenario_service.utils.templates import (
    ScenarioTemplate,
    load_template,
    customize_template,
    generate_injects,
    validate_template
)

# Define module version
__version__ = '1.0.0'

# Define public API
__all__ = [
    # Compliance Framework Components
    'ComplianceFramework',
    'ComplianceRequirement',
    'validate_compliance_mapping',
    'get_framework_requirements',
    'calculate_compliance_score',
    
    # Template Management Components
    'ScenarioTemplate',
    'load_template',
    'customize_template',
    'generate_injects',
    'validate_template'
]

# Module-level docstrings for key components
ComplianceFramework.__doc__ = """
Enterprise-grade compliance framework implementation supporting multiple standards
including SOC 2, GDPR, HIPAA, and ISO 27001. Provides comprehensive validation
and scoring capabilities.
"""

ComplianceRequirement.__doc__ = """
Detailed data model for compliance requirements with support for validation rules,
evidence requirements, and framework mapping.
"""

ScenarioTemplate.__doc__ = """
Advanced scenario template implementation with AI-driven customization and
compliance validation capabilities. Supports dynamic inject generation and
real-time adaptation.
"""

# Validation function docstrings
validate_compliance_mapping.__doc__ = """
Validates scenario compliance mappings against framework requirements with detailed
reporting and scoring capabilities.

Args:
    scenario_mapping (Dict[str, Any]): Scenario compliance mapping data
    framework_id (str): Target compliance framework identifier
    validation_level (str, optional): Validation strictness level
    detailed_report (bool, optional): Include detailed validation results

Returns:
    Tuple[bool, Dict[str, Any]]: Validation status and detailed results
"""

load_template.__doc__ = """
Loads and validates scenario templates with enhanced error handling and compliance
validation.

Args:
    template_type (str): Type of scenario template
    template_name (str): Name of the template to load
    strict_mode (bool, optional): Enable strict validation mode

Returns:
    ScenarioTemplate: Validated scenario template instance
"""

customize_template.__doc__ = """
Customizes scenario templates with organization context and AI-driven enhancements.

Args:
    template (ScenarioTemplate): Base scenario template
    organization_context (Dict[str, Any]): Organization-specific context
    custom_vars (Dict[str, Any], optional): Custom template variables
    ai_context (Dict[str, Any], optional): AI enhancement context

Returns:
    ScenarioData: Customized scenario data
"""

generate_injects.__doc__ = """
Generates dynamic scenario injects with AI assistance and compliance alignment.

Args:
    template (ScenarioTemplate): Scenario template
    context (Dict[str, Any]): Generation context
    compliance_framework (str, optional): Target compliance framework

Returns:
    List[Dict[str, Any]]: Generated scenario injects
"""

validate_template.__doc__ = """
Performs comprehensive template validation with compliance scoring.

Args:
    template (ScenarioTemplate): Template to validate
    strict_mode (bool, optional): Enable strict validation
    compliance_threshold (float, optional): Minimum compliance score

Returns:
    Tuple[bool, Dict[str, Any]]: Validation status and results
"""