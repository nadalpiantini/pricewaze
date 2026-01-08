"""AVM Tool for CrewAI - Automated Valuation Model Integration."""


from crewai_tools import BaseTool
from pydantic import BaseModel, Field

from avm import PropertyValuator


class AVMValuationInput(BaseModel):
    """Input schema for AVM valuation tool."""

    property_id: str = Field(..., description="Property ID to valuate")
    price: float = Field(..., description="Current listing price")
    area_m2: float = Field(..., description="Property area in square meters")
    bedrooms: int = Field(2, description="Number of bedrooms")
    bathrooms: int = Field(1, description="Number of bathrooms")
    latitude: float = Field(..., description="Property latitude")
    longitude: float = Field(..., description="Property longitude")
    property_type: str = Field("apartment", description="Property type")
    condition: int = Field(3, description="Condition grade 1-5")
    zone_id: str = Field("", description="Zone ID for context")
    zone_name: str = Field("", description="Zone name")
    zone_avg_price_m2: float = Field(2000, description="Zone average price/m²")
    zone_median_price_m2: float = Field(1800, description="Zone median price/m²")
    zone_property_count: int = Field(50, description="Number of properties in zone")


class AVMValuationTool(BaseTool):
    """
    Automated Valuation Model Tool for property valuation.

    Uses ensemble of ML model, comparable analysis, and zone statistics
    to estimate property fair market value with confidence intervals.
    """

    name: str = "avm_valuation"
    description: str = (
        "Performs automated property valuation using machine learning and comparable "
        "sales analysis. Returns estimated fair value, confidence interval, fairness "
        "score, and methodology notes. Use when you need an objective property valuation "
        "based on data-driven methods."
    )
    args_schema: type[BaseModel] = AVMValuationInput

    def _run(
        self,
        property_id: str,
        price: float,
        area_m2: float,
        bedrooms: int = 2,
        bathrooms: int = 1,
        latitude: float = 0,
        longitude: float = 0,
        property_type: str = "apartment",
        condition: int = 3,
        zone_id: str = "",
        zone_name: str = "",
        zone_avg_price_m2: float = 2000,
        zone_median_price_m2: float = 1800,
        zone_property_count: int = 50,
    ) -> str:
        """Run the AVM valuation tool."""
        valuator = PropertyValuator(use_ensemble=True)

        property_data = {
            "id": property_id,
            "price": price,
            "area_m2": area_m2,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "latitude": latitude,
            "longitude": longitude,
            "property_type": property_type,
            "condition": condition,
        }

        zone_stats = {
            "zone_id": zone_id,
            "zone_name": zone_name,
            "avg_price_m2": zone_avg_price_m2,
            "median_price_m2": zone_median_price_m2,
            "property_count": zone_property_count,
        }

        # Note: In production, candidate_properties would come from database
        # For now, use empty list (relies on zone stats and ML model)
        result = valuator.valuate(
            property_data=property_data,
            candidate_properties=[],  # Would be fetched from Supabase
            zone_stats=zone_stats,
        )

        return (
            f"AVM VALUATION RESULT for Property {result.property_id}\n"
            f"{'=' * 50}\n\n"
            f"ESTIMATED VALUE: ${result.estimated_value:,.0f}\n"
            f"Price per m²: ${result.estimated_price_per_m2:,.0f}/m²\n"
            f"Confidence: {result.confidence_score:.0%}\n\n"
            f"VALUE RANGE:\n"
            f"  Low: ${result.value_range_low:,.0f}\n"
            f"  High: ${result.value_range_high:,.0f}\n\n"
            f"FAIRNESS ASSESSMENT:\n"
            f"  Listed Price: ${result.listed_price:,.0f}\n"
            f"  Fairness Score: {result.fairness_score}/100\n"
            f"  Label: {result.fairness_label.upper()}\n"
            f"  Price Deviation: {result.price_deviation_percent:+.1f}%\n\n"
            f"ZONE CONTEXT ({result.zone_name}):\n"
            f"  Avg Price/m²: ${result.zone_avg_price_m2:,.0f}\n"
            f"  Median Price/m²: ${result.zone_median_price_m2:,.0f}\n"
            f"  Properties in Zone: {result.zone_property_count}\n\n"
            f"METHODOLOGY:\n"
            f"  Model: {result.model_type}\n"
            + "\n".join(f"  - {note}" for note in result.methodology_notes)
        )


