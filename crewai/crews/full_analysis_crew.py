"""Full Property Analysis Crew - Comprehensive end-to-end property analysis."""

from typing import Any

from crewai import Crew, Task, Process
from langchain_openai import ChatOpenAI

from agents import (
    MarketAnalystAgent,
    PricingAnalystAgent,
    NegotiationAdvisorAgent,
    LegalAdvisorAgent,
    CoordinatorAgent,
)
from config import get_settings


class FullPropertyAnalysisCrew:
    """Complete property analysis with all specialist agents."""

    def __init__(self, verbose: bool = True):
        """Initialize the full analysis crew."""
        self.verbose = verbose
        self.settings = get_settings()

        # Initialize LLM with DeepSeek
        self.llm = ChatOpenAI(
            model=self.settings.deepseek_model,
            api_key=self.settings.deepseek_api_key,
            base_url=self.settings.deepseek_base_url,
            temperature=0.3,
        )

        # Create all specialist agents
        self.market_analyst = MarketAnalystAgent.create(llm=self.llm, verbose=verbose)
        self.pricing_analyst = PricingAnalystAgent.create(llm=self.llm, verbose=verbose)
        self.negotiation_advisor = NegotiationAdvisorAgent.create(llm=self.llm, verbose=verbose)
        self.legal_advisor = LegalAdvisorAgent.create(llm=self.llm, verbose=verbose)
        self.coordinator = CoordinatorAgent.create(llm=self.llm, verbose=verbose)

    def create_tasks(
        self,
        property_id: str,
        buyer_budget: float | None = None,
        generate_contract: bool = False,
        buyer_name: str | None = None,
        seller_name: str | None = None,
    ) -> list[Task]:
        """Create comprehensive analysis tasks."""
        tasks = []

        # Task 1: Market Analysis
        market_task = Task(
            description=(
                f"Perform comprehensive market analysis for property {property_id}:\n"
                "1. Identify the property's zone/neighborhood\n"
                "2. Gather zone market statistics\n"
                "3. Analyze recent sales and listings\n"
                "4. Assess market health and trends\n"
                "5. Identify competitive properties"
            ),
            expected_output=(
                "Market intelligence report:\n"
                "- Zone characteristics and positioning\n"
                "- Price statistics (avg, median, range per m²)\n"
                "- Market health score and trend assessment\n"
                "- Competitive landscape summary\n"
                "- Key market insights"
            ),
            agent=self.market_analyst,
        )
        tasks.append(market_task)

        # Task 2: Property Valuation
        pricing_task = Task(
            description=(
                f"Analyze property {property_id} pricing and fair value:\n"
                "1. Fetch complete property details\n"
                "2. Compare to zone comparables\n"
                "3. Calculate fair market value estimate\n"
                "4. Assess pricing fairness\n"
                "5. Identify value factors"
            ),
            expected_output=(
                "Property valuation report:\n"
                "- Property details summary\n"
                "- Comparable analysis results\n"
                "- Fairness score and label\n"
                "- Estimated fair value\n"
                "- Value factors (positive/negative)"
            ),
            agent=self.pricing_analyst,
            context=[market_task],
        )
        tasks.append(pricing_task)

        # Task 3: Negotiation Strategy
        budget_note = f"Buyer budget: ${buyer_budget:,.0f}. " if buyer_budget else ""
        negotiation_task = Task(
            description=(
                f"Develop negotiation strategy for property {property_id}. "
                f"{budget_note}\n"
                "1. Analyze negotiation leverage factors\n"
                "2. Calculate negotiation power score\n"
                "3. Develop three offer tiers\n"
                "4. Create negotiation playbook\n"
                "5. Anticipate seller responses"
            ),
            expected_output=(
                "Negotiation strategy:\n"
                "- Negotiation power assessment\n"
                "- Three offer recommendations (aggressive/balanced/conservative)\n"
                "- Opening offer advice\n"
                "- Counter-offer response guidelines\n"
                "- Key talking points"
            ),
            agent=self.negotiation_advisor,
            context=[market_task, pricing_task],
        )
        tasks.append(negotiation_task)

        # Task 4: Legal Considerations
        legal_task = Task(
            description=(
                f"Review legal considerations for property {property_id}:\n"
                "1. Identify due diligence requirements\n"
                "2. List typical contract terms\n"
                "3. Highlight buyer protections needed\n"
                "4. Note common legal pitfalls\n"
                "5. Recommend professional consultations"
            ),
            expected_output=(
                "Legal considerations summary:\n"
                "- Due diligence checklist\n"
                "- Standard contract terms overview\n"
                "- Buyer protection recommendations\n"
                "- Common pitfalls to avoid\n"
                "- Professional consultation needs"
            ),
            agent=self.legal_advisor,
            context=[pricing_task],
        )
        tasks.append(legal_task)

        # Task 5: Contract Draft (if requested)
        if generate_contract and buyer_name and seller_name:
            contract_task = Task(
                description=(
                    f"Generate preliminary contract terms framework:\n"
                    f"- Buyer: {buyer_name}\n"
                    f"- Seller: {seller_name}\n"
                    f"- Property: {property_id}\n"
                    "Based on the analysis, suggest:\n"
                    "1. Appropriate deposit amount\n"
                    "2. Closing timeline\n"
                    "3. Key conditions to include\n"
                    "4. Special protections needed"
                ),
                expected_output=(
                    "Contract terms framework:\n"
                    "- Recommended deposit (amount and %)\n"
                    "- Suggested closing timeline\n"
                    "- Essential conditions list\n"
                    "- Special protections for this property\n"
                    "- Next steps for formal contract"
                ),
                agent=self.legal_advisor,
                context=[pricing_task, negotiation_task, legal_task],
            )
            tasks.append(contract_task)

        # Final Task: Executive Summary
        summary_task = Task(
            description=(
                "Synthesize all analyses into an executive summary:\n"
                "1. Overall investment recommendation\n"
                "2. Key findings from each specialist\n"
                "3. Risk assessment\n"
                "4. Recommended action plan\n"
                "5. Decision support metrics"
            ),
            expected_output=(
                "Executive Summary:\n\n"
                "INVESTMENT RECOMMENDATION: [Buy/Consider/Pass] with confidence level\n\n"
                "KEY FINDINGS:\n"
                "- Market: [summary]\n"
                "- Pricing: [summary]\n"
                "- Negotiation: [summary]\n"
                "- Legal: [summary]\n\n"
                "RISKS:\n"
                "- [Top 3 risks]\n\n"
                "OPPORTUNITIES:\n"
                "- [Top 3 opportunities]\n\n"
                "RECOMMENDED NEXT STEPS:\n"
                "1. [Action item]\n"
                "2. [Action item]\n"
                "3. [Action item]\n\n"
                "QUICK METRICS:\n"
                "- Fair Value: $X\n"
                "- Fairness Score: X/100\n"
                "- Negotiation Power: X/100\n"
                "- Recommended Offer: $X"
            ),
            agent=self.coordinator,
            context=tasks,  # Has access to all previous task outputs
        )
        tasks.append(summary_task)

        return tasks

    def run(
        self,
        property_id: str,
        buyer_budget: float | None = None,
        generate_contract: bool = False,
        buyer_name: str | None = None,
        seller_name: str | None = None,
    ) -> dict[str, Any]:
        """
        Run comprehensive property analysis.

        Args:
            property_id: UUID of the property to analyze
            buyer_budget: Optional buyer's maximum budget
            generate_contract: Whether to generate contract framework
            buyer_name: Buyer name (required if generate_contract=True)
            seller_name: Seller name (required if generate_contract=True)

        Returns:
            Complete multi-agent analysis results
        """
        tasks = self.create_tasks(
            property_id=property_id,
            buyer_budget=buyer_budget,
            generate_contract=generate_contract,
            buyer_name=buyer_name,
            seller_name=seller_name,
        )

        agents = [
            self.market_analyst,
            self.pricing_analyst,
            self.negotiation_advisor,
            self.legal_advisor,
            self.coordinator,
        ]

        crew = Crew(
            agents=agents,
            tasks=tasks,
            process=Process.sequential,
            verbose=self.verbose,
            memory=self.settings.crew_memory,
            max_rpm=self.settings.crew_max_rpm,
        )

        result = crew.kickoff()

        return {
            "property_id": property_id,
            "analysis_type": "full",
            "buyer_budget": buyer_budget,
            "contract_requested": generate_contract,
            "executive_summary": result.raw if hasattr(result, "raw") else str(result),
            "specialist_reports": [
                {
                    "specialist": task.agent.role if task.agent else "Unknown",
                    "task": task.description[:100] + "...",
                    "output": task.output.raw if task.output else None,
                }
                for task in tasks
            ],
            "agents_used": [agent.role for agent in agents],
        }
