"""
MongoDB document model for generating, storing and managing comprehensive exercise analysis reports.
Provides support for performance metrics, gap analysis, compliance mapping and historical trends.

Version: 1.0.0
"""

from datetime import datetime
from enum import Enum, unique
from mongoengine import (  # version: 0.27+
    Document,
    StringField,
    DateTimeField,
    ListField,
    DictField,
    EnumField,
    ObjectIdField,
    IntField,
)

from .gap import GapModel
from .metric import MetricModel

@unique
class ReportType(str, Enum):
    """Enumeration of supported report types with extensibility for future additions."""
    EXERCISE_SUMMARY = "EXERCISE_SUMMARY"
    GAP_ANALYSIS = "GAP_ANALYSIS"
    PERFORMANCE_METRICS = "PERFORMANCE_METRICS"
    COMPLIANCE_COVERAGE = "COMPLIANCE_COVERAGE"
    HISTORICAL_TRENDS = "HISTORICAL_TRENDS"
    AGGREGATED_INSIGHTS = "AGGREGATED_INSIGHTS"
    TREND_ANALYSIS = "TREND_ANALYSIS"

@unique
class ReportStatus(str, Enum):
    """Enumeration of report generation and delivery status with detailed state tracking."""
    PENDING = "PENDING"
    GENERATING = "GENERATING"
    VALIDATING = "VALIDATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"

