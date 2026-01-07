"""Negotiation Advisory Crew - Provides offer strategy and negotiation guidance."""

from typing import Any

from crewai import Crew, Task, Process
from langchain_openai import ChatOpenAI

from agents import PricingAnalystAgent, NegotiationAdvisorAgent
from config import get_settings


class NegotiationAdvisoryCrew:
    """Crew for negotiation strategy and offer advice."""

    def __init__(self, verbose: bool = True):
        """Initialize the negotiation advisory crew."""
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
        self.pricing_analyst = PricingAnalystAgent.create(llm=self.llm, verbose=verbose)
        self.negotiation_advisor = NegotiationAdvisorAgent.create(llm=self.llm, verbose=verbose)

    def create_buyer_tasks(
        self,
        property_id: str,
        buyer_budget: float | None = None,
    ) -> list[Task]:
        """Create tasks for buyer-side negotiation advice."""
        # Task 1: Property Position Analysis
        position_task = Task(
            description=(
                f"Analyze the negotiation position for property {property_id}. "
                "Determine:\n"
                "- Days on market and listing history\n"
                "- Price changes (reductions)\n"
                "- Offer history and competition\n"
                "- Market conditions in the zone\n"
                "Calculate the buyer's negotiation power score."
            ),
            expected_output=(
                "Negotiation position analysis with:\n"
                "1. Property listing history summary\n"
                "2. Negotiation power score (0-100)\n"
                "3. Key factors affecting leverage\n"
                "4. Market condition assessment"
            ),
            agent=self.negotiation_advisor,
        )

        # Task 2: Offer Strategy Development
        budget_context = f"Buyer's budget is ${buyer_budget:,.0f} USD. " if buyer_budget else ""
        strategy_task = Task(
            description=(
                f"Develop a comprehensive offer strategy for property {property_id}. "
                f"{budget_context}"
                "Based on the position analysis, create:\n"
                "- Three tiered offer amounts (aggressive, balanced, conservative)\n"
                "- Opening offer recommendation\n"
                "- Counter-offer response guidelines\n"
                "- Walk-away threshold\n"
                "- Key negotiation talking points"
            ),
            expected_output=(
                "Complete negotiation strategy including:\n"
                "1. Three offer tiers with amounts and rationale\n"
                "2. Recommended opening offer and approach\n"
                "3. Counter-offer response playbook\n"
                "4. Walk-away price and conditions\n"
                "5. Top 3 negotiation talking points\n"
                "6. Common seller objections and responses"
            ),
            agent=self.negotiation_advisor,
            context=[position_task],
        )

        return [position_task, strategy_task]

    def create_seller_tasks(
        self,
        property_id: str,
        offer_amount: float,
        offer_message: str | None = None,
    ) -> list[Task]:
        """Create tasks for seller-side offer evaluation."""
        # Task 1: Offer Analysis
        analysis_task = Task(
            description=(
                f"Analyze the offer of ${offer_amount:,.0f} USD for property {property_id}. "
                f"{'Buyer message: ' + offer_message if offer_message else ''}\n"
                "Evaluate:\n"
                "- Offer vs. listing price comparison\n"
                "- Offer vs. estimated fair value\n"
                "- Current market conditions\n"
                "- Property's time on market\n"
                "- Previous offers if any"
            ),
            expected_output=(
                "Offer evaluation with:\n"
                "1. Offer amount vs. listing price (%)\n"
                "2. Offer position vs. market\n"
                "3. Time-on-market context\n"
                "4. Comparable recent sales"
            ),
            agent=self.pricing_analyst,
        )

        # Task 2: Seller Recommendation
        recommendation_task = Task(
            description=(
                f"Provide a recommendation for the seller on the ${offer_amount:,.0f} offer. "
                "Based on the analysis, recommend one of:\n"
                "- ACCEPT: Take the offer as-is\n"
                "- COUNTER: Respond with a specific counter amount\n"
                "- REJECT: Decline and wait for better offers\n"
                "- WAIT: Hold for more offers before responding\n"
                "Provide confidence level and detailed reasoning."
            ),
            expected_output=(
                "Seller recommendation including:\n"
                "1. Clear recommendation (accept/counter/reject/wait)\n"
                "2. If counter: suggested amount and justification\n"
                "3. Confidence level (0-100%)\n"
                "4. Top 3 reasons for recommendation\n"
                "5. Risks of following/not following advice\n"
                "6. Response timeline suggestion"
            ),
            agent=self.negotiation_advisor,
            context=[analysis_task],
        )

        return [analysis_task, recommendation_task]

    def run_buyer_advice(
        self,
        property_id: str,
        buyer_budget: float | None = None,
    ) -> dict[str, Any]:
        """
        Run buyer-side negotiation advisory.

        Args:
            property_id: UUID of the property
            buyer_budget: Optional buyer's maximum budget

        Returns:
            Negotiation strategy for buyers
        """
        tasks = self.create_buyer_tasks(property_id, buyer_budget)

        crew = Crew(
            agents=[self.negotiation_advisor, self.pricing_analyst],
            tasks=tasks,
            process=Process.sequential,
            verbose=self.verbose,
            memory=self.settings.crew_memory,
            max_rpm=self.settings.crew_max_rpm,
        )

        result = crew.kickoff()

        return {
            "property_id": property_id,
            "advice_type": "buyer",
            "buyer_budget": buyer_budget,
            "result": result.raw if hasattr(result, "raw") else str(result),
            "tasks_output": [
                {
                    "task": task.description[:100] + "...",
                    "output": task.output.raw if task.output else None,
                }
                for task in tasks
            ],
        }

    def run_seller_advice(
        self,
        property_id: str,
        offer_amount: float,
        offer_message: str | None = None,
    ) -> dict[str, Any]:
        """
        Run seller-side offer evaluation.

        Args:
            property_id: UUID of the property
            offer_amount: The offer amount to evaluate
            offer_message: Optional message from the buyer

        Returns:
            Recommendation for sellers
        """
        tasks = self.create_seller_tasks(property_id, offer_amount, offer_message)

        crew = Crew(
            agents=[self.pricing_analyst, self.negotiation_advisor],
            tasks=tasks,
            process=Process.sequential,
            verbose=self.verbose,
            memory=self.settings.crew_memory,
            max_rpm=self.settings.crew_max_rpm,
        )

        result = crew.kickoff()

        return {
            "property_id": property_id,
            "advice_type": "seller",
            "offer_amount": offer_amount,
            "result": result.raw if hasattr(result, "raw") else str(result),
            "tasks_output": [
                {
                    "task": task.description[:100] + "...",
                    "output": task.output.raw if task.output else None,
                }
                for task in tasks
            ],
        }
