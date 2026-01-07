"""Pricing Analyst Agent - Specializes in property valuation and fair price estimation."""

from crewai import Agent

from tools import (
    FetchPropertyTool,
    FetchZonePropertiesTool,
    CalculatePriceStatsTool,
    ComparePropertyPricesTool,
)


class PricingAnalystAgent:
    """Creates a Pricing Analyst agent specialized in property valuation."""

    @staticmethod
    def create(llm: str | None = None, verbose: bool = True) -> Agent:
        """
        Create and return a Pricing Analyst agent.

        This agent specializes in:
        - Property valuation and fair price estimation
        - Comparable sales analysis
        - Price fairness assessment
        - Value identification (underpriced opportunities)

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Pricing Analyst agent
        """
        tools = [
            FetchPropertyTool(),
            FetchZonePropertiesTool(),
            CalculatePriceStatsTool(),
            ComparePropertyPricesTool(),
        ]

        return Agent(
            role="Real Estate Pricing Analyst",
            goal=(
                "Accurately assess property values by analyzing comparable sales, "
                "market conditions, and property characteristics. Identify whether "
                "properties are fairly priced, overpriced, or represent good value "
                "for buyers in the Dominican Republic market."
            ),
            backstory=(
                "You are a certified real estate appraiser with extensive experience "
                "in the Dominican Republic market. You've appraised thousands of "
                "properties across residential, commercial, and vacation segments. "
                "You understand the nuances of USD vs. DOP pricing, the impact of "
                "proximity to beaches and amenities, and how to adjust for property "
                "condition and features. Your valuations are respected by banks, "
                "investors, and individual buyers alike. You always explain your "
                "methodology and confidence level in your assessments."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
