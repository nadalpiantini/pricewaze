"""Playwright Browser Automation Tools for Testing Crew."""

import asyncio
import base64
import json
from pathlib import Path
from typing import Any

from crewai.tools import BaseTool
from pydantic import Field

# Playwright imports (async)
try:
    from playwright.async_api import async_playwright, Page, Browser, BrowserContext
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False


class PlaywrightManager:
    """Singleton manager for Playwright browser instances."""

    _instance = None
    _browser: "Browser | None" = None
    _context: "BrowserContext | None" = None
    _page: "Page | None" = None
    _playwright = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def get_browser(self) -> "Browser":
        """Get or create browser instance."""
        if not PLAYWRIGHT_AVAILABLE:
            raise RuntimeError("Playwright not installed. Run: pip install playwright && playwright install")

        if self._browser is None or not self._browser.is_connected():
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
        return self._browser

    async def get_context(self, viewport: dict | None = None) -> "BrowserContext":
        """Get or create browser context with optional viewport."""
        browser = await self.get_browser()

        viewport = viewport or {"width": 1920, "height": 1080}
        self._context = await browser.new_context(
            viewport=viewport,
            user_agent="PriceWaze-TestAgent/1.0"
        )
        return self._context

    async def get_page(self, viewport: dict | None = None) -> "Page":
        """Get or create page instance."""
        context = await self.get_context(viewport)
        self._page = await context.new_page()
        return self._page

    async def close(self):
        """Close all browser resources."""
        if self._page:
            await self._page.close()
            self._page = None
        if self._context:
            await self._context.close()
            self._context = None
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None


