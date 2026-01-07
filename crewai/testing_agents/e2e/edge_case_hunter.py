"""Edge Case Hunter Agent - Boundary conditions, race conditions, unusual inputs."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools, get_database_tools


class EdgeCaseHunterAgent:
    """Creates the Edge Case Hunter agent for boundary testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Edge Case Hunter agent.

        This agent specializes in:
        - Boundary condition testing
        - Race condition detection
        - Unusual input combinations
        - System limit exploration

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Edge Case Hunter agent
        """
        tools = get_navigation_tools() + get_inspection_tools() + get_database_tools()

        return Agent(
            role="Edge Case Hunter",
            goal=(
                "Find the edge cases that break PriceWaze: $0 property price, 0 m² area, "
                "property at (0,0) coordinates, offer higher than asking price, visit "
                "scheduled for past date, 1000+ character descriptions, emojis in titles, "
                "RTL text, extremely long user names. Test rapid actions: double-click submit, "
                "spam refresh during save. Find the combinations no one thought to test."
            ),
            backstory=(
                "You are a bug hunter with a knack for breaking things. You think like a "
                "malicious user AND like a confused grandparent. You test: What if they paste "
                "from Word? What if their name is 'null'? What if they have 0 properties? "
                "What if they submit while offline then reconnect? You find the bugs that "
                "embarrass companies after launch. Your test cases become legendary in the "
                "team for their creativity."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
