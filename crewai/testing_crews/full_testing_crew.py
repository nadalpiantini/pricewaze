"""Full Testing Crew - Orchestrates all 25 agents for comprehensive testing."""

from typing import Any

from crewai import Crew, Task, Process
from langchain_openai import ChatOpenAI

from config import get_settings

# Import all testing agents
from testing_agents import (
    # Coordination Squad
    LeadOrchestratorAgent,
    QualityGateManagerAgent,
    ReportSynthesizerAgent,
    # UI/UX Squad
    VisualAuditorAgent,
    AccessibilityTesterAgent,
    ResponsiveValidatorAgent,
    PerformanceAuditorAgent,
    UXFlowAnalyzerAgent,
    DesignSystemEnforcerAgent,
    AnimationTesterAgent,
    # E2E Squad
    AuthFlowTesterAgent,
    CRUDOperationsTesterAgent,
    FormValidationTesterAgent,
    NavigationTesterAgent,
    ErrorHandlingTesterAgent,
    StatePersistenceTesterAgent,
    MultiUserTesterAgent,
    EdgeCaseHunterAgent,
    # Backend Squad
    APIContractValidatorAgent,
    DatabaseIntegrityCheckerAgent,
    DataFlowTracerAgent,
    RealtimeSyncTesterAgent,
    MigrationValidatorAgent,
    # Fixer Squad
    UIUXImplementerAgent,
    IntegrationFixerAgent,
)


