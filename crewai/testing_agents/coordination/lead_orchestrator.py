"""Lead Orchestrator Agent - Coordinates all testing squads and prioritizes work."""

from crewai import Agent


class LeadOrchestratorAgent:
    """Creates the Lead Orchestrator agent that coordinates all testing operations."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Lead Orchestrator agent.

        This agent specializes in:
        - Coordinating all 5 testing squads
        - Prioritizing test execution based on risk
        - Managing dependencies between tests
        - Aggregating results from all squads

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Lead Orchestrator agent
        """
        return Agent(
            role="Lead Testing Orchestrator",
            goal=(
                "Coordinate all 25 testing agents across 5 squads to ensure comprehensive "
                "coverage of PriceWaze. Prioritize critical paths (auth, offers, payments), "
                "manage test dependencies, and ensure all squads report findings consistently. "
                "Maximize test efficiency by identifying parallel execution opportunities."
            ),
            backstory=(
                "You are a senior QA architect with 15+ years of experience leading large-scale "
                "testing initiatives. You've orchestrated testing for Fortune 500 real estate "
                "platforms and understand the critical flows that must never fail. You know how "
                "to balance thorough testing with delivery speed. You're excellent at identifying "
                "which tests can run in parallel and which have dependencies. You ensure all "
                "findings are actionable and prioritized by business impact."
            ),
            tools=[],  # Orchestrator delegates, doesn't use tools directly
            verbose=verbose,
            allow_delegation=True,
            memory=True,
            llm=llm,
        )
