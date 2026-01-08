"""Market Signals - Waze-style real-time market intelligence."""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any


class SignalType(str, Enum):
    """Types of market signals (like Waze traffic alerts)."""

    # Price Signals (like speed alerts)
    PRICE_DROP = "price_drop"  # Recent price reduction
    PRICE_SURGE = "price_surge"  # Rapid appreciation
    BELOW_MARKET = "below_market"  # Underpriced listing
    ABOVE_MARKET = "above_market"  # Overpriced listing

    # Activity Signals (like traffic volume)
    HIGH_INTEREST = "high_interest"  # Many views/saves
    LOW_INTEREST = "low_interest"  # Few views
    OFFER_RUSH = "offer_rush"  # Multiple recent offers
    BIDDING_WAR = "bidding_war"  # Escalating offers

    # Timing Signals (like ETAs)
    FRESH_LISTING = "fresh_listing"  # Just listed
    ABOUT_TO_EXPIRE = "about_to_expire"  # Listing expiring soon
    RELISTED = "relisted"  # Back on market
    WITHDRAWN = "withdrawn"  # Recently removed

    # Zone Signals (like area conditions)
    HOT_ZONE = "hot_zone"  # High demand area
    COOLING_ZONE = "cooling_zone"  # Slowing demand
    EMERGING_ZONE = "emerging_zone"  # Up-and-coming area
    SATURATED_ZONE = "saturated_zone"  # Too much inventory

    # Seller Signals (like hazard alerts)
    MOTIVATED_SELLER = "motivated_seller"  # Signs of urgency
    FIRM_SELLER = "firm_seller"  # Not budging on price
    DISTRESSED_SALE = "distressed_sale"  # Foreclosure/short sale
    ESTATE_SALE = "estate_sale"  # Probate/inheritance

    # Competition Signals (like other drivers)
    NEW_COMPETITOR = "new_competitor"  # Similar listing appeared
    COMPETITOR_SOLD = "competitor_sold"  # Comparable just closed
    COMPETITOR_PENDING = "competitor_pending"  # Comparable under contract


class SignalSeverity(str, Enum):
    """Severity level of signals."""

    INFO = "info"  # Informational
    ADVISORY = "advisory"  # Worth knowing
    ALERT = "alert"  # Requires attention
    URGENT = "urgent"  # Immediate action needed


@dataclass
class MarketSignal:
    """
    A market signal with Waze-style intelligence.

    Like Waze shows road hazards, this shows market conditions.
    """

    signal_type: SignalType
    severity: SignalSeverity
    timestamp: datetime
    expires_at: datetime | None = None

    # Signal details
    title: str = ""
    description: str = ""
    action_required: str = ""

    # Impact assessment
    buyer_impact: int = 0  # -100 to +100 (negative = bad for buyer)
    seller_impact: int = 0  # -100 to +100 (negative = bad for seller)

    # Context
    property_id: str | None = None
    zone_id: str | None = None
    data_points: dict[str, Any] = field(default_factory=dict)

    # Source
    confidence: float = 0.8  # 0-1 confidence in signal accuracy
    source: str = "system"  # Where signal came from

    @property
    def is_expired(self) -> bool:
        """Check if signal has expired."""
        if not self.expires_at:
            return False
        return datetime.now() > self.expires_at

    @property
    def age_hours(self) -> float:
        """Get signal age in hours."""
        return (datetime.now() - self.timestamp).total_seconds() / 3600