class ComparablesInput(BaseModel):
    """Input schema for comparables search tool."""

    property_id: str = Field(..., description="Subject property ID")
    area_m2: float = Field(..., description="Property area in m²")
    bedrooms: int = Field(2, description="Number of bedrooms")
    bathrooms: int = Field(1, description="Number of bathrooms")
    latitude: float = Field(..., description="Property latitude")
    longitude: float = Field(..., description="Property longitude")
    property_type: str = Field("apartment", description="Property type")
    max_distance_km: float = Field(2.0, description="Max search radius in km")


class ComparablesSearchTool(BaseTool):
    """
    Tool to find comparable properties for valuation.

    Searches for similar properties based on location and features,
    calculates adjustments, and returns adjusted values.
    """

    name: str = "find_comparables"
    description: str = (
        "Finds comparable properties for valuation analysis. Returns list of similar "
        "properties with distance, feature similarity, adjustments, and adjusted prices. "
        "Use when you need to support a valuation with comparable sales data."
    )
    args_schema: type[BaseModel] = ComparablesInput

    def _run(
        self,
        property_id: str,
        area_m2: float,
        bedrooms: int = 2,
        bathrooms: int = 1,
        latitude: float = 0,
        longitude: float = 0,
        property_type: str = "apartment",
        max_distance_km: float = 2.0,
    ) -> str:
        """Run the comparables search tool."""
        # Note: In production, use ComparablesFinder with Supabase data:
        # finder = ComparablesFinder(max_distance_km=max_distance_km)
        # comparables = finder.find_comparables(subject, candidates)
        return (
            f"COMPARABLE SEARCH for Property {property_id}\n"
            f"{'=' * 50}\n\n"
            f"Search Parameters:\n"
            f"  Location: ({latitude:.4f}, {longitude:.4f})\n"
            f"  Max Distance: {max_distance_km} km\n"
            f"  Target Area: {area_m2} m²\n"
            f"  Rooms: {bedrooms}BR / {bathrooms}BA\n"
            f"  Type: {property_type}\n\n"
            f"Methodology:\n"
            f"  - Spatial search using Haversine distance\n"
            f"  - Feature similarity scoring (area, rooms, type, condition)\n"
            f"  - Price adjustments for property differences\n"
            f"  - Overall similarity = 40% distance + 60% features\n\n"
            f"Note: Connect to Supabase to fetch actual comparable properties.\n"
            f"Query: SELECT * FROM pricewaze_properties WHERE zone_id = [zone]\n"
            f"       AND ST_DWithin(location, point, {max_distance_km * 1000}m)"
        )


class QuickEstimateInput(BaseModel):
    """Input schema for quick estimate tool."""

    area_m2: float = Field(..., description="Property area in m²")
    zone_avg_price_m2: float = Field(..., description="Zone average price/m²")
    zone_median_price_m2: float = Field(..., description="Zone median price/m²")
    bedrooms: int = Field(2, description="Number of bedrooms")
    bathrooms: int = Field(1, description="Number of bathrooms")


class QuickEstimateTool(BaseTool):
    """
    Quick property estimate without full AVM analysis.

    Useful for rapid estimates when detailed data is not available.
    """

    name: str = "quick_estimate"
    description: str = (
        "Provides a quick property value estimate based on area and zone statistics. "
        "Less accurate than full AVM but faster. Use for initial screening or when "
        "detailed property data is unavailable."
    )
    args_schema: type[BaseModel] = QuickEstimateInput

    def _run(
        self,
        area_m2: float,
        zone_avg_price_m2: float,
        zone_median_price_m2: float,
        bedrooms: int = 2,
        bathrooms: int = 1,
    ) -> str:
        """Run the quick estimate tool."""
        valuator = PropertyValuator()

        result = valuator.quick_estimate(
            area_m2=area_m2,
            zone_avg_price_m2=zone_avg_price_m2,
            zone_median_price_m2=zone_median_price_m2,
            bedrooms=bedrooms,
            bathrooms=bathrooms,
        )

        return (
            f"QUICK ESTIMATE\n"
            f"{'=' * 30}\n\n"
            f"Property: {area_m2} m², {bedrooms}BR/{bathrooms}BA\n\n"
            f"Estimated Value: ${result['estimated_value']:,.0f}\n"
            f"Price per m²: ${result['estimated_price_per_m2']:,.0f}\n\n"
            f"Value Range:\n"
            f"  Low: ${result['value_range_low']:,.0f}\n"
            f"  High: ${result['value_range_high']:,.0f}\n\n"
            f"Confidence: {result['confidence']:.0%}\n"
            f"Method: {result['methodology']}\n\n"
            f"Note: This is a simplified estimate. Use full AVM for accurate valuation."
        )
