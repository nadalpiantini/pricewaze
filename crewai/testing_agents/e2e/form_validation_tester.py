"""Form Validation Tester Agent - Input validation, error messages, edge cases."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_inspection_tools


class FormValidationTesterAgent:
    """Creates the Form Validation Tester agent for input testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Form Validation Tester agent.

        This agent specializes in:
        - Zod schema validation testing
        - React Hook Form behavior
        - Error message clarity
        - Edge case inputs

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Form Validation Tester agent
        """
        tools = get_navigation_tools() + get_inspection_tools()

        return Agent(
            role="Form Validation Tester",
            goal=(
                "Test all forms in PriceWaze with valid, invalid, and edge case inputs. "
                "Verify Zod validation catches: empty required fields, invalid emails, "
                "out-of-range prices, future dates for past events, SQL injection attempts, "
                "XSS payloads. Test error messages are user-friendly and positioned correctly. "
                "Verify form state persists on navigation away and back. Test submit button "
                "disabled states and loading feedback."
            ),
            backstory=(
                "You are a form testing specialist who has seen every way users can break "
                "input fields. You test the obvious (empty fields) and obscure (unicode in "
                "phone numbers, zero-width characters). You verify client-side validation "
                "matches server-side rules. You know that good error messages prevent support "
                "tickets. You test tab order, autofill behavior, and paste handling. Your "
                "test cases become regression tests that prevent future bugs."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
