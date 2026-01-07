"""Contract Generation Crew - Creates and validates contract drafts."""

from typing import Any

from crewai import Crew, Task, Process
from langchain_openai import ChatOpenAI

from agents import LegalAdvisorAgent, NegotiationAdvisorAgent
from config import get_settings


class ContractGenerationCrew:
    """Crew for contract draft generation and validation."""

    def __init__(self, verbose: bool = True):
        """Initialize the contract generation crew."""
        self.verbose = verbose
        self.settings = get_settings()

        # Initialize LLM with DeepSeek
        self.llm = ChatOpenAI(
            model=self.settings.deepseek_model,
            api_key=self.settings.deepseek_api_key,
            base_url=self.settings.deepseek_base_url,
            temperature=0.2,  # Lower temperature for legal documents
        )

        # Create agents
        self.legal_advisor = LegalAdvisorAgent.create(llm=self.llm, verbose=verbose)
        self.negotiation_advisor = NegotiationAdvisorAgent.create(llm=self.llm, verbose=verbose)

    def create_tasks(
        self,
        property_id: str,
        buyer_name: str,
        seller_name: str,
        agreed_price: float,
        property_address: str,
        deposit_percent: float = 10,
        closing_days: int = 30,
        special_conditions: list[str] | None = None,
    ) -> list[Task]:
        """Create tasks for contract generation workflow."""
        # Task 1: Validate Terms
        validation_task = Task(
            description=(
                f"Validate the proposed contract terms for property {property_id}:\n"
                f"- Agreed Price: ${agreed_price:,.0f} USD\n"
                f"- Deposit: {deposit_percent}%\n"
                f"- Closing Timeline: {closing_days} days\n"
                f"{'- Special Conditions: ' + ', '.join(special_conditions) if special_conditions else ''}\n\n"
                "Check these terms against Dominican Republic real estate standards:\n"
                "- Is the deposit percentage appropriate?\n"
                "- Is the closing timeline reasonable?\n"
                "- Are there any red flags in the terms?\n"
                "- What additional protections should be considered?"
            ),
            expected_output=(
                "Terms validation report with:\n"
                "1. Overall validity assessment (valid/needs adjustment)\n"
                "2. Deposit analysis (standard range: 10-20%)\n"
                "3. Timeline assessment (standard: 30-45 days)\n"
                "4. Identified issues or concerns\n"
                "5. Recommended adjustments if any\n"
                "6. Additional protective clauses to consider"
            ),
            agent=self.legal_advisor,
        )

        # Task 2: Generate Contract Draft
        generation_task = Task(
            description=(
                f"Generate a bilingual (Spanish/English) purchase agreement draft:\n\n"
                f"PARTIES:\n"
                f"- Buyer: {buyer_name}\n"
                f"- Seller: {seller_name}\n\n"
                f"PROPERTY:\n"
                f"- Address: {property_address}\n"
                f"- Property ID: {property_id}\n\n"
                f"TERMS:\n"
                f"- Sale Price: ${agreed_price:,.0f} USD\n"
                f"- Deposit: {deposit_percent}% (${agreed_price * deposit_percent / 100:,.0f})\n"
                f"- Balance: {100 - deposit_percent}% at closing\n"
                f"- Closing: {closing_days} days from signing\n"
                f"{'- Special Conditions: ' + ', '.join(special_conditions) if special_conditions else ''}\n\n"
                "Include all standard clauses for DR real estate and clear disclaimers "
                "that this is a non-binding draft requiring attorney review."
            ),
            expected_output=(
                "Complete bilingual contract draft including:\n"
                "1. Legal header with non-binding disclaimer\n"
                "2. Party identification section (with ID placeholders)\n"
                "3. Property description section\n"
                "4. Price and payment terms\n"
                "5. Standard conditions (title, inspection, liens)\n"
                "6. Special conditions if any\n"
                "7. Closing procedures\n"
                "8. Signature blocks\n"
                "9. Witness section\n"
                "10. Final legal disclaimer about attorney review"
            ),
            agent=self.legal_advisor,
            context=[validation_task],
        )

        # Task 3: Risk Summary
        risk_task = Task(
            description=(
                "Based on the contract terms and validation, provide a risk summary "
                "for both buyer and seller:\n"
                "- What are the key risks for the buyer?\n"
                "- What are the key risks for the seller?\n"
                "- What due diligence steps are essential?\n"
                "- What could go wrong and how to prevent it?"
            ),
            expected_output=(
                "Transaction risk summary:\n"
                "1. Buyer risks (2-3 key items)\n"
                "2. Seller risks (2-3 key items)\n"
                "3. Essential due diligence checklist\n"
                "4. Common pitfalls and prevention measures\n"
                "5. Recommended professional consultations"
            ),
            agent=self.negotiation_advisor,
            context=[validation_task, generation_task],
        )

        return [validation_task, generation_task, risk_task]

    def run(
        self,
        property_id: str,
        buyer_name: str,
        seller_name: str,
        agreed_price: float,
        property_address: str,
        deposit_percent: float = 10,
        closing_days: int = 30,
        special_conditions: list[str] | None = None,
    ) -> dict[str, Any]:
        """
        Run the contract generation crew.

        Args:
            property_id: UUID of the property
            buyer_name: Full legal name of buyer
            seller_name: Full legal name of seller
            agreed_price: Agreed sale price in USD
            property_address: Full property address
            deposit_percent: Deposit percentage (default 10%)
            closing_days: Days until closing (default 30)
            special_conditions: List of special conditions

        Returns:
            Contract draft and related analysis
        """
        tasks = self.create_tasks(
            property_id=property_id,
            buyer_name=buyer_name,
            seller_name=seller_name,
            agreed_price=agreed_price,
            property_address=property_address,
            deposit_percent=deposit_percent,
            closing_days=closing_days,
            special_conditions=special_conditions,
        )

        crew = Crew(
            agents=[self.legal_advisor, self.negotiation_advisor],
            tasks=tasks,
            process=Process.sequential,
            verbose=self.verbose,
            memory=self.settings.crew_memory,
            max_rpm=self.settings.crew_max_rpm,
        )

        result = crew.kickoff()

        # Extract contract from generation task
        contract_output = tasks[1].output.raw if tasks[1].output else ""

        return {
            "property_id": property_id,
            "buyer": buyer_name,
            "seller": seller_name,
            "agreed_price": agreed_price,
            "deposit_amount": agreed_price * deposit_percent / 100,
            "contract_draft": contract_output,
            "full_analysis": result.raw if hasattr(result, "raw") else str(result),
            "tasks_output": [
                {
                    "task": task.description[:100] + "...",
                    "output": task.output.raw if task.output else None,
                }
                for task in tasks
            ],
        }
