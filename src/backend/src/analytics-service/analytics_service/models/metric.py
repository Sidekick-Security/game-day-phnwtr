"""
MongoDB document model for storing and managing exercise performance metrics and analytics data.
Implements time-series optimization, advanced querying capabilities, and real-time analytics support.

Version: 1.0.0
"""

# External imports - version specified as per requirements
from mongoengine import Document, fields  # mongoengine==0.24.0
from datetime import datetime
from typing import Dict, List, Optional, Union

# Internal imports
from ..config import MetricsConfig

class MetricModel(Document):
    """
    MongoDB document model for storing exercise performance metrics and analytics data
    with optimized time-series support and comprehensive indexing strategies.
    """

    # Document fields with validation and indexing
    organization_id = fields.StringField(required=True, index=True)
    exercise_id = fields.StringField(required=True, index=True)
    metric_type = fields.StringField(
        required=True, 
        index=True,
        choices=[
            'response_time',
            'compliance_coverage',
            'participant_engagement',
            'decision_accuracy',
            'communication_effectiveness',
            'resource_utilization'
        ]
    )
    value = fields.FloatField(required=True)
    timestamp = fields.DateTimeField(required=True, index=-1)
    metadata = fields.DictField(default=dict)
    unit = fields.StringField(
        required=True,
        choices=['seconds', 'percentage', 'score', 'count', 'ratio']
    )
    is_aggregated = fields.BooleanField(default=False)
    batch_size = fields.IntField(default=1000)
    tags = fields.ListField(fields.StringField(), default=list)

    meta = {
        'collection': 'metrics',
        'indexes': [
            {'fields': ['timestamp'], 'expireAfterSeconds': 7776000},  # 90 days TTL
            {'fields': ['organization_id', 'metric_type', 'timestamp']},
            {'fields': ['exercise_id', 'metric_type', 'timestamp']},
            {'fields': ['tags', 'timestamp']},
            {'fields': ['is_aggregated', 'timestamp']}
        ],
        'ordering': ['-timestamp']
    }

    def __init__(self, *args, **kwargs):
        """
        Initialize a new metric document with enhanced validation and defaults.
        """
        # Set default timestamp if not provided
        if 'timestamp' not in kwargs:
            kwargs['timestamp'] = datetime.utcnow()

        # Initialize empty metadata if not provided
        if 'metadata' not in kwargs:
            kwargs['metadata'] = {}

        # Set default batch size from config if not provided
        if 'batch_size' not in kwargs:
            kwargs['batch_size'] = MetricsConfig.batch_size

        super().__init__(*args, **kwargs)

    def clean(self):
        """
        Perform additional validation before saving the document.
        """
        # Ensure timestamp is in UTC
        if self.timestamp.tzinfo is not None:
            self.timestamp = self.timestamp.replace(tzinfo=None)

        # Validate metadata structure
        if not isinstance(self.metadata, dict):
            raise ValueError("Metadata must be a dictionary")

        # Validate value ranges based on metric type
        if self.metric_type == 'percentage' and not 0 <= self.value <= 100:
            raise ValueError("Percentage values must be between 0 and 100")

        # Validate tags format
        if any(not isinstance(tag, str) for tag in self.tags):
            raise ValueError("All tags must be strings")

    def to_dict(self) -> Dict:
        """
        Convert metric document to dictionary representation with enhanced metadata.
        """
        return {
            'id': str(self.id),
            'organization_id': self.organization_id,
            'exercise_id': self.exercise_id,
            'metric_type': self.metric_type,
            'value': self.value,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata,
            'unit': self.unit,
            'is_aggregated': self.is_aggregated,
            'batch_size': self.batch_size,
            'tags': self.tags
        }

    @classmethod
    def get_metrics_by_timerange(
        cls,
        start_time: datetime,
        end_time: datetime,
        organization_id: str,
        metric_type: Optional[str] = None,
        tags: Optional[List[str]] = None,
        batch_size: Optional[int] = None,
        sort_order: str = '-timestamp'
    ) -> List['MetricModel']:
        """
        Retrieve metrics within a specified time range with advanced filtering.
        """
        # Build base query
        query = {
            'organization_id': organization_id,
            'timestamp': {'$gte': start_time, '$lte': end_time}
        }

        # Add optional filters
        if metric_type:
            query['metric_type'] = metric_type
        if tags:
            query['tags__all'] = tags

        # Set batch size for cursor
        if not batch_size:
            batch_size = MetricsConfig.batch_size

        # Execute query with proper indexing
        return cls.objects(**query).order_by(sort_order).batch_size(batch_size)

    @classmethod
    def aggregate_metrics(
        cls,
        organization_id: str,
        metric_type: str,
        interval: str,
        start_time: datetime,
        end_time: datetime
    ) -> List[Dict]:
        """
        Perform time-based aggregation of metrics with advanced grouping.
        """
        pipeline = [
            {
                '$match': {
                    'organization_id': organization_id,
                    'metric_type': metric_type,
                    'timestamp': {'$gte': start_time, '$lte': end_time}
                }
            },
            {
                '$group': {
                    '_id': {
                        'interval': {
                            '$dateTrunc': {
                                'date': '$timestamp',
                                'unit': interval
                            }
                        },
                        'metric_type': '$metric_type'
                    },
                    'avg_value': {'$avg': '$value'},
                    'min_value': {'$min': '$value'},
                    'max_value': {'$max': '$value'},
                    'count': {'$sum': 1}
                }
            },
            {
                '$sort': {'_id.interval': 1}
            }
        ]

        return list(cls.objects.aggregate(pipeline))