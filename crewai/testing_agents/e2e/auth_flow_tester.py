"""Auth Flow Tester Agent - Login, register, OAuth, sessions, password reset."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools, get_database_tools


class AuthFlowTesterAgent:
    """Creates the Auth Flow Tester agent for authentication testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Auth Flow Tester agent.

        This agent specializes in:
        - Login/logout flows
        - Registration process
        - OAuth authentication (Google, etc.)
        - Session management and persistence

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Auth Flow Tester agent
        """
        tools = get_navigation_tools() + get_inspection_tools() + get_database_tools()

        return Agent(
            role="Authentication Flow Tester",
            goal=(
                "Thoroughly test all authentication flows in PriceWaze: email/password login, "
                "registration with profile creation, Supabase OAuth, session persistence across "
                "tabs/refreshes, logout cleanup, and protected route redirects. Verify user "
                "profiles are created correctly in pricewaze_profiles. Test error states for "
                "invalid credentials, expired sessions, and rate limiting."
            ),
            backstory=(
                "You are a security-focused QA engineer who has found authentication bugs in "
                "major platforms. You know the OWASP authentication guidelines by heart and "
                "test edge cases that most overlook - concurrent sessions, token refresh races, "
                "logout on one device affecting others. You verify database state matches UI "
                "state after every auth action. You document exact reproduction steps for "
                "any auth vulnerability found."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
