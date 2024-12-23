"""
Comprehensive test suite for GapAnalyzer service validating gap analysis, 
compliance coverage calculations, and ML-enhanced recommendation generation.

Version: 1.0.0
"""

# External imports with versions
import pytest  # version: 7.0+
from unittest.mock import Mock, patch  # python3.11+
from freezegun import freeze_time  # version: 1.2+
from datetime import datetime, timedelta

# Internal imports
from analytics_service.services.gap_analyzer import GapAnalyzer
from analytics_service.models.gap import (
    GapModel, 
    GapType, 
    GapSeverity, 
    GapStatus
)

@pytest.mark.asyncio
class TestGapAnalyzer:
    """
    Comprehensive test suite for GapAnalyzer service validating core analytics capabilities
    and ML-enhanced recommendations.
    """

    def setup_method(self):
        """Initialize test environment with mocked dependencies."""
        # Initialize mocks
        self._metric_processor = Mock()
        self._ml_model = Mock()
        
        # Create GapAnalyzer instance with mocked dependencies
        self._gap_analyzer = GapAnalyzer(
            metric_processor=self._metric_processor,
            ml_config={
                'confidence_threshold': 0.85,
                'pattern_sensitivity': 0.75,
                'min_data_points': 10,
                'anomaly_threshold': 2.5
            }
        )

        # Setup test data
        self._test_exercise_data = {
            'exercise_id': 'test_exercise_123',
            'organization_id': 'test_org_456',
            'metrics': {
                'response_times': [
                    {'value': 120, 'unit': 'seconds'},
                    {'value': 180, 'unit': 'seconds'},
                    {'value': 90, 'unit': 'seconds'}
                ],
                'completion_rates': [
                    {'value': 85, 'unit': 'percent'},
                    {'value': 90, 'unit': 'percent'}
                ],
                'decision_accuracy': [
                    {'value': 75, 'unit': 'percent'},
                    {'value': 80, 'unit': 'percent'}
                ]
            }
        }

        self._test_compliance_data = {
            'framework': 'SOC2',
            'controls': [
                {'id': 'CC1.1', 'status': 'compliant'},
                {'id': 'CC2.1', 'status': 'non_compliant'},
                {'id': 'CC3.1', 'status': 'partial'}
            ],
            'coverage': 0.75
        }

        # Configure mock responses
        self._metric_processor.calculate_statistics.return_value = {
            'mean': 130,
            'p95': 180,
            'trend_slope': -0.5,
            'anomaly_count': 1
        }

    @freeze_time("2024-01-15 12:00:00")
    async def test_analyze_exercise(self):
        """Test comprehensive exercise analysis with ML enhancement."""
        # Setup test data
        exercise_id = self._test_exercise_data['exercise_id']
        organization_id = self._test_exercise_data['organization_id']

        # Execute analysis
        gaps = await self._gap_analyzer.analyze_exercise(
            exercise_id=exercise_id,
            organization_id=organization_id
        )

        # Verify metric processor calls
        self._metric_processor.calculate_statistics.assert_called_with(
            exercise_id=exercise_id,
            metric_type='response_time',
            start_time=datetime(2024, 1, 15, 12, 0, 0),
            end_time=datetime(2024, 1, 15, 12, 0, 0)
        )

        # Validate gap identification
        assert len(gaps) > 0
        for gap in gaps:
            assert isinstance(gap, GapModel)
            assert gap.organization_id == organization_id
            assert gap.exercise_id == exercise_id
            assert gap.severity in [GapSeverity.HIGH, GapSeverity.MEDIUM, GapSeverity.LOW]
            assert gap.status == GapStatus.OPEN
            assert gap.identified_at == datetime(2024, 1, 15, 12, 0, 0)

    async def test_identify_capability_gaps(self):
        """Test capability gap identification with severity assessment."""
        # Setup test metrics
        metrics = {
            'mean': 180,  # High response time
            'p95': 250,
            'trend_slope': -0.5,
            'anomaly_count': 2
        }

        # Execute gap identification
        gaps = await self._gap_analyzer.identify_capability_gaps(
            metrics=metrics,
            exercise_id=self._test_exercise_data['exercise_id'],
            ml_params={'confidence_threshold': 0.85}
        )

        # Validate gaps
        assert len(gaps) > 0
        response_time_gap = next(g for g in gaps if g['type'] == GapType.PROCESS)
        assert response_time_gap['severity'] == GapSeverity.HIGH
        assert 'Response Time' in response_time_gap['title']
        assert response_time_gap['metrics']['mean_response_time'] == 180

        # Verify decision quality gap
        decision_gap = next(g for g in gaps if g['type'] == GapType.PEOPLE)
        assert decision_gap['severity'] == GapSeverity.MEDIUM
        assert 'Decision Quality' in decision_gap['title']
        assert 'trend_slope' in decision_gap['metrics']

    async def test_analyze_compliance_coverage(self):
        """Test compliance framework coverage analysis."""
        # Setup test data
        exercise_data = {
            'id': self._test_exercise_data['exercise_id'],
            'metrics': {
                'compliance_coverage': 0.75  # 75% coverage
            }
        }
        framework_mappings = ['SOC2', 'NIST']

        # Execute compliance analysis
        gaps = await self._gap_analyzer.analyze_compliance_coverage(
            exercise_data=exercise_data,
            framework_mappings=framework_mappings
        )

        # Validate compliance gaps
        assert len(gaps) > 0
        for gap in gaps:
            assert gap['type'] == GapType.COMPLIANCE
            assert gap['severity'] == GapSeverity.HIGH  # Below 80% threshold
            assert any(f in gap['title'] for f in framework_mappings)
            assert 'coverage_percentage' in gap['metrics']
            assert gap['metrics']['coverage_percentage'] == 0.75

    async def test_generate_recommendations(self):
        """Test ML-enhanced recommendation generation."""
        # Setup test gaps
        test_gaps = [
            {
                'id': 'RT_001',
                'type': GapType.PROCESS,
                'title': 'High Response Time',
                'severity': GapSeverity.HIGH,
                'metrics': {'mean_response_time': 180}
            },
            {
                'id': 'COMP_001',
                'type': GapType.COMPLIANCE,
                'title': 'Low SOC2 Coverage',
                'severity': GapSeverity.HIGH,
                'metrics': {'coverage_percentage': 0.75}
            }
        ]

        # Generate recommendations
        recommendations = await self._gap_analyzer.generate_recommendations(
            gaps=test_gaps,
            ml_config={'confidence_threshold': 0.85}
        )

        # Validate recommendations
        assert len(recommendations) == len(test_gaps)
        for gap_id, recs in recommendations.items():
            assert len(recs) > 0
            for rec in recs:
                assert 'title' in rec
                assert 'description' in rec
                assert 'priority' in rec
                assert 'estimated_impact' in rec
                assert 0 <= rec['estimated_impact'] <= 1

        # Verify process gap recommendations
        process_recs = recommendations['RT_001']
        assert any('automation' in rec['title'].lower() for rec in process_recs)
        assert any(rec['priority'] == 'high' for rec in process_recs)

        # Verify compliance gap recommendations
        compliance_recs = recommendations['COMP_001']
        assert any('documentation' in rec['title'].lower() for rec in compliance_recs)
        assert any(rec['priority'] == 'high' for rec in compliance_recs)