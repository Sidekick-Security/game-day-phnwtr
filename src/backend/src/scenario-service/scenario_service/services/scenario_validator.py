"""
Scenario Validator Service Module

This module provides comprehensive validation services for exercise scenarios,
ensuring compliance with frameworks, business rules, and organizational requirements.
Implements strict validation logic with enhanced support for AI-generated content
and 95% compliance mapping threshold.

Version: 1.0.0
"""

from typing import Dict, List, Optional, Any, Tuple
from pydantic import BaseModel
import logging
from datetime import datetime

from scenario_service.models.scenario import (
    Scenario,
    Inject,
    SCENARIO_TYPES
)
from scenario_service.utils.compliance import (
    ComplianceFramework,
    validate_compliance_mapping,
    calculate_compliance_score
)
from scenario_service.utils.templates import (
    ScenarioTemplate,
    validate_template
)

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Global validation rules
VALIDATION_RULES: Dict[str, Dict[str, Any]] = {
    'min_injects': 3,
    'max_injects': 10,
    'min_duration': 30,
    'max_duration': 240,
    'compliance_threshold': 0.95,
    'ai_content_confidence': 0.85,
    'max_complexity_level': 5
}

SEVERITY_LEVELS: Dict[str, int] = {
    'critical': 3,
    'high': 2,
    'medium': 1,
    'low': 0
}

