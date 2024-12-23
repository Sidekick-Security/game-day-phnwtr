"""
Test Suite for ScenarioGenerator Service

This module provides comprehensive testing for the AI-driven scenario generation service,
including compliance validation, error handling, and performance metrics.

Version: 1.0.0
"""

import pytest
from unittest.mock import AsyncMock, Mock, patch
from typing import Dict, Any, List
from datetime import datetime

from scenario_service.services.scenario_generator import ScenarioGenerator
from scenario_service.models.scenario import (
    Scenario,
    Inject,
    SCENARIO_TYPES,
    SCENARIO_COMPLEXITY_LEVELS
)
from scenario_service.utils.compliance import (
    validate_compliance_mapping,
    ComplianceFramework
)

# Test Constants
TEST_ORG_CONTEXT: Dict[str, Any] = {
    'industry': 'technology',
    'size': 'enterprise',
    'region': 'global',
    'compliance_level': 'high',
    'risk_tolerance': 'low',
    'additional_context': {
        'incident_history': True,
        'security_maturity': 'advanced'
    }
}

TEST_COMPLIANCE_FRAMEWORKS: List[str] = ['SOC2', 'ISO27001', 'GDPR']

MOCK_SCENARIO_DATA = {
    'title': 'Ransomware Incident Response',
    'description': 'Enterprise-wide ransomware incident response exercise',
    'type': 'security_incident',
    'complexity_level': 3,
    'compliance_mappings': {
        'controls': {
            'cc1.1': {
                'description': 'Incident response procedures',
                'evidence': {'documentation': 'Complete'},
                'controls': {
                    'cc1.1': {'description': 'Valid', 'evidence': True}
                }
            }
        }
    }
}

