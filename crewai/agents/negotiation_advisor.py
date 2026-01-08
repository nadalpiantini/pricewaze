"""Negotiation Advisor Agent - Specializes in offer strategy and negotiation tactics."""

from crewai import Agent

from config import get_market_config
from tools import (
    CalculateNegotiationPowerTool,
    ComparePropertyPricesTool,
    FetchOfferHistoryTool,
    FetchPropertyTool,
    MarketSignalsTool,
    OfferStrategyTool,
    # Waze-style negotiation tools
    ScenarioAnalysisTool,
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
        market = get_market_config()

        tools = [
            # Data fetching
            FetchPropertyTool(),
            FetchOfferHistoryTool(),
            # Analysis
            CalculateNegotiationPowerTool(),
            ComparePropertyPricesTool(),
            # Waze-style intelligence
            ScenarioAnalysisTool(),
            MarketSignalsTool(),
            OfferStrategyTool(),
        ]

        return Agent(
            role="Real Estate Negotiation Advisor",
            goal=(
                "Develop optimal negotiation strategies for buyers and sellers in "
                f"{market.name} real estate transactions. Provide specific offer "
                "amount recommendations with tiered strategies (aggressive, balanced, "
                "conservative) and guide clients through the negotiation process."
            ),
            backstory=(
                f"You are a master negotiator with 20+ years in {market.name} "
                "real estate, now enhanced with Waze-style market intelligence. "
                "You've successfully closed deals ranging from modest apartments to "
                "multi-million dollar premium properties. You understand cultural "
                "nuances of negotiating with local sellers and international investors. "
                "Your unique advantage: real-time market signals that detect opportunities "
                "like motivated sellers, price drop momentum, and bidding wars before "
                "others notice. You analyze scenarios like Waze analyzes traffic - "
                "identifying the fastest route to a successful deal. You know when to "
                "push, when to wait, and when to walk away. Your clients trust you to "
                "get them the best possible deal with data-driven confidence."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
