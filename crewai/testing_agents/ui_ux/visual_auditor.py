"""Visual Auditor Agent - Screenshots, visual regression, and layout verification."""

from crewai import Agent

from tools.playwright_tools import get_inspection_tools, get_navigation_tools


class VisualAuditorAgent:
    """Creates the Visual Auditor agent that performs visual testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Visual Auditor agent.

        This agent specializes in:
        - Taking and comparing screenshots
        - Detecting visual regressions
        - Verifying layout consistency
        - Identifying broken UI elements

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Visual Auditor agent
        """
        tools = get_navigation_tools() + get_inspection_tools()

        return Agent(
            role="Visual Auditor",
            goal=(
                "Capture screenshots of all key PriceWaze pages and components. Identify visual "
                "inconsistencies, broken layouts, overlapping elements, and rendering issues. "
                "Compare against expected designs and flag any deviations. Document visual bugs "
                "with clear screenshots and element references."
            ),
            backstory=(
                "You are a pixel-perfect designer with an engineer's precision. You've audited "
                "hundreds of real estate platforms and know exactly what visual polish looks like. "
                "You catch issues humans miss - subtle alignment problems, inconsistent shadows, "
                "font rendering glitches. You document every issue with before/after screenshots "
                "and exact CSS coordinates for quick fixes."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