class MarketSignalDetector:
    """
    Waze-style market signal detection engine.

    Analyzes market data to detect and report significant signals
    that affect negotiation strategy.
    """

    def __init__(self) -> None:
        """Initialize the signal detector."""
        self.signals: list[MarketSignal] = []

    def detect_property_signals(
        self,
        property_data: dict[str, Any],
        zone_stats: dict[str, Any],
    ) -> list[MarketSignal]:
        """
        Detect signals for a specific property.

        Args:
            property_data: Property details
            zone_stats: Zone statistics

        Returns:
            List of detected signals
        """
        signals = []
        now = datetime.now()

        # Extract data
        listing_price = property_data.get("price", 0)
        days_on_market = property_data.get("days_on_market", 0)
        price_changes = property_data.get("price_changes", 0)
        last_price_change = property_data.get("last_price_change_days", 999)
        views = property_data.get("views", 0)
        saves = property_data.get("saves", 0)
        pending_offers = property_data.get("pending_offers", 0)

        zone_avg_price = zone_stats.get("avg_price", listing_price)
        zone_avg_dom = zone_stats.get("avg_days_on_market", 45)

        # Signal 1: Price Drop
        if last_price_change <= 7 and price_changes > 0:
            signals.append(
                MarketSignal(
                    signal_type=SignalType.PRICE_DROP,
                    severity=SignalSeverity.ALERT,
                    timestamp=now,
                    expires_at=now + timedelta(days=14),
                    title="Recent Price Reduction",
                    description=f"Price reduced {last_price_change} days ago (drop #{price_changes})",
                    action_required="Consider offering below new price - seller is adjusting",
                    buyer_impact=70,
                    seller_impact=-50,
                    confidence=0.95,
                    data_points={
                        "price_changes": price_changes,
                        "days_since_reduction": last_price_change,
                    },
                )
            )

        # Signal 2: Fresh Listing
        if days_on_market <= 3:
            signals.append(
                MarketSignal(
                    signal_type=SignalType.FRESH_LISTING,
                    severity=SignalSeverity.URGENT,
                    timestamp=now,
                    expires_at=now + timedelta(days=7),
                    title="New Listing Alert",
                    description=f"Listed just {days_on_market} days ago",
                    action_required="Act fast if interested - competition likely incoming",
                    buyer_impact=-30,
                    seller_impact=60,
                    confidence=1.0,
                    data_points={"days_on_market": days_on_market},
                )
            )

        # Signal 3: Stale Listing / Motivated Seller
        if days_on_market > zone_avg_dom * 1.5:
            signals.append(
                MarketSignal(
                    signal_type=SignalType.MOTIVATED_SELLER,
                    severity=SignalSeverity.ALERT,
                    timestamp=now,
                    expires_at=now + timedelta(days=30),
                    title="Extended Listing Period",
                    description=f"On market {days_on_market} days (zone avg: {zone_avg_dom})",
                    action_required="Seller likely motivated - consider aggressive offer",
                    buyer_impact=80,
                    seller_impact=-60,
                    confidence=0.85,
                    data_points={
                        "days_on_market": days_on_market,
                        "zone_avg_dom": zone_avg_dom,
                        "ratio": round(days_on_market / zone_avg_dom, 2),
                    },
                )
            )

        # Signal 4: Price vs Market
        price_vs_avg = (listing_price - zone_avg_price) / zone_avg_price * 100
        if price_vs_avg < -10:
            signals.append(
                MarketSignal(
                    signal_type=SignalType.BELOW_MARKET,
                    severity=SignalSeverity.URGENT,
                    timestamp=now,
                    expires_at=now + timedelta(days=7),
                    title="Below Market Price",
                    description=f"Priced {abs(price_vs_avg):.1f}% below zone average",
                    action_required="High value opportunity - expect competition",
                    buyer_impact=50,
                    seller_impact=-40,
                    confidence=0.8,
                    data_points={
                        "price_vs_avg_pct": round(price_vs_avg, 1),
                        "listing_price": listing_price,
                        "zone_avg_price": zone_avg_price,
                    },
                )
            )
        elif price_vs_avg > 15:
            signals.append(
                MarketSignal(
                    signal_type=SignalType.ABOVE_MARKET,
                    severity=SignalSeverity.ADVISORY,
                    timestamp=now,
                    expires_at=now + timedelta(days=30),
                    title="Above Market Price",
                    description=f"Priced {price_vs_avg:.1f}% above zone average",
                    action_required="Strong negotiation opportunity if interested",
                    buyer_impact=60,
                    seller_impact=-30,
                    confidence=0.8,
                    data_points={
                        "price_vs_avg_pct": round(price_vs_avg, 1),
                        "listing_price": listing_price,
                        "zone_avg_price": zone_avg_price,
                    },
                )
            )

        # Signal 5: High Interest
        avg_views_per_day = views / max(days_on_market, 1)
        if avg_views_per_day > 10 or saves > 20:
            signals.append(
                MarketSignal(
                    signal_type=SignalType.HIGH_INTEREST,
                    severity=SignalSeverity.ALERT,
                    timestamp=now,
                    expires_at=now + timedelta(days=7),
                    title="High Buyer Interest",
                    description=f"{views} views, {saves} saves ({avg_views_per_day:.1f}/day)",
                    action_required="Competition likely - prepare strong offer",
                    buyer_impact=-40,
                    seller_impact=60,
                    confidence=0.9,
                    data_points={
                        "views": views,
                        "saves": saves,
                        "views_per_day": round(avg_views_per_day, 1),
                    },
                )
            )

        # Signal 6: Bidding War
        if pending_offers >= 3:
            signals.append(
                MarketSignal(
                    signal_type=SignalType.BIDDING_WAR,
                    severity=SignalSeverity.URGENT,
                    timestamp=now,
                    expires_at=now + timedelta(days=3),
                    title="Multiple Offers Situation",
                    description=f"{pending_offers} active offers on property",
                    action_required="Submit best-and-final, consider escalation clause",
                    buyer_impact=-80,
                    seller_impact=90,
                    confidence=0.95,
                    data_points={"pending_offers": pending_offers},
                )
            )

        self.signals = signals
        return signals

    def detect_zone_signals(
        self,
        zone_stats: dict[str, Any],
        historical_stats: dict[str, Any] | None = None,
    ) -> list[MarketSignal]:
        """
        Detect zone-level signals.

        Args:
            zone_stats: Current zone statistics
            historical_stats: Historical comparison data

        Returns:
            List of zone signals
        """
        signals = []
        now = datetime.now()
        historical_stats = historical_stats or {}

        # Extract data
        active_listings = zone_stats.get("active_listings", 0)
        monthly_sales = zone_stats.get("monthly_sales", 0)
        avg_price = zone_stats.get("avg_price", 0)
        avg_dom = zone_stats.get("avg_days_on_market", 45)

        prev_avg_price = historical_stats.get("prev_avg_price", avg_price)
        prev_monthly_sales = historical_stats.get("prev_monthly_sales", monthly_sales)

        # Calculate metrics
        absorption_rate = (
            active_listings / monthly_sales if monthly_sales > 0 else float("inf")
        )
        price_change_pct = (
            (avg_price - prev_avg_price) / prev_avg_price * 100
            if prev_avg_price > 0
            else 0
        )
        sales_change_pct = (
            (monthly_sales - prev_monthly_sales) / prev_monthly_sales * 100
            if prev_monthly_sales > 0
            else 0
        )

        # Signal 1: Hot Zone
        if absorption_rate < 2 or (sales_change_pct > 20 and avg_dom < 30):
            signals.append(
                MarketSignal(
                    signal_type=SignalType.HOT_ZONE,
                    severity=SignalSeverity.ALERT,
                    timestamp=now,
                    expires_at=now + timedelta(days=30),
                    title="Hot Market Zone",
                    description=f"Absorption rate: {absorption_rate:.1f} months, DOM: {avg_dom} days",
                    action_required="Prepare competitive offers, expect fast-moving market",
                    buyer_impact=-60,
                    seller_impact=70,
                    confidence=0.85,
                    zone_id=zone_stats.get("zone_id"),
                    data_points={
                        "absorption_rate": round(absorption_rate, 2),
                        "avg_dom": avg_dom,
                        "sales_change_pct": round(sales_change_pct, 1),
                    },
                )
            )

        # Signal 2: Cooling Zone
        elif absorption_rate > 8 or sales_change_pct < -20:
            signals.append(
                MarketSignal(
                    signal_type=SignalType.COOLING_ZONE,
                    severity=SignalSeverity.ADVISORY,
                    timestamp=now,
                    expires_at=now + timedelta(days=30),
                    title="Cooling Market Zone",
                    description=f"Absorption rate: {absorption_rate:.1f} months",
                    action_required="Take time to negotiate - buyer leverage increasing",
                    buyer_impact=70,
                    seller_impact=-50,
                    confidence=0.85,
                    zone_id=zone_stats.get("zone_id"),
                    data_points={
                        "absorption_rate": round(absorption_rate, 2),
                        "sales_change_pct": round(sales_change_pct, 1),
                    },
                )
            )

        # Signal 3: Price Surge
        if price_change_pct > 10:
            signals.append(
                MarketSignal(
                    signal_type=SignalType.PRICE_SURGE,
                    severity=SignalSeverity.ALERT,
                    timestamp=now,
                    expires_at=now + timedelta(days=30),
                    title="Price Appreciation Alert",
                    description=f"Zone prices up {price_change_pct:.1f}% recently",
                    action_required="Act soon before further appreciation",
                    buyer_impact=-50,
                    seller_impact=60,
                    confidence=0.8,
                    zone_id=zone_stats.get("zone_id"),
                    data_points={
                        "price_change_pct": round(price_change_pct, 1),
                        "avg_price": avg_price,
                        "prev_avg_price": prev_avg_price,
                    },
                )
            )

        # Signal 4: Saturated Zone
        if active_listings > monthly_sales * 12:  # More than 12 months inventory
            signals.append(
                MarketSignal(
                    signal_type=SignalType.SATURATED_ZONE,
                    severity=SignalSeverity.INFO,
                    timestamp=now,
                    expires_at=now + timedelta(days=60),
                    title="High Inventory Zone",
                    description=f"{active_listings} listings, {monthly_sales} sales/month",
                    action_required="Significant buyer leverage - negotiate aggressively",
                    buyer_impact=80,
                    seller_impact=-70,
                    confidence=0.9,
                    zone_id=zone_stats.get("zone_id"),
                    data_points={
                        "active_listings": active_listings,
                        "monthly_sales": monthly_sales,
                        "months_inventory": round(absorption_rate, 1),
                    },
                )
            )

        self.signals.extend(signals)
        return signals

    def get_urgent_signals(self) -> list[MarketSignal]:
        """Get only urgent signals requiring immediate attention."""
        return [s for s in self.signals if s.severity == SignalSeverity.URGENT]

    def get_buyer_favorable(self) -> list[MarketSignal]:
        """Get signals favorable to buyers."""
        return [s for s in self.signals if s.buyer_impact > 30]

    def get_seller_favorable(self) -> list[MarketSignal]:
        """Get signals favorable to sellers."""
        return [s for s in self.signals if s.seller_impact > 30]

    def summarize(self) -> dict[str, Any]:
        """Get a summary of all detected signals."""
        if not self.signals:
            return {
                "total_signals": 0,
                "message": "No signals detected",
            }

        urgent = self.get_urgent_signals()
        buyer_favorable = self.get_buyer_favorable()
        seller_favorable = self.get_seller_favorable()

        # Calculate overall market sentiment
        total_buyer_impact = sum(s.buyer_impact for s in self.signals)
        total_seller_impact = sum(s.seller_impact for s in self.signals)
        net_impact = total_buyer_impact - total_seller_impact

        if net_impact > 50:
            market_sentiment = "strongly_buyer_favorable"
        elif net_impact > 0:
            market_sentiment = "slightly_buyer_favorable"
        elif net_impact > -50:
            market_sentiment = "slightly_seller_favorable"
        else:
            market_sentiment = "strongly_seller_favorable"

        return {
            "total_signals": len(self.signals),
            "urgent_count": len(urgent),
            "buyer_favorable_count": len(buyer_favorable),
            "seller_favorable_count": len(seller_favorable),
            "market_sentiment": market_sentiment,
            "net_impact": net_impact,
            "signals_by_type": {
                s.signal_type.value: s.title for s in self.signals
            },
            "urgent_signals": [
                {"type": s.signal_type.value, "title": s.title, "action": s.action_required}
                for s in urgent
            ],
        }
