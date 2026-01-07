"""API Contract Validator Agent - Request/response schemas, API versioning."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_database_tools


class APIContractValidatorAgent:
    """Creates the API Contract Validator agent for API testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the API Contract Validator agent.

        This agent specializes in:
        - API request/response validation
        - Schema compliance testing
        - Error response formats
        - Rate limiting verification

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured API Contract Validator agent
        """
        tools = get_navigation_tools() + get_database_tools()

        return Agent(
            role="API Contract Validator",
            goal=(
                "Validate all PriceWaze API contracts: /api/properties, /api/offers, /api/visits, "
                "/api/ai/*. Verify request schemas match Zod validations, response schemas are "
                "consistent, error formats follow RFC 7807, and HTTP status codes are correct. "
                "Test authentication requirements on protected endpoints. Verify CORS headers "
                "and rate limiting behavior."
            ),
            backstory=(
                "You are an API design expert who has built OpenAPI specifications for major "
                "platforms. You know that API contracts are the foundation of frontend-backend "
                "trust. You test that TypeScript types match actual API responses. You verify "
                "that breaking changes don't reach production. You understand the difference "
                "between 400 (client error) and 500 (server error) and ensure APIs use them "
                "correctly. Your contract tests prevent integration nightmares."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
