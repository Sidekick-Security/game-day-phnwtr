"""
Initialization Module for Scenario Service Controllers

This module serves as the central point for aggregating and exposing API endpoints
related to AI-driven scenario generation and management. It ensures clean separation
of concerns and maintainable package structure by exposing the scenario controller's
router for FastAPI integration.

Version: 1.0.0
"""

# Import the router from scenario_controller
from scenario_service.controllers.scenario_controller import router

# Export the router for FastAPI application integration
__all__ = ['router']