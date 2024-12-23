"""
Core Scenario Data Models Module

This module implements the core data models for exercise scenarios in the GameDay Platform,
providing comprehensive support for AI-generated tabletop exercises with compliance framework
alignment and optimized timeline generation.

Version: 1.0.0
"""

from typing import Dict, List, Optional, Any, TypedDict, Tuple
from pydantic import BaseModel, Field, validator
import uuid
from datetime import datetime

from scenario_service.utils.compliance import validate_compliance_mapping
from scenario_service.utils.templates import customize_template

# Global Constants
SCENARIO_TYPES: Dict[str, str] = {
    'security_incident': 'Security Incident Response',
    'business_continuity': 'Business Continuity',
    'compliance_validation': 'Compliance Validation',
    'crisis_management': 'Crisis Management',
    'technical_recovery': 'Technical Recovery'
}

SCENARIO_COMPLEXITY_LEVELS: Dict[str, int] = {
    'low': 1,
    'medium': 2,
    'high': 3
}

DEFAULT_DURATION_MINUTES: int = 60

class Inject(BaseModel):
    """Data model for scenario injects representing individual events or tasks within an exercise,
    with enhanced validation and content sanitization."""

    id: str = Field(..., description="Unique identifier for the inject")
    title: str = Field(..., description="Inject title")
    description: str = Field(..., description="Detailed inject description")
    type: str = Field(..., description="Type of inject")
    sequence_number: int = Field(..., description="Ordered sequence number")
    delay_minutes: int = Field(..., description="Delay in minutes from previous inject")
    content: Dict[str, Any] = Field(..., description="Inject content and data")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def __init__(self, title: str, description: str, type: str, sequence_number: int,
                 delay_minutes: int, content: Dict[str, Any], **kwargs):
        """Initialize an inject instance with sanitized inputs and validation."""
        # Generate unique ID if not provided
        if 'id' not in kwargs:
            kwargs['id'] = str(uuid.uuid4())

        # Initialize metadata with telemetry
        if 'metadata' not in kwargs:
            kwargs['metadata'] = {
                'created_by': 'system',
                'version': '1.0.0',
                'telemetry': {
                    'render_time_ms': 0,
                    'validation_score': 0.0
                }
            }

        super().__init__(
            title=title,
            description=description,
            type=type,
            sequence_number=sequence_number,
            delay_minutes=delay_minutes,
            content=content,
            **kwargs
        )

    @validator('type')
    def validate_inject_type(cls, v):
        """Validate inject type."""
        valid_types = ['notification', 'action', 'decision', 'escalation', 'resolution']
        if v not in valid_types:
            raise ValueError(f"Invalid inject type: {v}")
        return v

    @validator('content')
    def validate_content(cls, v):
        """Validate inject content structure."""
        required_fields = ['message', 'expected_response', 'success_criteria']
        if not all(field in v for field in required_fields):
            raise ValueError(f"Missing required content fields: {required_fields}")
        return v

class Scenario(BaseModel):
    """Core data model for exercise scenarios with compliance framework alignment
    and optimized timeline generation."""

    id: str = Field(..., description="Unique identifier for the scenario")
    title: str = Field(..., description="Scenario title")
    description: str = Field(..., description="Detailed scenario description")
    type: str = Field(..., description="Type of scenario")
    complexity_level: int = Field(..., description="Scenario complexity level")
    duration_minutes: int = Field(default=DEFAULT_DURATION_MINUTES)
    injects: List[Inject] = Field(default_factory=list)
    compliance_mappings: Dict[str, Any] = Field(default_factory=dict)
    organization_context: Dict[str, Any] = Field(..., description="Organization-specific context")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    telemetry: Dict[str, Any] = Field(default_factory=dict)

    def __init__(self, title: str, description: str, type: str, complexity_level: int,
                 organization_context: Dict[str, Any], duration_minutes: Optional[int] = None,
                 **kwargs):
        """Initialize a scenario instance with enhanced validation and telemetry."""
        # Generate unique ID if not provided
        if 'id' not in kwargs:
            kwargs['id'] = str(uuid.uuid4())

        # Set default duration if not provided
        if duration_minutes is None:
            duration_minutes = DEFAULT_DURATION_MINUTES

        # Initialize telemetry data
        if 'telemetry' not in kwargs:
            kwargs['telemetry'] = {
                'generation_time_ms': 0,
                'validation_time_ms': 0,
                'compliance_score': 0.0,
                'performance_metrics': {}
            }

        super().__init__(
            title=title,
            description=description,
            type=type,
            complexity_level=complexity_level,
            organization_context=organization_context,
            duration_minutes=duration_minutes,
            **kwargs
        )

    @validator('type')
    def validate_scenario_type(cls, v):
        """Validate scenario type against supported types."""
        if v not in SCENARIO_TYPES:
            raise ValueError(f"Invalid scenario type: {v}")
        return v

    @validator('complexity_level')
    def validate_complexity(cls, v):
        """Validate complexity level."""
        if v not in SCENARIO_COMPLEXITY_LEVELS.values():
            raise ValueError(f"Invalid complexity level: {v}")
        return v

    def add_inject(self, inject: Inject) -> Tuple[bool, Optional[str]]:
        """Adds a new inject to the scenario with conflict detection."""
        # Validate sequence number uniqueness
        if any(existing.sequence_number == inject.sequence_number 
               for existing in self.injects):
            return False, f"Sequence number {inject.sequence_number} already exists"

        # Validate timeline consistency
        total_duration = sum(i.delay_minutes for i in self.injects) + inject.delay_minutes
        if total_duration > self.duration_minutes:
            return False, "Total inject duration exceeds scenario duration"

        # Add inject and update scenario
        self.injects.append(inject)
        self.injects.sort(key=lambda x: x.sequence_number)
        self.updated_at = datetime.utcnow()

        # Update telemetry
        self.telemetry['inject_count'] = len(self.injects)
        self.telemetry['last_inject_added'] = datetime.utcnow().isoformat()

        return True, None

    def validate_compliance(self, framework_id: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """Validates scenario against compliance frameworks with detailed reporting."""
        start_time = datetime.utcnow()

        # Use default framework if not specified
        if framework_id is None:
            framework_id = self.metadata.get('compliance_framework', 'soc2')

        # Perform compliance validation
        is_compliant, validation_results = validate_compliance_mapping(
            self.compliance_mappings,
            framework_id=framework_id,
            validation_level='strict',
            detailed_report=True
        )

        # Update telemetry
        validation_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        self.telemetry['validation_time_ms'] = validation_time
        self.telemetry['compliance_score'] = validation_results['summary']['overall_score']
        self.telemetry['last_validation'] = datetime.utcnow().isoformat()

        return is_compliant, validation_results

    def generate_timeline(self) -> List[Dict[str, Any]]:
        """Generates optimized exercise timeline from injects."""
        timeline = []
        current_time = 0

        for inject in sorted(self.injects, key=lambda x: x.sequence_number):
            current_time += inject.delay_minutes
            
            timeline_entry = {
                'time': current_time,
                'inject_id': inject.id,
                'title': inject.title,
                'type': inject.type,
                'content': inject.content,
                'metadata': {
                    'sequence_number': inject.sequence_number,
                    'delay_minutes': inject.delay_minutes,
                    'cumulative_time': current_time
                }
            }
            timeline.append(timeline_entry)

        return timeline