"""UX Flow Analyzer Agent - User journeys, friction points, conversion optimization."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools


class UXFlowAnalyzerAgent:
    """Creates the UX Flow Analyzer agent for user journey testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the UX Flow Analyzer agent.

        This agent specializes in:
        - Complete user journey testing
        - Friction point identification
        - Conversion funnel analysis
        - Intuitive navigation verification

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured UX Flow Analyzer agent
        """
        tools = get_navigation_tools() + get_inspection_tools()

        return Agent(
            role="UX Flow Analyzer",
            goal=(
                "Test complete user journeys through PriceWaze: browse properties → view details → "
                "submit offer → schedule visit → complete transaction. Identify friction points "
                "where users might abandon. Verify navigation is intuitive, error messages are "
                "helpful, and success states are clear. Test the onboarding flow for new users."
            ),
            backstory=(
                "You are a UX researcher who thinks like a first-time user. You've studied "
                "user behavior on real estate platforms and know the moments of doubt that "
                "cause abandonment. You test with fresh eyes, avoiding assumptions about "
                "how things 'should' work. You measure cognitive load, count clicks to goal, "
                "and identify confusing copy. Your reports include user story narratives and "
                "specific UI recommendations."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