class ScenarioValidator:
    """Enhanced validator class for exercise scenarios with AI content and compliance validation."""

    def __init__(
        self,
        organization_context: Dict[str, Any],
        custom_rules: Optional[Dict[str, Any]] = None
    ):
        """Initialize the scenario validator with organization context and enhanced validation rules."""
        self._logger = logging.getLogger(f"{__name__}.ScenarioValidator")
        self._logger.info("Initializing ScenarioValidator with organization context")

        self._organization_context = organization_context
        self._validation_rules = {**VALIDATION_RULES, **(custom_rules or {})}
        self._compliance_cache: Dict[str, Any] = {}

        # Validate organization context
        required_fields = ['industry', 'size', 'region', 'compliance_frameworks']
        missing_fields = [f for f in required_fields if f not in organization_context]
        if missing_fields:
            raise ValueError(f"Missing required organization context: {missing_fields}")

    def validate_scenario(self, scenario: Scenario) -> Tuple[bool, Dict[str, Any]]:
        """Validates a complete scenario against all rules including AI content and compliance."""
        validation_start = datetime.utcnow()
        self._logger.info(f"Starting comprehensive validation for scenario {scenario.id}")

        validation_result = {
            'timestamp': validation_start.isoformat(),
            'scenario_id': scenario.id,
            'is_valid': False,
            'validation_details': {},
            'compliance_score': 0.0,
            'ai_confidence': 0.0,
            'issues': []
        }

        try:
            # Basic structure validation
            if not self._validate_basic_structure(scenario, validation_result):
                return False, validation_result

            # Scenario type and complexity validation
            type_valid, type_msg = validate_scenario_type(
                scenario.type,
                self._organization_context
            )
            if not type_valid:
                validation_result['issues'].append(f"Invalid scenario type: {type_msg}")

            complexity_valid, complexity_msg = validate_scenario_complexity(
                scenario.complexity_level,
                self._organization_context
            )
            if not complexity_valid:
                validation_result['issues'].append(
                    f"Invalid complexity level: {complexity_msg}"
                )

            # Inject validation
            injects_valid, inject_results = self.validate_injects(scenario.injects)
            validation_result['validation_details']['injects'] = inject_results
            if not injects_valid:
                validation_result['issues'].extend(
                    inject_results.get('issues', [])
                )

            # Compliance validation
            compliance_valid, compliance_results = self.validate_compliance_requirements(
                scenario,
                self._organization_context.get('primary_framework')
            )
            validation_result['validation_details']['compliance'] = compliance_results
            validation_result['compliance_score'] = compliance_results['summary']['overall_score']

            if not compliance_valid:
                validation_result['issues'].append(
                    f"Compliance score {validation_result['compliance_score']:.2f} "
                    f"below required threshold {self._validation_rules['compliance_threshold']}"
                )

            # AI content validation
            if scenario.metadata.get('ai_generated'):
                ai_confidence = self._validate_ai_content(scenario)
                validation_result['ai_confidence'] = ai_confidence
                if ai_confidence < self._validation_rules['ai_content_confidence']:
                    validation_result['issues'].append(
                        f"AI content confidence {ai_confidence:.2f} "
                        f"below threshold {self._validation_rules['ai_content_confidence']}"
                    )

            # Final validation status
            validation_result['is_valid'] = (
                len(validation_result['issues']) == 0 and
                validation_result['compliance_score'] >= self._validation_rules['compliance_threshold'] and
                (not scenario.metadata.get('ai_generated') or 
                 validation_result['ai_confidence'] >= self._validation_rules['ai_content_confidence'])
            )

        except Exception as e:
            self._logger.error(f"Validation failed with error: {str(e)}")
            validation_result['issues'].append(f"Validation error: {str(e)}")
            validation_result['is_valid'] = False

        # Record validation duration
        validation_duration = (datetime.utcnow() - validation_start).total_seconds()
        validation_result['validation_duration'] = validation_duration
        self._logger.info(
            f"Validation completed in {validation_duration:.2f}s - "
            f"Valid: {validation_result['is_valid']}"
        )

        return validation_result['is_valid'], validation_result

    def validate_injects(self, injects: List[Inject]) -> Tuple[bool, Dict[str, Any]]:
        """Enhanced validation of scenario injects including AI content quality."""
        self._logger.info(f"Validating {len(injects)} injects")

        validation_result = {
            'is_valid': False,
            'inject_count': len(injects),
            'inject_details': {},
            'timeline_valid': False,
            'issues': []
        }

        if not self._validation_rules['min_injects'] <= len(injects) <= self._validation_rules['max_injects']:
            validation_result['issues'].append(
                f"Invalid inject count: {len(injects)}. "
                f"Expected between {self._validation_rules['min_injects']} "
                f"and {self._validation_rules['max_injects']}"
            )
            return False, validation_result

        # Validate individual injects
        total_duration = 0
        sequence_numbers = set()
        
        for inject in injects:
            inject_validation = self._validate_single_inject(inject)
            validation_result['inject_details'][inject.id] = inject_validation
            
            if not inject_validation['is_valid']:
                validation_result['issues'].extend(inject_validation['issues'])
            
            total_duration += inject.delay_minutes
            
            if inject.sequence_number in sequence_numbers:
                validation_result['issues'].append(
                    f"Duplicate sequence number: {inject.sequence_number}"
                )
            sequence_numbers.add(inject.sequence_number)

        # Validate timeline
        if total_duration < self._validation_rules['min_duration']:
            validation_result['issues'].append(
                f"Total duration {total_duration}min below minimum "
                f"{self._validation_rules['min_duration']}min"
            )
        elif total_duration > self._validation_rules['max_duration']:
            validation_result['issues'].append(
                f"Total duration {total_duration}min exceeds maximum "
                f"{self._validation_rules['max_duration']}min"
            )
        else:
            validation_result['timeline_valid'] = True

        validation_result['is_valid'] = (
            len(validation_result['issues']) == 0 and
            validation_result['timeline_valid']
        )

        return validation_result['is_valid'], validation_result

    def validate_compliance_requirements(
        self,
        scenario: Scenario,
        framework_id: Optional[str] = None
    ) -> Tuple[bool, Dict[str, Any]]:
        """Enhanced compliance validation ensuring 95% framework coverage."""
        self._logger.info(f"Validating compliance requirements for scenario {scenario.id}")

        # Use cached results if available
        cache_key = f"{scenario.id}:{framework_id}"
        if cache_key in self._compliance_cache:
            return self._compliance_cache[cache_key]

        try:
            # Validate compliance mappings
            is_compliant, validation_results = validate_compliance_mapping(
                scenario.compliance_mappings,
                framework_id or self._organization_context.get('primary_framework', 'soc2'),
                validation_level='strict',
                detailed_report=True
            )

            # Calculate detailed compliance score
            score_details = calculate_compliance_score(
                validation_results,
                framework_id or self._organization_context.get('primary_framework', 'soc2'),
                include_evidence_score=True
            )

            validation_results['score_details'] = score_details
            validation_results['threshold'] = self._validation_rules['compliance_threshold']
            validation_results['is_compliant'] = (
                score_details['overall_score'] >= 
                self._validation_rules['compliance_threshold']
            )

            # Cache results
            self._compliance_cache[cache_key] = (
                validation_results['is_compliant'],
                validation_results
            )

            return validation_results['is_compliant'], validation_results

        except Exception as e:
            self._logger.error(f"Compliance validation failed: {str(e)}")
            return False, {
                'error': str(e),
                'is_compliant': False,
                'summary': {'overall_score': 0.0}
            }

    def _validate_basic_structure(
        self,
        scenario: Scenario,
        validation_result: Dict[str, Any]
    ) -> bool:
        """Internal method to validate basic scenario structure."""
        if not scenario.title or len(scenario.title) < 5:
            validation_result['issues'].append("Invalid scenario title")
            return False

        if not scenario.description or len(scenario.description) < 20:
            validation_result['issues'].append("Invalid scenario description")
            return False

        if not scenario.organization_context:
            validation_result['issues'].append("Missing organization context")
            return False

        return True

    def _validate_single_inject(self, inject: Inject) -> Dict[str, Any]:
        """Internal method to validate a single inject."""
        validation_result = {
            'is_valid': True,
            'issues': []
        }

        # Validate basic fields
        if not inject.title or len(inject.title) < 5:
            validation_result['issues'].append(f"Invalid inject title: {inject.id}")
            validation_result['is_valid'] = False

        if not inject.description or len(inject.description) < 20:
            validation_result['issues'].append(f"Invalid inject description: {inject.id}")
            validation_result['is_valid'] = False

        # Validate content structure
        required_content_fields = ['message', 'expected_response', 'success_criteria']
        missing_fields = [
            f for f in required_content_fields 
            if f not in inject.content
        ]
        if missing_fields:
            validation_result['issues'].append(
                f"Missing required content fields in inject {inject.id}: {missing_fields}"
            )
            validation_result['is_valid'] = False

        return validation_result

    def _validate_ai_content(self, scenario: Scenario) -> float:
        """Internal method to validate AI-generated content quality."""
        if not scenario.metadata.get('ai_generated'):
            return 1.0

        confidence_scores = []
        
        # Validate scenario description
        if scenario.metadata.get('ai_description_score'):
            confidence_scores.append(scenario.metadata['ai_description_score'])

        # Validate inject content
        for inject in scenario.injects:
            if inject.metadata.get('ai_content_score'):
                confidence_scores.append(inject.metadata['ai_content_score'])

        return sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0

def validate_scenario_type(
    scenario_type: str,
    organization_context: Dict[str, Any]
) -> Tuple[bool, str]:
    """Validates scenario type with enhanced AI content considerations."""
    if scenario_type not in SCENARIO_TYPES:
        return False, f"Unsupported scenario type: {scenario_type}"

    org_capabilities = organization_context.get('scenario_capabilities', {})
    if scenario_type not in org_capabilities:
        return False, f"Organization not configured for scenario type: {scenario_type}"

    return True, "Valid scenario type"

def validate_scenario_complexity(
    complexity_level: int,
    organization_context: Dict[str, Any]
) -> Tuple[bool, str]:
    """Enhanced validation of scenario complexity with AI considerations."""
    max_complexity = organization_context.get('max_complexity', VALIDATION_RULES['max_complexity_level'])
    
    if not 1 <= complexity_level <= max_complexity:
        return False, f"Complexity level {complexity_level} outside valid range (1-{max_complexity})"

    return True, "Valid complexity level"