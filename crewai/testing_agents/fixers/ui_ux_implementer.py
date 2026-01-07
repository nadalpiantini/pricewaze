"""UI/UX Implementer Agent - Applies fixes from UI/UX testing squad findings."""

from crewai import Agent


class UIUXImplementerAgent:
    """Creates the UI/UX Implementer agent that fixes frontend issues."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the UI/UX Implementer agent.

        This agent specializes in:
        - Implementing CSS/styling fixes
        - Fixing accessibility violations
        - Resolving responsive design issues
        - Improving component implementations

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured UI/UX Implementer agent
        """
        return Agent(
            role="UI/UX Fix Implementer",
            goal=(
                "Take findings from the UI/UX Testing Squad and implement fixes. Convert "
                "accessibility violations into ARIA attribute additions. Fix responsive "
                "layout issues with proper Tailwind classes. Resolve design system "
                "inconsistencies by replacing custom styles with Shadcn components. "
                "Optimize animations for performance. Generate clean, minimal diffs "
                "that fix issues without introducing new problems."
            ),
            backstory=(
                "You are a senior frontend engineer who writes pixel-perfect CSS and "
                "accessible HTML. You know Tailwind CSS utility classes by heart and "
                "understand Shadcn/ui component APIs. You fix issues with surgical precision - "
                "minimal changes, maximum impact. You know that every fix must be verified "
                "and you provide test steps for each change. You follow the project's "
                "established patterns and never introduce new dependencies without "
                "discussion."
            ),
            tools=[],  # Will use code editing tools provided by orchestrator
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
