"""Negotiation Tools for CrewAI - Waze-style market intelligence."""

from crewai_tools import BaseTool
from pydantic import BaseModel, Field

from negotiation import (
    MarketSignalDetector,
    ScenarioEngine,
)


class ScenarioAnalysisInput(BaseModel):
    """Input schema for scenario analysis tool."""

    property_id: str = Field(..., description="Property ID to analyze")
    listing_price: float = Field(..., description="Current listing price")
    days_on_market: int = Field(30, description="Days property has been listed")
    price_changes: int = Field(0, description="Number of price reductions")
    condition: int = Field(3, description="Property condition 1-5")
    zone_avg_price: float = Field(..., description="Zone average price")
    zone_avg_dom: int = Field(45, description="Zone average days on market")
    zone_inventory: int = Field(50, description="Active listings in zone")
    zone_monthly_sales: int = Field(10, description="Monthly sales in zone")
    active_offers: int = Field(0, description="Number of pending offers")


class ScenarioAnalysisTool(BaseTool):
    """
    Waze-style negotiation scenario analysis.

    Analyzes market conditions to identify applicable negotiation
    scenarios and provide strategic recommendations.
    """

    name: str = "analyze_negotiation_scenarios"
    description: str = (
        "Analyzes market conditions like Waze analyzes traffic. Returns applicable "
        "negotiation scenarios (buyers_market, stale_listing, multiple_offers, etc.) "
        "with probability scores, leverage assessment, and offer recommendations. "
        "Use when you need to understand the negotiation landscape before making offers."
    )
    args_schema: type[BaseModel] = ScenarioAnalysisInput

    def _run(
        self,
        property_id: str,
        listing_price: float,
        days_on_market: int = 30,
        price_changes: int = 0,
        condition: int = 3,
        zone_avg_price: float = 0,
        zone_avg_dom: int = 45,
        zone_inventory: int = 50,
        zone_monthly_sales: int = 10,
        active_offers: int = 0,
    ) -> str:
        """Run the scenario analysis."""
        engine = ScenarioEngine()

        property_data = {
            "id": property_id,
            "price": listing_price,
            "days_on_market": days_on_market,
            "price_changes": price_changes,
            "condition": condition,
        }

        market_data = {
            "avg_price": zone_avg_price or listing_price,
            "avg_days_on_market": zone_avg_dom,
            "active_listings": zone_inventory,
            "monthly_sales": zone_monthly_sales,
        }

        offer_history = [{"status": "pending"} for _ in range(active_offers)]

        scenarios = engine.analyze(property_data, market_data, offer_history)
        offer_rec = engine.get_offer_recommendation(listing_price)

        # Format output
        output = [
            f"NEGOTIATION SCENARIO ANALYSIS for Property {property_id}",
            "=" * 55,
            "",
            "DETECTED SCENARIOS:",
        ]

        for i, scenario in enumerate(scenarios[:3], 1):
            output.append(
                f"\n{i}. {scenario.scenario_type.value.upper()} "
                f"(Probability: {scenario.probability:.0%})"
            )
            output.append(f"   Leverage Score: {scenario.leverage_score:+d} (buyer perspective)")
            output.append(f"   Risk Level: {scenario.risk_level.upper()}")
            output.append(f"   Action: {scenario.recommended_action}")
            output.append(f"   Timing: {scenario.timing_advice}")
            output.append("   Key Factors:")
            for factor in scenario.key_factors:
                output.append(f"     - {factor}")

        output.extend([
            "",
            "OFFER RECOMMENDATIONS:",
            f"  Listing Price: ${offer_rec['listing_price']:,.0f}",
            "",
            f"  Aggressive: ${offer_rec['offer_range']['aggressive']:,.0f} "
            f"(-{offer_rec.get('discount_percentage', 0) + 3:.1f}%)",
            f"  Balanced:   ${offer_rec['offer_range']['balanced']:,.0f} "
            f"(-{offer_rec.get('discount_percentage', 0):.1f}%)",
            f"  Conservative: ${offer_rec['offer_range']['conservative']:,.0f} "
            f"(-{max(0, offer_rec.get('discount_percentage', 0) - 3):.1f}%)",
            "",
            f"  Confidence: {offer_rec['confidence']:.0%}",
            "",
            "PRIMARY RECOMMENDATION:",
            f"  {offer_rec['recommendation']}",
            f"  Timing: {offer_rec['timing']}",
        ])

        return "\n".join(output)


