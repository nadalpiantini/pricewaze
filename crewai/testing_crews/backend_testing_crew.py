"""Backend Testing Crew - Backend integration testing with 5 agents."""

from typing import Any

from crewai import Crew, Task, Process
from langchain_openai import ChatOpenAI

from config import get_settings
from testing_agents import (
    APIContractValidatorAgent,
    DatabaseIntegrityCheckerAgent,
    DataFlowTracerAgent,
    RealtimeSyncTesterAgent,
    MigrationValidatorAgent,
    ReportSynthesizerAgent,
)


class BackendTestingCrew:
    """Backend integration testing workflow with 5 specialized agents."""

    def __init__(self, verbose: bool = True, base_url: str = "http://localhost:3000"):
        """Initialize the backend testing crew."""
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
        self.api_contract_validator = APIContractValidatorAgent.create(llm=self.llm, verbose=verbose)
        self.database_integrity_checker = DatabaseIntegrityCheckerAgent.create(llm=self.llm, verbose=verbose)
        self.data_flow_tracer = DataFlowTracerAgent.create(llm=self.llm, verbose=verbose)
        self.realtime_sync_tester = RealtimeSyncTesterAgent.create(llm=self.llm, verbose=verbose)
        self.migration_validator = MigrationValidatorAgent.create(llm=self.llm, verbose=verbose)
        self.report_synthesizer = ReportSynthesizerAgent.create(llm=self.llm, verbose=verbose)

    def run(self, endpoints: list[str] | None = None) -> dict[str, Any]:
        """
        Run backend testing workflow.

        Args:
            endpoints: Optional list of specific API endpoints to test

        Returns:
            Backend test results with issues found
        """
        endpoints_to_test = endpoints or [
            "/api/properties",
            "/api/offers",
            "/api/visits",
            "/api/ai/pricing",
            "/api/ai/advice",
        ]

        tasks = [
            Task(
                description=f"Validate API contracts at {self.base_url}: test {', '.join(endpoints_to_test)} for schemas, status codes, auth.",
                expected_output="API contract validation with violations",
                agent=self.api_contract_validator,
            ),
            Task(
                description="Check database integrity: foreign keys, constraints, orphan records, computed columns in pricewaze_* tables.",
                expected_output="Database integrity report with data issues",
                agent=self.database_integrity_checker,
            ),
            Task(
                description=f"Trace data flows at {self.base_url}: UI → API → Database roundtrip verification.",
                expected_output="Data flow trace with transformation issues",
                agent=self.data_flow_tracer,
            ),
            Task(
                description=f"Test real-time sync at {self.base_url}: Supabase subscriptions for offers, visits, properties.",
                expected_output="Real-time sync results with latency",
                agent=self.realtime_sync_tester,
            ),
            Task(
                description="Validate migrations: idempotency, data preservation, rollback capability.",
                expected_output="Migration validation with issues",
                agent=self.migration_validator,
            ),
            Task(
                description="Synthesize all backend findings into prioritized fix list.",
                expected_output="Backend Test Report with prioritized fixes",
                agent=self.report_synthesizer,
            ),
        ]

        crew = Crew(
            agents=[
                self.api_contract_validator,
                self.database_integrity_checker,
                self.data_flow_tracer,
                self.realtime_sync_tester,
                self.migration_validator,
                self.report_synthesizer,
            ],
            tasks=tasks,
            process=Process.sequential,
            verbose=self.verbose,
        )

        result = crew.kickoff()

        return {
            "crew": "backend",
            "base_url": self.base_url,
            "endpoints_tested": endpoints_to_test,
            "agents_used": 6,
            "report": result.raw if hasattr(result, "raw") else str(result),
        }