class TestScenarioGenerator:
    """Comprehensive test suite for ScenarioGenerator service with enhanced async support."""

    @pytest.fixture(autouse=True)
    async def setup_method(self):
        """Initialize test environment with mocks and test data."""
        # Initialize mocked services
        self.mock_llm_service = AsyncMock()
        self.mock_validator = Mock()
        
        # Configure mock responses
        self.mock_llm_service.generate_scenario.return_value = MOCK_SCENARIO_DATA
        self.mock_validator.validate_scenario.return_value = (True, {
            'compliance_score': 0.96,
            'validation_results': {'passed': True}
        })

        # Initialize service under test
        self.generator = ScenarioGenerator(
            llm_service=self.mock_llm_service,
            validator=self.mock_validator
        )

        # Setup performance tracking
        self.start_time = datetime.utcnow()

    @pytest.mark.asyncio
    async def test_generate_scenario_success(self):
        """Test successful scenario generation with compliance validation."""
        # Arrange
        scenario_type = 'security_incident'
        complexity_level = 3

        # Act
        scenario, validation_results = await self.generator.generate_scenario(
            scenario_type=scenario_type,
            organization_context=TEST_ORG_CONTEXT,
            compliance_frameworks=TEST_COMPLIANCE_FRAMEWORKS,
            complexity_level=complexity_level
        )

        # Assert
        assert isinstance(scenario, Scenario)
        assert scenario.type == scenario_type
        assert scenario.complexity_level == complexity_level
        assert scenario.organization_context == TEST_ORG_CONTEXT
        
        # Verify compliance validation
        assert validation_results['compliance_score'] >= 0.95
        assert validation_results['validation_results']['passed']

        # Verify LLM service calls
        self.mock_llm_service.generate_scenario.assert_called_once_with(
            scenario_type,
            TEST_ORG_CONTEXT,
            TEST_COMPLIANCE_FRAMEWORKS
        )

        # Verify performance metrics
        assert hasattr(self.generator, '_performance_metrics')
        assert 'last_generation_time' in self.generator._performance_metrics
        assert self.generator._performance_metrics['last_generation_time'] > 0

    @pytest.mark.asyncio
    async def test_generate_scenario_invalid_type(self):
        """Test scenario generation with invalid scenario type."""
        # Arrange
        invalid_type = 'invalid_type'

        # Act/Assert
        with pytest.raises(ValueError) as exc_info:
            await self.generator.generate_scenario(
                scenario_type=invalid_type,
                organization_context=TEST_ORG_CONTEXT,
                compliance_frameworks=TEST_COMPLIANCE_FRAMEWORKS
            )

        assert 'Invalid scenario type' in str(exc_info.value)
        assert not self.mock_llm_service.generate_scenario.called

    @pytest.mark.asyncio
    async def test_generate_scenario_compliance_failure(self):
        """Test scenario generation with failed compliance validation."""
        # Arrange
        self.mock_validator.validate_scenario.return_value = (False, {
            'compliance_score': 0.85,
            'validation_results': {'passed': False},
            'issues': ['Insufficient compliance mapping']
        })

        # Act/Assert
        with pytest.raises(RuntimeError) as exc_info:
            await self.generator.generate_scenario(
                scenario_type='security_incident',
                organization_context=TEST_ORG_CONTEXT,
                compliance_frameworks=TEST_COMPLIANCE_FRAMEWORKS
            )

        assert 'Failed to generate valid scenario' in str(exc_info.value)
        assert self.mock_llm_service.generate_scenario.called

    @pytest.mark.asyncio
    async def test_regenerate_injects_success(self):
        """Test successful inject regeneration with compliance focus."""
        # Arrange
        base_scenario = Scenario(**MOCK_SCENARIO_DATA)
        mock_injects = [
            {
                'id': '1',
                'title': 'Initial Detection',
                'description': 'Detection of ransomware indicators',
                'type': 'notification',
                'sequence_number': 1,
                'delay_minutes': 0,
                'content': {
                    'message': 'Ransomware detected',
                    'expected_response': 'Initiate IR plan',
                    'success_criteria': 'Plan initiated within 5 minutes'
                }
            }
        ]
        self.mock_llm_service.generate_injects.return_value = mock_injects

        # Act
        success, injects, validation_results = await self.generator.regenerate_injects(
            scenario=base_scenario,
            complexity_level=3,
            compliance_focus=['SOC2-CC1.1']
        )

        # Assert
        assert success
        assert len(injects) > 0
        assert all(isinstance(inject, Inject) for inject in injects)
        assert validation_results['compliance_score'] >= 0.95

    @pytest.mark.asyncio
    async def test_customize_scenario_success(self):
        """Test successful scenario customization with compliance validation."""
        # Arrange
        base_scenario = Scenario(**MOCK_SCENARIO_DATA)
        customization_params = {
            'title': 'Custom Ransomware Exercise',
            'complexity_level': 4,
            'regenerate_injects': True
        }

        # Act
        success, customized_scenario, validation_results = await self.generator.customize_scenario(
            base_scenario=base_scenario,
            customization_params=customization_params,
            compliance_requirements=['SOC2-CC1.1']
        )

        # Assert
        assert success
        assert isinstance(customized_scenario, Scenario)
        assert customized_scenario.title == customization_params['title']
        assert customized_scenario.complexity_level == customization_params['complexity_level']
        assert validation_results['compliance_score'] >= 0.95

    @pytest.mark.asyncio
    async def test_scenario_caching(self):
        """Test scenario caching functionality and performance."""
        # Arrange
        scenario_type = 'security_incident'
        cache_key = self.generator._generate_cache_key(
            scenario_type,
            TEST_ORG_CONTEXT,
            TEST_COMPLIANCE_FRAMEWORKS
        )

        # Act - First generation
        scenario1, _ = await self.generator.generate_scenario(
            scenario_type=scenario_type,
            organization_context=TEST_ORG_CONTEXT,
            compliance_frameworks=TEST_COMPLIANCE_FRAMEWORKS
        )

        # Act - Second generation (should hit cache)
        scenario2, _ = await self.generator.generate_scenario(
            scenario_type=scenario_type,
            organization_context=TEST_ORG_CONTEXT,
            compliance_frameworks=TEST_COMPLIANCE_FRAMEWORKS
        )

        # Assert
        assert scenario1.id == scenario2.id
        assert self.mock_llm_service.generate_scenario.call_count == 1
        assert cache_key in self.generator._cache

    @pytest.mark.asyncio
    async def test_performance_metrics(self):
        """Test performance metrics collection and thresholds."""
        # Arrange
        scenario_type = 'security_incident'

        # Act
        await self.generator.generate_scenario(
            scenario_type=scenario_type,
            organization_context=TEST_ORG_CONTEXT,
            compliance_frameworks=TEST_COMPLIANCE_FRAMEWORKS
        )

        # Assert
        metrics = self.generator._performance_metrics
        assert 'last_generation_time' in metrics
        assert 'average_attempts' in metrics
        assert 'total_generations' in metrics
        assert metrics['last_generation_time'] < 5.0  # 5 second threshold
        assert metrics['average_attempts'] <= 2.0  # Average attempts threshold