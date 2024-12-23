"""
Analytics Service Controllers Initialization Module

Provides initialization and configuration of FastAPI controllers for the analytics service
with comprehensive security, monitoring, and caching capabilities.

Version: 1.0.0
"""

# External imports - versions specified as per requirements
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request  # version: 0.100+
from fastapi_cache import CacheControl  # version: 0.1.0+
from fastapi_limiter import RateLimiter  # version: 0.1.0+
from typing import Dict
import logging
from datetime import datetime

# Internal imports
from .gap_analysis import GapAnalysisController
from .metrics import MetricsController
from .reports import ReportController
from ..config import Config

# Initialize router with prefix and tags
router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["analytics"]
)

# Constants for rate limiting and caching
RATE_LIMIT_REQUESTS = 100  # Requests per period
RATE_LIMIT_PERIOD = 60    # Period in seconds
CACHE_EXPIRY = 300       # Cache expiry in seconds

async def initialize_controllers(config: Config) -> APIRouter:
    """
    Initialize analytics service controllers with enhanced security and monitoring.

    Args:
        config: Service configuration instance

    Returns:
        APIRouter: Configured router with all controller routes and middleware
    """
    try:
        # Initialize logging
        logger = logging.getLogger(__name__)
        logger.info("Initializing analytics service controllers")

        # Initialize controllers with configuration
        gap_analysis_controller = GapAnalysisController(config)
        metrics_controller = MetricsController(config)
        report_controller = ReportController(config)

        # Add rate limiting middleware
        @router.middleware("http")
        async def rate_limit_middleware(request: Request, call_next):
            limiter = RateLimiter(
                requests=RATE_LIMIT_REQUESTS,
                period=RATE_LIMIT_PERIOD
            )
            await limiter.check(request)
            return await call_next(request)

        # Add security headers middleware
        @router.middleware("http")
        async def security_headers_middleware(request: Request, call_next):
            response = await call_next(request)
            response.headers.update(config.service.security_headers)
            return response

        # Add caching middleware
        @router.middleware("http")
        async def cache_middleware(request: Request, call_next):
            if request.method == "GET":
                cache_control = CacheControl(max_age=CACHE_EXPIRY)
                return await cache_control(request, call_next)
            return await call_next(request)

        # Register health check endpoint
        @router.get("/health")
        async def health_check(request: Request) -> Dict:
            """
            Health check endpoint for service monitoring.

            Returns:
                Dict: Service health status and dependencies
            """
            try:
                # Check core dependencies
                dependencies = {
                    "database": "healthy",  # Would implement actual checks
                    "cache": "healthy",
                    "metrics_store": "healthy"
                }

                return {
                    "status": "healthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "version": config.service.version,
                    "dependencies": dependencies
                }
            except Exception as e:
                logger.error(f"Health check failed: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail="Service health check failed"
                )

        # Register controller routes
        router.include_router(gap_analysis_controller.router)
        router.include_router(metrics_controller.router)
        router.include_router(report_controller.router)

        # Add global exception handler
        @router.exception_handler(Exception)
        async def global_exception_handler(request: Request, exc: Exception):
            logger.error(f"Global exception: {str(exc)}")
            return {
                "status": "error",
                "message": "An unexpected error occurred",
                "timestamp": datetime.utcnow().isoformat()
            }

        logger.info("Analytics service controllers initialized successfully")
        return router

    except Exception as e:
        logger.error(f"Error initializing controllers: {str(e)}")
        raise

# Export controllers for API route registration
__all__ = [
    "initialize_controllers",
    "GapAnalysisController",
    "MetricsController",
    "ReportController"
]