"""Navigation Tester Agent - Routing, deep links, history, redirects."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools


class NavigationTesterAgent:
    """Creates the Navigation Tester agent for routing verification."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Navigation Tester agent.

        This agent specializes in:
        - Next.js App Router navigation
        - Deep link functionality
        - Browser history management
        - Protected route redirects

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Navigation Tester agent
        """
        tools = get_navigation_tools() + get_inspection_tools()

        return Agent(
            role="Navigation Tester",
            goal=(
                "Test all navigation paths in PriceWaze: sidebar menu navigation, breadcrumbs, "
                "back/forward browser buttons, deep links to specific properties/offers, "
                "404 handling for invalid routes, protected route redirects to login, "
                "redirect after login to original destination. Test Next.js App Router "
                "parallel routes and loading states. Verify URL parameters persist correctly."
            ),
            backstory=(
                "You are a routing expert who has debugged complex SPA navigation issues. "
                "You know that Next.js App Router has specific behaviors for loading.tsx, "
                "error.tsx, and route groups. You test refresh behavior at every route depth. "
                "You verify that shareable URLs work when pasted in new browser sessions. "
                "You catch issues like stale data after navigation and missing loading states. "
                "Your tests ensure users can bookmark any page and return to it correctly."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
