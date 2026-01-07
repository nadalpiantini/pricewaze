"""Pricing analysis API routes."""

from typing import Any

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from crews import PricingAnalysisCrew


router = APIRouter()


class PricingAnalysisRequest(BaseModel):
    """Request schema for pricing analysis."""

    property_id: str = Field(description="UUID of the property to analyze")
    zone_id: str | None = Field(default=None, description="Optional zone UUID for context")


class PricingAnalysisResponse(BaseModel):
    """Response schema for pricing analysis."""

    property_id: str
    zone_id: str | None
    analysis_type: str
    result: str
    tasks_output: list[dict[str, Any]]


# Store for async results
_results_store: dict[str, dict[str, Any]] = {}


@router.post("/analyze", response_model=PricingAnalysisResponse)
async def analyze_property_pricing(request: PricingAnalysisRequest) -> dict[str, Any]:
    """
    Run comprehensive pricing analysis for a property.

    This endpoint activates the Pricing Analysis Crew which includes:
    - Market Analyst: Analyzes zone market conditions
    - Pricing Analyst: Evaluates property value and suggests offers

    The analysis provides:
    - Market statistics and health assessment
    - Fair value estimation
    - Pricing fairness score
    - Three tiered offer suggestions
    """
    try:
        crew = PricingAnalysisCrew(verbose=True)
        result = crew.run(
            property_id=request.property_id,
            zone_id=request.zone_id,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze/async")
async def analyze_property_pricing_async(
    request: PricingAnalysisRequest,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """
    Start pricing analysis asynchronously.

    Returns a job ID to check results later via /analyze/result/{job_id}.
    Useful for long-running analyses.
    """
    import uuid

    job_id = str(uuid.uuid4())
    _results_store[job_id] = {"status": "processing", "result": None}

    def run_analysis():
        try:
            crew = PricingAnalysisCrew(verbose=True)
            result = crew.run(
                property_id=request.property_id,
                zone_id=request.zone_id,
            )
            _results_store[job_id] = {"status": "completed", "result": result}
        except Exception as e:
            _results_store[job_id] = {"status": "failed", "error": str(e)}

    background_tasks.add_task(run_analysis)

    return {
        "job_id": job_id,
        "status": "processing",
        "check_url": f"/api/v1/pricing/analyze/result/{job_id}",
    }


@router.get("/analyze/result/{job_id}")
async def get_analysis_result(job_id: str) -> dict[str, Any]:
    """
    Get the result of an async pricing analysis.
    """
    if job_id not in _results_store:
        raise HTTPException(status_code=404, detail="Job not found")

    return _results_store[job_id]


@router.get("/quick/{property_id}")
async def quick_pricing_check(property_id: str) -> dict[str, Any]:
    """
    Quick pricing assessment using only the Pricing Analyst.

    Faster but less comprehensive than full analysis.
    Returns basic pricing metrics without full market context.
    """
    from tools import FetchPropertyTool, ComparePropertyPricesTool, FetchZonePropertiesTool

    try:
        # Fetch property
        property_tool = FetchPropertyTool()
        property_result = property_tool._run(property_id=property_id)

        if not property_result.get("success"):
            raise HTTPException(status_code=404, detail="Property not found")

        prop = property_result["property"]

        # Fetch zone properties for comparison
        zone_tool = FetchZonePropertiesTool()
        zone_result = zone_tool._run(zone_id=prop.get("zone_id"), status="active", limit=30)

        comparables = zone_result.get("properties", [])

        if not comparables:
            return {
                "property_id": property_id,
                "quick_assessment": "insufficient_data",
                "message": "Not enough comparable properties in zone",
            }

        # Compare prices
        compare_tool = ComparePropertyPricesTool()
        comparison = compare_tool._run(
            target_price=float(prop["price"]),
            target_area=float(prop["area_m2"]),
            comparable_prices=[float(c["price"]) for c in comparables if c["price"]],
            comparable_areas=[float(c["area_m2"]) for c in comparables if c["area_m2"]],
        )

        return {
            "property_id": property_id,
            "quick_assessment": comparison.get("comparison", {}),
            "property_price": prop["price"],
            "property_area_m2": prop["area_m2"],
            "comparables_count": len(comparables),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quick check failed: {str(e)}")
