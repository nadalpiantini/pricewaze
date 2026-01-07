"""Analysis tools for CrewAI agents to perform calculations."""

from typing import Any
from statistics import mean, median, stdev

from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class CalculatePriceStatsInput(BaseModel):
    """Input schema for price statistics calculation."""

    prices: list[float] = Field(description="List of property prices")
    areas: list[float] | None = Field(default=None, description="List of property areas in m²")


class CalculatePriceStatsTool(BaseTool):
    """Calculate comprehensive price statistics."""

    name: str = "calculate_price_stats"
    description: str = (
        "Calculates statistical measures for a set of property prices including "
        "mean, median, standard deviation, and percentiles. Essential for fair value estimation."
    )
    args_schema: type[BaseModel] = CalculatePriceStatsInput

    def _run(
        self,
        prices: list[float],
        areas: list[float] | None = None,
    ) -> dict[str, Any]:
        """Calculate price statistics."""
        if not prices:
            return {"success": False, "error": "No prices provided"}

        sorted_prices = sorted(prices)
        n = len(sorted_prices)

        stats = {
            "count": n,
            "mean": mean(prices),
            "median": median(prices),
            "min": min(prices),
            "max": max(prices),
            "range": max(prices) - min(prices),
            "std_dev": stdev(prices) if n > 1 else 0,
            "percentile_25": sorted_prices[int(n * 0.25)] if n >= 4 else sorted_prices[0],
            "percentile_75": sorted_prices[int(n * 0.75)] if n >= 4 else sorted_prices[-1],
        }

        # Calculate price per m² stats if areas provided
        if areas and len(areas) == len(prices):
            prices_per_m2 = [
                p / a for p, a in zip(prices, areas, strict=False) if a and a > 0
            ]
            if prices_per_m2:
                stats["price_per_m2"] = {
                    "mean": mean(prices_per_m2),
                    "median": median(prices_per_m2),
                    "min": min(prices_per_m2),
                    "max": max(prices_per_m2),
                }

        return {"success": True, "statistics": stats}


class ComparePropertyPricesInput(BaseModel):
    """Input schema for property price comparison."""

    target_price: float = Field(description="Price of the target property")
    target_area: float = Field(description="Area of the target property in m²")
    comparable_prices: list[float] = Field(description="Prices of comparable properties")
    comparable_areas: list[float] = Field(description="Areas of comparable properties in m²")


class ComparePropertyPricesTool(BaseTool):
    """Compare a property's price against comparable properties."""

    name: str = "compare_property_prices"
    description: str = (
        "Compares a target property's price against comparable properties in the market. "
        "Returns pricing position, fairness assessment, and deviation from market average."
    )
    args_schema: type[BaseModel] = ComparePropertyPricesInput

    def _run(
        self,
        target_price: float,
        target_area: float,
        comparable_prices: list[float],
        comparable_areas: list[float],
    ) -> dict[str, Any]:
        """Compare property price against comparables."""
        if not comparable_prices or not comparable_areas:
            return {"success": False, "error": "No comparable data provided"}

        # Calculate price per m²
        target_ppm2 = target_price / target_area if target_area > 0 else 0
        comparable_ppm2 = [
            p / a for p, a in zip(comparable_prices, comparable_areas, strict=False)
            if a and a > 0
        ]

        if not comparable_ppm2:
            return {"success": False, "error": "Cannot calculate comparable prices per m²"}

        avg_ppm2 = mean(comparable_ppm2)
        median_ppm2 = median(comparable_ppm2)

        # Calculate deviation
        deviation_from_avg = ((target_ppm2 - avg_ppm2) / avg_ppm2 * 100) if avg_ppm2 > 0 else 0
        deviation_from_median = ((target_ppm2 - median_ppm2) / median_ppm2 * 100) if median_ppm2 > 0 else 0

        # Determine fairness label
        if deviation_from_avg < -10:
            fairness_label = "underpriced"
            fairness_score = 70 + min(30, abs(deviation_from_avg))
        elif deviation_from_avg > 20:
            fairness_label = "significantly_overpriced"
            fairness_score = max(0, 30 - deviation_from_avg)
        elif deviation_from_avg > 10:
            fairness_label = "overpriced"
            fairness_score = max(20, 50 - deviation_from_avg)
        else:
            fairness_label = "fair"
            fairness_score = 50 + (10 - abs(deviation_from_avg))

        # Calculate estimated fair value
        estimated_fair_value = avg_ppm2 * target_area

        return {
            "success": True,
            "comparison": {
                "target_price": target_price,
                "target_price_per_m2": target_ppm2,
                "market_avg_price_per_m2": avg_ppm2,
                "market_median_price_per_m2": median_ppm2,
                "deviation_from_avg_percent": round(deviation_from_avg, 2),
                "deviation_from_median_percent": round(deviation_from_median, 2),
                "fairness_label": fairness_label,
                "fairness_score": round(fairness_score, 1),
                "estimated_fair_value": round(estimated_fair_value, 2),
                "price_difference": round(target_price - estimated_fair_value, 2),
                "comparable_count": len(comparable_ppm2),
            },
        }