class FullTestingCrew:
    """Complete testing workflow with all 25 agents organized in squads."""

    def __init__(self, verbose: bool = True, base_url: str = "http://localhost:3000"):
        """
        Initialize the full testing crew.

        Args:
            verbose: Whether to output detailed logs
            base_url: Base URL of the PriceWaze application to test
        """
        self.verbose = verbose
        self.base_url = base_url
        self.settings = get_settings()

        # Initialize LLM with DeepSeek
        self.llm = ChatOpenAI(
            model=self.settings.deepseek_model,
            api_key=self.settings.deepseek_api_key,
            base_url=self.settings.deepseek_base_url,
            temperature=0.2,  # Lower temperature for consistent testing
        )

        # Initialize all agents
        self._init_coordination_squad()
        self._init_ui_ux_squad()
        self._init_e2e_squad()
        self._init_backend_squad()
        self._init_fixer_squad()

    def _init_coordination_squad(self):
        """Initialize coordination agents."""
        self.lead_orchestrator = LeadOrchestratorAgent.create(llm=self.llm, verbose=self.verbose)
        self.quality_gate_manager = QualityGateManagerAgent.create(llm=self.llm, verbose=self.verbose)
        self.report_synthesizer = ReportSynthesizerAgent.create(llm=self.llm, verbose=self.verbose)

    def _init_ui_ux_squad(self):
        """Initialize UI/UX testing agents."""
        self.visual_auditor = VisualAuditorAgent.create(llm=self.llm, verbose=self.verbose)
        self.accessibility_tester = AccessibilityTesterAgent.create(llm=self.llm, verbose=self.verbose)
        self.responsive_validator = ResponsiveValidatorAgent.create(llm=self.llm, verbose=self.verbose)
        self.performance_auditor = PerformanceAuditorAgent.create(llm=self.llm, verbose=self.verbose)
        self.ux_flow_analyzer = UXFlowAnalyzerAgent.create(llm=self.llm, verbose=self.verbose)
        self.design_system_enforcer = DesignSystemEnforcerAgent.create(llm=self.llm, verbose=self.verbose)
        self.animation_tester = AnimationTesterAgent.create(llm=self.llm, verbose=self.verbose)

    def _init_e2e_squad(self):
        """Initialize E2E testing agents."""
        self.auth_flow_tester = AuthFlowTesterAgent.create(llm=self.llm, verbose=self.verbose)
        self.crud_operations_tester = CRUDOperationsTesterAgent.create(llm=self.llm, verbose=self.verbose)
        self.form_validation_tester = FormValidationTesterAgent.create(llm=self.llm, verbose=self.verbose)
        self.navigation_tester = NavigationTesterAgent.create(llm=self.llm, verbose=self.verbose)
        self.error_handling_tester = ErrorHandlingTesterAgent.create(llm=self.llm, verbose=self.verbose)
        self.state_persistence_tester = StatePersistenceTesterAgent.create(llm=self.llm, verbose=self.verbose)
        self.multi_user_tester = MultiUserTesterAgent.create(llm=self.llm, verbose=self.verbose)
        self.edge_case_hunter = EdgeCaseHunterAgent.create(llm=self.llm, verbose=self.verbose)

    def _init_backend_squad(self):
        """Initialize backend testing agents."""
        self.api_contract_validator = APIContractValidatorAgent.create(llm=self.llm, verbose=self.verbose)
        self.database_integrity_checker = DatabaseIntegrityCheckerAgent.create(llm=self.llm, verbose=self.verbose)
        self.data_flow_tracer = DataFlowTracerAgent.create(llm=self.llm, verbose=self.verbose)
        self.realtime_sync_tester = RealtimeSyncTesterAgent.create(llm=self.llm, verbose=self.verbose)
        self.migration_validator = MigrationValidatorAgent.create(llm=self.llm, verbose=self.verbose)

    def _init_fixer_squad(self):
        """Initialize fixer agents."""
        self.ui_ux_implementer = UIUXImplementerAgent.create(llm=self.llm, verbose=self.verbose)
        self.integration_fixer = IntegrationFixerAgent.create(llm=self.llm, verbose=self.verbose)

    def create_tasks(self, focus_areas: list[str] | None = None) -> list[Task]:
        """
        Create comprehensive testing tasks.

        Args:
            focus_areas: Optional list of areas to focus on ('ui', 'e2e', 'backend', 'all')

        Returns:
            List of tasks for the crew
        """
        tasks = []
        focus = focus_areas or ["all"]

        # Phase 1: Coordination - Planning
        planning_task = Task(
            description=(
                f"Analyze PriceWaze at {self.base_url} and create a comprehensive test plan:\n"
                "1. Identify all critical user flows (auth, properties, offers, visits)\n"
                "2. Map out test dependencies and execution order\n"
                "3. Identify which tests can run in parallel\n"
                "4. Prioritize tests by business impact\n"
                "5. Set pass/fail thresholds for each category"
            ),
            expected_output=(
                "Test Execution Plan:\n"
                "- Critical paths prioritized\n"
                "- Parallel execution groups\n"
                "- Estimated duration per squad\n"
                "- Quality gate thresholds"
            ),
            agent=self.lead_orchestrator,
        )
        tasks.append(planning_task)

        # Phase 2: UI/UX Testing (parallel execution possible)
        if "all" in focus or "ui" in focus:
            ui_ux_tasks = self._create_ui_ux_tasks(planning_task)
            tasks.extend(ui_ux_tasks)

        # Phase 3: E2E Testing (some depend on UI)
        if "all" in focus or "e2e" in focus:
            e2e_tasks = self._create_e2e_tasks(planning_task)
            tasks.extend(e2e_tasks)

        # Phase 4: Backend Testing (can run parallel with E2E)
        if "all" in focus or "backend" in focus:
            backend_tasks = self._create_backend_tasks(planning_task)
            tasks.extend(backend_tasks)

        # Phase 5: Quality Gate Assessment
        quality_gate_task = Task(
            description=(
                "Review all test results and make go/no-go decision:\n"
                "1. Count issues by severity (critical, high, medium, low)\n"
                "2. Apply quality gate thresholds\n"
                "3. Identify blocking issues\n"
                "4. Calculate overall quality score\n"
                "5. Provide deployment recommendation"
            ),
            expected_output=(
                "Quality Gate Assessment:\n"
                "- PASS/FAIL decision\n"
                "- Issue counts by severity\n"
                "- Blocking issues list\n"
                "- Quality score (0-100)\n"
                "- Deployment recommendation"
            ),
            agent=self.quality_gate_manager,
            context=tasks,  # All previous tasks as context
        )
        tasks.append(quality_gate_task)

        # Phase 6: Report Synthesis
        report_task = Task(
            description=(
                "Synthesize all test findings into actionable reports:\n"
                "1. Executive summary (1 paragraph)\n"
                "2. Issues by squad and priority\n"
                "3. Fix recommendations with effort estimates\n"
                "4. Trend analysis vs previous runs\n"
                "5. Action items for next sprint"
            ),
            expected_output=(
                "# PriceWaze Test Report\n\n"
                "## Executive Summary\n[1 paragraph overview]\n\n"
                "## Issues Found\n"
                "### Critical (P0) - Fix immediately\n"
                "### High (P1) - Fix this sprint\n"
                "### Medium (P2) - Backlog\n"
                "### Low (P3) - Nice to have\n\n"
                "## Recommendations\n[Prioritized fix list]\n\n"
                "## Action Items\n[Specific next steps]"
            ),
            agent=self.report_synthesizer,
            context=[quality_gate_task],
        )
        tasks.append(report_task)

        return tasks

    def _create_ui_ux_tasks(self, planning_task: Task) -> list[Task]:
        """Create UI/UX squad tasks."""
        return [
            Task(
                description=f"Navigate to {self.base_url} and take screenshots of all key pages: landing, login, dashboard, property list, property detail, offer flow, visit scheduling. Compare layouts for visual consistency.",
                expected_output="Visual audit report with screenshots and identified issues",
                agent=self.visual_auditor,
                context=[planning_task],
            ),
            Task(
                description=f"Test {self.base_url} for WCAG 2.1 AA compliance: check alt text, form labels, color contrast, keyboard navigation, focus indicators, and ARIA attributes.",
                expected_output="Accessibility audit with violations and fixes",
                agent=self.accessibility_tester,
                context=[planning_task],
            ),
            Task(
                description=f"Test {self.base_url} at 375px, 768px, 1024px, 1440px, and 2560px viewports. Check for overflow, hidden elements, and touch target sizes.",
                expected_output="Responsive design report with issues per breakpoint",
                agent=self.responsive_validator,
                context=[planning_task],
            ),
            Task(
                description=f"Measure Core Web Vitals at {self.base_url}: LCP, FID, CLS. Test property listing page with 50+ items. Check Mapbox performance.",
                expected_output="Performance metrics with optimization recommendations",
                agent=self.performance_auditor,
                context=[planning_task],
            ),
            Task(
                description=f"Walk through complete user journeys at {self.base_url}: new user registration → browse properties → view detail → submit offer → schedule visit. Count clicks, identify friction.",
                expected_output="UX flow analysis with friction points and improvements",
                agent=self.ux_flow_analyzer,
                context=[planning_task],
            ),
            Task(
                description=f"Audit {self.base_url} for Shadcn/ui consistency: check button variants, spacing, colors, typography against design system standards.",
                expected_output="Design system compliance report with violations",
                agent=self.design_system_enforcer,
                context=[planning_task],
            ),
            Task(
                description=f"Test all animations at {self.base_url}: loading states, hover effects, page transitions, Framer Motion components. Check for jank and reduced-motion support.",
                expected_output="Animation audit with performance issues and fixes",
                agent=self.animation_tester,
                context=[planning_task],
            ),
        ]

    def _create_e2e_tasks(self, planning_task: Task) -> list[Task]:
        """Create E2E squad tasks."""
        return [
            Task(
                description=f"Test complete auth flow at {self.base_url}: login with valid/invalid credentials, registration, logout, session persistence, protected route redirects.",
                expected_output="Auth flow test results with pass/fail per scenario",
                agent=self.auth_flow_tester,
                context=[planning_task],
            ),
            Task(
                description=f"Test CRUD operations at {self.base_url}: create property, edit details, delete property, create/counter/accept offers, schedule/cancel visits.",
                expected_output="CRUD test results with database verification",
                agent=self.crud_operations_tester,
                context=[planning_task],
            ),
            Task(
                description=f"Test all forms at {self.base_url} with valid, invalid, and edge case inputs: empty fields, XSS payloads, SQL injection, boundary values.",
                expected_output="Form validation test results with vulnerabilities",
                agent=self.form_validation_tester,
                context=[planning_task],
            ),
            Task(
                description=f"Test navigation at {self.base_url}: sidebar, breadcrumbs, back/forward, deep links, 404 pages, route protection.",
                expected_output="Navigation test results with routing issues",
                agent=self.navigation_tester,
                context=[planning_task],
            ),
            Task(
                description=f"Test error handling at {self.base_url}: trigger API errors, network timeouts, simulate Supabase downtime, verify error messages.",
                expected_output="Error handling test results with UX improvements",
                agent=self.error_handling_tester,
                context=[planning_task],
            ),
            Task(
                description=f"Test state persistence at {self.base_url}: favorites survive refresh, session survives tab close, onboarding progress persists.",
                expected_output="State persistence test results with issues",
                agent=self.state_persistence_tester,
                context=[planning_task],
            ),
            Task(
                description=f"Test multi-user scenarios at {self.base_url}: buyer and seller on same property, concurrent offers, data isolation between users.",
                expected_output="Multi-user test results with race conditions",
                agent=self.multi_user_tester,
                context=[planning_task],
            ),
            Task(
                description=f"Hunt for edge cases at {self.base_url}: $0 price, 0 m² area, empty descriptions, special characters, rapid clicking, double submits.",
                expected_output="Edge case findings with reproduction steps",
                agent=self.edge_case_hunter,
                context=[planning_task],
            ),
        ]

    def _create_backend_tasks(self, planning_task: Task) -> list[Task]:
        """Create backend squad tasks."""
        return [
            Task(
                description=f"Validate API contracts at {self.base_url}/api/*: test all endpoints for correct schemas, status codes, error formats, auth requirements.",
                expected_output="API contract validation results with schema violations",
                agent=self.api_contract_validator,
                context=[planning_task],
            ),
            Task(
                description="Check database integrity: verify all foreign keys, find orphan records, validate constraints, check computed columns accuracy.",
                expected_output="Database integrity report with data issues",
                agent=self.database_integrity_checker,
                context=[planning_task],
            ),
            Task(
                description=f"Trace data flows at {self.base_url}: follow data from UI input through API to database and back, verify no loss or corruption.",
                expected_output="Data flow trace results with transformation issues",
                agent=self.data_flow_tracer,
                context=[planning_task],
            ),
            Task(
                description=f"Test real-time sync at {self.base_url}: verify Supabase subscriptions work for offers, visits, and property updates.",
                expected_output="Real-time sync test results with latency measurements",
                agent=self.realtime_sync_tester,
                context=[planning_task],
            ),
            Task(
                description="Validate database migrations: verify all migrations are idempotent, data survives schema changes, rollbacks work.",
                expected_output="Migration validation results with issues",
                agent=self.migration_validator,
                context=[planning_task],
            ),
        ]

    def run(
        self,
        focus_areas: list[str] | None = None,
        generate_fixes: bool = False,
    ) -> dict[str, Any]:
        """
        Run the full testing workflow.

        Args:
            focus_areas: Optional list of areas to focus on ('ui', 'e2e', 'backend', 'all')
            generate_fixes: Whether to generate fix implementations

        Returns:
            Complete test results with recommendations
        """
        tasks = self.create_tasks(focus_areas)

        # Collect all agents
        all_agents = [
            # Coordination
            self.lead_orchestrator,
            self.quality_gate_manager,
            self.report_synthesizer,
            # UI/UX
            self.visual_auditor,
            self.accessibility_tester,
            self.responsive_validator,
            self.performance_auditor,
            self.ux_flow_analyzer,
            self.design_system_enforcer,
            self.animation_tester,
            # E2E
            self.auth_flow_tester,
            self.crud_operations_tester,
            self.form_validation_tester,
            self.navigation_tester,
            self.error_handling_tester,
            self.state_persistence_tester,
            self.multi_user_tester,
            self.edge_case_hunter,
            # Backend
            self.api_contract_validator,
            self.database_integrity_checker,
            self.data_flow_tracer,
            self.realtime_sync_tester,
            self.migration_validator,
        ]

        if generate_fixes:
            all_agents.extend([self.ui_ux_implementer, self.integration_fixer])

        crew = Crew(
            agents=all_agents,
            tasks=tasks,
            process=Process.sequential,  # Tasks have dependencies
            verbose=self.verbose,
            memory=self.settings.crew_memory,
            max_rpm=self.settings.crew_max_rpm,
        )

        result = crew.kickoff()

        return {
            "base_url": self.base_url,
            "focus_areas": focus_areas or ["all"],
            "agents_used": len(all_agents),
            "tasks_executed": len(tasks),
            "final_report": result.raw if hasattr(result, "raw") else str(result),
            "squad_results": {
                "coordination": [t.output.raw for t in tasks[:1] if t.output],
                "ui_ux": [t.output.raw for t in tasks[1:8] if t.output] if "all" in (focus_areas or ["all"]) or "ui" in (focus_areas or []) else [],
                "e2e": [t.output.raw for t in tasks[8:16] if t.output] if "all" in (focus_areas or ["all"]) or "e2e" in (focus_areas or []) else [],
                "backend": [t.output.raw for t in tasks[16:21] if t.output] if "all" in (focus_areas or ["all"]) or "backend" in (focus_areas or []) else [],
            },
        }
