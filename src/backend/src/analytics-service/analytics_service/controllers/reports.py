"""
Reports Controller Module

Provides comprehensive FastAPI endpoints for report generation, retrieval, and management
with enhanced support for compliance mapping, performance metrics, and historical trends.

Version: 1.0.0
"""

# External imports
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Response  # version: 0.100+
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime

# Internal imports
from ..models.report import ReportModel, ReportType, ReportStatus
from ..services.report_generator import ReportGenerator

# Initialize router with prefix and tags
router = APIRouter(
    prefix="/api/v1",
    tags=["reports"]
)

class ReportRequest(BaseModel):
    """Enhanced request model for report generation with comprehensive options."""
    organization_id: str = Field(..., description="Organization identifier")
    exercise_id: str = Field(..., description="Exercise identifier")
    report_type: ReportType = Field(..., description="Type of report to generate")
    options: Optional[Dict] = Field(default=None, description="Additional report options")
    frameworks: Optional[List[str]] = Field(default=None, description="Compliance frameworks to analyze")
    format: Optional[str] = Field(default="PDF", description="Report output format")

    class Config:
        use_enum_values = True

class ReportResponse(BaseModel):
    """Enhanced response model for report details with extended metadata."""
    report_id: str = Field(..., description="Unique report identifier")
    status: str = Field(..., description="Report generation status")
    file_url: Optional[str] = Field(None, description="URL to download report")
    content: Optional[Dict] = Field(None, description="Report content for JSON format")
    metadata: Optional[Dict] = Field(None, description="Additional report metadata")
    available_formats: Optional[List[str]] = Field(default=["PDF", "HTML", "JSON"])

async def get_report_generator() -> ReportGenerator:
    """
    FastAPI dependency for report generator service with enhanced caching.
    
    Returns:
        ReportGenerator: Initialized report generator instance
    """
    from ..services.gap_analyzer import GapAnalyzer
    from ..services.metric_processor import MetricProcessor
    
    # Initialize dependencies with configuration
    metric_processor = MetricProcessor()
    gap_analyzer = GapAnalyzer(metric_processor=metric_processor)
    
    # Initialize report generator with enhanced capabilities
    config = {
        'template_path': 'templates/reports',
        'aws_region': 'us-west-2',  # TODO: Get from config
        's3_bucket': 'gameday-reports'
    }
    
    return ReportGenerator(
        gap_analyzer=gap_analyzer,
        metric_processor=metric_processor,
        config=config
    )

@router.post('/reports', response_model=ReportResponse)
async def create_report(
    request: ReportRequest,
    background_tasks: BackgroundTasks,
    report_generator: ReportGenerator = Depends(get_report_generator)
) -> ReportResponse:
    """
    Create a new report with enhanced validation and background processing.
    
    Args:
        request: Report generation request details
        background_tasks: FastAPI background task manager
        report_generator: Report generator service instance
        
    Returns:
        ReportResponse: Initial report status with metadata
    """
    try:
        # Validate report type and format
        if request.format not in ["PDF", "HTML", "JSON"]:
            raise HTTPException(
                status_code=400,
                detail="Unsupported format. Must be PDF, HTML, or JSON"
            )

        # Create initial report document
        report = ReportModel(
            organization_id=request.organization_id,
            exercise_id=request.exercise_id,
            report_type=request.report_type,
            title=f"{request.report_type.value} Report - {request.exercise_id}",
            description=f"Comprehensive analysis report for exercise {request.exercise_id}",
            created_by="system",  # TODO: Get from auth context
            format=request.format,
            metadata={
                "frameworks": request.frameworks,
                "options": request.options,
                "requested_at": datetime.utcnow().isoformat()
            }
        )
        
        # Add report generation to background tasks
        background_tasks.add_task(
            report_generator.generate_report,
            organization_id=request.organization_id,
            exercise_id=request.exercise_id,
            report_type=request.report_type,
            format=request.format,
            created_by="system",  # TODO: Get from auth context
            options=request.options
        )
        
        return ReportResponse(
            report_id=str(report.id),
            status=ReportStatus.PENDING.value,
            metadata=report.metadata,
            available_formats=["PDF", "HTML", "JSON"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating report: {str(e)}"
        )

@router.get('/reports/{report_id}', response_model=ReportResponse)
async def get_report(
    report_id: str,
    report_generator: ReportGenerator = Depends(get_report_generator)
) -> ReportResponse:
    """
    Retrieve report details with enhanced content negotiation.
    
    Args:
        report_id: Unique report identifier
        report_generator: Report generator service instance
        
    Returns:
        ReportResponse: Report details with content and metadata
    """
    try:
        # Retrieve report document
        report = ReportModel.objects(id=report_id).first()
        if not report:
            raise HTTPException(
                status_code=404,
                detail=f"Report {report_id} not found"
            )
            
        return ReportResponse(
            report_id=str(report.id),
            status=report.status.value,
            file_url=report.file_url,
            content=report.to_dict() if report.format == "JSON" else None,
            metadata=report.metadata,
            available_formats=["PDF", "HTML", "JSON"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving report: {str(e)}"
        )

@router.get('/reports/{report_id}/export', response_class=Response)
async def export_report(
    report_id: str,
    format: str,
    report_generator: ReportGenerator = Depends(get_report_generator)
) -> Response:
    """
    Export report in specified format with enhanced content handling.
    
    Args:
        report_id: Unique report identifier
        format: Desired export format
        report_generator: Report generator service instance
        
    Returns:
        Response: Formatted report content with appropriate headers
    """
    try:
        # Validate format
        if format not in ["PDF", "HTML", "JSON"]:
            raise HTTPException(
                status_code=400,
                detail="Unsupported format. Must be PDF, HTML, or JSON"
            )
            
        # Retrieve report
        report = ReportModel.objects(id=report_id).first()
        if not report:
            raise HTTPException(
                status_code=404,
                detail=f"Report {report_id} not found"
            )
            
        # Check report status
        if report.status != ReportStatus.COMPLETED:
            raise HTTPException(
                status_code=400,
                detail="Report generation not completed"
            )
            
        # Get content type based on format
        content_types = {
            "PDF": "application/pdf",
            "HTML": "text/html",
            "JSON": "application/json"
        }
        
        # Export report in requested format
        content = await report_generator._format_report(
            content=report.to_dict(),
            template_name=f"{report.report_type.value.lower()}.html",
            format=format
        )
        
        return Response(
            content=content,
            media_type=content_types[format],
            headers={
                "Content-Disposition": f"attachment; filename=report_{report_id}.{format.lower()}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error exporting report: {str(e)}"
        )

@router.delete('/reports/{report_id}')
async def delete_report(
    report_id: str,
    report_generator: ReportGenerator = Depends(get_report_generator)
) -> Dict:
    """
    Delete report with enhanced cleanup and cascade options.
    
    Args:
        report_id: Unique report identifier
        report_generator: Report generator service instance
        
    Returns:
        Dict: Deletion confirmation with cleanup status
    """
    try:
        # Retrieve report
        report = ReportModel.objects(id=report_id).first()
        if not report:
            raise HTTPException(
                status_code=404,
                detail=f"Report {report_id} not found"
            )
            
        # Delete report file from S3 if exists
        if report.file_url:
            # TODO: Implement S3 file deletion
            pass
            
        # Delete report document
        report.delete()
        
        return {
            "status": "success",
            "message": f"Report {report_id} deleted successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting report: {str(e)}"
        )