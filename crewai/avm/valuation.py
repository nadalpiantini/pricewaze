"""Property Valuation - Main AVM Interface."""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from .comparables import ComparableProperty, ComparablesFinder
from .model import AVMModel, EnsembleAVM


@dataclass
class ValuationResult:
    """Complete property valuation result."""

    property_id: str
    valuation_date: str

    # Primary estimates
    estimated_value: float
    estimated_price_per_m2: float
    confidence_score: float

    # Confidence interval
    value_range_low: float
    value_range_high: float

    # Fairness assessment
    listed_price: float
    fairness_score: float  # 0-100, lower = better for buyer
    fairness_label: str  # underpriced, fair, overpriced, significantly_overpriced
    price_deviation_percent: float

    # Comparables
    comparables: list[ComparableProperty]
    comp_based_value: float
    comp_confidence: float

    # Zone context
    zone_id: str
    zone_name: str
    zone_avg_price_m2: float
    zone_median_price_m2: float
    zone_property_count: int

    # Model details
    model_type: str
    methodology_notes: list[str] = field(default_factory=list)
    feature_importances: dict[str, float] = field(default_factory=dict)


class PropertyValuator:
    """
    Main interface for property valuation.

    Combines:
    - Comparable property analysis
    - ML model predictions
    - Zone statistics
    - Fairness assessment
    """

    def __init__(
        self,
        use_ml_model: bool = True,
        use_ensemble: bool = True,
    ):
        """
        Initialize the property valuator.

        Args:
            use_ml_model: Whether to use ML model predictions
            use_ensemble: Whether to use ensemble of methods
        """
        self.comparables_finder = ComparablesFinder(
            max_distance_km=2.0,
            min_comparables=3,
            max_comparables=8,
        )
        self.use_ml_model = use_ml_model
        self.use_ensemble = use_ensemble

        if use_ensemble:
            self.ensemble = EnsembleAVM()
        elif use_ml_model:
            self.model = AVMModel()

    def _calculate_fairness(
        self,
        listed_price: float,
        estimated_value: float,
    ) -> tuple[float, str, float]:
        """
        Calculate fairness score and label.

        Args:
            listed_price: Current listing price
            estimated_value: Estimated fair value

        Returns:
            Tuple of (score, label, deviation_percent)
        """
        if estimated_value <= 0:
            return 50, "unknown", 0

        # Calculate deviation
        deviation = (listed_price - estimated_value) / estimated_value
        deviation_percent = round(deviation * 100, 1)

        # Score: 0-100 where lower is better for buyer
        # Map deviation to score:
        # -20% or less = 0-20 (great deal)
        # -10% to -20% = 20-35 (good deal)
        # -5% to -10% = 35-45 (slight underpriced)
        # -5% to +5% = 45-55 (fair)
        # +5% to +10% = 55-65 (slight overpriced)
        # +10% to +20% = 65-80 (overpriced)
        # +20% or more = 80-100 (significantly overpriced)

        if deviation <= -0.20:
            score = max(0, 20 + (deviation + 0.20) * 100)
        elif deviation <= -0.10:
            score = 20 + (deviation + 0.20) * 150
        elif deviation <= -0.05:
            score = 35 + (deviation + 0.10) * 200
        elif deviation <= 0.05:
            score = 45 + (deviation + 0.05) * 100
        elif deviation <= 0.10:
            score = 55 + (deviation - 0.05) * 200
        elif deviation <= 0.20:
            score = 65 + (deviation - 0.10) * 150
        else:
            score = min(100, 80 + (deviation - 0.20) * 100)

        score = round(max(0, min(100, score)))

        # Determine label
        if score <= 30:
            label = "underpriced"
        elif score <= 55:
            label = "fair"
        elif score <= 75:
            label = "overpriced"
        else:
            label = "significantly_overpriced"

        return score, label, deviation_percent

    def valuate(
        self,
        property_data: dict[str, Any],
        candidate_properties: list[dict[str, Any]],
        zone_stats: dict[str, Any],
    ) -> ValuationResult:
        """
        Perform complete property valuation.

        Args:
            property_data: Subject property data including:
                - id, price, area_m2, bedrooms, bathrooms
                - latitude, longitude
                - property_type, condition
            candidate_properties: List of properties in area for comparables
            zone_stats: Zone statistics including:
                - zone_id, zone_name
                - avg_price_m2, median_price_m2
                - property_count

        Returns:
            Complete ValuationResult
        """
        methodology_notes = []

        # 1. Find comparables
        comparables = self.comparables_finder.find_comparables(
            subject=property_data,
            candidates=candidate_properties,
        )

        # 2. Get comparable-based estimate
        area_m2 = property_data.get("area_m2", 100)
        comp_value, comp_price_m2, comp_confidence = (
            self.comparables_finder.get_adjusted_value_estimate(
                comparables=comparables,
                subject_area_m2=area_m2,
            )
        )

        if len(comparables) >= 3:
            methodology_notes.append(
                f"Found {len(comparables)} comparables within search radius"
            )
        else:
            methodology_notes.append(
                f"Limited comparables ({len(comparables)}), estimate may be less reliable"
            )

        # 3. Get ML/ensemble estimate
        if self.use_ensemble:
            ensemble_result = self.ensemble.predict(
                property_data=property_data,
                comp_estimate=comp_value,
                comp_confidence=comp_confidence,
                zone_stats=zone_stats,
            )
            estimated_value = ensemble_result["ensemble_value"]
            estimated_price_m2 = ensemble_result["ensemble_price_per_m2"]
            confidence = ensemble_result["ensemble_confidence"]
            feature_importances = ensemble_result["feature_importances"]
            model_type = "ensemble"
            methodology_notes.append(
                "Using ensemble of ML model, comparables, and zone statistics"
            )

        elif self.use_ml_model:
            ml_result = self.model.predict(property_data, zone_stats)
            estimated_value = ml_result.predicted_value
            estimated_price_m2 = ml_result.predicted_price_per_m2
            confidence = ml_result.confidence_score
            feature_importances = ml_result.feature_importances
            model_type = "ml"
            methodology_notes.append("Using ML gradient boosting model")

        else:
            # Comparables-only
            estimated_value = comp_value
            estimated_price_m2 = comp_price_m2
            confidence = comp_confidence
            feature_importances = {}
            model_type = "comparables"
            methodology_notes.append("Using comparable sales approach only")

        # 4. Calculate value range
        variance_factor = 1 - confidence
        value_range_low = estimated_value * (1 - 0.15 * (1 + variance_factor))
        value_range_high = estimated_value * (1 + 0.15 * (1 + variance_factor))

        # 5. Calculate fairness
        listed_price = property_data.get("price", estimated_value)
        fairness_score, fairness_label, deviation_percent = self._calculate_fairness(
            listed_price=listed_price,
            estimated_value=estimated_value,
        )

        if fairness_label == "underpriced":
            methodology_notes.append(
                f"Property appears underpriced by {abs(deviation_percent):.1f}%"
            )
        elif fairness_label in ("overpriced", "significantly_overpriced"):
            methodology_notes.append(
                f"Property appears overpriced by {deviation_percent:.1f}%"
            )

        return ValuationResult(
            property_id=property_data.get("id", ""),
            valuation_date=datetime.now().isoformat(),
            estimated_value=estimated_value,
            estimated_price_per_m2=estimated_price_m2,
            confidence_score=confidence,
            value_range_low=round(value_range_low, 2),
            value_range_high=round(value_range_high, 2),
            listed_price=listed_price,
            fairness_score=fairness_score,
            fairness_label=fairness_label,
            price_deviation_percent=deviation_percent,
            comparables=comparables,
            comp_based_value=comp_value,
            comp_confidence=comp_confidence,
            zone_id=zone_stats.get("zone_id", ""),
            zone_name=zone_stats.get("zone_name", ""),
            zone_avg_price_m2=zone_stats.get("avg_price_m2", 0),
            zone_median_price_m2=zone_stats.get("median_price_m2", 0),
            zone_property_count=zone_stats.get("property_count", 0),
            model_type=model_type,
            methodology_notes=methodology_notes,
            feature_importances=feature_importances,
        )

    def quick_estimate(
        self,
        area_m2: float,
        zone_avg_price_m2: float,
        zone_median_price_m2: float,
        bedrooms: int = 2,
        bathrooms: int = 1,
    ) -> dict[str, Any]:
        """
        Quick estimate without full valuation.

        Args:
            area_m2: Property area in m²
            zone_avg_price_m2: Zone average price per m²
            zone_median_price_m2: Zone median price per m²
            bedrooms: Number of bedrooms
            bathrooms: Number of bathrooms

        Returns:
            Quick estimate dict
        """
        # Simple weighted estimate
        base_price_m2 = 0.4 * zone_avg_price_m2 + 0.6 * zone_median_price_m2

        # Adjustments for rooms
        room_factor = 1.0
        if bedrooms > 3:
            room_factor += 0.02 * (bedrooms - 3)
        if bathrooms > 2:
            room_factor += 0.01 * (bathrooms - 2)

        adjusted_price_m2 = base_price_m2 * room_factor
        estimated_value = adjusted_price_m2 * area_m2

        return {
            "estimated_value": round(estimated_value, 2),
            "estimated_price_per_m2": round(adjusted_price_m2, 2),
            "value_range_low": round(estimated_value * 0.85, 2),
            "value_range_high": round(estimated_value * 1.15, 2),
            "confidence": 0.5,  # Lower confidence for quick estimate
            "methodology": "quick_zone_based",
        }
