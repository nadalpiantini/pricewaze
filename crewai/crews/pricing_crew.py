"""Pricing Analysis Crew - Analyzes property pricing and fair value."""

from typing import Any

from crewai import Crew, Task, Process
from langchain_openai import ChatOpenAI

from agents import MarketAnalystAgent, PricingAnalystAgent
from config import get_settings


class PricingAnalysisCrew:
    """Crew for comprehensive property pricing analysis."""

    def __init__(self, verbose: bool = True):
        """Initialize the pricing analysis crew."""
        self.verbose = verbose
        self.settings = get_settings()

        # Initialize LLM with DeepSeek
        self.llm = ChatOpenAI(
            model=self.settings.deepseek_model,
            api_key=self.settings.deepseek_api_key,
            base_url=self.settings.deepseek_base_url,
            temperature=0.3,
        )

        # Create agents
        self.market_analyst = MarketAnalystAgent.create(llm=self.llm, verbose=verbose)
        self.pricing_analyst = PricingAnalystAgent.create(llm=self.llm, verbose=verbose)

    def create_tasks(self, property_id: str, zone_id: str | None = None) -> list[Task]:
        """Create tasks for pricing analysis workflow."""
        # Task 1: Market Research
        market_research_task = Task(
            description=(
                f"Analyze the real estate market for the zone containing property {property_id}. "
                f"{'Focus on zone ' + zone_id if zone_id else 'Identify the zone from property data.'} "
                "Gather comprehensive market statistics including:\n"
                "- Average and median prices per m²\n"
                "- Price range and distribution\n"
                "- Number of active listings\n"
                "- Recent sales volume\n"
                "- Property type breakdown\n"
                "Provide a market health assessment and trend analysis."
            ),
            expected_output=(
                "A detailed market analysis report with:\n"
                "1. Zone identification and characteristics\n"
                "2. Price statistics (avg, median, range per m²)\n"
                "3. Market health score (0-100) and trend (hot/warm/cool/cold)\n"
                "4. Competitive landscape summary\n"
                "5. Key market insights (2-3 bullet points)"
            ),
            agent=self.market_analyst,
        )

        # Task 2: Property Valuation
        property_valuation_task = Task(
            description=(
                f"Perform a detailed valuation analysis for property {property_id}. "
                "Using the market research from the previous task:\n"
                "- Fetch complete property details\n"
                "- Compare against zone comparable properties\n"
                "- Calculate fair market value estimate\n"
                "- Assess pricing fairness (underpriced/fair/overpriced)\n"
                "- Identify value factors (positive and negative)"
            ),
            expected_output=(
                "A comprehensive property valuation report with:\n"
                "1. Property summary (price, area, price/m², features)\n"
                "2. Comparable analysis (vs zone average/median)\n"
                "3. Fairness score (0-100) and label\n"
                "4. Estimated fair market value\n"
                "5. Price deviation from market (%)\n"
                "6. Value factors affecting price\n"
                "7. Confidence level in assessment"
            ),
            agent=self.pricing_analyst,
            context=[market_research_task],  # Depends on market research
        )

        # Task 3: Suggested Offers
        suggested_offers_task = Task(
            description=(
                "Based on the market research and property valuation, generate "
                "three tiered offer suggestions for a potential buyer:\n"
                "- AGGRESSIVE: Maximum discount, higher risk of rejection\n"
                "- BALANCED: Fair offer with good chance of acceptance\n"
                "- CONSERVATIVE: Minimal discount, highest acceptance probability\n"
                "For each, explain the rationale and likely seller response."
            ),
            expected_output=(
                "Three offer recommendations:\n"
                "1. AGGRESSIVE offer amount with rationale\n"
                "2. BALANCED offer amount with rationale\n"
                "3. CONSERVATIVE offer amount with rationale\n"
                "Plus:\n"
                "- Recommended approach based on market conditions\n"
                "- Key negotiation points to emphasize\n"
                "- Potential seller objections to prepare for"
            ),
            agent=self.pricing_analyst,
            context=[market_research_task, property_valuation_task],
        )

        return [market_research_task, property_valuation_task, suggested_offers_task]

    def run(self, property_id: str, zone_id: str | None = None) -> dict[str, Any]:
        """
        Run the pricing analysis crew.

        Args:
            property_id: UUID of the property to analyze
            zone_id: Optional zone UUID for context

        Returns:
            Complete pricing analysis results
        """
        tasks = self.create_tasks(property_id, zone_id)

        crew = Crew(
            agents=[self.market_analyst, self.pricing_analyst],
            tasks=tasks,
            process=Process.sequential,  # Tasks run in order with dependencies
            verbose=self.verbose,
            memory=self.settings.crew_memory,
            max_rpm=self.settings.crew_max_rpm,
        )

        result = crew.kickoff()

        return {
            "property_id": property_id,
            "zone_id": zone_id,
            "analysis_type": "pricing",
            "result": result.raw if hasattr(result, "raw") else str(result),
            "tasks_output": [
                {
                    "task": task.description[:100] + "...",
                    "output": task.output.raw if task.output else None,
                }
                for task in tasks
            ],
        }
