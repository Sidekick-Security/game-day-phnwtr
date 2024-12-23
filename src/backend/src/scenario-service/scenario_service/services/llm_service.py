"""
LLM Service Module

Provides enterprise-grade integration with Large Language Models for AI-driven scenario
generation with advanced features including intelligent caching, retry logic, and
comprehensive compliance validation.

Version: 1.0.0
"""

import logging
from typing import Dict, Any, List, Tuple, Optional
import json
import hashlib
from datetime import datetime

import openai  # openai v1.0+
import aiohttp  # aiohttp v3.8+
from tenacity import (  # tenacity v8.0+
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)
import redis  # redis v4.0+

from scenario_service.config import Settings, get_llm_config
from scenario_service.utils.templates import (
    ScenarioTemplate,
    ScenarioData,
    ComplianceValidator
)

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Global constants
DEFAULT_TEMPERATURE = 0.7
DEFAULT_MAX_TOKENS = 2048
CACHE_TTL = 3600  # 1 hour
MAX_RETRIES = 3
BACKOFF_MULTIPLIER = 1.5

class LLMService:
    """
    Enterprise-grade service for managing LLM interactions with advanced features
    including intelligent caching, retry logic, and compliance validation.
    """

    def __init__(self, settings: Settings):
        """Initialize LLM service with enhanced configuration."""
        logger.info("Initializing LLM Service")
        
        self._settings = settings
        self._llm_config = settings.get_llm_config()
        
        # Initialize Redis connection pool
        self._cache = redis.Redis(
            host=settings.database.host,
            port=settings.database.port,
            db=0,  # Use dedicated DB for LLM cache
            decode_responses=True,
            socket_timeout=5,
            connection_pool=redis.ConnectionPool(
                max_connections=50,
                socket_timeout=5
            )
        )
        
        # Configure OpenAI client
        openai.api_key = settings.llm.api_key.get_secret_value()
        
        # Initialize compliance validator
        self._validator = ComplianceValidator()
        
        # Validate API connectivity
        self._validate_api_connection()

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=BACKOFF_MULTIPLIER),
        retry=retry_if_exception_type((openai.error.APIError, aiohttp.ClientError))
    )
    async def generate_scenario(
        self,
        scenario_type: str,
        organization_context: Dict[str, Any],
        compliance_frameworks: List[str]
    ) -> ScenarioData:
        """
        Generates sophisticated base scenario content using LLM with compliance validation.
        
        Args:
            scenario_type: Type of scenario to generate
            organization_context: Organization-specific context
            compliance_frameworks: List of compliance frameworks to validate against
            
        Returns:
            ScenarioData: Validated and enhanced scenario data
        """
        logger.info(f"Generating scenario of type: {scenario_type}")
        
        # Generate cache key
        cache_key = self._generate_cache_key(
            scenario_type,
            organization_context,
            compliance_frameworks
        )
        
        # Check cache
        cached_response = self._get_cached_response(cache_key)
        if cached_response:
            logger.info("Retrieved scenario from cache")
            return cached_response
        
        # Prepare enhanced prompt
        prompt = self._prepare_scenario_prompt(
            scenario_type,
            organization_context,
            compliance_frameworks
        )
        
        # Adjust temperature based on scenario complexity
        temperature = self._calculate_temperature(
            scenario_type,
            organization_context.get('complexity_level', 2)
        )
        
        try:
            # Make API call with error handling
            response = await openai.ChatCompletion.create(
                model=self._llm_config['model_version'],
                messages=[{"role": "system", "content": prompt}],
                temperature=temperature,
                max_tokens=self._llm_config['max_tokens'],
                n=1,
                stream=False
            )
            
            # Parse and validate response
            scenario_data = self._parse_scenario_response(response)
            
            # Validate compliance
            is_compliant, validation_results = self._validate_compliance(
                scenario_data,
                compliance_frameworks
            )
            
            if not is_compliant:
                logger.warning(
                    f"Scenario failed compliance validation: "
                    f"Score {validation_results['score']:.2f}"
                )
                # Attempt regeneration with stricter compliance focus
                return await self._regenerate_with_compliance_focus(
                    scenario_type,
                    organization_context,
                    compliance_frameworks,
                    validation_results
                )
            
            # Cache successful response
            self._cache_response(cache_key, scenario_data)
            
            return scenario_data
            
        except Exception as e:
            logger.error(f"Failed to generate scenario: {str(e)}")
            raise

    @retry(
        stop=stop_after_attempt(MAX_RETRIES),
        wait=wait_exponential(multiplier=BACKOFF_MULTIPLIER)
    )
    async def generate_injects(
        self,
        base_scenario: ScenarioData,
        complexity_level: int
    ) -> List[Dict[str, Any]]:
        """
        Generates sophisticated dynamic inject sequence with timeline validation.
        
        Args:
            base_scenario: Base scenario data
            complexity_level: Desired complexity level (1-5)
            
        Returns:
            List[Dict[str, Any]]: Validated inject sequence
        """
        logger.info(f"Generating injects for scenario: {base_scenario['id']}")
        
        # Prepare inject generation prompt
        prompt = self._prepare_inject_prompt(base_scenario, complexity_level)
        
        try:
            response = await openai.ChatCompletion.create(
                model=self._llm_config['model_version'],
                messages=[{"role": "system", "content": prompt}],
                temperature=0.8,  # Higher variation for inject diversity
                max_tokens=self._llm_config['max_tokens'],
                n=1,
                stream=False
            )
            
            # Parse and validate inject sequence
            injects = self._parse_inject_response(response)
            
            # Validate timeline consistency
            validated_injects = self._validate_inject_sequence(
                injects,
                base_scenario
            )
            
            return validated_injects
            
        except Exception as e:
            logger.error(f"Failed to generate injects: {str(e)}")
            raise

    async def validate_content(
        self,
        content: Dict[str, Any],
        compliance_frameworks: List[str]
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Performs comprehensive content validation against multiple frameworks.
        
        Args:
            content: Content to validate
            compliance_frameworks: List of compliance frameworks
            
        Returns:
            Tuple[bool, Dict[str, Any]]: Validation results
        """
        logger.info("Performing content validation")
        
        validation_results = {
            'timestamp': datetime.utcnow().isoformat(),
            'frameworks': compliance_frameworks,
            'results': {},
            'overall_score': 0.0
        }
        
        try:
            for framework in compliance_frameworks:
                is_valid, framework_results = self._validate_compliance(
                    content,
                    [framework]
                )
                validation_results['results'][framework] = framework_results
            
            # Calculate overall score
            framework_scores = [
                r['score'] for r in validation_results['results'].values()
            ]
            validation_results['overall_score'] = (
                sum(framework_scores) / len(framework_scores)
            )
            
            is_valid = validation_results['overall_score'] >= 0.95
            
            return is_valid, validation_results
            
        except Exception as e:
            logger.error(f"Content validation failed: {str(e)}")
            raise

    def _validate_api_connection(self) -> None:
        """Validates LLM API connectivity with error handling."""
        try:
            openai.Model.list()
            logger.info("LLM API connection validated successfully")
        except Exception as e:
            logger.error(f"LLM API connection validation failed: {str(e)}")
            raise

    def _generate_cache_key(
        self,
        scenario_type: str,
        context: Dict[str, Any],
        frameworks: List[str]
    ) -> str:
        """Generates unique cache key for scenario parameters."""
        key_data = {
            'type': scenario_type,
            'context': context,
            'frameworks': sorted(frameworks)
        }
        return hashlib.sha256(
            json.dumps(key_data, sort_keys=True).encode()
        ).hexdigest()

    def _get_cached_response(self, cache_key: str) -> Optional[ScenarioData]:
        """Retrieves cached response with TTL validation."""
        try:
            cached = self._cache.get(cache_key)
            if cached:
                return json.loads(cached)
            return None
        except Exception as e:
            logger.warning(f"Cache retrieval failed: {str(e)}")
            return None

    def _cache_response(
        self,
        cache_key: str,
        response: ScenarioData
    ) -> None:
        """Caches response with TTL."""
        try:
            self._cache.setex(
                cache_key,
                CACHE_TTL,
                json.dumps(response)
            )
        except Exception as e:
            logger.warning(f"Cache storage failed: {str(e)}")

    def _prepare_scenario_prompt(
        self,
        scenario_type: str,
        context: Dict[str, Any],
        frameworks: List[str]
    ) -> str:
        """Prepares enhanced scenario generation prompt."""
        return f"""
        Generate a detailed {scenario_type} scenario for an organization with:
        Industry: {context.get('industry')}
        Size: {context.get('size')}
        Region: {context.get('region')}
        
        Compliance Requirements:
        {', '.join(frameworks)}
        
        Additional Context:
        {json.dumps(context.get('additional_context', {}), indent=2)}
        
        The scenario should be realistic, technically accurate, and fully compliant
        with the specified frameworks.
        """

    def _calculate_temperature(
        self,
        scenario_type: str,
        complexity_level: int
    ) -> float:
        """Calculates optimal temperature based on scenario parameters."""
        base_temperature = DEFAULT_TEMPERATURE
        
        # Adjust for complexity (higher complexity = lower temperature)
        complexity_factor = 1 - (complexity_level * 0.1)
        
        # Adjust for scenario type
        type_factors = {
            'security_incident': 0.9,
            'business_continuity': 0.8,
            'compliance_validation': 0.6
        }
        type_factor = type_factors.get(scenario_type, 1.0)
        
        return base_temperature * complexity_factor * type_factor