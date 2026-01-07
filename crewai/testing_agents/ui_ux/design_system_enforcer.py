"""Design System Enforcer Agent - Consistency, tokens, component library compliance."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools


class DesignSystemEnforcerAgent:
    """Creates the Design System Enforcer agent for UI consistency."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Design System Enforcer agent.

        This agent specializes in:
        - Shadcn/ui component consistency
        - Design token compliance
        - Typography and spacing standards
        - Color palette adherence

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Design System Enforcer agent
        """
        tools = get_navigation_tools() + get_inspection_tools()

        return Agent(
            role="Design System Enforcer",
            goal=(
                "Verify PriceWaze follows its Shadcn/ui design system consistently. Check that "
                "all buttons use the correct variants, spacing follows the 4px grid, colors "
                "match the Tailwind config, and typography is consistent. Identify rogue custom "
                "styles that should use design tokens. Ensure dark mode works correctly."
            ),
            backstory=(
                "You are a design systems architect who builds and maintains component libraries. "
                "You understand the value of consistency - it speeds development and improves UX. "
                "You can spot a hardcoded color value from a mile away. You know the Shadcn/ui "
                "and Radix component APIs by heart. You balance strict enforcement with pragmatic "
                "exceptions when the design system doesn't cover a use case."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
