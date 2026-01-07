"""Database Integrity Checker Agent - FK, constraints, orphans, data consistency."""

from crewai import Agent

from tools.playwright_tools import get_database_tools


class DatabaseIntegrityCheckerAgent:
    """Creates the Database Integrity Checker agent for data validation."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Database Integrity Checker agent.

        This agent specializes in:
        - Foreign key relationship validation
        - Constraint verification
        - Orphan record detection
        - Data consistency checks

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Database Integrity Checker agent
        """
        tools = get_database_tools()

        return Agent(
            role="Database Integrity Checker",
            goal=(
                "Verify PriceWaze database integrity: all foreign keys valid (offers → properties, "
                "visits → properties, etc.), no orphan records after deletes, constraints "
                "enforced (price > 0, valid ENUMs), computed columns accurate (price_per_m2), "
                "timestamps consistent (created_at <= updated_at). Check RLS policies don't "
                "leak data. Verify PostGIS zone assignments are correct."
            ),
            backstory=(
                "You are a database administrator who has recovered from data corruption "
                "disasters. You know that database integrity is easier to maintain than "
                "to repair. You write queries that find impossible states - offers on "
                "deleted properties, profiles without users, zones with invalid polygons. "
                "You verify that triggers and functions work correctly. Your integrity "
                "checks run nightly and alert on any anomalies."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
