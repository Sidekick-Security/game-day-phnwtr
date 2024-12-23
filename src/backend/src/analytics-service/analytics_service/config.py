"""
Analytics Service Configuration Module

Provides secure configuration management for the Analytics Service with enhanced validation,
security features, and performance optimizations. Implements configuration interfaces
defined in the shared backend configuration.

Version: 1.0.0
"""

import os
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, SecretStr, validator, root_validator
from pydantic.dataclasses import dataclass
from dotenv import load_dotenv
import re
from functools import lru_cache

# Constants for validation
ALLOWED_ENVIRONMENTS = {"dev", "staging", "prod"}
MIN_PORT = 1024
MAX_PORT = 65535
VERSION_PATTERN = re.compile(r"^\d+\.\d+\.\d+$")
DEFAULT_POOL_SIZE = {"dev": 5, "staging": 10, "prod": 20}

@dataclass(frozen=True)
class ServiceConfig(BaseModel):
    """Service-level configuration with enhanced security validation."""
    
    name: str = Field(default="analytics-service", const=True)
    environment: str = Field(..., regex="^(dev|staging|prod)$")
    port: int = Field(..., ge=MIN_PORT, le=MAX_PORT)
    version: str = Field(..., regex=VERSION_PATTERN.pattern)
    correlation_id_header: str = Field(default="X-Correlation-ID")
    security_headers: Dict[str, str] = Field(default_factory=lambda: {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
    })

    @validator("environment")
    def validate_environment(cls, v):
        if v not in ALLOWED_ENVIRONMENTS:
            raise ValueError(f"Environment must be one of {ALLOWED_ENVIRONMENTS}")
        return v

@dataclass(frozen=True)
class DatabaseConfig(BaseModel):
    """Enhanced database connection configuration with security features."""
    
    host: str = Field(..., min_length=1)
    port: int = Field(..., ge=1024, le=65535)
    name: str = Field(..., min_length=1)
    username: str = Field(..., min_length=1)
    password: SecretStr = Field(...)
    options: Dict[str, str] = Field(default_factory=dict)
    pool_size: int = Field(default=10, ge=1, le=100)
    max_idle_time_ms: int = Field(default=30000)
    ssl_enabled: bool = Field(default=True)
    ssl_ca_cert_path: Optional[str] = Field(default=None)

    @root_validator
    def validate_ssl_config(cls, values):
        if values.get("ssl_enabled") and not values.get("ssl_ca_cert_path"):
            raise ValueError("SSL CA certificate path required when SSL is enabled")
        return values

@dataclass(frozen=True)
class MetricsConfig(BaseModel):
    """Enhanced metrics storage and processing configuration."""
    
    influxdb_host: str = Field(..., min_length=1)
    influxdb_port: int = Field(..., ge=1024, le=65535)
    influxdb_org: str = Field(..., min_length=1)
    influxdb_bucket: str = Field(..., min_length=1)
    influxdb_token: SecretStr = Field(...)
    retention_days: int = Field(default=90, ge=1)
    batch_size: int = Field(default=1000, ge=100, le=5000)
    flush_interval_seconds: int = Field(default=10, ge=1, le=60)
    tags: Dict[str, str] = Field(default_factory=dict)
    default_fields: List[str] = Field(default_factory=list)

    @validator("influxdb_bucket")
    def validate_bucket_name(cls, v):
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Invalid bucket name format")
        return v

@dataclass(frozen=True)
class LoggerConfig(BaseModel):
    """Enhanced logging configuration with security features."""
    
    level: str = Field(default="INFO")
    format: str = Field(default="json")
    filename: Optional[str] = Field(default=None)
    max_size: int = Field(default=10485760)  # 10MB
    max_files: int = Field(default=5)
    json_output: bool = Field(default=True)
    sanitize_fields: List[str] = Field(default_factory=lambda: [
        "password", "token", "secret", "key"
    ])
    excluded_paths: List[str] = Field(default_factory=list)
    correlation_id_field: str = Field(default="correlation_id")

    @validator("level")
    def validate_log_level(cls, v):
        allowed_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        if v.upper() not in allowed_levels:
            raise ValueError(f"Log level must be one of {allowed_levels}")
        return v.upper()

@dataclass(frozen=True)
class Config(BaseModel):
    """Root configuration class with enhanced security and validation."""
    
    service: ServiceConfig
    database: DatabaseConfig
    metrics: MetricsConfig
    logger: LoggerConfig
    security_settings: Dict[str, str] = Field(default_factory=dict)
    feature_flags: Dict[str, bool] = Field(default_factory=dict)

    _instance: Optional["Config"] = None

    @classmethod
    def load_config(cls, env_file: Optional[str] = None, overrides: Dict = None) -> "Config":
        """Load and validate configuration with security checks."""
        if env_file:
            load_dotenv(env_file, override=True)

        # Load service configuration
        service_config = ServiceConfig(
            environment=os.getenv("ENVIRONMENT", "dev"),
            port=int(os.getenv("PORT", "8080")),
            version=os.getenv("VERSION", "1.0.0")
        )

        # Load database configuration
        database_config = DatabaseConfig(
            host=os.getenv("DB_HOST", "localhost"),
            port=int(os.getenv("DB_PORT", "27017")),
            name=os.getenv("DB_NAME", "analytics"),
            username=os.getenv("DB_USERNAME"),
            password=SecretStr(os.getenv("DB_PASSWORD", "")),
            pool_size=DEFAULT_POOL_SIZE.get(service_config.environment, 10),
            ssl_enabled=os.getenv("DB_SSL_ENABLED", "true").lower() == "true",
            ssl_ca_cert_path=os.getenv("DB_SSL_CA_CERT_PATH")
        )

        # Load metrics configuration
        metrics_config = MetricsConfig(
            influxdb_host=os.getenv("INFLUXDB_HOST", "localhost"),
            influxdb_port=int(os.getenv("INFLUXDB_PORT", "8086")),
            influxdb_org=os.getenv("INFLUXDB_ORG", "gameday"),
            influxdb_bucket=os.getenv("INFLUXDB_BUCKET", "analytics"),
            influxdb_token=SecretStr(os.getenv("INFLUXDB_TOKEN", "")),
            retention_days=int(os.getenv("METRICS_RETENTION_DAYS", "90"))
        )

        # Load logger configuration
        logger_config = LoggerConfig(
            level=os.getenv("LOG_LEVEL", "INFO"),
            filename=os.getenv("LOG_FILE"),
            json_output=True
        )

        # Apply any configuration overrides
        if overrides:
            # Implementation would merge overrides securely
            pass

        # Create and validate complete configuration
        config = cls(
            service=service_config,
            database=database_config,
            metrics=metrics_config,
            logger=logger_config
        )

        cls._instance = config
        return config

    @classmethod
    @lru_cache(maxsize=1)
    def get_config(cls) -> "Config":
        """Get singleton configuration instance with validation."""
        if cls._instance is None:
            raise RuntimeError("Configuration not initialized. Call load_config first.")
        return cls._instance

    @root_validator
    def validate_complete_config(cls, values):
        """Validate complete configuration for security and consistency."""
        # Ensure production environment has appropriate security settings
        if values["service"].environment == "prod":
            if not values["database"].ssl_enabled:
                raise ValueError("SSL must be enabled in production")
            if not values["security_settings"]:
                raise ValueError("Security settings must be configured for production")
        return values

# Export configuration classes and functions
__all__ = [
    "Config",
    "ServiceConfig",
    "DatabaseConfig",
    "MetricsConfig",
    "LoggerConfig"
]