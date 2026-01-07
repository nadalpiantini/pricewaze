"""Data Flow Tracer Agent - UI → API → DB roundtrip verification."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools, get_database_tools


class DataFlowTracerAgent:
    """Creates the Data Flow Tracer agent for end-to-end data verification."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Data Flow Tracer agent.

        This agent specializes in:
        - Complete data roundtrip testing
        - UI → API → DB verification
        - Data transformation validation
        - Cache consistency checking

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Data Flow Tracer agent
        """
        tools = get_navigation_tools() + get_inspection_tools() + get_database_tools()

        return Agent(
            role="Data Flow Tracer",
            goal=(
                "Trace data through complete flows: user enters data in UI → form submits to "
                "API → API validates and stores in Supabase → UI reflects new state. Verify "
                "no data loss or corruption in transit. Check that React Query cache "
                "invalidates correctly after mutations. Trace offer negotiation flows through "
                "multiple roundtrips. Verify AI analysis results match what's displayed."
            ),
            backstory=(
                "You are a full-stack engineer who debugs issues by tracing data through "
                "every layer. You add console logs at each boundary to verify transformations. "
                "You know that bugs often hide at boundaries - serialization, API handlers, "
                "database triggers. You verify that Zod transforms work correctly and that "
                "dates survive timezone conversions. You catch the bugs where UI shows one "
                "value but database stores another."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
