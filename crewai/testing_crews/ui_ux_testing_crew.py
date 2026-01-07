"""UI/UX Testing Crew - Focused testing with 7 UI/UX agents."""

from typing import Any

from crewai import Crew, Task, Process
from langchain_openai import ChatOpenAI

from config import get_settings
from testing_agents import (
    VisualAuditorAgent,
    AccessibilityTesterAgent,
    ResponsiveValidatorAgent,
    PerformanceAuditorAgent,
    UXFlowAnalyzerAgent,
    DesignSystemEnforcerAgent,
    AnimationTesterAgent,
    ReportSynthesizerAgent,
)


class UIUXTestingCrew:
    """UI/UX focused testing workflow with 7 specialized agents."""

    def __init__(self, verbose: bool = True, base_url: str = "http://localhost:3000"):
        """Initialize the UI/UX testing crew."""
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
        self.visual_auditor = VisualAuditorAgent.create(llm=self.llm, verbose=verbose)
        self.accessibility_tester = AccessibilityTesterAgent.create(llm=self.llm, verbose=verbose)
        self.responsive_validator = ResponsiveValidatorAgent.create(llm=self.llm, verbose=verbose)
        self.performance_auditor = PerformanceAuditorAgent.create(llm=self.llm, verbose=verbose)
        self.ux_flow_analyzer = UXFlowAnalyzerAgent.create(llm=self.llm, verbose=verbose)
        self.design_system_enforcer = DesignSystemEnforcerAgent.create(llm=self.llm, verbose=verbose)
        self.animation_tester = AnimationTesterAgent.create(llm=self.llm, verbose=verbose)
        self.report_synthesizer = ReportSynthesizerAgent.create(llm=self.llm, verbose=verbose)

    def run(self, pages: list[str] | None = None) -> dict[str, Any]:
        """
        Run UI/UX testing workflow.

        Args:
            pages: Optional list of specific pages to test

        Returns:
            UI/UX test results with recommendations
        """
        pages_to_test = pages or ["/", "/login", "/dashboard", "/properties", "/offers"]
        pages_str = ", ".join(pages_to_test)

        tasks = [
            Task(
                description=f"Visual audit of {self.base_url} pages: {pages_str}. Take screenshots, check layouts, identify visual bugs.",
                expected_output="Visual audit report with screenshots and issues",
                agent=self.visual_auditor,
            ),
            Task(
                description=f"Accessibility audit of {self.base_url}: WCAG 2.1 AA compliance for pages {pages_str}.",
                expected_output="Accessibility violations with WCAG criteria and fixes",
                agent=self.accessibility_tester,
            ),
            Task(
                description=f"Responsive testing of {self.base_url} at mobile, tablet, desktop breakpoints.",
                expected_output="Responsive issues per breakpoint with fixes",
                agent=self.responsive_validator,
            ),
            Task(
                description=f"Performance audit of {self.base_url}: Core Web Vitals, load times, resource optimization.",
                expected_output="Performance metrics with optimization recommendations",
                agent=self.performance_auditor,
            ),
            Task(
                description=f"UX flow analysis of {self.base_url}: user journeys, friction points, conversion paths.",
                expected_output="UX analysis with improvement recommendations",
                agent=self.ux_flow_analyzer,
            ),
            Task(
                description=f"Design system audit of {self.base_url}: Shadcn/ui consistency, Tailwind usage, component patterns.",
                expected_output="Design system compliance report",
                agent=self.design_system_enforcer,
            ),
            Task(
                description=f"Animation testing of {self.base_url}: Framer Motion, transitions, loading states, reduced motion.",
                expected_output="Animation audit with performance issues",
                agent=self.animation_tester,
            ),
            Task(
                description="Synthesize all UI/UX findings into prioritized action items.",
                expected_output="UI/UX Test Report with prioritized fixes",
                agent=self.report_synthesizer,
            ),
        ]

        crew = Crew(
            agents=[
                self.visual_auditor,
                self.accessibility_tester,
                self.responsive_validator,
                self.performance_auditor,
                self.ux_flow_analyzer,
                self.design_system_enforcer,
                self.animation_tester,
                self.report_synthesizer,
            ],
            tasks=tasks,
            process=Process.sequential,
            verbose=self.verbose,
        )

        result = crew.kickoff()

        return {
            "crew": "ui_ux",
            "base_url": self.base_url,
            "pages_tested": pages_to_test,
            "agents_used": 8,
            "report": result.raw if hasattr(result, "raw") else str(result),
        }
