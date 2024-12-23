"""
Configuration module for the Scenario Service.
Provides centralized configuration management with enhanced security and performance features.

Version: 1.0.0
"""

from os import environ
from typing import Dict, Any, Optional
from pydantic import BaseSettings, Field, SecretStr  # pydantic v2.0.3
from dotenv import load_dotenv  # python-dotenv v1.0.0

# Default configuration constants
DEFAULT_SERVICE_NAME = "scenario-service"
DEFAULT_SERVICE_PORT = 8003
DEFAULT_DB_PORT = 27017
DEFAULT_LLM_PROVIDER = "openai"
DEFAULT_MODEL_VERSION = "gpt-4"
DEFAULT_POOL_SIZE = 100
DEFAULT_TIMEOUT_MS = 5000
DEFAULT_RETRY_ATTEMPTS = 3
DEFAULT_CACHE_TTL = 3600

class ServiceSettings(BaseSettings):
    """Service-level configuration settings with enhanced validation."""
    
    name: str = Field(
        default=DEFAULT_SERVICE_NAME,
        description="Service identifier"
    )
    environment: str = Field(
        default="development",
        description="Deployment environment"
    )
    port: int = Field(
        default=DEFAULT_SERVICE_PORT,
        description="Service port number"
    )
    version: str = Field(
        default="1.0.0",
        description="Service version"
    )
    logging_config: Dict[str, Any] = Field(
        default={
            "level": "INFO",
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "handlers": ["console", "file"],
            "rotation": "1 day",
            "retention": "30 days"
        },
        description="Logging configuration"
    )
    monitoring_config: Dict[str, Any] = Field(
        default={
            "metrics_enabled": True,
            "tracing_enabled": True,
            "health_check_interval": 30,
            "performance_monitoring": True
        },
        description="Monitoring configuration"
    )

class DatabaseSettings(BaseSettings):
    """MongoDB database configuration settings with connection pooling and security."""
    
    host: str = Field(
        default="localhost",
        description="Database host"
    )
    port: int = Field(
        default=DEFAULT_DB_PORT,
        description="Database port"
    )
    name: str = Field(
        default="gameday",
        description="Database name"
    )
    username: SecretStr = Field(
        default=None,
        description="Database username"
    )
    password: SecretStr = Field(
        default=None,
        description="Database password"
    )
    pool_config: Dict[str, Any] = Field(
        default={
            "min_pool_size": 10,
            "max_pool_size": DEFAULT_POOL_SIZE,
            "max_idle_time_ms": 50000
        },
        description="Connection pool configuration"
    )
    ssl_config: Dict[str, Any] = Field(
        default={
            "enabled": True,
            "certificate_verify": True,
            "ca_certs": "/etc/ssl/certs/ca-certificates.crt"
        },
        description="SSL configuration"
    )
    timeout_config: Dict[str, int] = Field(
        default={
            "connect_timeout_ms": DEFAULT_TIMEOUT_MS,
            "server_selection_timeout_ms": DEFAULT_TIMEOUT_MS,
            "socket_timeout_ms": DEFAULT_TIMEOUT_MS
        },
        description="Timeout configuration"
    )
    retry_config: Dict[str, Any] = Field(
        default={
            "max_attempts": DEFAULT_RETRY_ATTEMPTS,
            "retry_interval_ms": 1000,
            "exponential_backoff": True
        },
        description="Retry configuration"
    )

class LLMSettings(BaseSettings):
    """Enhanced LLM service configuration settings with performance optimization."""
    
    provider: str = Field(
        default=DEFAULT_LLM_PROVIDER,
        description="LLM provider name"
    )
    api_key: SecretStr = Field(
        default=None,
        description="LLM API key"
    )
    model_version: str = Field(
        default=DEFAULT_MODEL_VERSION,
        description="LLM model version"
    )
    temperature: float = Field(
        default=0.7,
        description="LLM temperature parameter"
    )
    max_tokens: int = Field(
        default=2048,
        description="Maximum tokens per request"
    )
    retry_config: Dict[str, Any] = Field(
        default={
            "max_attempts": DEFAULT_RETRY_ATTEMPTS,
            "initial_delay": 1,
            "exponential_base": 2,
            "jitter": True
        },
        description="LLM retry configuration"
    )
    cache_config: Dict[str, Any] = Field(
        default={
            "enabled": True,
            "ttl_seconds": DEFAULT_CACHE_TTL,
            "max_size_mb": 1024,
            "eviction_policy": "LRU"
        },
        description="LLM response caching configuration"
    )
    rate_limit_config: Dict[str, Any] = Field(
        default={
            "requests_per_minute": 60,
            "burst_size": 10,
            "throttling_enabled": True
        },
        description="Rate limiting configuration"
    )
    performance_config: Dict[str, Any] = Field(
        default={
            "timeout_seconds": 30,
            "batch_size": 10,
            "concurrent_requests": 5,
            "streaming_enabled": True
        },
        description="Performance optimization configuration"
    )

class Settings(BaseSettings):
    """Root configuration class with enhanced validation and security."""
    
    service: ServiceSettings = Field(
        default_factory=ServiceSettings,
        description="Service settings"
    )
    database: DatabaseSettings = Field(
        default_factory=DatabaseSettings,
        description="Database settings"
    )
    llm: LLMSettings = Field(
        default_factory=LLMSettings,
        description="LLM settings"
    )
    security_config: Dict[str, Any] = Field(
        default={
            "encryption_enabled": True,
            "tls_version": "1.3",
            "min_password_length": 12,
            "require_mfa": True,
            "session_timeout_minutes": 30
        },
        description="Security configuration"
    )
    metrics_config: Dict[str, Any] = Field(
        default={
            "enabled": True,
            "collection_interval": 15,
            "retention_days": 30,
            "detailed_tracing": True
        },
        description="Metrics configuration"
    )

    def __init__(self, **kwargs):
        """Initialize settings with enhanced validation."""
        load_dotenv()  # Load environment variables
        super().__init__(**kwargs)
        self.validate_security()

    def get_llm_config(self) -> Dict[str, Any]:
        """Retrieve secure LLM configuration."""
        config = {
            "provider": self.llm.provider,
            "model_version": self.llm.model_version,
            "temperature": self.llm.temperature,
            "max_tokens": self.llm.max_tokens,
            "retry_config": self.llm.retry_config,
            "cache_config": self.llm.cache_config,
            "rate_limit_config": self.llm.rate_limit_config,
            "performance_config": self.llm.performance_config
        }
        # API key is handled separately for security
        return config

    def get_database_url(self) -> str:
        """Construct secure database URL."""
        auth_string = ""
        if self.database.username and self.database.password:
            auth_string = (
                f"{self.database.username.get_secret_value()}:"
                f"{self.database.password.get_secret_value()}@"
            )
        
        return (
            f"mongodb://{auth_string}{self.database.host}:"
            f"{self.database.port}/{self.database.name}"
        )

    def validate_security(self) -> bool:
        """Validate security configuration."""
        security_requirements = [
            self.security_config["encryption_enabled"],
            self.database.ssl_config["enabled"],
            len(str(self.llm.api_key.get_secret_value())) > 0 if self.llm.api_key else False,
            self.security_config["tls_version"] >= "1.2"
        ]
        return all(security_requirements)

def load_settings() -> Settings:
    """Load and initialize application settings with security validation."""
    try:
        settings = Settings()
        if not settings.validate_security():
            raise ValueError("Security validation failed")
        return settings
    except Exception as e:
        raise RuntimeError(f"Failed to load settings: {str(e)}") from e