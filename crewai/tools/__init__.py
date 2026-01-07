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
]
