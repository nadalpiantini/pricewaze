"""Tests for CrewAI tools."""

import pytest
from tools.analysis_tools import (
    CalculatePriceStatsTool,
    ComparePropertyPricesTool,
    CalculateNegotiationPowerTool,
)
from tools.contract_tools import (
    GenerateContractTemplateTool,
    ValidateContractTermsTool,
)


class TestCalculatePriceStatsTool:
    """Tests for price statistics calculation tool."""

    def test_basic_statistics(self):
        """Test basic price statistics calculation."""
        tool = CalculatePriceStatsTool()
        result = tool._run(prices=[100000, 150000, 200000, 250000, 300000])

        assert result["success"] is True
        stats = result["statistics"]
        assert stats["count"] == 5
        assert stats["mean"] == 200000
        assert stats["min"] == 100000
        assert stats["max"] == 300000

    def test_empty_prices(self):
        """Test handling of empty price list."""
        tool = CalculatePriceStatsTool()
        result = tool._run(prices=[])

        assert result["success"] is False
        assert "error" in result

    def test_with_areas(self):
        """Test price per m² calculation with areas."""
        tool = CalculatePriceStatsTool()
        result = tool._run(
            prices=[100000, 200000],
            areas=[100, 200],
        )

        assert result["success"] is True
        assert "price_per_m2" in result["statistics"]
        # Both should be 1000 USD/m²
        assert result["statistics"]["price_per_m2"]["mean"] == 1000


class TestComparePropertyPricesTool:
    """Tests for property price comparison tool."""

    def test_fair_pricing(self):
        """Test comparison when property is fairly priced."""
        tool = ComparePropertyPricesTool()
        result = tool._run(
            target_price=200000,
            target_area=200,  # 1000 USD/m²
            comparable_prices=[180000, 200000, 220000],
            comparable_areas=[180, 200, 220],  # All 1000 USD/m²
        )

        assert result["success"] is True
        comparison = result["comparison"]
        assert comparison["fairness_label"] == "fair"
        assert 40 <= comparison["fairness_score"] <= 60

    def test_overpriced_property(self):
        """Test detection of overpriced property."""
        tool = ComparePropertyPricesTool()
        result = tool._run(
            target_price=300000,
            target_area=200,  # 1500 USD/m²
            comparable_prices=[180000, 200000, 220000],
            comparable_areas=[180, 200, 220],  # 1000 USD/m²
        )

        assert result["success"] is True
        comparison = result["comparison"]
        assert comparison["fairness_label"] in ["overpriced", "significantly_overpriced"]

    def test_underpriced_property(self):
        """Test detection of underpriced property."""
        tool = ComparePropertyPricesTool()
        result = tool._run(
            target_price=160000,
            target_area=200,  # 800 USD/m²
            comparable_prices=[180000, 200000, 220000],
            comparable_areas=[180, 200, 220],  # 1000 USD/m²
        )

        assert result["success"] is True
        comparison = result["comparison"]
        assert comparison["fairness_label"] == "underpriced"
        assert comparison["fairness_score"] > 60


class TestCalculateNegotiationPowerTool:
    """Tests for negotiation power calculation tool."""

    def test_high_buyer_power(self):
        """Test high buyer negotiation power scenario."""
        tool = CalculateNegotiationPowerTool()
        result = tool._run(
            days_on_market=150,
            price_changes=3,
            offer_count=0,
            market_trend="cold",
            price_deviation_percent=20,
        )

        assert result["success"] is True
        power = result["negotiation_power"]
        assert power["score"] >= 70
        assert power["label"] == "strong"

    def test_low_buyer_power(self):
        """Test low buyer negotiation power scenario."""
        tool = CalculateNegotiationPowerTool()
        result = tool._run(
            days_on_market=5,
            price_changes=0,
            offer_count=5,
            market_trend="hot",
            price_deviation_percent=-10,
        )

        assert result["success"] is True
        power = result["negotiation_power"]
        assert power["score"] <= 40
        assert power["label"] == "weak"

    def test_factors_present(self):
        """Test that all factors are included."""
        tool = CalculateNegotiationPowerTool()
        result = tool._run(
            days_on_market=60,
            price_changes=1,
            offer_count=1,
            market_trend="stable",
        )

        assert result["success"] is True
        factors = result["negotiation_power"]["factors"]
        assert len(factors) == 5
        factor_names = [f["factor"] for f in factors]
        assert "Days on Market" in factor_names
        assert "Price Reductions" in factor_names
        assert "Buyer Competition" in factor_names


class TestValidateContractTermsTool:
    """Tests for contract terms validation tool."""

    def test_valid_terms(self):
        """Test validation of standard terms."""
        tool = ValidateContractTermsTool()
        result = tool._run(
            agreed_price=180000,
            property_price=200000,
            deposit_percent=10,
            closing_days=30,
        )

        assert result["success"] is True
        validation = result["validation"]
        assert validation["is_valid"] is True
        assert len(validation["issues"]) == 0

    def test_low_deposit_warning(self):
        """Test warning for low deposit percentage."""
        tool = ValidateContractTermsTool()
        result = tool._run(
            agreed_price=180000,
            property_price=200000,
            deposit_percent=3,
            closing_days=30,
        )

        assert result["success"] is True
        validation = result["validation"]
        assert validation["is_valid"] is False
        assert any(i["field"] == "deposit_percent" for i in validation["issues"])

    def test_high_discount_warning(self):
        """Test warning for high price discount."""
        tool = ValidateContractTermsTool()
        result = tool._run(
            agreed_price=140000,  # 30% discount
            property_price=200000,
            deposit_percent=10,
            closing_days=30,
        )

        assert result["success"] is True
        validation = result["validation"]
        assert any(w["field"] == "agreed_price" for w in validation["warnings"])


class TestGenerateContractTemplateTool:
    """Tests for contract template generation tool."""

    def test_basic_contract_generation(self):
        """Test basic contract generation."""
        from tools.contract_tools import ContractParty, PropertyDetails

        tool = GenerateContractTemplateTool()
        result = tool._run(
            buyer=ContractParty(name="Juan Buyer"),
            seller=ContractParty(name="Maria Seller"),
            property_details=PropertyDetails(
                address="Calle 1, Santo Domingo",
                description="Apartamento de 2 habitaciones",
                area_m2=100,
            ),
            agreed_price=200000,
            deposit_percent=10,
            closing_days=30,
        )

        assert result["success"] is True
        contract = result["contract"]
        assert "Juan Buyer" in contract["content"]
        assert "Maria Seller" in contract["content"]
        assert "200,000" in contract["content"]
        assert contract["terms"]["deposit_amount"] == 20000

    def test_contract_includes_disclaimer(self):
        """Test that contract includes legal disclaimer."""
        from tools.contract_tools import ContractParty, PropertyDetails

        tool = GenerateContractTemplateTool()
        result = tool._run(
            buyer=ContractParty(name="Test Buyer"),
            seller=ContractParty(name="Test Seller"),
            property_details=PropertyDetails(
                address="Test Address",
                description="Test Property",
            ),
            agreed_price=100000,
        )

        assert result["success"] is True
        assert "AVISO LEGAL" in result["contract"]["disclaimer"]
        assert "NON-BINDING" in result["contract"]["disclaimer"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
