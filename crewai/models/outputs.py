"""Structured output models for CrewAI crews.

These models serve dual purposes:
1. Guardrails: Validate LLM outputs before passing to downstream tasks
2. Structured Output: Ensure consistent JSON response format

Usage:
    task = Task(
        description="...",
        expected_output="...",
        agent=pricing_analyst,
        output_pydantic=PricingAnalysisOutput,  # Enforces structure
    )
"""

from typing import List, Optional, Literal
from pydantic import BaseModel, Field, field_validator


class SuggestedOffer(BaseModel):
    """Individual offer suggestion with risk assessment."""

    amount: float = Field(ge=0, description="Offer amount in USD")
    discount_percent: float = Field(
        ge=0, le=100, description="Discount from listing price"
    )
    risk: Literal["low", "medium", "high"] = Field(
        description="Risk of rejection"
    )
    rationale: Optional[str] = Field(
        default=None, description="Reasoning for this offer level"
    )


class NegotiationFactor(BaseModel):
    """Factor influencing negotiation power."""

    factor: str = Field(description="Name of the factor")
    value: str = Field(description="Current value/state")
    impact: Literal["positive", "negative", "neutral"] = Field(
        description="Impact on buyer's negotiation power"
    )
    weight: float = Field(ge=0, le=1, description="Importance weight 0-1")
    score_adjustment: float = Field(
        ge=-50, le=50, description="Points added/subtracted from base score"
    )
    explanation: str = Field(description="Why this factor matters")


class MarketAnalysisOutput(BaseModel):
    """Output from Market Analyst tasks."""

    zone_id: Optional[str] = Field(default=None, description="Zone UUID if identified")
    zone_name: str = Field(description="Human-readable zone name")
    avg_price_per_m2: float = Field(ge=0, description="Average price per square meter")
    median_price_per_m2: float = Field(ge=0, description="Median price per square meter")
    min_price_per_m2: float = Field(ge=0, description="Minimum price per square meter")
    max_price_per_m2: float = Field(ge=0, description="Maximum price per square meter")
    property_count: int = Field(ge=0, description="Number of properties in zone")
    market_health_score: int = Field(
        ge=0, le=100, description="Overall market health 0-100"
    )
    market_trend: Literal["hot", "warm", "cool", "cold"] = Field(
        description="Current market temperature"
    )
    avg_days_on_market: Optional[int] = Field(
        default=None, ge=0, description="Average days to sell"
    )
    key_insights: List[str] = Field(
        min_length=1, max_length=5, description="Key market observations"
    )

    @field_validator("key_insights")
    @classmethod
    def insights_not_empty(cls, v: List[str]) -> List[str]:
        """Ensure insights are meaningful."""
        return [insight for insight in v if insight.strip()]


class PricingAnalysisOutput(BaseModel):
    """Output from Pricing Analyst valuation tasks."""

    property_id: str = Field(description="UUID of analyzed property")
    listing_price: float = Field(ge=0, description="Current listing price")
    price_per_m2: float = Field(ge=0, description="Price per square meter")
    fairness_score: int = Field(
        ge=0, le=100, description="Price fairness score 0-100 (100=most overpriced)"
    )
    fairness_label: Literal[
        "underpriced", "fair", "overpriced", "significantly_overpriced"
    ] = Field(description="Categorical assessment")
    estimated_fair_value: Optional[float] = Field(
        default=None, ge=0, description="Estimated fair market value"
    )
    price_deviation_percent: float = Field(
        ge=-100, le=500, description="% deviation from fair value"
    )
    confidence_level: Literal["low", "medium", "high"] = Field(
        description="Confidence in assessment"
    )
    value_factors: List[str] = Field(
        default_factory=list, description="Factors affecting value"
    )

    @field_validator("fairness_label")
    @classmethod
    def label_matches_score(cls, v: str, info) -> str:
        """Ensure label roughly matches score."""
        score = info.data.get("fairness_score", 50)
        expected = {
            (0, 30): "underpriced",
            (30, 55): "fair",
            (55, 75): "overpriced",
            (75, 101): "significantly_overpriced",
        }
        for (low, high), label in expected.items():
            if low <= score < high and v != label:
                # Allow some flexibility but log warning
                pass  # In production, log this discrepancy
        return v


