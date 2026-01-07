"""Negotiation advisory API routes."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from crews import NegotiationAdvisoryCrew


router = APIRouter()


class BuyerAdviceRequest(BaseModel):
    """Request schema for buyer negotiation advice."""

    property_id: str = Field(description="UUID of the property")
    buyer_budget: float | None = Field(default=None, description="Buyer's maximum budget in USD")


class SellerAdviceRequest(BaseModel):
    """Request schema for seller offer evaluation."""

    property_id: str = Field(description="UUID of the property")
    offer_amount: float = Field(description="Offer amount to evaluate in USD")
    offer_message: str | None = Field(default=None, description="Message from the buyer")


class NegotiationPowerRequest(BaseModel):
    """Request schema for negotiation power calculation."""

    property_id: str = Field(description="UUID of the property")
    days_on_market: int = Field(default=0, description="Days listed")
    price_changes: int = Field(default=0, description="Number of price reductions")
    offer_count: int = Field(default=0, description="Number of existing offers")
    market_trend: str = Field(default="stable", description="Market trend")


@router.post("/buyer-advice")
async def get_buyer_advice(request: BuyerAdviceRequest) -> dict[str, Any]:
    """
    Get negotiation strategy advice for buyers.

    Analyzes the property and market to provide:
    - Negotiation power assessment
    - Three tiered offer recommendations
    - Counter-offer response guidelines
    - Key talking points for negotiation
    """
    try:
        crew = NegotiationAdvisoryCrew(verbose=True)
        result = crew.run_buyer_advice(
            property_id=request.property_id,
            buyer_budget=request.buyer_budget,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Buyer advice failed: {str(e)}")


@router.post("/seller-advice")
async def get_seller_advice(request: SellerAdviceRequest) -> dict[str, Any]:
    """
    Evaluate an offer and provide seller recommendation.

    Analyzes the offer against market conditions to recommend:
    - Accept, Counter, Reject, or Wait
    - Suggested counter-offer amount (if countering)
    - Confidence level in recommendation
    - Detailed reasoning
    """
    try:
        crew = NegotiationAdvisoryCrew(verbose=True)
        result = crew.run_seller_advice(
            property_id=request.property_id,
            offer_amount=request.offer_amount,
            offer_message=request.offer_message,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Seller advice failed: {str(e)}")


@router.post("/power-score")
async def calculate_negotiation_power(request: NegotiationPowerRequest) -> dict[str, Any]:
    """
    Calculate negotiation power score for a property.

    Quick assessment without full crew analysis.
    Returns a score 0-100 and key factors.
    """
    from tools import CalculateNegotiationPowerTool

    try:
        tool = CalculateNegotiationPowerTool()
        result = tool._run(
            days_on_market=request.days_on_market,
            price_changes=request.price_changes,
            offer_count=request.offer_count,
            market_trend=request.market_trend,
            price_deviation_percent=0,  # Would need pricing analysis for this
        )
        return {
            "property_id": request.property_id,
            **result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Power calculation failed: {str(e)}")


@router.get("/offer-suggestions/{property_id}")
async def get_offer_suggestions(
    property_id: str,
    budget: float | None = None,
) -> dict[str, Any]:
    """
    Get quick offer amount suggestions without full analysis.

    Returns three offer tiers based on property price:
    - Aggressive (10-15% below)
    - Balanced (5-10% below)
    - Conservative (0-5% below)
    """
    from tools import FetchPropertyTool

    try:
        tool = FetchPropertyTool()
        result = tool._run(property_id=property_id)

        if not result.get("success"):
            raise HTTPException(status_code=404, detail="Property not found")

        prop = result["property"]
        price = float(prop["price"])

        # Simple offer calculations
        suggestions = {
            "property_id": property_id,
            "listing_price": price,
            "offers": {
                "aggressive": {
                    "amount": round(price * 0.87, -2),
                    "discount_percent": 13,
                    "risk": "Higher chance of rejection",
                },
                "balanced": {
                    "amount": round(price * 0.93, -2),
                    "discount_percent": 7,
                    "risk": "Good balance of discount and acceptance",
                },
                "conservative": {
                    "amount": round(price * 0.97, -2),
                    "discount_percent": 3,
                    "risk": "High acceptance probability",
                },
            },
        }

        # Adjust if budget provided
        if budget:
            suggestions["buyer_budget"] = budget
            if budget < price * 0.85:
                suggestions["warning"] = "Budget significantly below market price"
            elif budget >= price:
                suggestions["note"] = "Budget allows full price offer if needed"

        return suggestions

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggestions failed: {str(e)}")
