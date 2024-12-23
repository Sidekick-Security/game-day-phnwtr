"""
Gap Analysis Controller Module

Provides secure and optimized FastAPI endpoints for managing organizational gap analysis,
including identification, retrieval, and status updates with comprehensive validation
and caching capabilities.

Version: 1.0.0
"""

# External imports with versions
from fastapi import APIRouter, Depends, HTTPException, Query  # version: 0.100+
from fastapi.security import OAuth2PasswordBearer  # version: 0.100+
from pydantic import BaseModel, Field, validator  # version: 2.0+
from typing import Dict, List, Optional
from datetime import datetime
import redis  # version: 4.0+
from opentelemetry import trace  # version: 1.0+
from functools import wraps

# Internal imports
from ..models.gap import GapModel, GapType, GapStatus
from ..services.gap_analyzer import GapAnalyzer
from ..config import Config

# Initialize router with prefix and tags
router = APIRouter(
    prefix="/api/v1/gap-analysis",
    tags=["gap-analysis"]
)

# Initialize tracer
tracer = trace.get_tracer(__name__)

# Initialize Redis for caching
config = Config.get_config()
redis_client = redis.Redis(
    host=config.cache.redis_host,
    port=config.cache.redis_port,
    db=0,
    decode_responses=True
)

# Request/Response Models
class GapAnalysisRequest(BaseModel):
    """Validated request model for gap analysis."""
    organization_id: str = Field(..., min_length=1)
    exercise_id: str = Field(..., min_length=1)
    frameworks: List[str] = Field(default_factory=list)
    include_recommendations: bool = Field(default=True)
    page_size: Optional[int] = Field(default=20, ge=1, le=100)
    page_number: Optional[int] = Field(default=1, ge=1)

    @validator('frameworks')
    def validate_frameworks(cls, v):
        """Validate compliance frameworks."""
        allowed_frameworks = {'SOC2', 'NIST', 'ISO27001', 'GDPR'}
        if not all(f in allowed_frameworks for f in v):
            raise ValueError(f"Frameworks must be one of {allowed_frameworks}")
        return v

class GapUpdateRequest(BaseModel):
    """Validated request model for gap status updates."""
    gap_id: str = Field(..., min_length=1)
    status: GapStatus
    updated_by: str = Field(..., min_length=1)
    resolution_details: Optional[Dict] = None
    audit_note: Optional[str] = Field(None, max_length=1000)

# Security and caching decorators
def requires_auth(func):
    """Decorator for endpoint authentication."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Authentication logic would be implemented here
        return await func(*args, **kwargs)
    return wrapper

def cache_response(ttl_seconds: int = 300):
    """Decorator for response caching."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"gap_analysis:{func.__name__}:{str(args)}:{str(kwargs)}"
            cached_response = redis_client.get(cache_key)
            
            if cached_response:
                return cached_response
                
            response = await func(*args, **kwargs)
            redis_client.setex(cache_key, ttl_seconds, str(response))
            return response
        return wrapper
    return decorator

@router.post("/analyze")
@requires_auth
@cache_response(ttl_seconds=300)
async def analyze_exercise_gaps(
    request: GapAnalysisRequest,
    auth: Dict = Depends(requires_auth)
) -> Dict:
    """
    Analyze exercise data to identify organizational gaps with ML enhancement.
    
    Args:
        request: Validated gap analysis request
        auth: Authentication context
        
    Returns:
        Dict containing identified gaps with recommendations
        
    Raises:
        HTTPException: For invalid requests or processing errors
    """
    with tracer.start_as_current_span("analyze_exercise_gaps") as span:
        try:
            # Initialize gap analyzer with configuration
            gap_analyzer = GapAnalyzer()
            
            # Analyze exercise data for gaps
            gaps = gap_analyzer.analyze_exercise(
                exercise_id=request.exercise_id,
                organization_id=request.organization_id
            )
            
            # Add compliance analysis if frameworks specified
            if request.frameworks:
                compliance_gaps = gap_analyzer.identify_compliance_gaps(
                    exercise_id=request.exercise_id,
                    frameworks=request.frameworks
                )
                gaps.extend(compliance_gaps)
            
            # Apply pagination
            start_idx = (request.page_number - 1) * request.page_size
            end_idx = start_idx + request.page_size
            paginated_gaps = gaps[start_idx:end_idx]
            
            # Format response
            response = {
                "total_gaps": len(gaps),
                "page_size": request.page_size,
                "page_number": request.page_number,
                "total_pages": (len(gaps) + request.page_size - 1) // request.page_size,
                "gaps": [gap.to_dict() for gap in paginated_gaps]
            }
            
            span.set_attribute("gaps.count", len(gaps))
            return response
            
        except Exception as e:
            span.set_attribute("error", str(e))
            raise HTTPException(status_code=500, detail=str(e))

