"""E2E Testing Crew - End-to-end flow testing with 8 agents."""

from typing import Any

from crewai import Crew, Task, Process
from langchain_openai import ChatOpenAI

from config import get_settings
from testing_agents import (
    AuthFlowTesterAgent,
    CRUDOperationsTesterAgent,
    FormValidationTesterAgent,
    NavigationTesterAgent,
    ErrorHandlingTesterAgent,
    StatePersistenceTesterAgent,
    MultiUserTesterAgent,
    EdgeCaseHunterAgent,
    ReportSynthesizerAgent,
)


class E2ETestingCrew:
    """End-to-end testing workflow with 8 specialized agents."""

    def __init__(self, verbose: bool = True, base_url: str = "http://localhost:3000"):
        """Initialize the E2E testing crew."""
        self.verbose = verbose
        self.base_url = base_url
        self.settings = get_settings()

        self.llm = ChatOpenAI(
            model=self.settings.deepseek_model,
            api_key=self.settings.deepseek_api_key,
            base_url=self.settings.deepseek_base_url,
            temperature=0.2,
        )

        # Initialize agents
        self.auth_flow_tester = AuthFlowTesterAgent.create(llm=self.llm, verbose=verbose)
        self.crud_operations_tester = CRUDOperationsTesterAgent.create(llm=self.llm, verbose=verbose)
        self.form_validation_tester = FormValidationTesterAgent.create(llm=self.llm, verbose=verbose)
        self.navigation_tester = NavigationTesterAgent.create(llm=self.llm, verbose=verbose)
        self.error_handling_tester = ErrorHandlingTesterAgent.create(llm=self.llm, verbose=verbose)
        self.state_persistence_tester = StatePersistenceTesterAgent.create(llm=self.llm, verbose=verbose)
        self.multi_user_tester = MultiUserTesterAgent.create(llm=self.llm, verbose=verbose)
        self.edge_case_hunter = EdgeCaseHunterAgent.create(llm=self.llm, verbose=verbose)
        self.report_synthesizer = ReportSynthesizerAgent.create(llm=self.llm, verbose=verbose)

    def run(self, test_user: dict | None = None) -> dict[str, Any]:
        """
        Run E2E testing workflow.

        Args:
            test_user: Optional test user credentials

        Returns:
            E2E test results with issues found
        """
        tasks = [
            Task(
                description=f"Test authentication flows at {self.base_url}: login, register, logout, session management, protected routes.",
                expected_output="Auth flow test results with pass/fail status",
                agent=self.auth_flow_tester,
            ),
            Task(
                description=f"Test CRUD operations at {self.base_url}: properties, offers, visits - create, read, update, delete.",
                expected_output="CRUD test results with database verification",
                agent=self.crud_operations_tester,
            ),
            Task(
                description=f"Test form validation at {self.base_url}: all forms with valid, invalid, edge case, and malicious inputs.",
                expected_output="Form validation results with vulnerabilities",
                agent=self.form_validation_tester,
            ),
            Task(
                description=f"Test navigation at {self.base_url}: routes, deep links, history, breadcrumbs, 404 handling.",
                expected_output="Navigation test results with routing issues",
                agent=self.navigation_tester,
            ),
            Task(
                description=f"Test error handling at {self.base_url}: API errors, network failures, graceful degradation.",
                expected_output="Error handling results with UX issues",
                agent=self.error_handling_tester,
            ),
            Task(
                description=f"Test state persistence at {self.base_url}: localStorage, session, Zustand stores across refresh/restart.",
                expected_output="State persistence results with issues",
                agent=self.state_persistence_tester,
            ),
            Task(
                description=f"Test multi-user scenarios at {self.base_url}: concurrent users, data isolation, real-time updates.",
                expected_output="Multi-user test results with race conditions",
                agent=self.multi_user_tester,
            ),
            Task(
                description=f"Hunt edge cases at {self.base_url}: boundary values, unusual inputs, rapid actions, stress scenarios.",
                expected_output="Edge case findings with reproduction steps",
                agent=self.edge_case_hunter,
            ),
            Task(
                description="Synthesize all E2E findings into prioritized bug list.",
                expected_output="E2E Test Report with prioritized issues",
                agent=self.report_synthesizer,
            ),
        ]

        crew = Crew(
            agents=[
                self.auth_flow_tester,
                self.crud_operations_tester,
                self.form_validation_tester,
                self.navigation_tester,
                self.error_handling_tester,
                self.state_persistence_tester,
                self.multi_user_tester,
                self.edge_case_hunter,
                self.report_synthesizer,
            ],
            tasks=tasks,
            process=Process.sequential,
            verbose=self.verbose,
        )

        result = crew.kickoff()

        return {
            "crew": "e2e",
            "base_url": self.base_url,
            "agents_used": 9,
            "report": result.raw if hasattr(result, "raw") else str(result),
        }
