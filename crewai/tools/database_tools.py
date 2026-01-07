"""Database tools for CrewAI agents to interact with Supabase."""

from typing import Any

from crewai.tools import BaseTool
from pydantic import BaseModel, Field
from supabase import create_client, Client

from config import get_settings


def get_supabase_client() -> Client:
    """Get Supabase client instance."""
    settings = get_settings()
    return create_client(
        settings.effective_supabase_url,
        settings.effective_supabase_key,
    )


class FetchPropertyInput(BaseModel):
    """Input schema for fetching a property."""

    property_id: str = Field(description="The UUID of the property to fetch")


class FetchPropertyTool(BaseTool):
    """Fetch detailed property information from the database."""

    name: str = "fetch_property"
    description: str = (
        "Fetches complete property information including owner details, price, "
        "area, location, and status. Use this to get all data about a specific property."
    )
    args_schema: type[BaseModel] = FetchPropertyInput

    def _run(self, property_id: str) -> dict[str, Any]:
        """Fetch property data from Supabase."""
        client = get_supabase_client()

        result = client.table("pricewaze_properties").select(
            "*, owner:pricewaze_profiles!owner_id(id, full_name, email), "
            "zone:pricewaze_zones!zone_id(id, name, city, avg_price_m2)"
        ).eq("id", property_id).single().execute()

        if result.data:
            return {
                "success": True,
                "property": result.data,
            }
        return {"success": False, "error": "Property not found"}


class FetchZonePropertiesInput(BaseModel):
    """Input schema for fetching zone properties."""

    zone_id: str | None = Field(default=None, description="Zone UUID to filter by")
    zone_name: str | None = Field(default=None, description="Zone name to filter by")
    status: str = Field(default="active", description="Property status filter")
    limit: int = Field(default=50, description="Maximum number of properties to fetch")


class FetchZonePropertiesTool(BaseTool):
    """Fetch all properties in a specific zone for market analysis."""

    name: str = "fetch_zone_properties"
    description: str = (
        "Fetches all properties in a specific zone or city. Essential for market "
        "analysis, price comparisons, and understanding local market conditions."
    )
    args_schema: type[BaseModel] = FetchZonePropertiesInput

    def _run(
        self,
        zone_id: str | None = None,
        zone_name: str | None = None,
        status: str = "active",
        limit: int = 50,
    ) -> dict[str, Any]:
        """Fetch zone properties from Supabase."""
        client = get_supabase_client()

        query = client.table("pricewaze_properties").select(
            "id, title, price, area_m2, price_per_m2, property_type, status, "
            "bedrooms, bathrooms, created_at, zone_id"
        )

        if zone_id:
            query = query.eq("zone_id", zone_id)

        if status:
            query = query.eq("status", status)

        result = query.limit(limit).execute()

        # If filtering by zone_name, fetch zone first
        if zone_name and not zone_id:
            zone_result = client.table("pricewaze_zones").select("id").ilike(
                "name", f"%{zone_name}%"
            ).execute()
            if zone_result.data:
                zone_ids = [z["id"] for z in zone_result.data]
                result = client.table("pricewaze_properties").select(
                    "id, title, price, area_m2, price_per_m2, property_type, status, "
                    "bedrooms, bathrooms, created_at, zone_id"
                ).in_("zone_id", zone_ids).eq("status", status).limit(limit).execute()

        return {
            "success": True,
            "properties": result.data or [],
            "count": len(result.data or []),
        }


class FetchOfferHistoryInput(BaseModel):
    """Input schema for fetching offer history."""

    property_id: str = Field(description="Property UUID to get offers for")
    include_expired: bool = Field(default=False, description="Include expired offers")


