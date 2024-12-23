"""
Analytics Service Entry Point Module

Provides initialization and configuration of the FastAPI application for the analytics service
with comprehensive security, monitoring, and error handling capabilities.

Version: 1.0.0
"""

# External imports - versions specified as per requirements
from fastapi import FastAPI, HTTPException, Request, Response  # version: 0.100+
from fastapi.middleware.cors import CORSMiddleware  # version: 0.100+
from fastapi.responses import JSONResponse
import logging
import logging.config
from datetime import datetime
from typing import Dict
import traceback
from prometheus_client import Counter, Histogram  # version: 0.17+
import uuid

# Internal imports
from .config import Config
from .controllers import initialize_controllers

# Service version
__version__ = "1.0.0"

# Initialize logging
logging.config.dictConfig({
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            'class': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s'
        }
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
            'stream': 'ext://sys.stdout'
        }
    },
    'root': {
        'level': 'INFO',
        'handlers': ['console']
    }
})

logger = logging.getLogger(__name__)

# Initialize Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint']
)

# Initialize FastAPI application with enhanced configuration
app = FastAPI(
    title="Analytics Service",
    version=__version__,
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
    redoc_url="/api/redoc"
)

@app.middleware("http")
async def correlation_middleware(request: Request, call_next):
    """Add correlation ID to request context for tracing."""
    correlation_id = request.headers.get('X-Correlation-ID', str(uuid.uuid4()))
    request.state.correlation_id = correlation_id
    
    response = await call_next(request)
    response.headers['X-Correlation-ID'] = correlation_id
    return response

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Collect request metrics using Prometheus."""
    start_time = datetime.utcnow()
    
    response = await call_next(request)
    
    duration = (datetime.utcnow() - start_time).total_seconds()
    REQUEST_LATENCY.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)
    
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    return response

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with detailed error responses."""
    logger.error(f"HTTP error: {exc.detail}", extra={
        'correlation_id': getattr(request.state, 'correlation_id', None),
        'status_code': exc.status_code,
        'path': request.url.path
    })
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            'status': 'error',
            'message': exc.detail,
            'correlation_id': getattr(request.state, 'correlation_id', None),
            'timestamp': datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions with secure error responses."""
    logger.error(f"Unexpected error: {str(exc)}", extra={
        'correlation_id': getattr(request.state, 'correlation_id', None),
        'traceback': traceback.format_exc(),
        'path': request.url.path
    })
    
    return JSONResponse(
        status_code=500,
        content={
            'status': 'error',
            'message': 'An unexpected error occurred',
            'correlation_id': getattr(request.state, 'correlation_id', None),
            'timestamp': datetime.utcnow().isoformat()
        }
    )

@app.on_event("startup")
async def startup_event():
    """Initialize service dependencies and configuration on startup."""
    try:
        # Load configuration
        config = Config.load_config()
        
        # Configure CORS
        app.add_middleware(
            CORSMiddleware,
            allow_origins=config.service.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["X-Correlation-ID"]
        )
        
        # Initialize controllers
        router = await initialize_controllers(config)
        app.include_router(router)
        
        # Add security headers middleware
        @app.middleware("http")
        async def security_headers_middleware(request: Request, call_next):
            response = await call_next(request)
            response.headers.update(config.service.security_headers)
            return response
        
        logger.info("Analytics service initialized successfully", extra={
            'version': __version__,
            'environment': config.service.environment
        })
        
    except Exception as e:
        logger.error(f"Failed to initialize service: {str(e)}", extra={
            'traceback': traceback.format_exc()
        })
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on service shutdown."""
    logger.info("Shutting down analytics service")

@app.get("/health")
async def health_check() -> Dict:
    """Health check endpoint for service monitoring."""
    return {
        "status": "healthy",
        "version": __version__,
        "timestamp": datetime.utcnow().isoformat()
    }

# Export FastAPI application instance
__all__ = ["app"]