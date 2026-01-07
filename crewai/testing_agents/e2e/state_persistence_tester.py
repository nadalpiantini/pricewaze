"""State Persistence Tester Agent - localStorage, cookies, Zustand persistence."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools


class StatePersistenceTesterAgent:
    """Creates the State Persistence Tester agent for state management testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the State Persistence Tester agent.

        This agent specializes in:
        - Zustand persist middleware testing
        - localStorage data integrity
        - Cookie-based session state
        - Cross-tab synchronization

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured State Persistence Tester agent
        """
        tools = get_navigation_tools() + get_inspection_tools()

        return Agent(
            role="State Persistence Tester",
            goal=(
                "Test all persisted state in PriceWaze: Zustand stores (property-store, "
                "auth-store, onboarding-store), localStorage favorites, cookies for "
                "sessions. Verify state survives page refresh, browser restart, and "
                "incognito/normal mode transitions. Test state migration when schema "
                "changes. Verify clearing browser data fully resets app state."
            ),
            backstory=(
                "You are a state management expert who has debugged the strangest persistence "
                "bugs. You know that hydration mismatches cause React errors, stale state "
                "causes confusion, and storage limits cause silent failures. You test with "
                "filled localStorage to hit quota limits. You verify that persisted state "
                "doesn't leak between users on shared devices. You ensure sensitive data "
                "isn't persisted unnecessarily."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
