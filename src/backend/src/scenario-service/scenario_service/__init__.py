"""
Scenario Service Initialization Module

This module provides centralized configuration and service component exports for the
GameDay Platform's Scenario Service, implementing comprehensive error handling,
structured logging, and production-ready service initialization.

Version: 1.0.0
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram  # prometheus-client v0.17+
import time
from typing import Dict, Any

from scenario_service.config import Settings, load_settings
from scenario_service.controllers.scenario_controller import router
from scenario_service.services.scenario_generator import ScenarioGenerator

# Initialize metrics
REQUEST_COUNT = Counter(
    'scenario_service_requests_total',
    'Total number of requests processed'
)
REQUEST_LATENCY = Histogram(
    'scenario_service_request_latency_seconds',
    'Request latency in seconds'
)
ERROR_COUNT = Counter(
    'scenario_service_errors_total',
    'Total number of errors encountered'
)

# Initialize global settings
settings = load_settings()

# Configure logging
logger = logging.getLogger(__name__)

def configure_logging() -> None:
    """Configure structured logging with rotation and performance tracking."""
    
    logging_config = settings.service.logging_config
    
    logging.basicConfig(
        level=logging_config['level'],
        format=logging_config['format'],
        handlers=[
            logging.StreamHandler(),  # Console handler
            logging.handlers.RotatingFileHandler(
                filename='logs/scenario_service.log',
                maxBytes=10485760,  # 10MB
                backupCount=5,
                encoding='utf-8'
            )
        ]
    )
    
    # Set third-party loggers to WARNING
    logging.getLogger('uvicorn').setLevel(logging.WARNING)
    logging.getLogger('fastapi').setLevel(logging.WARNING)
    
    logger.info('Logging configured successfully')

def init_app() -> FastAPI:
    """Initialize the FastAPI application with comprehensive configuration."""
    
    # Configure logging first
    configure_logging()
    logger.info('Initializing Scenario Service')
    
    # Initialize FastAPI with enhanced documentation
    app = FastAPI(
        title='Scenario Service',
        description='AI-driven exercise scenario generation service',
        version='1.0.0',
        docs_url='/api/docs',
        redoc_url='/api/redoc'
    )
    
    # Configure CORS with security settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.security_config.get('allowed_origins', ['*']),
        allow_credentials=True,
        allow_methods=['GET', 'POST', 'PUT', 'DELETE'],
        allow_headers=['*'],
        max_age=600  # 10 minutes
    )
    
    # Add performance monitoring middleware
    @app.middleware('http')
    async def performance_middleware(request, call_next):
        REQUEST_COUNT.inc()
        start_time = time.time()
        
        try:
            response = await call_next(request)
            REQUEST_LATENCY.observe(time.time() - start_time)
            return response
        except Exception as e:
            ERROR_COUNT.inc()
            logger.error(f'Request failed: {str(e)}')
            return JSONResponse(
                status_code=500,
                content={'error': 'Internal server error'}
            )
    
    # Register API routes
    app.include_router(router)
    
    # Startup event handler
    @app.on_event('startup')
    async def startup_event():
        logger.info('Scenario Service starting up')
        # Initialize service connections and resources
        
    # Shutdown event handler
    @app.on_event('shutdown')
    async def shutdown_event():
        logger.info('Scenario Service shutting down')
        # Cleanup resources and connections
    
    # Health check endpoint
    @app.get('/health')
    async def health_check() -> Dict[str, Any]:
        return {
            'status': 'healthy',
            'version': app.version,
            'timestamp': time.time()
        }
    
    logger.info('Scenario Service initialized successfully')
    return app

# Initialize the FastAPI application
app = init_app()

# Export key components
__all__ = [
    'app',
    'settings',
    'ScenarioGenerator'
]

# Version information
__version__ = '1.0.0'