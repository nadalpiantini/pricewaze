"""Contract generation API routes."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from crews import ContractGenerationCrew
from tools import GenerateContractTemplateTool, ValidateContractTermsTool


router = APIRouter()


class ContractParty(BaseModel):
    """Schema for contract party information."""

    name: str = Field(description="Full legal name")
    email: str | None = Field(default=None, description="Email address")
    id_number: str | None = Field(default=None, description="Cédula or ID number")


class ContractGenerationRequest(BaseModel):
    """Request schema for contract generation."""

    property_id: str = Field(description="UUID of the property")
    buyer: ContractParty = Field(description="Buyer information")
    seller: ContractParty = Field(description="Seller information")
    property_address: str = Field(description="Full property address")
    agreed_price: float = Field(description="Agreed sale price in USD")
    deposit_percent: float = Field(default=10, description="Deposit percentage")
    closing_days: int = Field(default=30, description="Days until closing")
    special_conditions: list[str] | None = Field(
        default=None, description="Special conditions to include"
    )


class QuickContractRequest(BaseModel):
    """Request schema for quick contract template."""

    buyer_name: str
    seller_name: str
    property_address: str
    property_description: str
    agreed_price: float
    deposit_percent: float = 10
    closing_days: int = 30


class ValidateTermsRequest(BaseModel):
    """Request schema for terms validation."""

    agreed_price: float = Field(description="Agreed sale price")
    property_price: float = Field(description="Original listing price")
    deposit_percent: float = Field(description="Deposit percentage")
    closing_days: int = Field(description="Days until closing")


@router.post("/generate")
async def generate_contract(request: ContractGenerationRequest) -> dict[str, Any]:
    """
    Generate a comprehensive contract draft with full crew analysis.

    This uses the Contract Generation Crew to:
    1. Validate proposed terms
    2. Generate bilingual contract draft
    3. Provide risk assessment

    The contract is NON-BINDING and requires attorney review.
    """
    try:
        crew = ContractGenerationCrew(verbose=True)
        result = crew.run(
            property_id=request.property_id,
            buyer_name=request.buyer.name,
            seller_name=request.seller.name,
            agreed_price=request.agreed_price,
            property_address=request.property_address,
            deposit_percent=request.deposit_percent,
            closing_days=request.closing_days,
            special_conditions=request.special_conditions,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Contract generation failed: {str(e)}")


@router.post("/quick-draft")
async def generate_quick_draft(request: QuickContractRequest) -> dict[str, Any]:
    """
    Generate a quick contract template without full crew analysis.

    Faster but without comprehensive validation and risk assessment.
    Still includes all standard terms and disclaimers.
    """
    try:
        from tools.contract_tools import ContractParty as ToolParty, PropertyDetails

        tool = GenerateContractTemplateTool()
        result = tool._run(
            buyer=ToolParty(name=request.buyer_name),
            seller=ToolParty(name=request.seller_name),
            property_details=PropertyDetails(
                address=request.property_address,
                description=request.property_description,
            ),
            agreed_price=request.agreed_price,
            deposit_percent=request.deposit_percent,
            closing_days=request.closing_days,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quick draft failed: {str(e)}")


@router.post("/validate-terms")
async def validate_contract_terms(request: ValidateTermsRequest) -> dict[str, Any]:
    """
    Validate proposed contract terms against market standards.

    Checks:
    - Deposit percentage (standard: 10-20%)
    - Closing timeline (standard: 30-45 days)
    - Price discount from listing
    - Identifies issues and warnings
    """
    try:
        tool = ValidateContractTermsTool()
        result = tool._run(
            agreed_price=request.agreed_price,
            property_price=request.property_price,
            deposit_percent=request.deposit_percent,
            closing_days=request.closing_days,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/template-info")
async def get_template_info() -> dict[str, Any]:
    """
    Get information about available contract templates and terms.
    """
    return {
        "templates_available": ["purchase_agreement"],
        "supported_languages": ["Spanish", "English (translations)"],
        "standard_terms": {
            "deposit": {
                "standard_range": "10-20%",
                "minimum_recommended": 10,
                "default": 10,
            },
            "closing_timeline": {
                "standard_range": "30-45 days",
                "minimum_recommended": 14,
                "default": 30,
            },
            "payment_structure": "Deposit at signing, balance at closing",
        },
        "standard_conditions": [
            "Clear title verification",
            "Property inspection rights",
            "No outstanding liens or encumbrances",
            "Valid property registration",
            "Notarial formalization required",
        ],
        "disclaimer": (
            "All contracts generated are NON-BINDING drafts for reference only. "
            "Professional legal counsel is required for final documentation."
        ),
        "jurisdiction": "Dominican Republic",
        "applicable_law": "Dominican Republic Civil Code and Property Law",
    }
