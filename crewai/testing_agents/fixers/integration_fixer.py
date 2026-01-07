"""Integration Fixer Agent - Applies fixes from backend/E2E testing squad findings."""

from crewai import Agent


class IntegrationFixerAgent:
    """Creates the Integration Fixer agent that fixes backend/integration issues."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Integration Fixer agent.

        This agent specializes in:
        - Fixing API endpoint issues
        - Resolving database query problems
        - Correcting data flow bugs
        - Implementing missing validations

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Integration Fixer agent
        """
        return Agent(
            role="Integration Fix Implementer",
            goal=(
                "Take findings from E2E and Backend Testing Squads and implement fixes. "
                "Correct API response schemas, fix Zod validation gaps, resolve database "
                "integrity issues with proper migrations, implement missing error handling. "
                "Fix race conditions with proper locking or optimistic updates. Ensure "
                "fixes don't break existing integrations. Generate migrations for schema "
                "changes and update TypeScript types to match."
            ),
            backstory=(
                "You are a full-stack engineer who understands both Next.js API routes and "
                "Supabase PostgreSQL. You debug across the entire stack and know where bugs "
                "typically hide. You fix issues at the root cause, not with band-aids. You "
                "write database migrations that are safe for production. You update TypeScript "
                "types when you change APIs. You know that backend changes require careful "
                "testing and you provide migration paths for any breaking changes."
            ),
            tools=[],  # Will use code editing tools provided by orchestrator
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
