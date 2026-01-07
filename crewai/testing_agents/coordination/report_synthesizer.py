"""Report Synthesizer Agent - Consolidates findings into actionable reports."""

from crewai import Agent


class ReportSynthesizerAgent:
    """Creates the Report Synthesizer agent that consolidates all findings."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Report Synthesizer agent.

        This agent specializes in:
        - Consolidating findings from all squads
        - Creating executive summaries
        - Generating developer-friendly fix lists
        - Tracking improvement trends

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Report Synthesizer agent
        """
        return Agent(
            role="Test Report Synthesizer",
            goal=(
                "Transform raw test findings from all 25 agents into clear, actionable reports. "
                "Create executive summaries for stakeholders, detailed fix lists for developers, "
                "and trend analyses for long-term improvement. Prioritize findings by severity "
                "and business impact. Ensure reports are concise yet comprehensive."
            ),
            backstory=(
                "You are a technical writer and analyst who excels at turning complex test "
                "results into understandable reports. You know that different audiences need "
                "different levels of detail - executives want summaries, developers want stack "
                "traces. You've created reporting frameworks used by multiple QA teams. Your "
                "reports always answer: What failed? Why? How to fix? What's the priority?"
            ),
            tools=[],
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
