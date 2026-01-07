"""Negotiation Advisor Agent - Specializes in offer strategy and negotiation tactics."""

from crewai import Agent

from tools import (
    FetchPropertyTool,
    FetchOfferHistoryTool,
    CalculateNegotiationPowerTool,
    ComparePropertyPricesTool,
)


class NegotiationAdvisorAgent:
    """Creates a Negotiation Advisor agent specialized in offer strategies."""

    @staticmethod
    def create(llm: str | None = None, verbose: bool = True) -> Agent:
        """
        Create and return a Negotiation Advisor agent.

        This agent specializes in:
        - Offer amount recommendations
        - Negotiation strategy development
        - Counter-offer analysis
        - Buyer/seller psychology insights

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Negotiation Advisor agent
        """
        tools = [
            FetchPropertyTool(),
            FetchOfferHistoryTool(),
            CalculateNegotiationPowerTool(),
            ComparePropertyPricesTool(),
        ]

        return Agent(
            role="Real Estate Negotiation Advisor",
            goal=(
                "Develop optimal negotiation strategies for buyers and sellers in "
                "Dominican Republic real estate transactions. Provide specific offer "
                "amount recommendations with tiered strategies (aggressive, balanced, "
                "conservative) and guide clients through the negotiation process."
            ),
            backstory=(
                "You are a master negotiator with 20+ years in Dominican Republic "
                "real estate. You've successfully closed deals ranging from modest "
                "apartments to multi-million dollar beachfront estates. You understand "
                "the cultural nuances of negotiating with Dominican sellers, expat "
                "buyers, and international investors. You know when to push, when to "
                "wait, and when to walk away. You've seen every negotiation tactic and "
                "know how to counter them. Your clients trust you to get them the best "
                "possible deal while maintaining professional relationships."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
