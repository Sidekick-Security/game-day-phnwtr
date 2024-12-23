"""
Analytics Service Test Configuration Module

Configures pytest test environment with enhanced security controls, fixtures, and utilities
for comprehensive testing of the Analytics Service components including gap analysis,
recommendation engine, and trend analysis capabilities.

Version: 1.0.0
"""

import pytest
import mongomock
import logging
from freezegun import freeze_time
from typing import List, Dict, Any
from ..analytics_service.config import Config, load_config, validate_config

# Test configuration constants with security considerations
MONGODB_TEST_URL = "mongodb://testdb:27017"
TEST_CONFIG = Config()
logger = logging.getLogger(__name__)

@pytest.fixture(scope='session')
def pytest_configure(config) -> None:
    """
    Enhanced pytest hook to configure test environment with security controls and validation.
    
    Args:
        config: pytest configuration object
    """
    # Configure secure test logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('test.log', mode='w')
        ]
    )
    logger.info("Initializing Analytics Service test environment")

    # Register custom test markers with validation
    config.addinivalue_line(
        "markers",
        "unit: mark test as unit test with isolation verification"
    )
    config.addinivalue_line(
        "markers",
        "integration: mark test as integration test with dependency checks"
    )
    config.addinivalue_line(
        "markers",
        "async_test: mark test as asynchronous requiring special handling"
    )
    config.addinivalue_line(
        "markers",
        "performance: mark test for performance monitoring"
    )

    # Configure test database with security settings
    mongomock.MongoClient(
        MONGODB_TEST_URL,
        ssl=True,
        ssl_cert_reqs='CERT_REQUIRED',
        serverSelectionTimeoutMS=5000
    )

    # Initialize test configuration with validation
    test_config = {
        'service': {
            'environment': 'test',
            'port': 8080,
            'version': '1.0.0'
        },
        'database': {
            'host': 'testdb',
            'port': 27017,
            'name': 'analytics_test',
            'ssl_enabled': True
        },
        'metrics': {
            'influxdb_bucket': 'analytics_test',
            'retention_days': 7
        },
        'logger': {
            'level': 'DEBUG',
            'json_output': True
        }
    }
    
    TEST_CONFIG.load_config(overrides=test_config)
    logger.info("Test configuration initialized with security controls")

def pytest_collection_modifyitems(items: List[pytest.Item]) -> None:
    """
    Enhanced pytest hook for test collection modification with extended marker system.
    
    Args:
        items: List of collected test items
    """
    for item in items:
        # Add markers based on test type with validation
        if item.get_closest_marker('async_test'):
            if not item.get_closest_marker('unit') and not item.get_closest_marker('integration'):
                item.add_marker(pytest.mark.unit)
            
        # Configure test timeouts based on test type
        if item.get_closest_marker('integration'):
            item.add_marker(pytest.mark.timeout(60))
        elif item.get_closest_marker('unit'):
            item.add_marker(pytest.mark.timeout(10))
            
        # Add performance tracking for marked tests
        if item.get_closest_marker('performance'):
            item.add_marker(pytest.mark.monitor_performance)

        # Set up test isolation for data security
        if item.get_closest_marker('unit'):
            item.add_marker(pytest.mark.isolate_data)

    logger.info(f"Test collection modified: {len(items)} tests configured")

# Export test configuration and utilities
__all__ = [
    'TEST_CONFIG',
    'MONGODB_TEST_URL',
    'pytest_configure',
    'pytest_collection_modifyitems'
]