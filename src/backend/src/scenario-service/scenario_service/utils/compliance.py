"""
Compliance Framework Validation Module

This module provides comprehensive compliance framework definitions, validation functions,
and scoring mechanisms for exercise scenarios. Implements enterprise-grade validation logic
with weighted scoring, detailed audit trails, and support for multiple regulatory frameworks.

Version: 1.0.0
"""

from typing import Dict, Any, List, Optional, Tuple
from pydantic import BaseModel, Field, validator
import logging
from datetime import datetime

# Configure logging for compliance operations
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Global Constants
COMPLIANCE_FRAMEWORKS: Dict[str, Dict[str, Any]] = {
    'soc2': {
        'name': 'SOC 2',
        'version': '2017',
        'controls': {
            'cc1': {
                'name': 'CC1.0',
                'description': 'Common Criteria Related to Organization and Management',
                'requirements': [
                    'cc1.1: Demonstrate commitment to integrity and ethical values',
                    'cc1.2: Exercise oversight responsibility',
                    'cc1.3: Establish structure, authority, and responsibility',
                    'cc1.4: Demonstrate commitment to competence'
                ],
                'severity': 'critical'
            }
            # Additional controls would be defined here
        }
    },
    'gdpr': {
        'name': 'GDPR',
        'version': '2018',
        'controls': {
            'art5': {
                'name': 'Article 5',
                'description': 'Principles relating to processing of personal data',
                'requirements': [
                    'art5.1.a: Lawfulness, fairness and transparency',
                    'art5.1.b: Purpose limitation',
                    'art5.1.c: Data minimisation'
                ],
                'severity': 'critical'
            }
            # Additional controls would be defined here
        }
    }
    # Additional frameworks would be defined here
}

COMPLIANCE_THRESHOLD: float = 0.95
CONTROL_WEIGHTS: Dict[str, float] = {
    'critical': 1.0,
    'high': 0.8,
    'medium': 0.6,
    'low': 0.4
}

VALIDATION_LEVELS: Dict[str, Dict[str, Any]] = {
    'strict': {
        'threshold': 0.95,
        'require_evidence': True
    },
    'standard': {
        'threshold': 0.85,
        'require_evidence': False
    }
}

class ComplianceFramework(BaseModel):
    """Comprehensive data model representing a compliance framework with its controls,
    requirements, and validation logic."""
    
    id: str = Field(..., description="Unique identifier for the compliance framework")
    name: str = Field(..., description="Name of the compliance framework")
    version: str = Field(..., description="Version of the compliance framework")
    controls: Dict[str, Any] = Field(..., description="Framework controls and requirements")
    control_weights: Dict[str, float] = Field(default_factory=lambda: CONTROL_WEIGHTS)
    minimum_score: float = Field(default=COMPLIANCE_THRESHOLD)
    validation_rules: Dict[str, Any] = Field(default_factory=dict)
    metadata: Optional[Dict[str, Any]] = Field(default=None)

    @validator('id')
    def validate_framework_id(cls, v):
        """Validate framework ID against supported frameworks."""
        if v.lower() not in COMPLIANCE_FRAMEWORKS:
            raise ValueError(f"Unsupported compliance framework: {v}")
        return v.lower()

    def validate_control(
        self, 
        control_id: str, 
        implementation: Dict[str, Any],
        validation_level: Optional[str] = 'standard'
    ) -> Tuple[bool, float, Dict[str, Any]]:
        """Validates a specific control implementation against framework requirements."""
        
        logger.info(f"Validating control {control_id} for framework {self.id}")
        
        if control_id not in self.controls:
            raise ValueError(f"Invalid control ID: {control_id}")

        validation_context = {
            'timestamp': datetime.utcnow().isoformat(),
            'framework': self.id,
            'control': control_id,
            'level': validation_level
        }

        control = self.controls[control_id]
        validation_rules = self.validation_rules.get(control_id, [])
        level_config = VALIDATION_LEVELS[validation_level]

        # Validate implementation against requirements
        findings = []
        total_score = 0.0
        requirements_met = 0

        for requirement in control['requirements']:
            requirement_score = self._validate_requirement(
                requirement,
                implementation,
                level_config
            )
            total_score += requirement_score
            if requirement_score >= level_config['threshold']:
                requirements_met += 1
            findings.append({
                'requirement': requirement,
                'score': requirement_score,
                'evidence': implementation.get('evidence', {}).get(requirement, None)
            })

        # Calculate final control score
        control_score = total_score / len(control['requirements'])
        is_compliant = control_score >= level_config['threshold']

        validation_result = {
            'context': validation_context,
            'score': control_score,
            'findings': findings,
            'requirements_met': requirements_met,
            'total_requirements': len(control['requirements']),
            'is_compliant': is_compliant
        }

        logger.info(
            f"Control validation completed - Score: {control_score:.2f}, "
            f"Compliant: {is_compliant}"
        )

        return is_compliant, control_score, validation_result

    def _validate_requirement(
        self,
        requirement: str,
        implementation: Dict[str, Any],
        level_config: Dict[str, Any]
    ) -> float:
        """Internal method to validate individual requirements."""
        if not implementation.get('controls', {}).get(requirement):
            return 0.0

        score = 0.0
        implementation_data = implementation['controls'][requirement]

        # Validate implementation completeness
        if implementation_data.get('description'):
            score += 0.4

        # Validate evidence if required
        if level_config['require_evidence']:
            if implementation_data.get('evidence'):
                score += 0.3
            if implementation_data.get('artifacts'):
                score += 0.3
        else:
            score += 0.6

        return score

