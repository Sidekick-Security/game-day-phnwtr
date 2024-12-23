"""
Scenario Generator Service Module

This module provides enterprise-grade scenario generation capabilities with AI-driven content,
strict compliance validation, and performance optimization features. Implements comprehensive
validation, caching, and telemetry for optimal scenario generation.

Version: 1.0.0
"""

from typing import Dict, List, Optional, Any, Tuple
import logging
from datetime import datetime

from scenario_service.models.scenario import (
    Scenario,
    Inject,
    SCENARIO_TYPES
)
from scenario_service.services.llm_service import LLMService
from scenario_service.services.scenario_validator import ScenarioValidator

# Global Constants
DEFAULT_COMPLEXITY: int = 2
MAX_GENERATION_ATTEMPTS: int = 3
COMPLIANCE_THRESHOLD: float = 0.95
CACHE_TTL: int = 3600

class ScenarioGenerator:
    """Enhanced service class for generating AI-driven exercise scenarios with strict
    compliance validation and performance optimization."""

    def __init__(
        self,
        llm_service: LLMService,
        validator: ScenarioValidator,
        config: Optional[Dict[str, Any]] = None
    ):
        """Initialize the scenario generator service with enhanced validation and monitoring.

        Args:
            llm_service: LLM service instance for AI-driven content generation
            validator: Scenario validator instance for compliance checking
            config: Optional configuration overrides
        """
        self._llm_service = llm_service
        self._validator = validator
        self._logger = logging.getLogger(f"{__name__}.ScenarioGenerator")
        self._cache: Dict[str, Any] = {}
        self._performance_metrics: Dict[str, float] = {}

        # Initialize with default or custom configuration
        self._config = {
            'max_attempts': MAX_GENERATION_ATTEMPTS,
            'compliance_threshold': COMPLIANCE_THRESHOLD,
            'cache_ttl': CACHE_TTL,
            **(config or {})
        }

        self._logger.info("Initialized ScenarioGenerator with enhanced validation")

    async def generate_scenario(
        self,
        scenario_type: str,
        organization_context: Dict[str, Any],
        compliance_frameworks: List[str],
        complexity_level: Optional[int] = None
    ) -> Tuple[Scenario, Dict[str, Any]]:
        """Generates a complete exercise scenario with enhanced validation and compliance checking.

        Args:
            scenario_type: Type of scenario to generate
            organization_context: Organization-specific context
            compliance_frameworks: List of compliance frameworks to validate against
            complexity_level: Optional complexity level (1-5)

        Returns:
            Tuple containing the generated scenario and validation results
        """
        generation_start = datetime.utcnow()
        self._logger.info(f"Generating {scenario_type} scenario with complexity {complexity_level}")

        # Validate input parameters
        if scenario_type not in SCENARIO_TYPES:
            raise ValueError(f"Invalid scenario type: {scenario_type}")

        complexity = complexity_level or DEFAULT_COMPLEXITY
        if not 1 <= complexity <= 5:
            raise ValueError(f"Invalid complexity level: {complexity}")

        # Check cache for similar scenarios
        cache_key = self._generate_cache_key(
            scenario_type,
            organization_context,
            compliance_frameworks,
            complexity
        )
        cached_scenario = self._get_cached_scenario(cache_key)
        if cached_scenario:
            self._logger.info("Retrieved scenario from cache")
            return cached_scenario

        attempts = 0
        while attempts < self._config['max_attempts']:
            try:
                # Generate base scenario using LLM
                scenario_data = await self._llm_service.generate_scenario(
                    scenario_type,
                    organization_context,
                    compliance_frameworks
                )

                # Create and validate scenario instance
                scenario = Scenario(
                    title=scenario_data['title'],
                    description=scenario_data['description'],
                    type=scenario_type,
                    complexity_level=complexity,
                    organization_context=organization_context,
                    compliance_mappings=scenario_data['compliance_mappings'],
                    metadata={
                        'ai_generated': True,
                        'generation_timestamp': datetime.utcnow().isoformat(),
                        'compliance_frameworks': compliance_frameworks
                    }
                )

                # Generate and validate injects
                injects = await self._llm_service.generate_injects(
                    scenario_data,
                    complexity
                )

                # Add validated injects to scenario
                for inject_data in injects:
                    inject = Inject(**inject_data)
                    success, error = scenario.add_inject(inject)
                    if not success:
                        self._logger.warning(f"Failed to add inject: {error}")
                        continue

                # Perform comprehensive validation
                is_valid, validation_results = self._validator.validate_scenario(scenario)
                
                if is_valid and validation_results['compliance_score'] >= self._config['compliance_threshold']:
                    # Cache successful scenario
                    self._cache_scenario(cache_key, (scenario, validation_results))
                    
                    # Record performance metrics
                    generation_time = (datetime.utcnow() - generation_start).total_seconds()
                    self._update_performance_metrics(generation_time, attempts + 1)
                    
                    self._logger.info(
                        f"Successfully generated scenario in {generation_time:.2f}s "
                        f"after {attempts + 1} attempts"
                    )
                    return scenario, validation_results

                attempts += 1
                self._logger.warning(
                    f"Attempt {attempts} failed validation. "
                    f"Compliance score: {validation_results['compliance_score']:.2f}"
                )

            except Exception as e:
                self._logger.error(f"Generation attempt {attempts + 1} failed: {str(e)}")
                attempts += 1

        raise RuntimeError(
            f"Failed to generate valid scenario after {self._config['max_attempts']} attempts"
        )

    async def regenerate_injects(
        self,
        scenario: Scenario,
        complexity_level: Optional[int] = None,
        compliance_focus: Optional[List[str]] = None
    ) -> Tuple[bool, List[Inject], Dict[str, Any]]:
        """Regenerates injects with enhanced timeline consistency and compliance validation.

        Args:
            scenario: Existing scenario instance
            complexity_level: Optional new complexity level
            compliance_focus: Optional list of compliance controls to focus on

        Returns:
            Tuple containing success status, new injects, and validation metrics
        """
        self._logger.info(f"Regenerating injects for scenario {scenario.id}")

        try:
            # Generate new injects with compliance focus
            new_injects = await self._llm_service.generate_injects(
                {
                    'id': scenario.id,
                    'title': scenario.title,
                    'description': scenario.description,
                    'type': scenario.type,
                    'compliance_mappings': scenario.compliance_mappings
                },
                complexity_level or scenario.complexity_level,
                compliance_focus=compliance_focus
            )

            # Validate inject sequence
            is_valid, validation_results = self._validator.validate_injects(
                [Inject(**inject_data) for inject_data in new_injects]
            )

            if not is_valid:
                self._logger.warning("Generated injects failed validation")
                return False, [], validation_results

            return True, [Inject(**inject_data) for inject_data in new_injects], validation_results

        except Exception as e:
            self._logger.error(f"Failed to regenerate injects: {str(e)}")
            raise

    async def customize_scenario(
        self,
        base_scenario: Scenario,
        customization_params: Dict[str, Any],
        compliance_requirements: Optional[List[str]] = None
    ) -> Tuple[bool, Scenario, Dict[str, Any]]:
        """Customizes scenarios with enhanced template handling and validation.

        Args:
            base_scenario: Base scenario to customize
            customization_params: Customization parameters
            compliance_requirements: Optional specific compliance requirements

        Returns:
            Tuple containing success status, customized scenario, and validation metrics
        """
        self._logger.info(f"Customizing scenario {base_scenario.id}")

        try:
            # Apply customizations
            customized_scenario = Scenario(
                title=customization_params.get('title', base_scenario.title),
                description=customization_params.get('description', base_scenario.description),
                type=base_scenario.type,
                complexity_level=customization_params.get(
                    'complexity_level',
                    base_scenario.complexity_level
                ),
                organization_context=base_scenario.organization_context,
                compliance_mappings=base_scenario.compliance_mappings
            )

            # Regenerate injects if needed
            if customization_params.get('regenerate_injects', False):
                success, new_injects, validation_results = await self.regenerate_injects(
                    customized_scenario,
                    customization_params.get('complexity_level'),
                    compliance_requirements
                )
                if not success:
                    return False, customized_scenario, validation_results

                for inject in new_injects:
                    customized_scenario.add_inject(inject)

            # Validate customized scenario
            is_valid, validation_results = self._validator.validate_scenario(
                customized_scenario
            )

            return is_valid, customized_scenario, validation_results

        except Exception as e:
            self._logger.error(f"Scenario customization failed: {str(e)}")
            raise

    def _generate_cache_key(self, *args) -> str:
        """Generates a unique cache key for scenario parameters."""
        return ":".join(str(arg) for arg in args)

    def _get_cached_scenario(
        self,
        cache_key: str
    ) -> Optional[Tuple[Scenario, Dict[str, Any]]]:
        """Retrieves a cached scenario if available and valid."""
        if cache_key in self._cache:
            cached_data = self._cache[cache_key]
            if (datetime.utcnow() - cached_data['timestamp']).seconds < self._config['cache_ttl']:
                return cached_data['scenario'], cached_data['validation']
        return None

    def _cache_scenario(
        self,
        cache_key: str,
        scenario_data: Tuple[Scenario, Dict[str, Any]]
    ) -> None:
        """Caches a successfully generated scenario."""
        self._cache[cache_key] = {
            'scenario': scenario_data[0],
            'validation': scenario_data[1],
            'timestamp': datetime.utcnow()
        }

    def _update_performance_metrics(
        self,
        generation_time: float,
        attempts: int
    ) -> None:
        """Updates performance metrics for monitoring."""
        self._performance_metrics.update({
            'last_generation_time': generation_time,
            'average_attempts': (
                self._performance_metrics.get('average_attempts', 0) * 0.9 +
                attempts * 0.1
            ),
            'total_generations': self._performance_metrics.get('total_generations', 0) + 1
        })