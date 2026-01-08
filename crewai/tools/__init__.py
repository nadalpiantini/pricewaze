"""Custom tools for PriceWaze CrewAI agents."""

from .database_tools import (
    FetchPropertyTool,
    FetchZonePropertiesTool,
    FetchOfferHistoryTool,
    FetchMarketStatsTool,
    SaveAnalysisResultTool,
)
from .analysis_tools import (
    CalculatePriceStatsTool,
    ComparePropertyPricesTool,
    CalculateNegotiationPowerTool,
)
from .contract_tools import (
    GenerateContractTemplateTool,
    ValidateContractTermsTool,
)
from .avm_tool import (
    AVMValuationTool,
    ComparablesSearchTool,
    QuickEstimateTool,
)
from .playwright_tools import (
    # Individual tools
    NavigateTool,
    ClickElementTool,
    FillFormTool,
    TakeScreenshotTool,
    GetPageContentTool,
    CheckElementTool,
    CheckAccessibilityTool,
    MeasurePerformanceTool,
    CheckResponsiveTool,
    VerifyDatabaseActionTool,
    CheckDatabaseConnectionTool,
    WaitForElementTool,
    CloseBrowserTool,
    # Tool collections
    get_all_playwright_tools,
    get_navigation_tools,
    get_inspection_tools,
    get_quality_tools,
    get_database_tools as get_db_verification_tools,
)

__all__ = [
    # Database tools
    "FetchPropertyTool",
    "FetchZonePropertiesTool",
    "FetchOfferHistoryTool",
    "FetchMarketStatsTool",
    "SaveAnalysisResultTool",
    # Analysis tools
    "CalculatePriceStatsTool",
    "ComparePropertyPricesTool",
    "CalculateNegotiationPowerTool",
    # Contract tools
    "GenerateContractTemplateTool",
    "ValidateContractTermsTool",
    # AVM tools
    "AVMValuationTool",
    "ComparablesSearchTool",
    "QuickEstimateTool",
    # Playwright tools
    "NavigateTool",
    "ClickElementTool",
    "FillFormTool",
    "TakeScreenshotTool",
    "GetPageContentTool",
    "CheckElementTool",
    "CheckAccessibilityTool",
    "MeasurePerformanceTool",
    "CheckResponsiveTool",
    "VerifyDatabaseActionTool",
    "CheckDatabaseConnectionTool",
    "WaitForElementTool",
    "CloseBrowserTool",
    # Playwright tool collections
    "get_all_playwright_tools",
    "get_navigation_tools",
    "get_inspection_tools",
    "get_quality_tools",
    "get_db_verification_tools",
]
