"""Quick Smoke Test Crew - Fast critical path testing with minimal agents."""

from typing import Any

from crewai import Crew, Task, Process
from langchain_openai import ChatOpenAI

from config import get_settings
from testing_agents import (
    AuthFlowTesterAgent,
    NavigationTesterAgent,
    APIContractValidatorAgent,
    PerformanceAuditorAgent,
    ReportSynthesizerAgent,
)


class QuickSmokeTestCrew:
    """Fast smoke test workflow for critical paths only."""

    def __init__(self, verbose: bool = True, base_url: str = "http://localhost:3000"):
        """Initialize the quick smoke test crew."""
        self.verbose = verbose
        self.base_url = base_url
        self.settings = get_settings()

        self.llm = ChatOpenAI(
            model=self.settings.deepseek_model,
            api_key=self.settings.deepseek_api_key,
            base_url=self.settings.deepseek_base_url,
            temperature=0.2,
        )

        # Initialize minimal agent set
        self.auth_flow_tester = AuthFlowTesterAgent.create(llm=self.llm, verbose=verbose)
        self.navigation_tester = NavigationTesterAgent.create(llm=self.llm, verbose=verbose)
        self.api_contract_validator = APIContractValidatorAgent.create(llm=self.llm, verbose=verbose)
        self.performance_auditor = PerformanceAuditorAgent.create(llm=self.llm, verbose=verbose)
        self.report_synthesizer = ReportSynthesizerAgent.create(llm=self.llm, verbose=verbose)

    def run(self) -> dict[str, Any]:
        """
        Run quick smoke test - critical paths only.

        Returns:
            Smoke test results with pass/fail status
        """
        tasks = [
            Task(
                description=f"Quick auth test at {self.base_url}: login works, logout works, protected routes redirect.",
                expected_output="Auth smoke test: PASS/FAIL with critical issues",
                agent=self.auth_flow_tester,
            ),
            Task(
                description=f"Quick navigation test at {self.base_url}: main pages load, no 500 errors, basic routing works.",
                expected_output="Navigation smoke test: PASS/FAIL with broken routes",
                agent=self.navigation_tester,
            ),
            Task(
                description=f"Quick API test at {self.base_url}/api/*: main endpoints respond, auth works, no server errors.",
                expected_output="API smoke test: PASS/FAIL with broken endpoints",
                agent=self.api_contract_validator,
            ),
            Task(
                description=f"Quick performance check at {self.base_url}: homepage loads <3s, no blocking resources.",
                expected_output="Performance smoke test: PASS/FAIL with metrics",
                agent=self.performance_auditor,
            ),
            Task(
                description="Summarize smoke test results into go/no-go decision.",
                expected_output="Smoke Test Summary: GO/NO-GO with blocking issues",
                agent=self.report_synthesizer,
            ),
        ]

        crew = Crew(
            agents=[
                self.auth_flow_tester,
                self.navigation_tester,
                self.api_contract_validator,
                self.performance_auditor,
                self.report_synthesizer,
            ],
            tasks=tasks,
            process=Process.sequential,
            verbose=self.verbose,
        )

        result = crew.kickoff()

        return {
            "crew": "smoke_test",
            "base_url": self.base_url,
            "agents_used": 5,
            "quick_test": True,
            "report": result.raw if hasattr(result, "raw") else str(result),
        }