class MarketSignalsInput(BaseModel):
    """Input schema for market signals tool."""

    property_id: str = Field(..., description="Property ID")
    listing_price: float = Field(..., description="Current listing price")
    days_on_market: int = Field(30, description="Days on market")
    price_changes: int = Field(0, description="Number of price reductions")
    last_price_change_days: int = Field(999, description="Days since last price change")
    views: int = Field(0, description="Property views/visits")
    saves: int = Field(0, description="Times saved/favorited")
    pending_offers: int = Field(0, description="Active pending offers")
    zone_avg_price: float = Field(..., description="Zone average price")
    zone_avg_dom: int = Field(45, description="Zone average DOM")


class MarketSignalsTool(BaseTool):
    """
    Waze-style market signal detection.

    Detects real-time market signals like price drops, hot zones,
    bidding wars, and motivated sellers.
    """

    name: str = "detect_market_signals"
    description: str = (
        "Detects Waze-style market signals for a property. Returns alerts about "
        "price drops, bidding wars, motivated sellers, market heat, and more. "
        "Each signal includes severity (info/advisory/alert/urgent), buyer/seller "
        "impact scores, and recommended actions. Use to identify opportunities and risks."
    )
    args_schema: type[BaseModel] = MarketSignalsInput

    def _run(
        self,
        property_id: str,
        listing_price: float,
        days_on_market: int = 30,
        price_changes: int = 0,
        last_price_change_days: int = 999,
        views: int = 0,
        saves: int = 0,
        pending_offers: int = 0,
        zone_avg_price: float = 0,
        zone_avg_dom: int = 45,
    ) -> str:
        """Run market signal detection."""
        detector = MarketSignalDetector()

        property_data = {
            "id": property_id,
            "price": listing_price,
            "days_on_market": days_on_market,
            "price_changes": price_changes,
            "last_price_change_days": last_price_change_days,
            "views": views,
            "saves": saves,
            "pending_offers": pending_offers,
        }

        zone_stats = {
            "avg_price": zone_avg_price or listing_price,
            "median_price": zone_avg_price or listing_price,
            "avg_days_on_market": zone_avg_dom,
        }

        signals = detector.detect_property_signals(property_data, zone_stats)
        summary = detector.summarize()

        # Format output
        severity_icons = {
            "info": "ℹ️",
            "advisory": "📋",
            "alert": "⚠️",
            "urgent": "🚨",
        }

        output = [
            f"MARKET SIGNALS for Property {property_id}",
            "=" * 50,
            "",
            f"Total Signals: {summary['total_signals']}",
            f"Urgent Actions: {summary['urgent_count']}",
            f"Market Sentiment: {summary['market_sentiment'].replace('_', ' ').title()}",
            f"Net Buyer Impact: {summary['net_impact']:+d}",
            "",
            "DETECTED SIGNALS:",
        ]

        if not signals:
            output.append("  No significant signals detected.")
        else:
            for signal in signals:
                icon = severity_icons.get(signal.severity.value, "•")
                output.extend([
                    "",
                    f"{icon} {signal.title} [{signal.severity.value.upper()}]",
                    f"   Type: {signal.signal_type.value}",
                    f"   {signal.description}",
                    f"   Buyer Impact: {signal.buyer_impact:+d} | "
                    f"Seller Impact: {signal.seller_impact:+d}",
                    f"   Action: {signal.action_required}",
                    f"   Confidence: {signal.confidence:.0%}",
                ])

        if summary.get("urgent_signals"):
            output.extend([
                "",
                "⚡ PRIORITY ACTIONS:",
            ])
            for urgent in summary["urgent_signals"]:
                output.append(f"  • {urgent['title']}: {urgent['action']}")

        return "\n".join(output)


class OfferStrategyInput(BaseModel):
    """Input schema for offer strategy tool."""

    listing_price: float = Field(..., description="Current listing price")
    buyer_budget: float = Field(..., description="Maximum buyer budget")
    days_on_market: int = Field(30, description="Days on market")
    zone_avg_price: float = Field(..., description="Zone average price")
    zone_inventory: int = Field(50, description="Active listings in zone")
    zone_monthly_sales: int = Field(10, description="Monthly sales in zone")
    urgency: str = Field("normal", description="Buyer urgency: low, normal, high")
    competition_level: str = Field("unknown", description="Competition: none, low, medium, high")


