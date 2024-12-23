"""
Metrics Controller Module

FastAPI controller handling HTTP endpoints for exercise performance metrics management,
data retrieval, and analytics processing with enhanced caching and batch capabilities.

Version: 1.0.0
"""

# External imports - versions specified as per requirements
from fastapi import APIRouter, Depends, HTTPException, Query  # fastapi==0.100+
from pydantic import BaseModel, Field, validator  # pydantic==2.0+
from typing import Dict, List, Optional, Union  # python3.11+
from datetime import datetime, timedelta  # python3.11+
import redis  # redis==4.0+
from functools import lru_cache

# Internal imports
from ..models.metric import MetricModel
from ..services.metric_processor import MetricProcessor
from ..config import Config

# Initialize router with prefix and tags
router = APIRouter(
    prefix="/api/v1",
    tags=["metrics"]
)

# Initialize Redis client for caching
redis_client = redis.Redis(
    host=Config.get_config().service.redis_host,
    port=Config.get_config().service.redis_port,
    decode_responses=True
)

class MetricRequest(BaseModel):
    """Enhanced Pydantic model for metric submission requests with validation."""
    
    organization_id: str = Field(..., description="Organization identifier")
    exercise_id: str = Field(..., description="Exercise identifier")
    metric_type: str = Field(..., description="Type of metric being submitted")
    value: float = Field(..., description="Metric value")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    metadata: Optional[Dict] = Field(default={}, description="Additional metric metadata")
    tags: Optional[List[str]] = Field(default=[], description="Metric tags")
    dimensions: Optional[Dict] = Field(default={}, description="Metric dimensions")

    @validator("value")
    def validate_value(cls, v, values):
        """Validate metric value based on type and unit."""
        metric_type = values.get("metric_type")
        
        if metric_type == "percentage" and not 0 <= v <= 100:
            raise ValueError("Percentage values must be between 0 and 100")
        
        if metric_type == "response_time" and v < 0:
            raise ValueError("Response time cannot be negative")
            
        return v

    def to_model(self) -> MetricModel:
        """Convert request to MetricModel instance with metadata."""
        return MetricModel(
            organization_id=self.organization_id,
            exercise_id=self.exercise_id,
            metric_type=self.metric_type,
            value=self.value,
            unit=self.unit,
            metadata=self.metadata,
            tags=self.tags,
            timestamp=datetime.utcnow()
        )

@router.post("/metrics", response_model=Dict)
async def submit_metric(
    request: MetricRequest,
    batch_mode: Optional[bool] = Query(False, description="Enable batch processing"),
    batch_size: Optional[int] = Query(1000, description="Batch size for processing")
) -> Dict:
    """
    Submit metrics with enhanced batch processing and caching support.
    """
    try:
        processor = MetricProcessor()
        
        # Process metric
        metric_model = request.to_model()
        
        # Store metric with batch processing if enabled
        if batch_mode:
            success = processor.store_metric(
                organization_id=request.organization_id,
                exercise_id=request.exercise_id,
                metric_type=request.metric_type,
                value=request.value,
                metadata=request.metadata
            )
        else:
            success = metric_model.save()

        return {
            "status": "success" if success else "error",
            "metric_id": str(metric_model.id),
            "timestamp": metric_model.timestamp.isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics", response_model=Dict)
async def get_metrics(
    organization_id: str,
    exercise_id: str,
    metric_type: str,
    start_time: datetime,
    end_time: datetime,
    page: Optional[int] = Query(1, ge=1),
    page_size: Optional[int] = Query(50, ge=1, le=1000),
    filters: Optional[Dict] = Query(None)
) -> Dict:
    """
    Retrieve metrics with enhanced filtering and pagination support.
    """
    try:
        # Check cache first
        cache_key = f"metrics:{organization_id}:{exercise_id}:{metric_type}:{start_time}:{end_time}:{page}"
        cached_result = redis_client.get(cache_key)
        
        if cached_result:
            return cached_result

        # Query metrics
        metrics = MetricModel.get_metrics_by_timerange(
            start_time=start_time,
            end_time=end_time,
            organization_id=organization_id,
            metric_type=metric_type,
            batch_size=page_size
        )

        # Apply filters if provided
        if filters:
            metrics = [m for m in metrics if all(
                m.metadata.get(k) == v for k, v in filters.items()
            )]

        # Paginate results
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_metrics = metrics[start_idx:end_idx]

        result = {
            "data": [m.to_dict() for m in paginated_metrics],
            "page": page,
            "page_size": page_size,
            "total_count": len(metrics)
        }

        # Cache result
        redis_client.setex(
            cache_key,
            timedelta(minutes=5),
            str(result)
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/statistics", response_model=Dict)
async def get_metric_statistics(
    exercise_id: str,
    metric_type: str,
    start_time: datetime,
    end_time: datetime
) -> Dict:
    """
    Retrieve comprehensive metric statistics with enhanced analysis.
    """
    try:
        processor = MetricProcessor()
        
        statistics = processor.calculate_statistics(
            exercise_id=exercise_id,
            metric_type=metric_type,
            start_time=start_time,
            end_time=end_time
        )
        
        return {
            "status": "success",
            "statistics": statistics
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/timeseries", response_model=Dict)
async def get_time_series(
    organization_id: str,
    metric_type: str,
    start_time: datetime,
    end_time: datetime,
    interval: str = "1h"
) -> Dict:
    """
    Generate time series data with enhanced analysis capabilities.
    """
    try:
        processor = MetricProcessor()
        
        time_series = processor.generate_time_series(
            organization_id=organization_id,
            metric_type=metric_type,
            start_time=start_time,
            end_time=end_time,
            interval=interval
        )
        
        return {
            "status": "success",
            "time_series": time_series.to_dict()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Export router for FastAPI application
__all__ = ["router"]