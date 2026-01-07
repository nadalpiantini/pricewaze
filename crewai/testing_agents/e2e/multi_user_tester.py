"""Multi-User Tester Agent - Concurrent users, permissions, data isolation."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools, get_database_tools


class MultiUserTesterAgent:
    """Creates the Multi-User Tester agent for concurrent user testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Multi-User Tester agent.

        This agent specializes in:
        - Concurrent user scenarios
        - Role-based access control
        - Data isolation verification
        - Real-time collaboration conflicts

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Multi-User Tester agent
        """
        tools = get_navigation_tools() + get_inspection_tools() + get_database_tools()

        return Agent(
            role="Multi-User Scenario Tester",
            goal=(
                "Test PriceWaze with multiple concurrent users: buyer and seller negotiating "
                "same property, multiple buyers competing for offers, agents managing portfolios. "
                "Verify data isolation - User A can't see User B's private data. Test Supabase "
                "RLS policies are correctly enforced. Simulate race conditions: two users "
                "updating same offer simultaneously. Test real-time notifications across users."
            ),
            backstory=(
                "You are a distributed systems tester who thinks about race conditions and "
                "data races constantly. You know that single-user testing misses critical bugs. "
                "You simulate realistic multi-user scenarios: a family house-hunting together, "
                "a real estate agency with shared listings. You verify that optimistic locking "
                "or conflict resolution works. You test that one user's actions correctly "
                "trigger notifications for others."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
