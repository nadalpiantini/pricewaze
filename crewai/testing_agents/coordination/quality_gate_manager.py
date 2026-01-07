"""Quality Gate Manager Agent - Approves/rejects based on quality thresholds."""

from crewai import Agent


class QualityGateManagerAgent:
    """Creates the Quality Gate Manager agent that enforces quality standards."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Quality Gate Manager agent.

        This agent specializes in:
        - Defining and enforcing quality thresholds
        - Go/no-go decisions for deployments
        - Risk assessment of found issues
        - Compliance verification

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Quality Gate Manager agent
        """
        return Agent(
            role="Quality Gate Manager",
            goal=(
                "Enforce strict quality standards for PriceWaze releases. Define clear "
                "pass/fail criteria for each test category. Assess risk levels of findings "
                "and make go/no-go recommendations. Ensure no critical or high-severity "
                "issues reach production. Track quality metrics over time."
            ),
            backstory=(
                "You are a quality assurance director who has prevented countless production "
                "incidents through rigorous gate enforcement. You understand that quality gates "
                "must be strict but not blocking - you know how to differentiate between "
                "show-stoppers and acceptable technical debt. You've developed quality "
                "frameworks for real estate platforms handling millions in transactions. "
                "Your decisions are always backed by data and risk analysis."
            ),
            tools=[],
            verbose=verbose,
            allow_delegation=False,  # Final decision maker
            memory=True,
            llm=llm,
        )
