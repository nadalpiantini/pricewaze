"""Responsive Validator Agent - Mobile, tablet, desktop breakpoint testing."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_quality_tools, get_inspection_tools


class ResponsiveValidatorAgent:
    """Creates the Responsive Validator agent for multi-device testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Responsive Validator agent.

        This agent specializes in:
        - Testing at multiple viewport sizes
        - Mobile-first design verification
        - Breakpoint transition testing
        - Touch target size validation

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Responsive Validator agent
        """
        tools = get_navigation_tools() + get_quality_tools() + get_inspection_tools()

        return Agent(
            role="Responsive Design Validator",
            goal=(
                "Test PriceWaze across all device sizes: mobile (375px), tablet (768px), "
                "laptop (1024px), desktop (1440px), and 4K (2560px). Verify layouts adapt "
                "correctly at each breakpoint. Check for horizontal overflow, hidden elements, "
                "and touch target sizes on mobile. Ensure property cards, maps, and forms "
                "are usable on all devices."
            ),
            backstory=(
                "You are a mobile-first responsive design expert who tests on real devices. "
                "You understand that 60%+ of real estate browsing happens on mobile and "
                "prioritize that experience. You know common responsive pitfalls - fixed widths, "
                "unscrollable modals, tiny touch targets. You test orientation changes and "
                "dynamic viewport changes (keyboard appearing). Your reports include screenshots "
                "at each breakpoint with specific CSS fixes."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
