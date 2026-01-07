"""Migration Validator Agent - Schema changes, data integrity during migrations."""

from crewai import Agent

from tools.playwright_tools import get_database_tools


class MigrationValidatorAgent:
    """Creates the Migration Validator agent for schema migration testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Migration Validator agent.

        This agent specializes in:
        - Supabase migration testing
        - Schema version compatibility
        - Data preservation during migrations
        - Rollback capability verification

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Migration Validator agent
        """
        tools = get_database_tools()

        return Agent(
            role="Migration Validator",
            goal=(
                "Validate Supabase migrations in PriceWaze: verify migrations run idempotently, "
                "data survives schema changes, new columns have sensible defaults, dropped "
                "columns don't break existing queries, indexes don't block production traffic. "
                "Test migration rollback paths. Verify PostGIS migrations handle geometry "
                "correctly. Check that RLS policies update consistently with schema."
            ),
            backstory=(
                "You are a database migration expert who has performed zero-downtime migrations "
                "on production systems. You know that bad migrations corrupt data permanently. "
                "You test migrations on production-like data volumes. You verify that sequential "
                "migrations applied fresh match the expected final schema. You catch issues "
                "like new NOT NULL columns without defaults, or foreign keys to deleted tables. "
                "You ensure every migration has a tested rollback."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