class CalculateNegotiationPowerInput(BaseModel):
    """Input schema for negotiation power calculation."""

    days_on_market: int = Field(description="Number of days the property has been listed")
    price_changes: int = Field(default=0, description="Number of price reductions")
    offer_count: int = Field(default=0, description="Number of offers received")
    market_trend: str = Field(default="stable", description="Market trend: hot, warm, cool, cold")
    price_deviation_percent: float = Field(default=0, description="Deviation from market average %")


class CalculateNegotiationPowerTool(BaseTool):
    """Calculate buyer's negotiation power for a property."""

    name: str = "calculate_negotiation_power"
    description: str = (
        "Calculates the buyer's negotiation leverage based on market conditions, "
        "property listing history, and competitive factors. Returns a score 0-100 "
        "and specific negotiation factors."
    )
    args_schema: type[BaseModel] = CalculateNegotiationPowerInput

    def _run(
        self,
        days_on_market: int,
        price_changes: int = 0,
        offer_count: int = 0,
        market_trend: str = "stable",
        price_deviation_percent: float = 0,
    ) -> dict[str, Any]:
        """Calculate negotiation power score."""
        factors = []
        base_score = 50

        # Days on market factor (longer = more buyer power)
        if days_on_market > 120:
            dom_impact = 20
            dom_label = "very_positive"
        elif days_on_market > 90:
            dom_impact = 15
            dom_label = "positive"
        elif days_on_market > 60:
            dom_impact = 10
            dom_label = "slightly_positive"
        elif days_on_market > 30:
            dom_impact = 0
            dom_label = "neutral"
        else:
            dom_impact = -10
            dom_label = "negative"

        factors.append({
            "factor": "Days on Market",
            "value": days_on_market,
            "impact": dom_label,
            "weight": 0.25,
            "score_adjustment": dom_impact,
            "explanation": f"Property listed for {days_on_market} days",
        })

        # Price changes factor
        if price_changes >= 2:
            pc_impact = 15
            pc_label = "positive"
        elif price_changes == 1:
            pc_impact = 8
            pc_label = "slightly_positive"
        else:
            pc_impact = 0
            pc_label = "neutral"

        factors.append({
            "factor": "Price Reductions",
            "value": price_changes,
            "impact": pc_label,
            "weight": 0.20,
            "score_adjustment": pc_impact,
            "explanation": f"Seller has reduced price {price_changes} time(s)",
        })

        # Competition factor (more offers = less buyer power)
        if offer_count == 0:
            comp_impact = 10
            comp_label = "positive"
        elif offer_count <= 2:
            comp_impact = 0
            comp_label = "neutral"
        else:
            comp_impact = -15
            comp_label = "negative"

        factors.append({
            "factor": "Buyer Competition",
            "value": offer_count,
            "impact": comp_label,
            "weight": 0.20,
            "score_adjustment": comp_impact,
            "explanation": f"{offer_count} other offer(s) on this property",
        })

        # Market trend factor
        trend_impacts = {
            "hot": (-15, "negative"),
            "warm": (-5, "slightly_negative"),
            "stable": (0, "neutral"),
            "cool": (10, "positive"),
            "cold": (20, "very_positive"),
        }
        trend_impact, trend_label = trend_impacts.get(market_trend, (0, "neutral"))

        factors.append({
            "factor": "Market Conditions",
            "value": market_trend,
            "impact": trend_label,
            "weight": 0.20,
            "score_adjustment": trend_impact,
            "explanation": f"Market is currently {market_trend}",
        })

        # Price deviation factor
        if price_deviation_percent > 15:
            dev_impact = 15
            dev_label = "positive"
        elif price_deviation_percent > 5:
            dev_impact = 8
            dev_label = "slightly_positive"
        elif price_deviation_percent > -5:
            dev_impact = 0
            dev_label = "neutral"
        else:
            dev_impact = -10
            dev_label = "negative"

        factors.append({
            "factor": "Price vs Market",
            "value": f"{price_deviation_percent:.1f}%",
            "impact": dev_label,
            "weight": 0.15,
            "score_adjustment": dev_impact,
            "explanation": f"Property priced {abs(price_deviation_percent):.1f}% {'above' if price_deviation_percent > 0 else 'below'} market average",
        })

        # Calculate final score
        total_adjustment = sum(f["score_adjustment"] for f in factors)
        final_score = max(0, min(100, base_score + total_adjustment))

        return {
            "success": True,
            "negotiation_power": {
                "score": round(final_score, 1),
                "label": (
                    "strong" if final_score >= 70 else
                    "moderate" if final_score >= 50 else
                    "weak"
                ),
                "factors": factors,
                "recommendation": self._get_recommendation(final_score),
            },
        }

    def _get_recommendation(self, score: float) -> str:
        """Get negotiation recommendation based on score."""
        if score >= 75:
            return "Strong negotiation position. Consider aggressive offer 10-15% below asking."
        elif score >= 60:
            return "Good negotiation leverage. Offer 5-10% below asking price."
        elif score >= 45:
            return "Balanced market. Offer near asking price with minor negotiation room."
        elif score >= 30:
            return "Limited leverage. Be prepared to offer at or near asking price."
        else:
            return "Competitive market. May need to offer at or above asking to secure property."
