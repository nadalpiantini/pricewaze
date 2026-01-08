"""Comparable Property Search - Spatial + Feature Similarity."""

import math
from dataclasses import dataclass, field
from typing import Any

import numpy as np


@dataclass
class ComparableProperty:
    """A comparable property with similarity scores."""

    property_id: str
    price: float
    price_per_m2: float
    area_m2: float
    bedrooms: int
    bathrooms: int
    latitude: float
    longitude: float
    distance_km: float
    feature_similarity: float
    overall_similarity: float
    adjustments: dict[str, float] = field(default_factory=dict)
    adjusted_price_per_m2: float = 0.0


class ComparablesFinder:
    """
    Find comparable properties using spatial proximity and feature similarity.

    Implements OpenAVMKit-style comparable search:
    - Spatial proximity using Haversine distance
    - Feature similarity using weighted Euclidean distance
    - Adjustments for property differences
    """

    # Feature weights for similarity calculation
    DEFAULT_WEIGHTS = {
        "area_m2": 0.25,
        "bedrooms": 0.15,
        "bathrooms": 0.15,
        "property_type": 0.20,
        "condition": 0.15,
        "age": 0.10,
    }

    # Adjustment factors per unit difference
    ADJUSTMENT_FACTORS = {
        "bedroom": 0.03,  # 3% per bedroom difference
        "bathroom": 0.02,  # 2% per bathroom difference
        "area_per_10m2": 0.005,  # 0.5% per 10m² difference
        "age_per_year": 0.005,  # 0.5% per year difference
        "condition_grade": 0.05,  # 5% per condition grade
    }

    def __init__(
        self,
        max_distance_km: float = 2.0,
        min_comparables: int = 3,
        max_comparables: int = 10,
        weights: dict[str, float] | None = None,
    ):
        """
        Initialize the comparables finder.

        Args:
            max_distance_km: Maximum search radius in kilometers
            min_comparables: Minimum number of comparables to find
            max_comparables: Maximum number of comparables to return
            weights: Custom feature weights
        """
        self.max_distance_km = max_distance_km
        self.min_comparables = min_comparables
        self.max_comparables = max_comparables
        self.weights = weights or self.DEFAULT_WEIGHTS

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate the great circle distance between two points on Earth.

        Args:
            lat1, lon1: Latitude and longitude of first point
            lat2, lon2: Latitude and longitude of second point

        Returns:
            Distance in kilometers
        """
        earth_radius_km = 6371

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_lat / 2) ** 2
            + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return earth_radius_km * c

    def calculate_feature_similarity(
        self,
        subject: dict[str, Any],
        comp: dict[str, Any],
    ) -> float:
        """
        Calculate feature similarity between subject and comparable.

        Uses weighted Euclidean distance normalized to 0-1 scale.

        Args:
            subject: Subject property features
            comp: Comparable property features

        Returns:
            Similarity score 0-1 (1 = identical)
        """
        total_weight = 0
        weighted_diff = 0

        # Numeric features
        for feature, weight in self.weights.items():
            if feature in subject and feature in comp:
                subj_val = subject.get(feature, 0)
                comp_val = comp.get(feature, 0)

                if feature == "property_type":
                    # Categorical: 1 if same, 0 if different
                    diff = 0 if subj_val == comp_val else 1
                elif feature in ("area_m2",):
                    # Normalize area difference (assume max diff is 200m²)
                    diff = min(abs(subj_val - comp_val) / 200, 1)
                elif feature in ("bedrooms", "bathrooms"):
                    # Normalize room difference (assume max diff is 4)
                    diff = min(abs(subj_val - comp_val) / 4, 1)
                elif feature == "age":
                    # Normalize age difference (assume max diff is 30 years)
                    diff = min(abs(subj_val - comp_val) / 30, 1)
                elif feature == "condition":
                    # Normalize condition (1-5 scale, max diff is 4)
                    diff = min(abs(subj_val - comp_val) / 4, 1)
                else:
                    diff = 0

                weighted_diff += weight * diff
                total_weight += weight

        if total_weight == 0:
            return 0.5  # Default if no features available

        # Convert distance to similarity (1 - normalized distance)
        return 1 - (weighted_diff / total_weight)

    def calculate_adjustments(
        self,
        subject: dict[str, Any],
        comp: dict[str, Any],
        comp_price_per_m2: float,
    ) -> tuple[dict[str, float], float]:
        """
        Calculate price adjustments for property differences.

        Args:
            subject: Subject property features
            comp: Comparable property features
            comp_price_per_m2: Comparable's price per m²

        Returns:
            Tuple of (adjustments dict, adjusted price per m²)
        """
        adjustments: dict[str, float] = {}
        total_adjustment = 1.0

        # Bedroom adjustment
        subj_beds = subject.get("bedrooms", 0)
        comp_beds = comp.get("bedrooms", 0)
        if subj_beds and comp_beds:
            bed_diff = subj_beds - comp_beds
            adj = bed_diff * self.ADJUSTMENT_FACTORS["bedroom"]
            if adj != 0:
                adjustments["bedrooms"] = adj
                total_adjustment += adj

        # Bathroom adjustment
        subj_baths = subject.get("bathrooms", 0)
        comp_baths = comp.get("bathrooms", 0)
        if subj_baths and comp_baths:
            bath_diff = subj_baths - comp_baths
            adj = bath_diff * self.ADJUSTMENT_FACTORS["bathroom"]
            if adj != 0:
                adjustments["bathrooms"] = adj
                total_adjustment += adj

        # Area adjustment (per 10m² difference)
        subj_area = subject.get("area_m2", 0)
        comp_area = comp.get("area_m2", 0)
        if subj_area and comp_area:
            area_diff = (subj_area - comp_area) / 10
            adj = area_diff * self.ADJUSTMENT_FACTORS["area_per_10m2"]
            if abs(adj) > 0.001:
                adjustments["area"] = round(adj, 4)
                total_adjustment += adj

        # Condition adjustment
        subj_cond = subject.get("condition", 3)
        comp_cond = comp.get("condition", 3)
        cond_diff = subj_cond - comp_cond
        if cond_diff != 0:
            adj = cond_diff * self.ADJUSTMENT_FACTORS["condition_grade"]
            adjustments["condition"] = adj
            total_adjustment += adj

        adjusted_price = comp_price_per_m2 * total_adjustment
        return adjustments, adjusted_price

    def find_comparables(
        self,
        subject: dict[str, Any],
        candidates: list[dict[str, Any]],
        expand_radius: bool = True,
    ) -> list[ComparableProperty]:
        """
        Find comparable properties for the subject property.

        Args:
            subject: Subject property with features and location
            candidates: List of candidate properties from database
            expand_radius: Whether to expand search radius if not enough found

        Returns:
            List of comparable properties sorted by overall similarity
        """
        subj_lat = subject.get("latitude", 0)
        subj_lon = subject.get("longitude", 0)

        comparables: list[ComparableProperty] = []
        search_radius = self.max_distance_km

        while len(comparables) < self.min_comparables and search_radius <= 10:
            comparables = []

            for cand in candidates:
                # Skip if same property
                if cand.get("id") == subject.get("id"):
                    continue

                cand_lat = cand.get("latitude", 0)
                cand_lon = cand.get("longitude", 0)

                # Calculate distance
                distance = self.haversine_distance(
                    subj_lat, subj_lon, cand_lat, cand_lon
                )

                if distance > search_radius:
                    continue

                # Calculate feature similarity
                feature_sim = self.calculate_feature_similarity(subject, cand)

                # Calculate overall similarity (weighted combination)
                # Distance weight: closer is better (inverse distance)
                distance_sim = max(0, 1 - (distance / search_radius))

                # Overall: 40% distance, 60% features
                overall_sim = 0.4 * distance_sim + 0.6 * feature_sim

                # Calculate adjustments
                comp_price_per_m2 = cand.get("price_per_m2", 0)
                adjustments, adjusted_price = self.calculate_adjustments(
                    subject, cand, comp_price_per_m2
                )

                comparables.append(
                    ComparableProperty(
                        property_id=cand.get("id", ""),
                        price=cand.get("price", 0),
                        price_per_m2=comp_price_per_m2,
                        area_m2=cand.get("area_m2", 0),
                        bedrooms=cand.get("bedrooms", 0),
                        bathrooms=cand.get("bathrooms", 0),
                        latitude=cand_lat,
                        longitude=cand_lon,
                        distance_km=round(distance, 2),
                        feature_similarity=round(feature_sim, 3),
                        overall_similarity=round(overall_sim, 3),
                        adjustments=adjustments,
                        adjusted_price_per_m2=round(adjusted_price, 2),
                    )
                )

            if not expand_radius:
                break

            search_radius += 1  # Expand by 1km if needed

        # Sort by overall similarity (descending)
        comparables.sort(key=lambda x: x.overall_similarity, reverse=True)

        return comparables[: self.max_comparables]

    def get_adjusted_value_estimate(
        self,
        comparables: list[ComparableProperty],
        subject_area_m2: float,
    ) -> tuple[float, float, float]:
        """
        Calculate value estimate from adjusted comparables.

        Uses weighted average where weights are based on similarity scores.

        Args:
            comparables: List of comparable properties
            subject_area_m2: Subject property area in m²

        Returns:
            Tuple of (estimated_value, price_per_m2, confidence)
        """
        if not comparables:
            return 0, 0, 0

        # Calculate weighted average of adjusted prices
        total_weight = 0
        weighted_sum = 0

        for comp in comparables:
            weight = comp.overall_similarity ** 2  # Square to emphasize closer matches
            weighted_sum += weight * comp.adjusted_price_per_m2
            total_weight += weight

        if total_weight == 0:
            return 0, 0, 0

        avg_price_per_m2 = weighted_sum / total_weight
        estimated_value = avg_price_per_m2 * subject_area_m2

        # Calculate confidence based on:
        # - Number of comparables
        # - Average similarity
        # - Price variance
        num_factor = min(len(comparables) / self.min_comparables, 1.0)
        sim_factor = np.mean([c.overall_similarity for c in comparables])

        prices = [c.adjusted_price_per_m2 for c in comparables]
        if len(prices) > 1:
            cv = np.std(prices) / np.mean(prices)  # Coefficient of variation
            variance_factor = max(0, 1 - cv)  # Lower variance = higher confidence
        else:
            variance_factor = 0.5

        confidence = 0.3 * num_factor + 0.4 * sim_factor + 0.3 * variance_factor

        return round(estimated_value, 2), round(avg_price_per_m2, 2), round(confidence, 3)
