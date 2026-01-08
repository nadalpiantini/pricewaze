"""Negotiation Scenarios - Waze-style scenario analysis for real estate negotiations."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ScenarioType(str, Enum):
    """Types of negotiation scenarios (Waze-style traffic patterns)."""

    # Buyer-favorable scenarios
    BUYERS_MARKET = "buyers_market"  # Low demand, high inventory
    PRICE_DROP_MOMENTUM = "price_drop_momentum"  # Recent price reductions
    STALE_LISTING = "stale_listing"  # Long days on market
    MOTIVATED_SELLER = "motivated_seller"  # Signs of urgency
    OFF_SEASON = "off_season"  # Low market activity period

    # Seller-favorable scenarios
    SELLERS_MARKET = "sellers_market"  # High demand, low inventory
    MULTIPLE_OFFERS = "multiple_offers"  # Competition for property
    HOT_ZONE = "hot_zone"  # High-demand area
    NEW_LISTING = "new_listing"  # Fresh to market
    PEAK_SEASON = "peak_season"  # High market activity period

    # Neutral / Strategic scenarios
    BALANCED_MARKET = "balanced_market"  # Equal buyer/seller leverage
    PRICE_DISCOVERY = "price_discovery"  # Unclear market value
    RENOVATION_OPPORTUNITY = "renovation_opportunity"  # Value-add potential
    COMPARABLE_GAP = "comparable_gap"  # Limited market data


@dataclass
class NegotiationScenario:
    """
    A negotiation scenario with Waze-style intelligence.

    Like Waze shows traffic conditions, this shows negotiation conditions.
    """

    scenario_type: ScenarioType
    probability: float  # 0-1 likelihood this scenario applies
    leverage_score: float  # -100 to +100 (negative = seller, positive = buyer)
    confidence: float  # 0-1 confidence in assessment

    # Waze-style recommendations
    recommended_action: str
    timing_advice: str
    risk_level: str  # low, medium, high

    # Context
    key_factors: list[str] = field(default_factory=list)
    data_points: dict[str, Any] = field(default_factory=dict)

    # Offer guidance
    suggested_discount_pct: float = 0.0  # Below asking (positive = discount)
    offer_range_low_pct: float = 0.0
    offer_range_high_pct: float = 0.0


class ScenarioEngine:
    """
    Waze-style scenario analysis engine.

    Analyzes market conditions and property data to identify
    the most likely negotiation scenarios and strategies.
    """

    # Scenario templates with base configurations
    SCENARIO_TEMPLATES = {
        ScenarioType.BUYERS_MARKET: {
            "leverage_score": 60,
            "recommended_action": "Make an aggressive initial offer",
            "timing_advice": "Take your time - leverage is on your side",
            "risk_level": "low",
            "suggested_discount_pct": 10,
            "offer_range_low_pct": 12,
            "offer_range_high_pct": 5,
        },
        ScenarioType.PRICE_DROP_MOMENTUM: {
            "leverage_score": 70,
            "recommended_action": "Offer below last price drop, cite pattern",
            "timing_advice": "Act within 7 days of latest reduction",
            "risk_level": "low",
            "suggested_discount_pct": 8,
            "offer_range_low_pct": 15,
            "offer_range_high_pct": 5,
        },
        ScenarioType.STALE_LISTING: {
            "leverage_score": 80,
            "recommended_action": "Significant discount, emphasize cash/quick close",
            "timing_advice": "Seller motivation increases daily",
            "risk_level": "low",
            "suggested_discount_pct": 12,
            "offer_range_low_pct": 20,
            "offer_range_high_pct": 8,
        },
        ScenarioType.MOTIVATED_SELLER: {
            "leverage_score": 85,
            "recommended_action": "Quick, clean offer with short contingencies",
            "timing_advice": "Move fast but don't overpay for speed",
            "risk_level": "medium",
            "suggested_discount_pct": 10,
            "offer_range_low_pct": 18,
            "offer_range_high_pct": 5,
        },
        ScenarioType.OFF_SEASON: {
            "leverage_score": 40,
            "recommended_action": "Moderate discount, less competition",
            "timing_advice": "Holiday/slow periods favor buyers",
            "risk_level": "low",
            "suggested_discount_pct": 6,
            "offer_range_low_pct": 10,
            "offer_range_high_pct": 3,
        },
        ScenarioType.SELLERS_MARKET: {
            "leverage_score": -60,
            "recommended_action": "Offer at or slightly above asking",
            "timing_advice": "Act immediately, expect competition",
            "risk_level": "high",
            "suggested_discount_pct": -3,
            "offer_range_low_pct": 0,
            "offer_range_high_pct": -5,
        },
        ScenarioType.MULTIPLE_OFFERS: {
            "leverage_score": -80,
            "recommended_action": "Submit best-and-final, consider escalation clause",
            "timing_advice": "No time for negotiation, decide now",
            "risk_level": "high",
            "suggested_discount_pct": -5,
            "offer_range_low_pct": 0,
            "offer_range_high_pct": -8,
        },
        ScenarioType.HOT_ZONE: {
            "leverage_score": -50,
            "recommended_action": "Competitive offer, highlight buyer strengths",
            "timing_advice": "Properties move fast in this area",
            "risk_level": "medium",
            "suggested_discount_pct": -2,
            "offer_range_low_pct": 3,
            "offer_range_high_pct": -5,
        },
        ScenarioType.NEW_LISTING: {
            "leverage_score": -40,
            "recommended_action": "Strong opening offer to beat competition",
            "timing_advice": "First 72 hours are critical",
            "risk_level": "medium",
            "suggested_discount_pct": 2,
            "offer_range_low_pct": 5,
            "offer_range_high_pct": -2,
        },
        ScenarioType.PEAK_SEASON: {
            "leverage_score": -30,
            "recommended_action": "Prepared offer with pre-approval ready",
            "timing_advice": "Expect multiple showings and offers",
            "risk_level": "medium",
            "suggested_discount_pct": 0,
            "offer_range_low_pct": 3,
            "offer_range_high_pct": -3,
        },
        ScenarioType.BALANCED_MARKET: {
            "leverage_score": 0,
            "recommended_action": "Fair offer based on comparables",
            "timing_advice": "Normal negotiation timeline expected",
            "risk_level": "low",
            "suggested_discount_pct": 5,
            "offer_range_low_pct": 8,
            "offer_range_high_pct": 0,
        },
        ScenarioType.PRICE_DISCOVERY: {
            "leverage_score": 20,
            "recommended_action": "Data-driven offer with AVM support",
            "timing_advice": "Take time to gather market evidence",
            "risk_level": "medium",
            "suggested_discount_pct": 7,
            "offer_range_low_pct": 15,
            "offer_range_high_pct": 0,
        },
        ScenarioType.RENOVATION_OPPORTUNITY: {
            "leverage_score": 45,
            "recommended_action": "Factor renovation costs into offer",
            "timing_advice": "Get contractor estimates before offering",
            "risk_level": "medium",
            "suggested_discount_pct": 15,
            "offer_range_low_pct": 25,
            "offer_range_high_pct": 10,
        },
        ScenarioType.COMPARABLE_GAP: {
            "leverage_score": 30,
            "recommended_action": "Use uncertainty to negotiate aggressively",
            "timing_advice": "Seller may be uncertain of true value",
            "risk_level": "medium",
            "suggested_discount_pct": 8,
            "offer_range_low_pct": 15,
            "offer_range_high_pct": 3,
        },
    }

    def __init__(self) -> None:
        """Initialize the scenario engine."""
        self.scenarios: list[NegotiationScenario] = []

    def analyze(
        self,
        property_data: dict[str, Any],
        market_data: dict[str, Any],
        offer_history: list[dict[str, Any]] | None = None,
    ) -> list[NegotiationScenario]:
        """
        Analyze conditions and identify applicable scenarios.

        Args:
            property_data: Property details (price, DOM, etc.)
            market_data: Zone/market statistics
            offer_history: Previous offers on property

        Returns:
            List of applicable scenarios sorted by probability
        """
        offer_history = offer_history or []
        scenarios = []

        # Extract key metrics
        days_on_market = property_data.get("days_on_market", 30)
        price_changes = property_data.get("price_changes", 0)
        zone_avg_dom = market_data.get("avg_days_on_market", 45)
        zone_inventory = market_data.get("active_listings", 50)
        zone_demand = market_data.get("monthly_sales", 10)
        active_offers = len([o for o in offer_history if o.get("status") == "pending"])

        # Calculate absorption rate (months of inventory)
        absorption_rate = (
            zone_inventory / zone_demand if zone_demand > 0 else float("inf")
        )

        # Scenario 1: Days on Market Analysis
        if days_on_market > zone_avg_dom * 1.5:
            scenarios.append(
                self._create_scenario(
                    ScenarioType.STALE_LISTING,
                    probability=min(0.9, 0.5 + (days_on_market - zone_avg_dom) / 100),
                    key_factors=[
                        f"Property has been listed for {days_on_market} days",
                        f"Zone average is {zone_avg_dom} days",
                        "Extended listing time indicates negotiation opportunity",
                    ],
                    data_points={
                        "days_on_market": days_on_market,
                        "zone_avg_dom": zone_avg_dom,
                        "dom_ratio": round(days_on_market / zone_avg_dom, 2),
                    },
                )
            )
        elif days_on_market < 7:
            scenarios.append(
                self._create_scenario(
                    ScenarioType.NEW_LISTING,
                    probability=0.8,
                    key_factors=[
                        f"Listed only {days_on_market} days ago",
                        "First-mover advantage available",
                        "Seller expectations are still high",
                    ],
                    data_points={"days_on_market": days_on_market},
                )
            )

        # Scenario 2: Price Change Momentum
        if price_changes >= 2:
            scenarios.append(
                self._create_scenario(
                    ScenarioType.PRICE_DROP_MOMENTUM,
                    probability=min(0.85, 0.6 + price_changes * 0.1),
                    key_factors=[
                        f"Property has had {price_changes} price reductions",
                        "Seller is adjusting expectations",
                        "Pattern suggests further flexibility",
                    ],
                    data_points={"price_changes": price_changes},
                )
            )

        # Scenario 3: Market Balance (Absorption Rate)
        if absorption_rate > 6:
            scenarios.append(
                self._create_scenario(
                    ScenarioType.BUYERS_MARKET,
                    probability=min(0.9, 0.5 + (absorption_rate - 6) * 0.05),
                    key_factors=[
                        f"Absorption rate: {absorption_rate:.1f} months of inventory",
                        "Supply exceeds demand",
                        "Buyers have strong negotiating position",
                    ],
                    data_points={
                        "absorption_rate": round(absorption_rate, 2),
                        "zone_inventory": zone_inventory,
                        "zone_demand": zone_demand,
                    },
                )
            )
        elif absorption_rate < 3:
            scenarios.append(
                self._create_scenario(
                    ScenarioType.SELLERS_MARKET,
                    probability=min(0.9, 0.5 + (3 - absorption_rate) * 0.2),
                    key_factors=[
                        f"Absorption rate: {absorption_rate:.1f} months of inventory",
                        "Demand exceeds supply",
                        "Sellers have strong negotiating position",
                    ],
                    data_points={
                        "absorption_rate": round(absorption_rate, 2),
                        "zone_inventory": zone_inventory,
                        "zone_demand": zone_demand,
                    },
                )
            )
        else:
            scenarios.append(
                self._create_scenario(
                    ScenarioType.BALANCED_MARKET,
                    probability=0.7,
                    key_factors=[
                        f"Absorption rate: {absorption_rate:.1f} months (balanced)",
                        "Normal market conditions",
                        "Fair negotiation expected",
                    ],
                    data_points={"absorption_rate": round(absorption_rate, 2)},
                )
            )

        # Scenario 4: Multiple Offers
        if active_offers >= 2:
            scenarios.append(
                self._create_scenario(
                    ScenarioType.MULTIPLE_OFFERS,
                    probability=0.95,
                    key_factors=[
                        f"{active_offers} active offers on property",
                        "Competitive situation requires decisive action",
                        "Consider escalation clause or best-and-final",
                    ],
                    data_points={"active_offers": active_offers},
                )
            )

        # Scenario 5: Renovation Opportunity (condition-based)
        condition = property_data.get("condition", 3)
        if condition <= 2:
            scenarios.append(
                self._create_scenario(
                    ScenarioType.RENOVATION_OPPORTUNITY,
                    probability=0.8,
                    key_factors=[
                        f"Property condition rated {condition}/5",
                        "Renovation required - factor into offer",
                        "Reduced buyer pool due to condition",
                    ],
                    data_points={"condition": condition},
                )
            )

        # Sort by probability (highest first)
        scenarios.sort(key=lambda s: s.probability, reverse=True)
        self.scenarios = scenarios

        return scenarios

    def _create_scenario(
        self,
        scenario_type: ScenarioType,
        probability: float,
        key_factors: list[str],
        data_points: dict[str, Any],
    ) -> NegotiationScenario:
        """Create a scenario from template with custom data."""
        template = self.SCENARIO_TEMPLATES[scenario_type]

        return NegotiationScenario(
            scenario_type=scenario_type,
            probability=round(probability, 2),
            leverage_score=template["leverage_score"],
            confidence=round(probability * 0.9, 2),
            recommended_action=template["recommended_action"],
            timing_advice=template["timing_advice"],
            risk_level=template["risk_level"],
            key_factors=key_factors,
            data_points=data_points,
            suggested_discount_pct=template["suggested_discount_pct"],
            offer_range_low_pct=template["offer_range_low_pct"],
            offer_range_high_pct=template["offer_range_high_pct"],
        )

    def get_primary_scenario(self) -> NegotiationScenario | None:
        """Get the most likely scenario."""
        return self.scenarios[0] if self.scenarios else None

    def get_offer_recommendation(
        self,
        listing_price: float,
    ) -> dict[str, Any]:
        """
        Get recommended offer amounts based on scenarios.

        Args:
            listing_price: Current listing price

        Returns:
            Offer recommendations with rationale
        """
        if not self.scenarios:
            return {
                "error": "No scenarios analyzed. Call analyze() first.",
            }

        # Weight scenarios by probability
        weighted_discount = 0.0
        total_weight = 0.0

        for scenario in self.scenarios:
            weight = scenario.probability
            weighted_discount += scenario.suggested_discount_pct * weight
            total_weight += weight

        avg_discount = weighted_discount / total_weight if total_weight > 0 else 5

        # Calculate offer amounts
        primary = self.get_primary_scenario()
        if not primary:
            return {"error": "No primary scenario"}

        suggested_offer = listing_price * (1 - avg_discount / 100)
        low_offer = listing_price * (1 - primary.offer_range_low_pct / 100)
        high_offer = listing_price * (1 - primary.offer_range_high_pct / 100)

        return {
            "listing_price": listing_price,
            "suggested_offer": round(suggested_offer, 2),
            "offer_range": {
                "aggressive": round(low_offer, 2),
                "balanced": round(suggested_offer, 2),
                "conservative": round(high_offer, 2),
            },
            "discount_percentage": round(avg_discount, 1),
            "primary_scenario": primary.scenario_type.value,
            "leverage_score": primary.leverage_score,
            "confidence": primary.confidence,
            "recommendation": primary.recommended_action,
            "timing": primary.timing_advice,
            "risk_level": primary.risk_level,
            "key_factors": primary.key_factors,
        }
