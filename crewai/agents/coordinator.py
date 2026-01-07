"""Coordinator Agent - Orchestrates multi-agent workflows and synthesizes results."""

from crewai import Agent

from config import get_market_config


class CoordinatorAgent:
    """Creates a Coordinator agent that orchestrates other agents."""

    @staticmethod
    def create(llm: str | None = None, verbose: bool = True) -> Agent:
        """
        Create and return a Coordinator agent.

        This agent specializes in:
        - Orchestrating multi-agent workflows
        - Synthesizing results from specialist agents
        - Quality control and consistency
        - Final recommendation generation

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Coordinator agent
        """
        market = get_market_config()

        return Agent(
            role="Real Estate Transaction Coordinator",
            goal=(
                "Orchestrate comprehensive property analysis by coordinating market, "
                "pricing, negotiation, and legal specialists. Synthesize their findings "
                "into actionable recommendations that help clients make informed "
                f"decisions about {market.name} real estate investments."
            ),
            backstory=(
                f"You are a senior real estate consultant who has managed thousands of "
                f"transactions in {market.name}. You know how to extract the "
                "best insights from specialists and present them in a clear, actionable "
                "format. You understand that clients need confidence in their decisions, "
                "so you ensure all analyses are thorough, consistent, and well-reasoned. "
                "You're excellent at identifying gaps in analysis and asking the right "
                "follow-up questions. Your final recommendations balance opportunity "
                "with risk and always consider the client's specific situation."
            ),
            tools=[],  # Coordinator delegates to other agents
            verbose=verbose,
            allow_delegation=True,  # Can delegate to specialist agents
            memory=True,
            llm=llm,
        )
