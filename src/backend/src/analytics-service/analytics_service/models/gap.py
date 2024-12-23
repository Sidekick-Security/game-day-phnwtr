"""
MongoDB document model for representing and persisting identified gaps in organizational 
capabilities, processes, and compliance discovered during exercise analysis.

Version: 1.0
"""

from datetime import datetime
from enum import Enum, unique
from mongoengine import (  # version: 0.27+
    Document,
    StringField,
    DateTimeField,
    ReferenceField,
    ListField,
    DictField,
    EnumField,
)


@unique
class GapType(str, Enum):
    """Enumeration of possible gap types identified during analysis."""
    PEOPLE = "PEOPLE"
    PROCESS = "PROCESS"
    TECHNOLOGY = "TECHNOLOGY"
    COMPLIANCE = "COMPLIANCE"


@unique
class GapSeverity(str, Enum):
    """Enumeration of gap severity levels."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@unique
class GapStatus(str, Enum):
    """Enumeration of gap remediation status."""
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    ACCEPTED = "ACCEPTED"


class GapModel(Document):
    """
    MongoDB document model for storing identified gaps.
    
    This model captures gaps identified during exercise analysis including their type,
    severity, status, and associated recommendations for remediation.
    """

    # Document metadata
    organization_id = StringField(required=True)
    exercise_id = StringField(required=True)
    
    # Gap classification
    gap_type = EnumField(GapType, required=True)
    title = StringField(required=True, max_length=200)
    description = StringField(required=True)
    severity = EnumField(GapSeverity, required=True)
    status = EnumField(GapStatus, required=True, default=GapStatus.OPEN)
    
    # Impact and compliance
    affected_areas = ListField(StringField(), required=True)
    compliance_frameworks = ListField(StringField())
    
    # Analysis data
    metrics = DictField()
    recommendations = ListField(DictField())
    resolution_details = DictField()
    
    # Timestamps
    identified_at = DateTimeField(required=True)
    updated_at = DateTimeField(required=True)
    resolved_at = DateTimeField()
    
    # Audit fields
    created_by = StringField(required=True)
    updated_by = StringField(required=True)
    
    # MongoDB metadata
    meta = {
        'collection': 'gaps',
        'indexes': [
            'organization_id',
            'exercise_id',
            'gap_type',
            'severity',
            'status',
            'identified_at'
        ],
        'ordering': ['-identified_at']
    }

    def __init__(self, **kwargs):
        """
        Initialize a new gap document with default values.
        
        Args:
            **kwargs: Keyword arguments for document fields
        """
        super().__init__(**kwargs)
        
        # Set default timestamps if not provided
        if not self.identified_at:
            self.identified_at = datetime.utcnow()
        if not self.updated_at:
            self.updated_at = self.identified_at
            
        # Initialize empty collections if not provided
        if not self.recommendations:
            self.recommendations = []
        if not self.metrics:
            self.metrics = {}

    def to_dict(self) -> dict:
        """
        Convert the gap document to a dictionary representation.
        
        Returns:
            dict: Dictionary representation of the gap document
        """
        return {
            'id': str(self.id),
            'organization_id': self.organization_id,
            'exercise_id': self.exercise_id,
            'gap_type': self.gap_type.value,
            'title': self.title,
            'description': self.description,
            'severity': self.severity.value,
            'status': self.status.value,
            'affected_areas': self.affected_areas,
            'compliance_frameworks': self.compliance_frameworks,
            'metrics': self.metrics,
            'recommendations': self.recommendations,
            'resolution_details': self.resolution_details,
            'identified_at': self.identified_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'created_by': self.created_by,
            'updated_by': self.updated_by
        }

    def update_status(self, new_status: GapStatus, updated_by: str, 
                     resolution_details: dict = None) -> bool:
        """
        Update the gap status and related fields.
        
        Args:
            new_status (GapStatus): New status to set
            updated_by (str): ID of user making the update
            resolution_details (dict, optional): Details about gap resolution
            
        Returns:
            bool: True if update was successful, False otherwise
            
        Raises:
            ValueError: If invalid status transition is attempted
        """
        # Validate status transition
        if self.status == GapStatus.RESOLVED and new_status != GapStatus.RESOLVED:
            raise ValueError("Cannot reopen a resolved gap")
            
        # Update status and metadata
        self.status = new_status
        self.updated_at = datetime.utcnow()
        self.updated_by = updated_by
        
        # Set resolution timestamp if gap is being resolved
        if new_status == GapStatus.RESOLVED:
            self.resolved_at = self.updated_at
            
        # Update resolution details if provided
        if resolution_details:
            self.resolution_details = resolution_details
            
        try:
            self.save()
            return True
        except Exception:
            return False