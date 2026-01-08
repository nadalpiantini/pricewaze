"""AVM Model - Machine Learning Property Valuation Model."""

import pickle
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

# Try to import sklearn, fallback to basic stats if not available
try:
    from sklearn.ensemble import GradientBoostingRegressor
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


@dataclass
class PredictionResult:
    """Result of an AVM prediction."""

    predicted_value: float
    predicted_price_per_m2: float
    confidence_interval_low: float
    confidence_interval_high: float
    confidence_score: float
    features_used: list[str]
    feature_importances: dict[str, float]


class AVMModel:
    """
    Automated Valuation Model using Gradient Boosting.

    Features:
    - Feature engineering for real estate properties
    - Confidence interval estimation
    - Feature importance analysis
    - Model persistence

    Inspired by OpenAVMKit's approach to property valuation.
    """

    # Core features used by the model
    FEATURE_NAMES = [
        "area_m2",
        "bedrooms",
        "bathrooms",
        "parking_spaces",
        "floor",
        "age_years",
        "zone_avg_price_m2",
        "zone_median_price_m2",
        "distance_to_center_km",
        "property_type_encoded",
        "condition_encoded",
    ]

    def __init__(self, model_path: Path | str | None = None):
        """
        Initialize the AVM model.

        Args:
            model_path: Path to load pre-trained model from
        """
        self.model = None
        self.scaler = None
        self.feature_names = self.FEATURE_NAMES.copy()
        self.is_fitted = False

        if model_path:
            self.load(model_path)
        elif SKLEARN_AVAILABLE:
            self._initialize_model()

    def _initialize_model(self) -> None:
        """Initialize the gradient boosting model."""
        if not SKLEARN_AVAILABLE:
            return

        self.model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            min_samples_split=5,
            min_samples_leaf=2,
            subsample=0.8,
            random_state=42,
        )
        self.scaler = StandardScaler()

    def _encode_property_type(self, property_type: str | None) -> int:
        """Encode property type to numeric value."""
        type_map = {
            "apartment": 1,
            "house": 2,
            "penthouse": 3,
            "studio": 0,
            "townhouse": 2,
            "villa": 4,
            "commercial": 5,
            "land": 6,
        }
        return type_map.get(str(property_type).lower(), 1)

    def _encode_condition(self, condition: str | int | None) -> int:
        """Encode condition to numeric value."""
        if isinstance(condition, int):
            return min(max(condition, 1), 5)

        condition_map = {
            "poor": 1,
            "fair": 2,
            "good": 3,
            "very_good": 4,
            "excellent": 5,
            "new": 5,
        }
        return condition_map.get(str(condition).lower(), 3)

    def extract_features(
        self,
        property_data: dict[str, Any],
        zone_stats: dict[str, Any] | None = None,
    ) -> np.ndarray:
        """
        Extract features from property data for model input.

        Args:
            property_data: Property attributes dictionary
            zone_stats: Zone-level statistics (optional)

        Returns:
            Feature array for model input
        """
        zone_stats = zone_stats or {}

        features = [
            property_data.get("area_m2", 100),
            property_data.get("bedrooms", 2),
            property_data.get("bathrooms", 1),
            property_data.get("parking_spaces", 1),
            property_data.get("floor", 1),
            property_data.get("age_years", 10),
            zone_stats.get("avg_price_m2", 2000),
            zone_stats.get("median_price_m2", 1800),
            property_data.get("distance_to_center_km", 5),
            self._encode_property_type(property_data.get("property_type")),
            self._encode_condition(property_data.get("condition")),
        ]

        return np.array(features).reshape(1, -1)

    def fit(
        self,
        properties: list[dict[str, Any]],
        prices: list[float],
        zone_stats_map: dict[str, dict[str, Any]] | None = None,
    ) -> "AVMModel":
        """
        Train the AVM model on historical data.

        Args:
            properties: List of property data dictionaries
            prices: Corresponding sale prices
            zone_stats_map: Zone statistics by zone_id

        Returns:
            Self for method chaining
        """
        if not SKLEARN_AVAILABLE:
            raise RuntimeError("scikit-learn required for model training")

        zone_stats_map = zone_stats_map or {}

        # Extract features for all properties
        feature_matrix = []
        for prop in properties:
            zone_id = prop.get("zone_id", "")
            zone_stats = zone_stats_map.get(zone_id, {})
            features = self.extract_features(prop, zone_stats)
            feature_matrix.append(features.flatten())

        feature_array = np.array(feature_matrix)
        target_prices = np.array(prices)

        # Scale features
        scaled_features = self.scaler.fit_transform(feature_array)

        # Train model
        self.model.fit(scaled_features, target_prices)
        self.is_fitted = True

        return self

    def predict(
        self,
        property_data: dict[str, Any],
        zone_stats: dict[str, Any] | None = None,
    ) -> PredictionResult:
        """
        Predict property value with confidence interval.

        Args:
            property_data: Property attributes
            zone_stats: Zone-level statistics

        Returns:
            PredictionResult with value and confidence
        """
        features = self.extract_features(property_data, zone_stats)
        area_m2 = property_data.get("area_m2", 100)

        if self.is_fitted and SKLEARN_AVAILABLE:
            # Use trained model
            scaled_features = self.scaler.transform(features)
            predicted_value = self.model.predict(scaled_features)[0]

            # Estimate confidence interval using tree variance
            predictions = []
            for tree in self.model.estimators_:
                pred = tree[0].predict(scaled_features)[0]
                predictions.append(pred)

            std_dev = np.std(predictions)
            ci_low = predicted_value - 1.96 * std_dev
            ci_high = predicted_value + 1.96 * std_dev

            # Get feature importances
            importances = dict(
                zip(self.feature_names, self.model.feature_importances_)
            )

            # Confidence based on prediction variance
            cv = std_dev / predicted_value if predicted_value > 0 else 1
            confidence = max(0, min(1, 1 - cv))

        else:
            # Fallback: Use zone stats for estimation
            zone_avg = zone_stats.get("avg_price_m2", 2000) if zone_stats else 2000
            zone_median = zone_stats.get("median_price_m2", zone_avg) if zone_stats else zone_avg

            # Simple weighted estimate
            predicted_price_m2 = 0.4 * zone_avg + 0.6 * zone_median
            predicted_value = predicted_price_m2 * area_m2

            # Simple confidence interval (±15%)
            ci_low = predicted_value * 0.85
            ci_high = predicted_value * 1.15

            # Default importances
            importances = {name: 0.1 for name in self.feature_names}
            importances["zone_avg_price_m2"] = 0.3
            importances["area_m2"] = 0.2

            confidence = 0.6  # Lower confidence for fallback

        predicted_price_m2 = predicted_value / area_m2 if area_m2 > 0 else 0

        return PredictionResult(
            predicted_value=round(predicted_value, 2),
            predicted_price_per_m2=round(predicted_price_m2, 2),
            confidence_interval_low=round(max(0, ci_low), 2),
            confidence_interval_high=round(ci_high, 2),
            confidence_score=round(confidence, 3),
            features_used=self.feature_names,
            feature_importances={k: round(v, 4) for k, v in importances.items()},
        )

    def save(self, path: Path | str) -> None:
        """Save model to disk."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)

        state = {
            "model": self.model,
            "scaler": self.scaler,
            "feature_names": self.feature_names,
            "is_fitted": self.is_fitted,
        }

        with open(path, "wb") as f:
            pickle.dump(state, f)

    def load(self, path: Path | str) -> "AVMModel":
        """Load model from disk."""
        path = Path(path)

        with open(path, "rb") as f:
            state = pickle.load(f)

        self.model = state["model"]
        self.scaler = state["scaler"]
        self.feature_names = state["feature_names"]
        self.is_fitted = state["is_fitted"]

        return self


class EnsembleAVM:
    """
    Ensemble AVM combining multiple valuation approaches.

    Combines:
    - ML model predictions
    - Comparable-based valuations
    - Zone statistics
    """

    def __init__(
        self,
        ml_weight: float = 0.4,
        comp_weight: float = 0.4,
        zone_weight: float = 0.2,
    ):
        """
        Initialize ensemble with component weights.

        Args:
            ml_weight: Weight for ML model prediction
            comp_weight: Weight for comparable-based estimate
            zone_weight: Weight for zone statistics estimate
        """
        self.ml_weight = ml_weight
        self.comp_weight = comp_weight
        self.zone_weight = zone_weight

        self.ml_model = AVMModel()

    def predict(
        self,
        property_data: dict[str, Any],
        comp_estimate: float,
        comp_confidence: float,
        zone_stats: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Generate ensemble prediction.

        Args:
            property_data: Property attributes
            comp_estimate: Estimate from comparable analysis
            comp_confidence: Confidence in comparable estimate
            zone_stats: Zone-level statistics

        Returns:
            Combined prediction with confidence
        """
        area_m2 = property_data.get("area_m2", 100)

        # ML model prediction
        ml_result = self.ml_model.predict(property_data, zone_stats)

        # Zone-based estimate
        zone_avg = zone_stats.get("avg_price_m2", 2000)
        zone_estimate = zone_avg * area_m2

        # Adjust weights based on confidences
        ml_conf = ml_result.confidence_score
        zone_conf = 0.5  # Fixed confidence for zone average

        # Normalize weights
        total_conf = (
            self.ml_weight * ml_conf
            + self.comp_weight * comp_confidence
            + self.zone_weight * zone_conf
        )

        if total_conf > 0:
            adj_ml_weight = (self.ml_weight * ml_conf) / total_conf
            adj_comp_weight = (self.comp_weight * comp_confidence) / total_conf
            adj_zone_weight = (self.zone_weight * zone_conf) / total_conf
        else:
            adj_ml_weight = self.ml_weight
            adj_comp_weight = self.comp_weight
            adj_zone_weight = self.zone_weight

        # Weighted ensemble prediction
        ensemble_value = (
            adj_ml_weight * ml_result.predicted_value
            + adj_comp_weight * comp_estimate
            + adj_zone_weight * zone_estimate
        )

        # Ensemble confidence
        ensemble_confidence = (
            adj_ml_weight * ml_conf
            + adj_comp_weight * comp_confidence
            + adj_zone_weight * zone_conf
        )

        return {
            "ensemble_value": round(ensemble_value, 2),
            "ensemble_price_per_m2": round(ensemble_value / area_m2, 2),
            "ensemble_confidence": round(ensemble_confidence, 3),
            "components": {
                "ml_value": ml_result.predicted_value,
                "ml_confidence": ml_conf,
                "ml_weight": round(adj_ml_weight, 3),
                "comp_value": comp_estimate,
                "comp_confidence": comp_confidence,
                "comp_weight": round(adj_comp_weight, 3),
                "zone_value": zone_estimate,
                "zone_confidence": zone_conf,
                "zone_weight": round(adj_zone_weight, 3),
            },
            "feature_importances": ml_result.feature_importances,
        }
