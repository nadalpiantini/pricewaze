"""
PriceWaze Testing Crews - Orchestration workflows for the 25-agent testing system.

Available Crews:
- FullTestingCrew: Complete testing with all 25 agents (comprehensive)
- UIUXTestingCrew: UI/UX focused testing (7 agents)
- E2ETestingCrew: End-to-end flow testing (8 agents)
- BackendTestingCrew: Backend integration testing (5 agents)
- QuickSmokeTestCrew: Fast critical path testing (5 agents)
"""

from .full_testing_crew import FullTestingCrew
from .ui_ux_testing_crew import UIUXTestingCrew
from .e2e_testing_crew import E2ETestingCrew
from .backend_testing_crew import BackendTestingCrew
from .quick_smoke_test_crew import QuickSmokeTestCrew

__all__ = [
    "FullTestingCrew",
    "UIUXTestingCrew",
    "E2ETestingCrew",
    "BackendTestingCrew",
    "QuickSmokeTestCrew",
]
