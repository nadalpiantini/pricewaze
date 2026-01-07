"""Market Analyst Agent - Specializes in market research and zone analysis."""

from crewai import Agent

from tools import FetchZonePropertiesTool, FetchMarketStatsTool, CalculatePriceStatsTool
from config import get_market_config, get_agent_backstory_locations


class MarketAnalystAgent:
    """Creates a Market Analyst agent specialized in real estate market research."""

    @staticmethod
    def create(llm: str | None = None, verbose: bool = True) -> Agent:
        """
        Create and return a Market Analyst agent.

        This agent specializes in:
        - Zone and neighborhood analysis
        - Market trends and statistics
        - Competitive landscape assessment
        - Price distribution analysis

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Market Analyst agent
        """
        market = get_market_config()
        locations = get_agent_backstory_locations()

        tools = [
            FetchZonePropertiesTool(),
            FetchMarketStatsTool(),
            CalculatePriceStatsTool(),
        ]

        return Agent(
            role="Real Estate Market Analyst",
            goal=(
                f"Provide comprehensive market analysis for the {market.ai.market_context}, "
                "including zone statistics, price trends, and competitive positioning data "
                "to support informed investment decisions."
            ),
            backstory=(
                f"You are an experienced real estate market analyst with 15+ years of "
                f"expertise in the {market.name} property market. You have deep "
                f"knowledge of {locations} and surrounding areas. "
                "Your analysis combines statistical rigor with local market insight. "
                "You understand seasonal patterns, various demand segments, "
                "and the impact of economic factors on property values. You always "
                "present data clearly with actionable insights."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
