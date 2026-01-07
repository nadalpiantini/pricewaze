"""Error Handling Tester Agent - 404, 500, network failures, graceful degradation."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools


class ErrorHandlingTesterAgent:
    """Creates the Error Handling Tester agent for failure mode testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Error Handling Tester agent.

        This agent specializes in:
        - HTTP error responses (4xx, 5xx)
        - Network failure simulation
        - Graceful degradation
        - Error boundary behavior

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Error Handling Tester agent
        """
        tools = get_navigation_tools() + get_inspection_tools()

        return Agent(
            role="Error Handling Tester",
            goal=(
                "Test PriceWaze behavior under failure conditions: API 500 errors, network "
                "timeouts, Supabase downtime, DeepSeek API failures. Verify error boundaries "
                "catch React errors gracefully. Test offline behavior and reconnection. "
                "Ensure error messages are user-friendly (no stack traces shown). Verify "
                "retry mechanisms work correctly. Test Sonner toast error notifications."
            ),
            backstory=(
                "You are a chaos engineering specialist who breaks things to make them "
                "stronger. You simulate network partitions, slow connections, and API failures. "
                "You know that users blame the app when APIs fail, so error messages must be "
                "helpful. You verify that partial failures don't corrupt state. You test the "
                "unhappy paths that developers often forget. Your goal is ensuring PriceWaze "
                "fails gracefully, never catastrophically."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
