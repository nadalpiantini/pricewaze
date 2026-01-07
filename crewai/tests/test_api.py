"""Tests for FastAPI endpoints."""

import pytest
from fastapi.testclient import TestClient

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.main import app


client = TestClient(app)


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    def test_root_endpoint(self):
        """Test root endpoint returns health info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "PriceWaze CrewAI"

    def test_health_endpoint(self):
        """Test detailed health check."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "crews_available" in data


class TestPricingEndpoints:
    """Tests for pricing analysis endpoints."""

    def test_pricing_requires_property_id(self):
        """Test that pricing analysis requires property_id."""
        response = client.post("/api/v1/pricing/analyze", json={})
        assert response.status_code == 422  # Validation error

    def test_quick_pricing_requires_property_id(self):
        """Test that quick pricing requires property_id."""
        response = client.get("/api/v1/pricing/quick/")
        assert response.status_code in [404, 405]  # Not found or method not allowed


class TestNegotiationEndpoints:
    """Tests for negotiation advisory endpoints."""

    def test_buyer_advice_requires_property_id(self):
        """Test that buyer advice requires property_id."""
        response = client.post("/api/v1/negotiation/buyer-advice", json={})
        assert response.status_code == 422

    def test_seller_advice_requires_offer_amount(self):
        """Test that seller advice requires offer_amount."""
        response = client.post(
            "/api/v1/negotiation/seller-advice",
            json={"property_id": "test-123"},
        )
        assert response.status_code == 422

    def test_power_score_endpoint(self):
        """Test negotiation power score endpoint."""
        response = client.post(
            "/api/v1/negotiation/power-score",
            json={
                "property_id": "test-123",
                "days_on_market": 60,
                "price_changes": 1,
                "offer_count": 0,
                "market_trend": "stable",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "negotiation_power" in data


class TestContractEndpoints:
    """Tests for contract generation endpoints."""

    def test_contract_requires_all_fields(self):
        """Test that contract generation validates required fields."""
        response = client.post("/api/v1/contracts/generate", json={})
        assert response.status_code == 422

    def test_validate_terms_endpoint(self):
        """Test contract terms validation."""
        response = client.post(
            "/api/v1/contracts/validate-terms",
            json={
                "agreed_price": 180000,
                "property_price": 200000,
                "deposit_percent": 10,
                "closing_days": 30,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "validation" in data

    def test_template_info_endpoint(self):
        """Test template info endpoint."""
        response = client.get("/api/v1/contracts/template-info")
        assert response.status_code == 200
        data = response.json()
        assert "standard_terms" in data
        assert "disclaimer" in data


class TestAnalysisEndpoints:
    """Tests for full analysis endpoints."""

    def test_full_analysis_requires_property_id(self):
        """Test that full analysis requires property_id."""
        response = client.post("/api/v1/analysis/full", json={})
        assert response.status_code == 422

    def test_contract_generation_requires_names(self):
        """Test that contract generation requires buyer and seller names."""
        response = client.post(
            "/api/v1/analysis/full",
            json={
                "property_id": "test-123",
                "generate_contract": True,
            },
        )
        assert response.status_code == 400

    def test_capabilities_endpoint(self):
        """Test capabilities endpoint."""
        response = client.get("/api/v1/analysis/capabilities")
        assert response.status_code == 200
        data = response.json()
        assert "crews_available" in data
        assert "quick_endpoints" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