def run_async(coro):
    """Run async coroutine in sync context."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import nest_asyncio
            nest_asyncio.apply()
            return loop.run_until_complete(coro)
        return loop.run_until_complete(coro)
    except RuntimeError:
        return asyncio.run(coro)


# =============================================================================
# NAVIGATION TOOLS
# =============================================================================

class NavigateTool(BaseTool):
    """Navigate to a URL and wait for load."""

    name: str = "navigate_to_url"
    description: str = (
        "Navigate browser to a URL. "
        "Input: JSON with 'url' (required), 'wait_until' (optional: 'load', 'domcontentloaded', 'networkidle'). "
        "Returns page title and URL after navigation."
    )

    def _run(self, input_str: str) -> str:
        async def _navigate():
            try:
                params = json.loads(input_str) if isinstance(input_str, str) else input_str
                url = params.get("url", input_str if isinstance(input_str, str) and input_str.startswith("http") else "")
                wait_until = params.get("wait_until", "domcontentloaded")

                if not url:
                    return json.dumps({"error": "URL required"})

                manager = PlaywrightManager()
                page = await manager.get_page()

                response = await page.goto(url, wait_until=wait_until, timeout=30000)

                return json.dumps({
                    "success": True,
                    "url": page.url,
                    "title": await page.title(),
                    "status": response.status if response else None
                })
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_navigate())


class ClickElementTool(BaseTool):
    """Click an element on the page."""

    name: str = "click_element"
    description: str = (
        "Click an element using CSS selector or text. "
        "Input: JSON with 'selector' (CSS) or 'text' (button/link text). "
        "Returns success status."
    )

    def _run(self, input_str: str) -> str:
        async def _click():
            try:
                params = json.loads(input_str) if isinstance(input_str, str) else input_str
                selector = params.get("selector")
                text = params.get("text")

                manager = PlaywrightManager()
                page = await manager.get_page()

                if text:
                    await page.get_by_text(text).click(timeout=10000)
                elif selector:
                    await page.click(selector, timeout=10000)
                else:
                    return json.dumps({"error": "Provide 'selector' or 'text'"})

                await page.wait_for_load_state("domcontentloaded")

                return json.dumps({
                    "success": True,
                    "url": page.url,
                    "clicked": selector or f"text:{text}"
                })
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_click())


class FillFormTool(BaseTool):
    """Fill form fields."""

    name: str = "fill_form"
    description: str = (
        "Fill form fields with values. "
        "Input: JSON with 'fields' array of {selector, value} or {label, value}. "
        "Returns filled fields status."
    )

    def _run(self, input_str: str) -> str:
        async def _fill():
            try:
                params = json.loads(input_str)
                fields = params.get("fields", [])

                manager = PlaywrightManager()
                page = await manager.get_page()

                filled = []
                for field in fields:
                    selector = field.get("selector")
                    label = field.get("label")
                    value = field.get("value", "")

                    if label:
                        await page.get_by_label(label).fill(value)
                        filled.append({"label": label, "filled": True})
                    elif selector:
                        await page.fill(selector, value)
                        filled.append({"selector": selector, "filled": True})

                return json.dumps({"success": True, "fields_filled": filled})
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_fill())


# =============================================================================
# INSPECTION TOOLS
# =============================================================================

class TakeScreenshotTool(BaseTool):
    """Take screenshot of page or element."""

    name: str = "take_screenshot"
    description: str = (
        "Take a screenshot. "
        "Input: JSON with 'path' (file path), 'full_page' (bool), 'selector' (optional element). "
        "Returns base64 encoded image or file path."
    )

    def _run(self, input_str: str) -> str:
        async def _screenshot():
            try:
                params = json.loads(input_str) if isinstance(input_str, str) else {"path": "screenshot.png"}
                path = params.get("path", "screenshot.png")
                full_page = params.get("full_page", False)
                selector = params.get("selector")

                manager = PlaywrightManager()
                page = await manager.get_page()

                # Ensure directory exists
                Path(path).parent.mkdir(parents=True, exist_ok=True)

                if selector:
                    element = page.locator(selector)
                    await element.screenshot(path=path)
                else:
                    await page.screenshot(path=path, full_page=full_page)

                return json.dumps({
                    "success": True,
                    "path": path,
                    "full_page": full_page
                })
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_screenshot())


class GetPageContentTool(BaseTool):
    """Get page content (HTML, text, or accessibility tree)."""

    name: str = "get_page_content"
    description: str = (
        "Get page content. "
        "Input: JSON with 'type' ('html', 'text', 'accessibility'). "
        "Returns requested content."
    )

    def _run(self, input_str: str) -> str:
        async def _content():
            try:
                params = json.loads(input_str) if isinstance(input_str, str) else {"type": "text"}
                content_type = params.get("type", "text")

                manager = PlaywrightManager()
                page = await manager.get_page()

                if content_type == "html":
                    content = await page.content()
                elif content_type == "accessibility":
                    content = await page.accessibility.snapshot()
                else:
                    content = await page.inner_text("body")

                return json.dumps({
                    "success": True,
                    "type": content_type,
                    "content": content[:10000] if isinstance(content, str) else content  # Limit size
                })
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_content())


class CheckElementTool(BaseTool):
    """Check element properties (visible, enabled, text content)."""

    name: str = "check_element"
    description: str = (
        "Check element properties. "
        "Input: JSON with 'selector' and 'checks' array ('visible', 'enabled', 'text', 'count'). "
        "Returns check results."
    )

    def _run(self, input_str: str) -> str:
        async def _check():
            try:
                params = json.loads(input_str)
                selector = params.get("selector")
                checks = params.get("checks", ["visible"])

                if not selector:
                    return json.dumps({"error": "Selector required"})

                manager = PlaywrightManager()
                page = await manager.get_page()

                locator = page.locator(selector)
                results = {"selector": selector}

                if "visible" in checks:
                    results["visible"] = await locator.is_visible()
                if "enabled" in checks:
                    results["enabled"] = await locator.is_enabled()
                if "text" in checks:
                    results["text"] = await locator.inner_text() if await locator.count() > 0 else None
                if "count" in checks:
                    results["count"] = await locator.count()
                if "value" in checks:
                    results["value"] = await locator.input_value() if await locator.count() > 0 else None

                return json.dumps({"success": True, **results})
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_check())


# =============================================================================
# PERFORMANCE & ACCESSIBILITY TOOLS
# =============================================================================

class CheckAccessibilityTool(BaseTool):
    """Run accessibility checks on page."""

    name: str = "check_accessibility"
    description: str = (
        "Check page accessibility. "
        "Input: JSON with optional 'selector' for specific element. "
        "Returns accessibility issues found."
    )

    def _run(self, input_str: str) -> str:
        async def _a11y():
            try:
                params = json.loads(input_str) if isinstance(input_str, str) else {}

                manager = PlaywrightManager()
                page = await manager.get_page()

                # Get accessibility snapshot
                snapshot = await page.accessibility.snapshot()

                # Basic checks
                issues = []

                # Check for images without alt
                images = await page.locator("img:not([alt])").count()
                if images > 0:
                    issues.append({"type": "missing_alt", "count": images, "severity": "error"})

                # Check for form inputs without labels
                inputs_without_labels = await page.evaluate("""
                    () => {
                        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"])');
                        let count = 0;
                        inputs.forEach(input => {
                            const id = input.id;
                            const label = id ? document.querySelector(`label[for="${id}"]`) : null;
                            const ariaLabel = input.getAttribute('aria-label');
                            if (!label && !ariaLabel) count++;
                        });
                        return count;
                    }
                """)
                if inputs_without_labels > 0:
                    issues.append({"type": "missing_labels", "count": inputs_without_labels, "severity": "error"})

                # Check for buttons without accessible names
                buttons_no_name = await page.evaluate("""
                    () => {
                        const buttons = document.querySelectorAll('button');
                        let count = 0;
                        buttons.forEach(btn => {
                            if (!btn.innerText.trim() && !btn.getAttribute('aria-label')) count++;
                        });
                        return count;
                    }
                """)
                if buttons_no_name > 0:
                    issues.append({"type": "buttons_no_name", "count": buttons_no_name, "severity": "error"})

                # Check color contrast (basic)
                low_contrast = await page.evaluate("""
                    () => {
                        // Simplified contrast check
                        const elements = document.querySelectorAll('*');
                        let issues = 0;
                        elements.forEach(el => {
                            const style = window.getComputedStyle(el);
                            const color = style.color;
                            const bg = style.backgroundColor;
                            // Very basic check - real implementation would calculate contrast ratio
                            if (color === bg && color !== 'rgba(0, 0, 0, 0)') issues++;
                        });
                        return issues;
                    }
                """)
                if low_contrast > 0:
                    issues.append({"type": "potential_contrast", "count": low_contrast, "severity": "warning"})

                return json.dumps({
                    "success": True,
                    "issues": issues,
                    "issue_count": len(issues),
                    "snapshot_available": snapshot is not None
                })
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_a11y())


class MeasurePerformanceTool(BaseTool):
    """Measure page performance metrics."""

    name: str = "measure_performance"
    description: str = (
        "Measure page performance (Core Web Vitals). "
        "Input: JSON with 'url' to navigate first (optional). "
        "Returns LCP, FID, CLS estimates."
    )

    def _run(self, input_str: str) -> str:
        async def _perf():
            try:
                params = json.loads(input_str) if isinstance(input_str, str) else {}
                url = params.get("url")

                manager = PlaywrightManager()
                page = await manager.get_page()

                if url:
                    await page.goto(url, wait_until="networkidle")

                # Get performance metrics
                metrics = await page.evaluate("""
                    () => {
                        const perf = performance.getEntriesByType('navigation')[0];
                        const paint = performance.getEntriesByType('paint');

                        return {
                            // Navigation timing
                            domContentLoaded: perf ? perf.domContentLoadedEventEnd - perf.startTime : null,
                            loadComplete: perf ? perf.loadEventEnd - perf.startTime : null,

                            // Paint timing
                            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || null,
                            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || null,

                            // Resource counts
                            resourceCount: performance.getEntriesByType('resource').length,

                            // Memory (if available)
                            jsHeapSize: performance.memory?.usedJSHeapSize || null
                        };
                    }
                """)

                # Evaluate performance
                score = "good"
                if metrics.get("firstContentfulPaint", 0) > 2500:
                    score = "needs_improvement"
                if metrics.get("firstContentfulPaint", 0) > 4000:
                    score = "poor"

                return json.dumps({
                    "success": True,
                    "metrics": metrics,
                    "score": score,
                    "url": page.url
                })
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_perf())


class CheckResponsiveTool(BaseTool):
    """Test responsive design at different viewports."""

    name: str = "check_responsive"
    description: str = (
        "Test page at different viewport sizes. "
        "Input: JSON with 'url' and optional 'viewports' array [{width, height, name}]. "
        "Returns layout issues per viewport."
    )

    def _run(self, input_str: str) -> str:
        async def _responsive():
            try:
                params = json.loads(input_str)
                url = params.get("url")
                viewports = params.get("viewports", [
                    {"width": 375, "height": 667, "name": "mobile"},
                    {"width": 768, "height": 1024, "name": "tablet"},
                    {"width": 1920, "height": 1080, "name": "desktop"}
                ])

                if not url:
                    return json.dumps({"error": "URL required"})

                manager = PlaywrightManager()
                results = []

                for vp in viewports:
                    # Create new context with viewport
                    browser = await manager.get_browser()
                    context = await browser.new_context(viewport={"width": vp["width"], "height": vp["height"]})
                    page = await context.new_page()

                    await page.goto(url, wait_until="domcontentloaded")

                    # Check for horizontal overflow
                    overflow = await page.evaluate("""
                        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
                    """)

                    # Check visible elements
                    visible_buttons = await page.locator("button:visible").count()
                    visible_links = await page.locator("a:visible").count()

                    # Take screenshot
                    screenshot_path = f"/tmp/responsive_{vp['name']}.png"
                    await page.screenshot(path=screenshot_path)

                    results.append({
                        "viewport": vp["name"],
                        "width": vp["width"],
                        "height": vp["height"],
                        "horizontal_overflow": overflow,
                        "visible_buttons": visible_buttons,
                        "visible_links": visible_links,
                        "screenshot": screenshot_path
                    })

                    await context.close()

                return json.dumps({"success": True, "results": results})
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_responsive())


# =============================================================================
# DATABASE VERIFICATION TOOLS
# =============================================================================

class VerifyDatabaseActionTool(BaseTool):
    """Verify UI action resulted in correct database state."""

    name: str = "verify_database_action"
    description: str = (
        "Verify a UI action updated the database correctly. "
        "Input: JSON with 'table', 'query' (filter), 'expected' (expected values). "
        "Requires Supabase connection."
    )

    def _run(self, input_str: str) -> str:
        try:
            from config import get_settings
            from supabase import create_client

            params = json.loads(input_str)
            table = params.get("table")
            query_filter = params.get("query", {})
            expected = params.get("expected", {})

            if not table:
                return json.dumps({"error": "Table name required"})

            settings = get_settings()
            supabase = create_client(
                settings.effective_supabase_url,
                settings.effective_supabase_key
            )

            # Build query
            q = supabase.table(table).select("*")
            for key, value in query_filter.items():
                q = q.eq(key, value)

            result = q.execute()

            if not result.data:
                return json.dumps({
                    "success": False,
                    "error": "No records found",
                    "query": query_filter
                })

            # Check expected values
            record = result.data[0]
            mismatches = []
            for key, expected_value in expected.items():
                actual = record.get(key)
                if actual != expected_value:
                    mismatches.append({
                        "field": key,
                        "expected": expected_value,
                        "actual": actual
                    })

            return json.dumps({
                "success": len(mismatches) == 0,
                "record_found": True,
                "mismatches": mismatches,
                "record": record
            })
        except Exception as e:
            return json.dumps({"error": str(e)})


class CheckDatabaseConnectionTool(BaseTool):
    """Verify database connection and table existence."""

    name: str = "check_database_connection"
    description: str = (
        "Check database connectivity and verify tables exist. "
        "Input: JSON with optional 'tables' array to verify. "
        "Returns connection status and table verification."
    )

    def _run(self, input_str: str) -> str:
        try:
            from config import get_settings
            from supabase import create_client

            params = json.loads(input_str) if isinstance(input_str, str) else {}
            tables_to_check = params.get("tables", [
                "pricewaze_profiles",
                "pricewaze_properties",
                "pricewaze_offers",
                "pricewaze_visits",
                "pricewaze_zones"
            ])

            settings = get_settings()
            supabase = create_client(
                settings.effective_supabase_url,
                settings.effective_supabase_key
            )

            table_status = {}
            for table in tables_to_check:
                try:
                    result = supabase.table(table).select("count").limit(1).execute()
                    table_status[table] = {"exists": True, "accessible": True}
                except Exception as e:
                    table_status[table] = {"exists": False, "error": str(e)}

            all_ok = all(t.get("accessible", False) for t in table_status.values())

            return json.dumps({
                "success": all_ok,
                "connected": True,
                "tables": table_status,
                "supabase_url": settings.effective_supabase_url[:50] + "..."
            })
        except Exception as e:
            return json.dumps({"success": False, "connected": False, "error": str(e)})


# =============================================================================
# UTILITY TOOLS
# =============================================================================

class WaitForElementTool(BaseTool):
    """Wait for element to appear or change state."""

    name: str = "wait_for_element"
    description: str = (
        "Wait for element. "
        "Input: JSON with 'selector', 'state' ('visible', 'hidden', 'attached'), 'timeout' (ms). "
        "Returns when condition met or timeout."
    )

    def _run(self, input_str: str) -> str:
        async def _wait():
            try:
                params = json.loads(input_str)
                selector = params.get("selector")
                state = params.get("state", "visible")
                timeout = params.get("timeout", 10000)

                if not selector:
                    return json.dumps({"error": "Selector required"})

                manager = PlaywrightManager()
                page = await manager.get_page()

                await page.wait_for_selector(selector, state=state, timeout=timeout)

                return json.dumps({
                    "success": True,
                    "selector": selector,
                    "state": state
                })
            except Exception as e:
                return json.dumps({"error": str(e), "timeout": True})

        return run_async(_wait())


class CloseBrowserTool(BaseTool):
    """Close browser and cleanup resources."""

    name: str = "close_browser"
    description: str = "Close browser and release resources. Call when done testing."

    def _run(self, input_str: str = "") -> str:
        async def _close():
            try:
                manager = PlaywrightManager()
                await manager.close()
                return json.dumps({"success": True, "message": "Browser closed"})
            except Exception as e:
                return json.dumps({"error": str(e)})

        return run_async(_close())


# =============================================================================
# TOOL EXPORTS
# =============================================================================

def get_navigation_tools() -> list[BaseTool]:
    """Get navigation-related tools."""
    return [NavigateTool(), ClickElementTool(), FillFormTool()]


def get_inspection_tools() -> list[BaseTool]:
    """Get page inspection tools."""
    return [TakeScreenshotTool(), GetPageContentTool(), CheckElementTool()]


def get_quality_tools() -> list[BaseTool]:
    """Get performance and accessibility tools."""
    return [CheckAccessibilityTool(), MeasurePerformanceTool(), CheckResponsiveTool()]


def get_database_tools() -> list[BaseTool]:
    """Get database verification tools."""
    return [VerifyDatabaseActionTool(), CheckDatabaseConnectionTool()]


def get_utility_tools() -> list[BaseTool]:
    """Get utility tools."""
    return [WaitForElementTool(), CloseBrowserTool()]


def get_all_playwright_tools() -> list[BaseTool]:
    """Get all Playwright tools."""
    return (
        get_navigation_tools() +
        get_inspection_tools() +
        get_quality_tools() +
        get_database_tools() +
        get_utility_tools()
    )
