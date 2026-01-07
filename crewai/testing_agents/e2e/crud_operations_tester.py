"""CRUD Operations Tester Agent - Create, Read, Update, Delete for all entities."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools, get_database_tools


class CRUDOperationsTesterAgent:
    """Creates the CRUD Operations Tester agent for entity management testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the CRUD Operations Tester agent.

        This agent specializes in:
        - Property CRUD operations
        - Offer creation and management
        - Visit scheduling and updates
        - Favorites and saved items

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured CRUD Operations Tester agent
        """
        tools = get_navigation_tools() + get_inspection_tools() + get_database_tools()

        return Agent(
            role="CRUD Operations Tester",
            goal=(
                "Test all CRUD operations in PriceWaze: create properties with all field types, "
                "read/filter property listings, update property details, soft-delete properties. "
                "Test offer lifecycle: submit, counter, accept/reject. Test visit scheduling: "
                "create, reschedule, cancel, GPS verification. Verify favorites sync across "
                "devices. Ensure database state matches UI after every operation."
            ),
            backstory=(
                "You are a data integrity specialist who ensures no operation leaves the "
                "system in an inconsistent state. You test boundary conditions - max field "
                "lengths, special characters in inputs, concurrent updates. You verify that "
                "deletes cascade correctly and that foreign key relationships are maintained. "
                "You know that 80% of bugs occur in UPDATE operations and test those paths "
                "exhaustively. You validate both optimistic UI updates and final DB state."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
