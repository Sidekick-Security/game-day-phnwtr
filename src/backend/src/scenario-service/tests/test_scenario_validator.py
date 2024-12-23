"""
Test Suite for ScenarioValidator Service

This module provides comprehensive testing for the ScenarioValidator service,
ensuring proper validation of exercise scenarios against compliance frameworks,
business rules, and organizational requirements with enhanced coverage for
AI content validation and performance testing.

Version: 1.0.0
"""

import pytest
from typing import Dict, Any, List
from datetime import datetime, timedelta
import asyncio
import json

from scenario_service.services.scenario_validator import (
    ScenarioValidator,
    VALIDATION_RULES
)
from scenario_service.utils.compliance import (
    ComplianceFramework,
    validate_compliance_mapping,
    calculate_compliance_score,
    COMPLIANCE_FRAMEWORKS
)
from scenario_service.models.scenario import (
    Scenario,
    Inject,
    SCENARIO_TYPES
)

# Test Constants
MOCK_ORGANIZATION_CONTEXT: Dict[str, Any] = {
    'id': 'test-org-001',
    'industry': 'technology',
    'size': 'enterprise',
    'region': 'us-west',
    'compliance_frameworks': ['soc2', 'iso27001', 'nist'],
    'scenario_types': ['security_incident', 'business_continuity'],
    'ai_content_requirements': {
        'min_quality_score': 0.85,
        'required_elements': ['objectives', 'success_criteria', 'prerequisites']
    }
}

MOCK_SCENARIO_DATA: Dict[str, Any] = {
    'id': 'test-scenario-001',
    'title': 'Ransomware Incident Response',
    'description': 'Enterprise-wide ransomware incident response exercise',
    'type': 'security_incident',
    'complexity_level': 2,
    'duration_minutes': 60,
    'injects': [],
    'compliance_mappings': {},
    'organization_context': MOCK_ORGANIZATION_CONTEXT,
    'metadata': {
        'ai_generated': True,
        'ai_content_score': 0.9,
        'version': '1.0.0'
    }
}

COMPLIANCE_THRESHOLD: float = 0.95

@pytest.fixture
def validator():
    """Fixture providing configured ScenarioValidator instance."""
    return ScenarioValidator(MOCK_ORGANIZATION_CONTEXT)

@pytest.fixture
def mock_scenario():
    """Fixture providing a mock scenario with basic structure."""
    return Scenario(**MOCK_SCENARIO_DATA)