class ComplianceRequirement(BaseModel):
    """Detailed data model for individual compliance requirements with validation rules."""
    
    id: str = Field(..., description="Unique identifier for the requirement")
    framework_id: str = Field(..., description="Associated framework identifier")
    control_id: str = Field(..., description="Associated control identifier")
    description: str = Field(..., description="Detailed requirement description")
    severity: str = Field(..., description="Requirement severity level")
    validation_rules: List[str] = Field(..., description="Validation rules for the requirement")
    metadata: Optional[Dict[str, Any]] = Field(default=None)
    dependencies: Optional[List[str]] = Field(default_factory=list)
    evidence_requirements: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @validator('severity')
    def validate_severity(cls, v):
        """Validate severity level against allowed values."""
        if v.lower() not in CONTROL_WEIGHTS:
            raise ValueError(f"Invalid severity level: {v}")
        return v.lower()

def validate_compliance_mapping(
    scenario_mapping: Dict[str, Any],
    framework_id: str,
    validation_level: Optional[str] = 'standard',
    detailed_report: Optional[bool] = False
) -> Tuple[bool, Dict[str, Any]]:
    """Validates scenario compliance mappings against framework requirements with detailed reporting."""
    
    logger.info(f"Starting compliance validation for framework: {framework_id}")
    
    if framework_id not in COMPLIANCE_FRAMEWORKS:
        raise ValueError(f"Unsupported compliance framework: {framework_id}")

    framework = ComplianceFramework(
        id=framework_id,
        **COMPLIANCE_FRAMEWORKS[framework_id]
    )

    validation_results = {
        'timestamp': datetime.utcnow().isoformat(),
        'framework': framework_id,
        'validation_level': validation_level,
        'controls': {},
        'summary': {
            'total_controls': 0,
            'compliant_controls': 0,
            'overall_score': 0.0
        }
    }

    total_score = 0.0
    for control_id, control_data in scenario_mapping.get('controls', {}).items():
        is_compliant, score, details = framework.validate_control(
            control_id,
            control_data,
            validation_level
        )
        
        validation_results['controls'][control_id] = {
            'compliant': is_compliant,
            'score': score,
            'details': details if detailed_report else None
        }
        
        total_score += score
        validation_results['summary']['total_controls'] += 1
        if is_compliant:
            validation_results['summary']['compliant_controls'] += 1

    # Calculate overall compliance score
    if validation_results['summary']['total_controls'] > 0:
        validation_results['summary']['overall_score'] = (
            total_score / validation_results['summary']['total_controls']
        )

    is_compliant = (
        validation_results['summary']['overall_score'] >= 
        VALIDATION_LEVELS[validation_level]['threshold']
    )

    logger.info(
        f"Compliance validation completed - Overall Score: "
        f"{validation_results['summary']['overall_score']:.2f}, "
        f"Compliant: {is_compliant}"
    )

    return is_compliant, validation_results

def calculate_compliance_score(
    validation_results: Dict[str, Any],
    framework_id: str,
    include_evidence_score: Optional[bool] = True
) -> Dict[str, Any]:
    """Calculates detailed compliance score with weighted controls and evidence validation."""
    
    logger.info(f"Calculating compliance score for framework: {framework_id}")
    
    framework = COMPLIANCE_FRAMEWORKS[framework_id]
    score_breakdown = {
        'timestamp': datetime.utcnow().isoformat(),
        'framework': framework_id,
        'overall_score': 0.0,
        'control_scores': {},
        'category_scores': {},
        'evidence_score': 0.0 if include_evidence_score else None
    }

    total_weight = 0.0
    weighted_score = 0.0

    for control_id, result in validation_results['controls'].items():
        control = framework['controls'][control_id]
        weight = CONTROL_WEIGHTS[control['severity']]
        
        weighted_score += result['score'] * weight
        total_weight += weight
        
        score_breakdown['control_scores'][control_id] = {
            'score': result['score'],
            'weight': weight,
            'weighted_score': result['score'] * weight
        }

        # Calculate category scores
        category = control.get('category', 'uncategorized')
        if category not in score_breakdown['category_scores']:
            score_breakdown['category_scores'][category] = {
                'total_score': 0.0,
                'count': 0
            }
        score_breakdown['category_scores'][category]['total_score'] += result['score']
        score_breakdown['category_scores'][category]['count'] += 1

    # Calculate final scores
    if total_weight > 0:
        score_breakdown['overall_score'] = weighted_score / total_weight

    # Calculate category averages
    for category in score_breakdown['category_scores']:
        if score_breakdown['category_scores'][category]['count'] > 0:
            score_breakdown['category_scores'][category]['average'] = (
                score_breakdown['category_scores'][category]['total_score'] /
                score_breakdown['category_scores'][category]['count']
            )

    logger.info(
        f"Compliance score calculation completed - "
        f"Overall Score: {score_breakdown['overall_score']:.2f}"
    )

    return score_breakdown