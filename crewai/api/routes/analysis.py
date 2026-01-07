"""Full property analysis API routes."""

from typing import Any

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from crews import FullPropertyAnalysisCrew


router = APIRouter()


# Store for async results
_analysis_store: dict[str, dict[str, Any]] = {}


class FullAnalysisRequest(BaseModel):
    """Request schema for comprehensive property analysis."""

    property_id: str = Field(description="UUID of the property to analyze")
    buyer_budget: float | None = Field(
        default=None, description="Buyer's maximum budget in USD"
    )
    generate_contract: bool = Field(
        default=False, description="Whether to generate contract framework"
    )
    buyer_name: str | None = Field(
        default=None, description="Buyer name (required if generate_contract=True)"
    )
    seller_name: str | None = Field(
        default=None, description="Seller name (required if generate_contract=True)"
    )


class FullAnalysisResponse(BaseModel):
    """Response schema for full analysis."""

    property_id: str
    analysis_type: str
    buyer_budget: float | None
    contract_requested: bool
    executive_summary: str
    specialist_reports: list[dict[str, Any]]
    agents_used: list[str]


@router.post("/full", response_model=FullAnalysisResponse)
async def run_full_analysis(request: FullAnalysisRequest) -> dict[str, Any]:
    """
    Run comprehensive property analysis with all specialist agents.

    This is the most thorough analysis, engaging:
    - Market Analyst: Zone and market conditions
    - Pricing Analyst: Fair value assessment
    - Negotiation Advisor: Offer strategy
    - Legal Advisor: Due diligence guidance
    - Coordinator: Executive summary synthesis

    Provides complete investment decision support.
    """
    # Validate contract request
    if request.generate_contract:
        if not request.buyer_name or not request.seller_name:
            raise HTTPException(
                status_code=400,
                detail="buyer_name and seller_name required when generate_contract=True",
            )

    try:
        crew = FullPropertyAnalysisCrew(verbose=True)
        result = crew.run(
            property_id=request.property_id,
            buyer_budget=request.buyer_budget,
            generate_contract=request.generate_contract,
            buyer_name=request.buyer_name,
            seller_name=request.seller_name,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full analysis failed: {str(e)}")


@router.post("/full/async")
async def run_full_analysis_async(
    request: FullAnalysisRequest,
    background_tasks: BackgroundTasks,
) -> dict[str, str]:
    """
    Start comprehensive analysis asynchronously.

    Full analysis can take several minutes. This endpoint returns
    immediately with a job ID to check results later.
    """
    import uuid

    # Validate
    if request.generate_contract:
        if not request.buyer_name or not request.seller_name:
            raise HTTPException(
                status_code=400,
                detail="buyer_name and seller_name required when generate_contract=True",
            )

    job_id = str(uuid.uuid4())
    _analysis_store[job_id] = {
        "status": "processing",
        "property_id": request.property_id,
        "started_at": None,
        "result": None,
    }

    def run_analysis():
        from datetime import datetime

        _analysis_store[job_id]["started_at"] = datetime.now().isoformat()
        try:
            crew = FullPropertyAnalysisCrew(verbose=True)
            result = crew.run(
                property_id=request.property_id,
                buyer_budget=request.buyer_budget,
                generate_contract=request.generate_contract,
                buyer_name=request.buyer_name,
                seller_name=request.seller_name,
            )
            _analysis_store[job_id] = {
                "status": "completed",
                "property_id": request.property_id,
                "completed_at": datetime.now().isoformat(),
                "result": result,
            }
        except Exception as e:
            _analysis_store[job_id] = {
                "status": "failed",
                "property_id": request.property_id,
                "error": str(e),
            }

    background_tasks.add_task(run_analysis)

    return {
        "job_id": job_id,
        "status": "processing",
        "check_url": f"/api/v1/analysis/full/result/{job_id}",
        "estimated_time": "2-5 minutes",
    }


@router.get("/full/result/{job_id}")
async def get_full_analysis_result(job_id: str) -> dict[str, Any]:
    """
    Get the result of an async full analysis.
    """
    if job_id not in _analysis_store:
        raise HTTPException(status_code=404, detail="Job not found")

    return _analysis_store[job_id]


@router.get("/capabilities")
async def get_analysis_capabilities() -> dict[str, Any]:
    """
    Get information about available analysis capabilities.
    """
    return {
        "crews_available": [
            {
                "name": "Pricing Analysis",
                "endpoint": "/api/v1/pricing/analyze",
                "description": "Property valuation and offer suggestions",
                "agents": ["Market Analyst", "Pricing Analyst"],
                "estimated_time": "30-60 seconds",
            },
            {
                "name": "Negotiation Advisory",
                "endpoint": "/api/v1/negotiation/buyer-advice",
                "description": "Negotiation strategy for buyers or sellers",
                "agents": ["Pricing Analyst", "Negotiation Advisor"],
                "estimated_time": "30-60 seconds",
            },
            {
                "name": "Contract Generation",
                "endpoint": "/api/v1/contracts/generate",
                "description": "Draft contract with validation",
                "agents": ["Legal Advisor", "Negotiation Advisor"],
                "estimated_time": "45-90 seconds",
            },
            {
                "name": "Full Analysis",
                "endpoint": "/api/v1/analysis/full",
                "description": "Comprehensive multi-agent analysis",
                "agents": [
                    "Market Analyst",
                    "Pricing Analyst",
                    "Negotiation Advisor",
                    "Legal Advisor",
                    "Coordinator",
                ],
                "estimated_time": "2-5 minutes",
            },
        ],
        "quick_endpoints": [
            {
                "name": "Quick Pricing",
                "endpoint": "/api/v1/pricing/quick/{property_id}",
                "description": "Fast pricing check without full analysis",
                "estimated_time": "5-10 seconds",
            },
            {
                "name": "Offer Suggestions",
                "endpoint": "/api/v1/negotiation/offer-suggestions/{property_id}",
                "description": "Quick offer tier calculations",
                "estimated_time": "5-10 seconds",
            },
            {
                "name": "Negotiation Power",
                "endpoint": "/api/v1/negotiation/power-score",
                "description": "Calculate negotiation leverage score",
                "estimated_time": "< 5 seconds",
            },
        ],
        "async_support": True,
        "model": "DeepSeek Chat (via OpenAI-compatible API)",
        "jurisdiction": "Dominican Republic",
    }