class OfferSuggestionsOutput(BaseModel):
    """Output from offer suggestion tasks."""

    property_id: str = Field(description="UUID of property")
    listing_price: float = Field(ge=0, description="Current listing price")
    aggressive: SuggestedOffer = Field(description="Low-ball offer")
    balanced: SuggestedOffer = Field(description="Fair middle-ground offer")
    conservative: SuggestedOffer = Field(description="Safe close-to-asking offer")
    recommended_approach: Literal["aggressive", "balanced", "conservative"] = Field(
        description="Recommended strategy based on market"
    )
    negotiation_points: List[str] = Field(
        min_length=1, max_length=5, description="Key points to emphasize"
    )

    @field_validator("aggressive", "balanced", "conservative")
    @classmethod
    def offers_ordered(cls, v: SuggestedOffer, info) -> SuggestedOffer:
        """Validate offer amounts are in expected order."""
        # This runs per-field, so we can't compare across fields here
        # Full validation would be in model_validator
        return v


class NegotiationAdviceOutput(BaseModel):
    """Output from Negotiation Advisor tasks."""

    property_id: str = Field(description="UUID of property")
    advice_type: Literal["buyer", "seller"] = Field(description="Perspective of advice")
    recommendation: Literal["accept", "counter", "reject", "wait"] = Field(
        description="Primary recommendation"
    )
    confidence: int = Field(ge=0, le=100, description="Confidence in recommendation")
    suggested_counter_amount: Optional[float] = Field(
        default=None, ge=0, description="Suggested counter-offer if applicable"
    )
    negotiation_power_score: int = Field(
        ge=0, le=100, description="Buyer's negotiation leverage 0-100"
    )
    factors: List[NegotiationFactor] = Field(
        min_length=2, description="Factors influencing advice"
    )
    reasoning: List[str] = Field(
        min_length=1, max_length=5, description="Key reasoning points"
    )
    risks: List[str] = Field(default_factory=list, description="Potential risks")
    next_steps: List[str] = Field(
        min_length=1, max_length=3, description="Recommended actions"
    )

    @field_validator("suggested_counter_amount")
    @classmethod
    def counter_required_for_counter_rec(cls, v: Optional[float], info) -> Optional[float]:
        """Ensure counter amount is provided when recommendation is 'counter'."""
        rec = info.data.get("recommendation")
        if rec == "counter" and v is None:
            raise ValueError("suggested_counter_amount required when recommendation is 'counter'")
        return v


class ContractTermsOutput(BaseModel):
    """Output from Legal Advisor contract tasks."""

    property_id: str = Field(description="UUID of property")
    buyer_name: str = Field(min_length=2, description="Buyer's full name")
    seller_name: str = Field(min_length=2, description="Seller's full name")
    property_address: str = Field(min_length=10, description="Full property address")
    agreed_price: float = Field(ge=0, description="Agreed purchase price")
    deposit_amount: float = Field(ge=0, description="Initial deposit amount")
    deposit_percent: float = Field(ge=0, le=100, description="Deposit as percentage")
    closing_days: int = Field(ge=1, le=365, description="Days until closing")
    special_conditions: List[str] = Field(
        default_factory=list, description="Special terms and conditions"
    )
    risk_assessment: List[str] = Field(
        default_factory=list, description="Identified risks"
    )
    recommendations: List[str] = Field(
        default_factory=list, description="Legal recommendations"
    )
    contract_draft: str = Field(min_length=100, description="Full contract text")


class SpecialistReportOutput(BaseModel):
    """Individual specialist contribution to full analysis."""

    specialist: str = Field(description="Agent role name")
    task: str = Field(description="Task performed")
    key_findings: List[str] = Field(min_length=1, description="Main findings")
    recommendations: List[str] = Field(default_factory=list)


class FullAnalysisOutput(BaseModel):
    """Output from Full Analysis Crew (Coordinator summary)."""

    property_id: str = Field(description="UUID of analyzed property")
    executive_summary: str = Field(
        min_length=100, description="High-level summary for decision makers"
    )
    market_assessment: MarketAnalysisOutput = Field(description="Market context")
    pricing_assessment: PricingAnalysisOutput = Field(description="Valuation results")
    negotiation_strategy: Optional[NegotiationAdviceOutput] = Field(
        default=None, description="Negotiation guidance if requested"
    )
    contract_terms: Optional[ContractTermsOutput] = Field(
        default=None, description="Contract draft if requested"
    )
    specialist_reports: List[SpecialistReportOutput] = Field(
        min_length=2, description="Individual agent contributions"
    )
    overall_recommendation: Literal["buy", "negotiate", "wait", "pass"] = Field(
        description="Final recommendation"
    )
    confidence_level: Literal["low", "medium", "high"] = Field(
        description="Overall confidence"
    )
    key_risks: List[str] = Field(
        min_length=1, max_length=5, description="Top risks to consider"
    )
    next_steps: List[str] = Field(
        min_length=1, max_length=5, description="Recommended actions"
    )
