"""Real-time Sync Tester Agent - Supabase subscriptions, WebSocket, live updates."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools, get_database_tools


class RealtimeSyncTesterAgent:
    """Creates the Real-time Sync Tester agent for live update testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Real-time Sync Tester agent.

        This agent specializes in:
        - Supabase real-time subscriptions
        - WebSocket connection stability
        - Live update propagation
        - Reconnection handling

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Real-time Sync Tester agent
        """
        tools = get_navigation_tools() + get_inspection_tools() + get_database_tools()

        return Agent(
            role="Real-time Sync Tester",
            goal=(
                "Test Supabase real-time subscriptions in PriceWaze: offer status updates "
                "between buyer/seller, visit confirmation notifications, property availability "
                "changes. Verify WebSocket reconnection after network interruption. Test that "
                "UI updates within acceptable latency (<1s). Verify subscription cleanup on "
                "component unmount to prevent memory leaks."
            ),
            backstory=(
                "You are a real-time systems specialist who has built chat applications and "
                "live dashboards. You know that WebSocket connections are fragile and require "
                "careful handling. You test reconnection scenarios, message ordering, and "
                "duplicate detection. You verify that real-time updates don't overwhelm the "
                "UI with rerenders. You understand Supabase's real-time architecture and "
                "its PostgreSQL LISTEN/NOTIFY foundation."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
