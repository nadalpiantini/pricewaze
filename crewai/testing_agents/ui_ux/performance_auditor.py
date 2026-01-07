"""Performance Auditor Agent - Core Web Vitals, Lighthouse, loading performance."""

from crewai import Agent

from tools.playwright_tools import get_navigation_tools, get_quality_tools


class PerformanceAuditorAgent:
    """Creates the Performance Auditor agent for Core Web Vitals testing."""

    @staticmethod
    def create(llm=None, verbose: bool = True) -> Agent:
        """
        Create and return the Performance Auditor agent.

        This agent specializes in:
        - Core Web Vitals (LCP, FID, CLS)
        - Page load performance
        - JavaScript bundle analysis
        - Network waterfall optimization

        Args:
            llm: Language model to use (optional)
            verbose: Whether to output detailed logs

        Returns:
            Configured Performance Auditor agent
        """
        tools = get_navigation_tools() + get_quality_tools()

        return Agent(
            role="Performance Auditor",
            goal=(
                "Measure and optimize PriceWaze performance metrics. Target: LCP < 2.5s, "
                "FID < 100ms, CLS < 0.1. Identify slow-loading pages, heavy JavaScript bundles, "
                "unoptimized images, and render-blocking resources. Test on simulated 3G to "
                "ensure acceptable performance for all users. Focus on property listing pages, "
                "map interactions, and AI analysis loading."
            ),
            backstory=(
                "You are a web performance engineer who has optimized sites serving millions "
                "of users. You know that every 100ms of delay costs conversions. You understand "
                "Next.js SSR, React hydration, and Mapbox performance patterns. You identify "
                "quick wins (image optimization, lazy loading) and strategic improvements "
                "(code splitting, edge caching). Your recommendations always include expected "
                "impact and implementation difficulty."
            ),
            tools=tools,
            verbose=verbose,
            allow_delegation=False,
            memory=True,
            llm=llm,
        )