class OfferStrategyTool(BaseTool):
    """
    Generate tiered offer strategy with Waze-style intelligence.

    Creates aggressive, balanced, and conservative offer tiers
    based on market conditions and buyer constraints.
    """

    name: str = "generate_offer_strategy"
    description: str = (
        "Generates a complete offer strategy with three tiers (aggressive, balanced, "
        "conservative) based on market conditions. Includes walk-away price, counter-offer "
        "guidelines, and negotiation talking points. Use to develop a comprehensive "
        "approach before making an offer."
    )
    args_schema: type[BaseModel] = OfferStrategyInput

    def _run(
        self,
        listing_price: float,
        buyer_budget: float,
        days_on_market: int = 30,
        zone_avg_price: float = 0,
        zone_inventory: int = 50,
        zone_monthly_sales: int = 10,
        urgency: str = "normal",
        competition_level: str = "unknown",
    ) -> str:
        """Generate offer strategy."""
        engine = ScenarioEngine()

        property_data = {
            "id": "strategy",
            "price": listing_price,
            "days_on_market": days_on_market,
            "price_changes": 0,
            "condition": 3,
        }

        market_data = {
            "avg_price": zone_avg_price or listing_price,
            "avg_days_on_market": 45,
            "active_listings": zone_inventory,
            "monthly_sales": zone_monthly_sales,
        }

        engine.analyze(property_data, market_data)
        rec = engine.get_offer_recommendation(listing_price)

        # Adjust for urgency
        urgency_adj = {"low": 0.95, "normal": 1.0, "high": 1.05}
        adj = urgency_adj.get(urgency, 1.0)

        # Adjust for competition
        comp_adj = {"none": 0.95, "low": 0.98, "medium": 1.0, "high": 1.05, "unknown": 1.0}
        adj *= comp_adj.get(competition_level, 1.0)

        aggressive = min(rec["offer_range"]["aggressive"] * adj, buyer_budget * 0.90)
        balanced = min(rec["offer_range"]["balanced"] * adj, buyer_budget * 0.95)
        conservative = min(rec["offer_range"]["conservative"] * adj, buyer_budget)

        walk_away = buyer_budget * 0.98

        output = [
            "OFFER STRATEGY",
            "=" * 40,
            "",
            f"Listing Price: ${listing_price:,.0f}",
            f"Your Budget: ${buyer_budget:,.0f}",
            f"Urgency: {urgency.title()}",
            f"Competition: {competition_level.title()}",
            "",
            "TIERED OFFERS:",
            "",
            f"🔥 AGGRESSIVE: ${aggressive:,.0f}",
            f"   Discount: {(1 - aggressive/listing_price) * 100:.1f}%",
            "   Use when: Motivated seller, long DOM, price drops",
            "   Risk: May offend seller, lose deal",
            "",
            f"⚖️ BALANCED: ${balanced:,.0f}",
            f"   Discount: {(1 - balanced/listing_price) * 100:.1f}%",
            "   Use when: Normal market conditions",
            "   Risk: May require negotiation rounds",
            "",
            f"🛡️ CONSERVATIVE: ${conservative:,.0f}",
            f"   Discount: {(1 - conservative/listing_price) * 100:.1f}%",
            "   Use when: Hot market, competition, must-have property",
            "   Risk: May overpay slightly",
            "",
            "WALK-AWAY THRESHOLD:",
            f"   Maximum: ${walk_away:,.0f}",
            "   Do not exceed under any circumstances",
            "",
            "COUNTER-OFFER PLAYBOOK:",
            "   Round 1: If countered, move to balanced tier",
            "   Round 2: Split the difference, max conservative",
            "   Round 3: Final offer at walk-away or walk",
            "",
            "NEGOTIATION TALKING POINTS:",
            f"   1. Market data shows zone avg at ${zone_avg_price:,.0f}",
            f"   2. Property has been on market {days_on_market} days",
            "   3. Ready to close quickly with pre-approval",
            "   4. Clean offer with minimal contingencies",
            "",
            f"Market Leverage: {rec['leverage_score']:+d}",
            f"Confidence: {rec['confidence']:.0%}",
        ]

        return "\n".join(output)
