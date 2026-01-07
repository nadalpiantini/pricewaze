"""
PriceWaze Testing Agents - 25 Specialized Testing Agents organized in 5 Squads.

Squad Structure:
- Coordination Squad (3 agents): Orchestration, Quality Gates, Reporting
- UI/UX Testing Squad (7 agents): Visual, A11y, Responsive, Performance, UX Flow, Design System, Animations
- E2E Testing Squad (8 agents): Auth, CRUD, Forms, Navigation, Errors, State, Multi-user, Edge Cases
- Backend Integration Squad (5 agents): API, DB Integrity, Data Flow, Real-time, Migrations
- Fixer Squad (2 agents): UI/UX Fixer, Integration Fixer
"""

# Coordination Squad
from .coordination.lead_orchestrator import LeadOrchestratorAgent
from .coordination.quality_gate_manager import QualityGateManagerAgent
from .coordination.report_synthesizer import ReportSynthesizerAgent

# UI/UX Testing Squad
from .ui_ux.visual_auditor import VisualAuditorAgent
from .ui_ux.accessibility_tester import AccessibilityTesterAgent
from .ui_ux.responsive_validator import ResponsiveValidatorAgent
from .ui_ux.performance_auditor import PerformanceAuditorAgent
from .ui_ux.ux_flow_analyzer import UXFlowAnalyzerAgent
from .ui_ux.design_system_enforcer import DesignSystemEnforcerAgent
from .ui_ux.animation_tester import AnimationTesterAgent

# E2E Testing Squad
from .e2e.auth_flow_tester import AuthFlowTesterAgent
from .e2e.crud_operations_tester import CRUDOperationsTesterAgent
from .e2e.form_validation_tester import FormValidationTesterAgent
from .e2e.navigation_tester import NavigationTesterAgent
from .e2e.error_handling_tester import ErrorHandlingTesterAgent
from .e2e.state_persistence_tester import StatePersistenceTesterAgent
from .e2e.multi_user_tester import MultiUserTesterAgent
from .e2e.edge_case_hunter import EdgeCaseHunterAgent

# Backend Integration Squad
from .backend.api_contract_validator import APIContractValidatorAgent
from .backend.database_integrity_checker import DatabaseIntegrityCheckerAgent
from .backend.data_flow_tracer import DataFlowTracerAgent
from .backend.realtime_sync_tester import RealtimeSyncTesterAgent
from .backend.migration_validator import MigrationValidatorAgent

# Fixer Squad
from .fixers.ui_ux_implementer import UIUXImplementerAgent
from .fixers.integration_fixer import IntegrationFixerAgent

__all__ = [
    # Coordination Squad (3)
    "LeadOrchestratorAgent",
    "QualityGateManagerAgent",
    "ReportSynthesizerAgent",
    # UI/UX Testing Squad (7)
    "VisualAuditorAgent",
    "AccessibilityTesterAgent",
    "ResponsiveValidatorAgent",
    "PerformanceAuditorAgent",
    "UXFlowAnalyzerAgent",
    "DesignSystemEnforcerAgent",
    "AnimationTesterAgent",
    # E2E Testing Squad (8)
    "AuthFlowTesterAgent",
    "CRUDOperationsTesterAgent",
    "FormValidationTesterAgent",
    "NavigationTesterAgent",
    "ErrorHandlingTesterAgent",
    "StatePersistenceTesterAgent",
    "MultiUserTesterAgent",
    "EdgeCaseHunterAgent",
    # Backend Integration Squad (5)
    "APIContractValidatorAgent",
    "DatabaseIntegrityCheckerAgent",
    "DataFlowTracerAgent",
    "RealtimeSyncTesterAgent",
    "MigrationValidatorAgent",
    # Fixer Squad (2)
    "UIUXImplementerAgent",
    "IntegrationFixerAgent",
]

# Total: 25 agents
AGENT_COUNT = 25
SQUAD_COUNT = 5