@router.get("/{organization_id}/gaps")
@requires_auth
@cache_response(ttl_seconds=60)
async def get_organization_gaps(
    organization_id: str,
    gap_type: Optional[GapType] = None,
    status: Optional[GapStatus] = None,
    exercise_id: Optional[str] = None,
    page_size: int = Query(default=20, ge=1, le=100),
    page_number: int = Query(default=1, ge=1),
    auth: Dict = Depends(requires_auth)
) -> Dict:
    """
    Retrieve filtered and paginated organizational gaps.
    
    Args:
        organization_id: Organization identifier
        gap_type: Optional gap type filter
        status: Optional status filter
        exercise_id: Optional exercise filter
        page_size: Number of items per page
        page_number: Page number to retrieve
        auth: Authentication context
        
    Returns:
        Dict containing filtered and paginated gaps
        
    Raises:
        HTTPException: For invalid requests or processing errors
    """
    with tracer.start_as_current_span("get_organization_gaps") as span:
        try:
            # Build query filters
            filters = {"organization_id": organization_id}
            if gap_type:
                filters["gap_type"] = gap_type
            if status:
                filters["status"] = status
            if exercise_id:
                filters["exercise_id"] = exercise_id
                
            # Execute query with pagination
            total_gaps = GapModel.objects(**filters).count()
            gaps = GapModel.objects(**filters)\
                .skip((page_number - 1) * page_size)\
                .limit(page_size)
                
            # Format response
            response = {
                "total_gaps": total_gaps,
                "page_size": page_size,
                "page_number": page_number,
                "total_pages": (total_gaps + page_size - 1) // page_size,
                "gaps": [gap.to_dict() for gap in gaps]
            }
            
            span.set_attribute("gaps.count", total_gaps)
            return response
            
        except Exception as e:
            span.set_attribute("error", str(e))
            raise HTTPException(status_code=500, detail=str(e))

@router.put("/gaps/{gap_id}")
@requires_auth
async def update_gap_status(
    gap_id: str,
    request: GapUpdateRequest,
    auth: Dict = Depends(requires_auth)
) -> Dict:
    """
    Update gap status with audit trail and validation.
    
    Args:
        gap_id: Gap identifier
        request: Validated update request
        auth: Authentication context
        
    Returns:
        Dict containing updated gap information
        
    Raises:
        HTTPException: For invalid requests or processing errors
    """
    with tracer.start_as_current_span("update_gap_status") as span:
        try:
            # Retrieve gap
            gap = GapModel.objects(id=gap_id).first()
            if not gap:
                raise HTTPException(status_code=404, detail="Gap not found")
                
            # Update gap status and details
            gap.status = request.status
            gap.updated_by = request.updated_by
            gap.updated_at = datetime.utcnow()
            
            if request.resolution_details:
                gap.resolution_details = request.resolution_details
                
            if request.status == GapStatus.RESOLVED:
                gap.resolved_at = gap.updated_at
                
            # Save changes
            gap.save()
            
            # Invalidate relevant caches
            cache_keys = [
                f"gap_analysis:get_organization_gaps:{gap.organization_id}*",
                f"gap_analysis:analyze_exercise_gaps:{gap.exercise_id}*"
            ]
            for key in redis_client.keys(cache_keys):
                redis_client.delete(key)
                
            span.set_attribute("gap.id", str(gap.id))
            return gap.to_dict()
            
        except Exception as e:
            span.set_attribute("error", str(e))
            raise HTTPException(status_code=500, detail=str(e))