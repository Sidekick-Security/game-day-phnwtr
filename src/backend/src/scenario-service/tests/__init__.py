"""
Test Suite Initialization Module for Scenario Service

This module provides comprehensive test utilities, fixtures, and configuration for testing
AI-driven scenario generation, validation, and compliance testing capabilities. Implements
extensive mocking capabilities and performance monitoring.

Version: 1.0.0
"""

import pytest
from typing import Dict, List, Any, Optional
from datetime import datetime

from scenario_service.services.scenario_generator import ScenarioGenerator
from scenario_service.services.scenario_validator import ScenarioValidator

# Test Configuration Constants
TEST_COMPLIANCE_FRAMEWORKS = ['SOC2', 'GDPR', 'ISO27001', 'NIST']

TEST_ORG_CONTEXT = {
    'industry': 'financial_services',
    'size': 'enterprise',
    'region': 'global',
    'compliance_frameworks': TEST_COMPLIANCE_FRAMEWORKS,
    'scenario_capabilities': {
        'security_incident': True,
        'business_continuity': True,
        'compliance_validation': True,
        'crisis_management': True,
        'technical_recovery': True
    },
    'max_complexity': 5
}

TEST_VALIDATION_RULES = {
    'min_injects': 3,
    'max_injects': 20,
    'min_duration_minutes': 30,
    'max_duration_minutes': 480,
    'compliance_threshold': 0.95,
    'ai_content_confidence': 0.85
}

def pytest_configure(config):
    """
    Pytest configuration hook for setting up test environment with enhanced validation
    and monitoring capabilities.
    """
    # Register custom markers for scenario types
    config.addinivalue_line(
        "markers",
        "security_incident: mark test as security incident scenario test"
    )
    config.addinivalue_line(
        "markers",
        "business_continuity: mark test as business continuity scenario test"
    )
    config.addinivalue_line(
        "markers",
        "compliance_validation: mark test as compliance validation scenario test"
    )
    config.addinivalue_line(
        "markers",
        "performance: mark test for performance monitoring"
    )

    # Configure test logging with performance monitoring
    config.option.log_level = "INFO"
    config.option.log_format = (
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    config.option.log_date_format = "%Y-%m-%d %H:%M:%S"

def pytest_collection_modifyitems(session, config, items):
    """
    Pytest hook for modifying test collection with enhanced async support
    and dependency management.
    """
    # Add async marker to async tests
    for item in items:
        if item.get_closest_marker('asyncio'):
            item.add_marker(pytest.mark.asyncio)

    # Sort tests by dependency order
    items.sort(key=lambda x: x.get_closest_marker('dependency').args[0]
               if x.get_closest_marker('dependency') else 0)

class BaseTestCase:
    """
    Enhanced base test class providing comprehensive test utilities and fixtures
    with AI mocking and performance monitoring capabilities.
    """

    def __init__(self):
        """Initialize test case with comprehensive testing capabilities."""
        self._generator = None
        self._validator = None
        self._perf_monitor = None
        self._test_start_time = None
        self._test_metrics = {}

    def setup_method(self):
        """Enhanced setup method run before each test."""
        self._test_start_time = datetime.utcnow()
        self._test_metrics = {
            'setup_time': 0,
            'execution_time': 0,
            'validation_time': 0,
            'cleanup_time': 0
        }

        # Initialize scenario validator with test configuration
        self._validator = ScenarioValidator(
            organization_context=TEST_ORG_CONTEXT,
            custom_rules=TEST_VALIDATION_RULES
        )

        # Initialize scenario generator with mock AI capabilities
        self._generator = ScenarioGenerator(
            llm_service=self._mock_llm_service(),
            validator=self._validator
        )

        # Record setup time
        self._test_metrics['setup_time'] = (
            datetime.utcnow() - self._test_start_time
        ).total_seconds()

    async def create_test_scenario(
        self,
        scenario_data: Dict[str, Any],
        compliance_frameworks: Optional[List[str]] = None,
        performance_thresholds: Optional[Dict[str, float]] = None
    ):
        """
        Enhanced helper method to create test scenarios with comprehensive validation.

        Args:
            scenario_data: Base scenario configuration
            compliance_frameworks: Optional list of compliance frameworks to validate
            performance_thresholds: Optional performance monitoring thresholds
        """
        execution_start = datetime.utcnow()

        try:
            # Generate scenario with AI mocking
            scenario = await self._generator.generate_scenario(
                scenario_type=scenario_data['type'],
                organization_context={
                    **TEST_ORG_CONTEXT,
                    **scenario_data.get('org_context', {})
                },
                compliance_frameworks=compliance_frameworks or TEST_COMPLIANCE_FRAMEWORKS
            )

            # Validate scenario
            is_valid, validation_results = self._validator.validate_scenario(scenario)
            if not is_valid:
                raise ValueError(
                    f"Scenario validation failed: {validation_results['issues']}"
                )

            # Check performance if thresholds provided
            if performance_thresholds:
                execution_time = (
                    datetime.utcnow() - execution_start
                ).total_seconds()
                if execution_time > performance_thresholds.get('max_execution_time', 5.0):
                    raise ValueError(
                        f"Scenario generation exceeded time threshold: "
                        f"{execution_time:.2f}s"
                    )

            return scenario

        finally:
            # Record metrics
            self._test_metrics['execution_time'] = (
                datetime.utcnow() - execution_start
            ).total_seconds()

    def _mock_llm_service(self):
        """Creates a mock LLM service for testing."""
        class MockLLMService:
            async def generate_scenario(self, *args, **kwargs):
                return {
                    'title': 'Test Scenario',
                    'description': 'Test scenario description',
                    'type': kwargs.get('scenario_type'),
                    'compliance_mappings': {
                        'controls': {
                            'test_control': {
                                'description': 'Test control implementation',
                                'evidence': {'test_req': 'Test evidence'}
                            }
                        }
                    }
                }

            async def generate_injects(self, *args, **kwargs):
                return [
                    {
                        'title': f'Test Inject {i}',
                        'description': f'Test inject {i} description',
                        'type': 'notification',
                        'sequence_number': i,
                        'delay_minutes': 15,
                        'content': {
                            'message': f'Test message {i}',
                            'expected_response': 'Test response',
                            'success_criteria': 'Test criteria'
                        }
                    }
                    for i in range(1, 4)
                ]

        return MockLLMService()