class TestScenarioValidator:
    """Comprehensive test suite for ScenarioValidator functionality."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test environment with enhanced validation context."""
        self._validator = ScenarioValidator(MOCK_ORGANIZATION_CONTEXT)
        self._mock_context = MOCK_ORGANIZATION_CONTEXT.copy()
        self._mock_compliance_data = {
            'controls': {
                'cc1.1': {
                    'description': 'Test control implementation',
                    'evidence': {'documentation': 'Control evidence'},
                    'implementation': 'Implemented in exercise'
                }
            }
        }

    def test_validate_scenario_basic_structure(self, mock_scenario):
        """Tests basic scenario structure validation."""
        is_valid, results = self._validator.validate_scenario(mock_scenario)
        
        assert isinstance(results, dict)
        assert 'validation_details' in results
        assert 'timestamp' in results
        assert isinstance(results['is_valid'], bool)

    @pytest.mark.parametrize('scenario_type', list(SCENARIO_TYPES.keys()))
    def test_validate_scenario_types(self, mock_scenario, scenario_type):
        """Tests validation of different scenario types."""
        mock_scenario.type = scenario_type
        is_valid, results = self._validator.validate_scenario(mock_scenario)
        
        assert 'type' in results['validation_details']
        if scenario_type in MOCK_ORGANIZATION_CONTEXT['scenario_types']:
            assert results['validation_details']['type']['is_valid']
        else:
            assert not results['validation_details']['type']['is_valid']

    def test_validate_scenario_compliance_threshold(self, mock_scenario):
        """Tests scenario compliance validation against 95% threshold."""
        # Setup compliant scenario
        mock_scenario.compliance_mappings = self._mock_compliance_data
        mock_scenario.metadata['compliance_framework'] = 'soc2'
        
        is_valid, results = self._validator.validate_scenario(mock_scenario)
        
        assert 'compliance_score' in results
        assert isinstance(results['compliance_score'], float)
        assert results['compliance_score'] >= COMPLIANCE_THRESHOLD
        assert 'compliance' in results['validation_details']

    def test_validate_ai_content_quality(self, mock_scenario):
        """Tests AI-generated content quality validation."""
        # Test high-quality content
        mock_scenario.metadata['ai_generated'] = True
        mock_scenario.metadata['ai_content_score'] = 0.95
        
        is_valid, results = self._validator.validate_scenario(mock_scenario)
        
        assert results['ai_confidence'] >= VALIDATION_RULES['ai_content_confidence']
        assert 'ai_content' in results['validation_details']

        # Test low-quality content
        mock_scenario.metadata['ai_content_score'] = 0.70
        is_valid, results = self._validator.validate_scenario(mock_scenario)
        
        assert not is_valid
        assert results['ai_confidence'] < VALIDATION_RULES['ai_content_confidence']

    @pytest.mark.asyncio
    async def test_validate_complex_injects(self, mock_scenario):
        """Tests validation of complex inject sequences."""
        # Setup complex inject sequence
        injects = [
            Inject(
                id=f'inject-{i}',
                title=f'Test Inject {i}',
                description=f'Test description {i}',
                type='notification',
                sequence_number=i,
                delay_minutes=15,
                content={
                    'message': 'Test message',
                    'expected_response': 'Expected response',
                    'success_criteria': ['Criteria 1', 'Criteria 2']
                }
            ) for i in range(1, 4)
        ]
        mock_scenario.injects = injects

        is_valid, results = self._validator.validate_scenario(mock_scenario)
        
        assert 'injects' in results['validation_details']
        assert len(results['validation_details']['injects']) == len(injects)
        assert all(inject['is_valid'] for inject in 
                  results['validation_details']['injects'].values())

    @pytest.mark.asyncio
    async def test_performance_large_scenarios(self, mock_scenario):
        """Tests validation performance with large scenarios."""
        # Generate large scenario with many injects
        large_injects = [
            Inject(
                id=f'inject-{i}',
                title=f'Performance Test Inject {i}',
                description=f'Performance test description {i}',
                type='notification',
                sequence_number=i,
                delay_minutes=5,
                content={
                    'message': f'Test message {i}',
                    'expected_response': f'Expected response {i}',
                    'success_criteria': ['Criteria 1', 'Criteria 2']
                }
            ) for i in range(1, 51)  # Test with 50 injects
        ]
        mock_scenario.injects = large_injects

        start_time = datetime.utcnow()
        is_valid, results = self._validator.validate_scenario(mock_scenario)
        execution_time = (datetime.utcnow() - start_time).total_seconds()

        assert execution_time < 5.0  # Performance threshold
        assert 'validation_duration' in results
        assert isinstance(results['validation_duration'], float)

    def test_validate_compliance_framework_mapping(self, mock_scenario):
        """Tests detailed compliance framework mapping validation."""
        # Setup comprehensive compliance mapping
        mock_scenario.compliance_mappings = {
            'controls': {
                control_id: {
                    'description': f'Implementation of {control_id}',
                    'evidence': {'documentation': f'Evidence for {control_id}'},
                    'implementation': 'Fully implemented'
                } for control_id in COMPLIANCE_FRAMEWORKS['soc2']['controls'].keys()
            }
        }

        is_valid, results = self._validator.validate_scenario(mock_scenario)
        
        assert 'compliance' in results['validation_details']
        assert 'controls' in results['validation_details']['compliance']
        assert results['compliance_score'] >= COMPLIANCE_THRESHOLD

    def test_validate_scenario_metadata(self, mock_scenario):
        """Tests validation of scenario metadata and versioning."""
        mock_scenario.metadata.update({
            'version': '1.0.0',
            'created_by': 'test-user',
            'last_modified': datetime.utcnow().isoformat()
        })

        is_valid, results = self._validator.validate_scenario(mock_scenario)
        
        assert 'metadata' in results['validation_details']
        assert results['validation_details']['metadata']['version_valid']
        assert 'created_by' in results['validation_details']['metadata']

    @pytest.mark.parametrize('complexity_level', [1, 2, 3, 4, 5])
    def test_validate_scenario_complexity(self, mock_scenario, complexity_level):
        """Tests validation of different scenario complexity levels."""
        mock_scenario.complexity_level = complexity_level
        is_valid, results = self._validator.validate_scenario(mock_scenario)
        
        assert 'complexity' in results['validation_details']
        assert isinstance(results['validation_details']['complexity']['is_valid'], bool)
        assert results['validation_details']['complexity']['level'] == complexity_level

def test_validator_initialization():
    """Tests validator initialization with various organization contexts."""
    # Test with minimal context
    minimal_context = {
        'id': 'test-org',
        'industry': 'technology',
        'size': 'enterprise',
        'region': 'us-west',
        'compliance_frameworks': ['soc2']
    }
    validator = ScenarioValidator(minimal_context)
    assert validator is not None

    # Test with invalid context
    with pytest.raises(ValueError):
        ScenarioValidator({})

def test_validator_custom_rules():
    """Tests validator initialization with custom validation rules."""
    custom_rules = {
        'min_injects': 5,
        'max_injects': 15,
        'compliance_threshold': 0.98
    }
    validator = ScenarioValidator(MOCK_ORGANIZATION_CONTEXT, custom_rules)
    assert validator is not None