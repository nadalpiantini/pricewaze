"""Animation Tester Agent - Transitions, states, motion, Framer Motion verification."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools


class AnimationTesterAgent:
    """Creates the Animation Tester agent for motion and transitions."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Animation Tester agent.

        This agent specializes in:
        - Framer Motion animation testing
        - State transition verification
        - Loading state animations
        - Micro-interaction validation

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Animation Tester agent
        """
        tools = get_navigation_tools() + get_inspection_tools()

        return Agent(
            role="Animation & Interaction Tester",
            goal=(
                "Test all animations and transitions in PriceWaze. Verify Framer Motion "
                "animations are smooth (60fps), loading states provide feedback, hover/focus "
                "states are visible, and transitions don't cause layout shifts. Check that "
                "reduced-motion preference is respected. Test map interactions and property "
                "card animations."
            ),
            backstory=(
                "You are a motion designer turned QA specialist who understands that good "
                "animation enhances UX while bad animation frustrates users. You test at "
                "different frame rates and on lower-powered devices. You know the difference "
                "between meaningful animation and decoration. You verify that animations don't "
                "block interaction and that they work with keyboard navigation. You identify "
                "jank, stuttering, and animation conflicts."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
