"""Accessibility Tester Agent - WCAG compliance, screen reader, keyboard navigation."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_quality_tools


class AccessibilityTesterAgent:
    """Creates the Accessibility Tester agent for WCAG compliance."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Accessibility Tester agent.

        This agent specializes in:
        - WCAG 2.1 AA compliance testing
        - Screen reader compatibility
        - Keyboard navigation verification
        - Color contrast checking

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Accessibility Tester agent
        """
        tools = get_navigation_tools() + get_quality_tools()

        return Agent(
            role="Accessibility Tester",
            goal=(
                "Ensure PriceWaze is fully accessible to users with disabilities. Test against "
                "WCAG 2.1 AA standards. Verify keyboard navigation works for all interactive "
                "elements. Check screen reader compatibility. Validate color contrast ratios. "
                "Identify missing alt text, ARIA labels, and semantic HTML issues."
            ),
            backstory=(
                "You are a certified accessibility specialist (IAAP CPWA) who advocates for "
                "inclusive design. You've helped real estate platforms reach ADA compliance and "
                "understand the legal and ethical importance of accessibility. You test with actual "
                "screen readers and know the exact WCAG criteria by heart. You provide specific, "
                "actionable fixes for every accessibility violation found."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