class ReportModel(Document):
    """
    MongoDB document model for storing exercise analysis reports with comprehensive 
    analytics capabilities.
    """

    # Document metadata
    id = ObjectIdField(primary_key=True)
    organization_id = StringField(required=True)
    exercise_id = StringField(required=True)
    report_type = EnumField(ReportType, required=True)
    title = StringField(required=True, max_length=200)
    description = StringField(required=True)
    metadata = DictField(default=dict)

    # Report content sections
    sections = ListField(DictField(), default=list)
    recommendations = ListField(DictField(), default=list)
    metrics_summary = DictField(default=dict)
    gaps_summary = ListField(DictField(), default=list)
    compliance_summary = DictField(default=dict)
    historical_trends = DictField(default=dict)
    trend_analysis = DictField(default=dict)

    # Status and tracking
    status = EnumField(ReportStatus, required=True, default=ReportStatus.PENDING)
    created_at = DateTimeField(required=True)
    completed_at = DateTimeField()
    last_updated_at = DateTimeField(required=True)
    created_by = StringField(required=True)
    
    # Output format and location
    format = StringField(required=True, choices=['PDF', 'HTML', 'JSON'])
    file_url = StringField()
    
    # Version control and audit
    version = IntField(required=True, default=1)
    audit_log = ListField(DictField(), default=list)

    meta = {
        'collection': 'reports',
        'indexes': [
            ('organization_id', 1),
            ('exercise_id', 1),
            ('report_type', 1),
            ('created_at', -1),
            ('status', 1),
            {
                'fields': ['organization_id', 'exercise_id'],
                'unique': True
            }
        ],
        'ordering': ['-created_at']
    }

    def __init__(self, organization_id: str, exercise_id: str, report_type: ReportType,
                 title: str, description: str, created_by: str, format: str,
                 metadata: dict = None, **kwargs):
        """
        Initialize a new report document with validation and audit logging.
        
        Args:
            organization_id: Organization identifier
            exercise_id: Exercise identifier
            report_type: Type of report to generate
            title: Report title
            description: Report description
            created_by: User identifier who created the report
            format: Output format (PDF, HTML, JSON)
            metadata: Additional metadata for the report
        """
        super().__init__(**kwargs)
        
        # Set required fields
        self.organization_id = organization_id
        self.exercise_id = exercise_id
        self.report_type = report_type
        self.title = title
        self.description = description
        self.created_by = created_by
        self.format = format
        
        # Set timestamps
        current_time = datetime.utcnow()
        self.created_at = current_time
        self.last_updated_at = current_time
        
        # Set metadata
        self.metadata = metadata or {}
        
        # Initialize audit log
        self.audit_log.append({
            'action': 'CREATED',
            'timestamp': current_time,
            'user_id': created_by,
            'details': {'report_type': report_type.value}
        })

    def add_section(self, title: str, content: dict, metadata: dict = None,
                   validate: bool = True) -> bool:
        """
        Add a new section to the report with validation and versioning.
        
        Args:
            title: Section title
            content: Section content
            metadata: Additional section metadata
            validate: Whether to validate content format
            
        Returns:
            bool: Success status of section addition
        """
        try:
            # Create section dictionary
            section = {
                'title': title,
                'content': content,
                'metadata': metadata or {},
                'added_at': datetime.utcnow()
            }
            
            # Validate section data if required
            if validate:
                if not title or not content:
                    raise ValueError("Section title and content are required")
                
                # Check for duplicate titles
                if any(s['title'] == title for s in self.sections):
                    raise ValueError(f"Section with title '{title}' already exists")
            
            # Add section and update metadata
            self.sections.append(section)
            self.version += 1
            self.last_updated_at = datetime.utcnow()
            
            # Add audit log entry
            self.audit_log.append({
                'action': 'SECTION_ADDED',
                'timestamp': datetime.utcnow(),
                'user_id': self.created_by,
                'details': {'section_title': title}
            })
            
            self.save()
            return True
            
        except Exception as e:
            return False

    def update_status(self, new_status: ReportStatus, file_url: str = None,
                     additional_metadata: dict = None) -> bool:
        """
        Update report generation status with validation and logging.
        
        Args:
            new_status: New status to set
            file_url: URL of generated report file
            additional_metadata: Additional metadata to update
            
        Returns:
            bool: Success status of update
        """
        try:
            # Validate status transition
            if self.status == ReportStatus.COMPLETED and new_status != ReportStatus.ARCHIVED:
                raise ValueError("Completed reports can only be archived")
            
            # Update status and related fields
            self.status = new_status
            self.last_updated_at = datetime.utcnow()
            
            if new_status == ReportStatus.COMPLETED:
                self.completed_at = self.last_updated_at
            
            if file_url:
                self.file_url = file_url
                
            if additional_metadata:
                self.metadata.update(additional_metadata)
            
            # Add audit log entry
            self.audit_log.append({
                'action': 'STATUS_UPDATED',
                'timestamp': self.last_updated_at,
                'user_id': self.created_by,
                'details': {
                    'new_status': new_status.value,
                    'file_url': file_url
                }
            })
            
            self.save()
            return True
            
        except Exception as e:
            return False

    def to_dict(self, include_metadata: bool = True,
                include_audit_log: bool = False) -> dict:
        """
        Convert report document to dictionary representation with caching.
        
        Args:
            include_metadata: Whether to include metadata
            include_audit_log: Whether to include audit log
            
        Returns:
            dict: Dictionary containing report data
        """
        report_dict = {
            'id': str(self.id),
            'organization_id': self.organization_id,
            'exercise_id': self.exercise_id,
            'report_type': self.report_type.value,
            'title': self.title,
            'description': self.description,
            'status': self.status.value,
            'sections': self.sections,
            'recommendations': self.recommendations,
            'metrics_summary': self.metrics_summary,
            'gaps_summary': self.gaps_summary,
            'compliance_summary': self.compliance_summary,
            'historical_trends': self.historical_trends,
            'trend_analysis': self.trend_analysis,
            'created_at': self.created_at.isoformat(),
            'last_updated_at': self.last_updated_at.isoformat(),
            'created_by': self.created_by,
            'format': self.format,
            'file_url': self.file_url,
            'version': self.version
        }
        
        if self.completed_at:
            report_dict['completed_at'] = self.completed_at.isoformat()
            
        if include_metadata:
            report_dict['metadata'] = self.metadata
            
        if include_audit_log:
            report_dict['audit_log'] = self.audit_log
            
        return report_dict