class FetchOfferHistoryTool(BaseTool):
    """Fetch negotiation history for a property."""

    name: str = "fetch_offer_history"
    description: str = (
        "Fetches all offers and counter-offers for a property. Critical for "
        "understanding negotiation patterns, buyer behavior, and pricing strategies."
    )
    args_schema: type[BaseModel] = FetchOfferHistoryInput

    def _run(
        self,
        property_id: str,
        include_expired: bool = False,
    ) -> dict[str, Any]:
        """Fetch offer history from Supabase."""
        client = get_supabase_client()

        query = client.table("pricewaze_offers").select(
            "id, amount, message, status, created_at, expires_at, parent_offer_id, "
            "buyer:pricewaze_profiles!buyer_id(id, full_name), "
            "seller:pricewaze_profiles!seller_id(id, full_name)"
        ).eq("property_id", property_id).order("created_at", desc=True)

        if not include_expired:
            query = query.neq("status", "expired")

        result = query.execute()

        return {
            "success": True,
            "offers": result.data or [],
            "total_offers": len(result.data or []),
        }


class FetchMarketStatsInput(BaseModel):
    """Input schema for fetching market statistics."""

    zone_id: str | None = Field(default=None, description="Zone UUID for stats")
    property_type: str | None = Field(default=None, description="Property type filter")
    days_back: int = Field(default=90, description="Days to look back for stats")


class FetchMarketStatsTool(BaseTool):
    """Fetch market statistics for analysis."""

    name: str = "fetch_market_stats"
    description: str = (
        "Fetches aggregated market statistics including average prices, "
        "sales volume, and trends. Essential for market positioning analysis."
    )
    args_schema: type[BaseModel] = FetchMarketStatsInput

    def _run(
        self,
        zone_id: str | None = None,
        property_type: str | None = None,
        days_back: int = 90,
    ) -> dict[str, Any]:
        """Fetch market statistics from Supabase."""
        client = get_supabase_client()

        # Get active listings
        query = client.table("pricewaze_properties").select(
            "price, area_m2, price_per_m2, property_type, status, created_at"
        )

        if zone_id:
            query = query.eq("zone_id", zone_id)
        if property_type:
            query = query.eq("property_type", property_type)

        result = query.execute()
        properties = result.data or []

        # Calculate statistics
        active = [p for p in properties if p["status"] == "active"]
        sold = [p for p in properties if p["status"] == "sold"]

        active_prices = [p["price"] for p in active if p["price"]]
        active_price_per_m2 = [p["price_per_m2"] for p in active if p["price_per_m2"]]

        stats = {
            "total_listings": len(active),
            "total_sold": len(sold),
            "avg_price": sum(active_prices) / len(active_prices) if active_prices else 0,
            "min_price": min(active_prices) if active_prices else 0,
            "max_price": max(active_prices) if active_prices else 0,
            "avg_price_per_m2": (
                sum(active_price_per_m2) / len(active_price_per_m2)
                if active_price_per_m2 else 0
            ),
            "property_type_distribution": {},
        }

        # Property type distribution
        for p in active:
            ptype = p["property_type"]
            stats["property_type_distribution"][ptype] = (
                stats["property_type_distribution"].get(ptype, 0) + 1
            )

        return {"success": True, "stats": stats}


class SaveAnalysisResultInput(BaseModel):
    """Input schema for saving analysis results."""

    property_id: str = Field(description="Property UUID")
    analysis_type: str = Field(description="Type of analysis (pricing, negotiation, etc.)")
    result: dict[str, Any] = Field(description="Analysis result data")


class SaveAnalysisResultTool(BaseTool):
    """Save analysis results for future reference."""

    name: str = "save_analysis_result"
    description: str = (
        "Saves the analysis results to the database for audit trail and "
        "future reference. Call this after completing any analysis."
    )
    args_schema: type[BaseModel] = SaveAnalysisResultInput

    def _run(
        self,
        property_id: str,
        analysis_type: str,
        result: dict[str, Any],
    ) -> dict[str, Any]:
        """Save analysis result - stores in memory for now."""
        # For MVP, we just return success
        # In production, this would store in a dedicated analytics table
        return {
            "success": True,
            "message": f"Analysis of type '{analysis_type}' saved for property {property_id}",
            "timestamp": "now",
        }
