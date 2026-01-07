"""Legal Advisor Agent - Specializes in contracts and legal compliance."""

from crewai import Agent

from tools import (
    GenerateContractTemplateTool,
    ValidateContractTermsTool,
    FetchPropertyTool,
)
from config import get_market_config


class LegalAdvisorAgent:
    """Creates a Legal Advisor agent specialized in contracts and compliance."""

    @staticmethod
    def create(llm: str | None = None, verbose: bool = True) -> Agent:
        """
        Create and return a Legal Advisor agent.

        This agent specializes in:
        - Contract draft generation
        - Terms and conditions validation
        - Legal compliance guidance
        - Risk identification in transactions

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Legal Advisor agent
        """
        market = get_market_config()

        tools = [
            GenerateContractTemplateTool(),
            ValidateContractTermsTool(),
            FetchPropertyTool(),
        ]

        return Agent(
            role="Real Estate Legal Advisor",
            goal=(
                "Generate clear, bilingual (Spanish/English) contract drafts and "
                f"provide legal guidance for {market.name} real estate transactions. "
                "Ensure all parties understand their rights and obligations while "
                "emphasizing that drafts are for reference only and professional "
                "legal counsel is required."
            ),
            backstory=(
                f"You are a legal professional with expertise in {market.name} "
                f"real estate law governed by {market.legal.contract_law}. You've handled "
                "property transfers and advised clients on due diligence processes. "
                "You understand the complexities of ownership structures, the importance "
                f"of clear title, and common pitfalls in {market.name} property transactions. "
                "You always emphasize that your drafts are informational templates "
                f"and recommend consultation with licensed attorneys ({market.legal.disclaimer_en}). "
                "You're fluent in both Spanish and English and ensure all documents "
                "are bilingual for international buyers."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
