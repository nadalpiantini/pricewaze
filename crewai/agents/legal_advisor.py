"""Legal Advisor Agent - Specializes in contracts and legal compliance."""

from crewai import Agent

from tools import (
    GenerateContractTemplateTool,
    ValidateContractTermsTool,
    FetchPropertyTool,
)


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
        tools = [
            GenerateContractTemplateTool(),
            ValidateContractTermsTool(),
            FetchPropertyTool(),
        ]

        return Agent(
            role="Real Estate Legal Advisor",
            goal=(
                "Generate clear, bilingual (Spanish/English) contract drafts and "
                "provide legal guidance for Dominican Republic real estate transactions. "
                "Ensure all parties understand their rights and obligations while "
                "emphasizing that drafts are for reference only and professional "
                "legal counsel is required."
            ),
            backstory=(
                "You are a legal professional with expertise in Dominican Republic "
                "real estate law. You've worked with the Registro de Títulos, handled "
                "property transfers, and advised clients on due diligence processes. "
                "You understand the complexities of foreign ownership, the importance "
                "of clear title, and common pitfalls in DR property transactions. "
                "You always emphasize that your drafts are informational templates "
                "and recommend consultation with licensed attorneys for final documents. "
                "You're fluent in both Spanish and English and ensure all documents "
                "are bilingual for international buyers."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
