"""Market Configuration for PriceWaze CrewAI system.

Centralizes all market-specific settings for multi-region support.
This mirrors the TypeScript market configuration in src/config/market.ts
"""

import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Literal


MarketCode = Literal["DO", "US", "MX", "ES", "CO", "global"]


@dataclass(frozen=True)
class CurrencyConfig:
    """Currency configuration for a market."""
    code: str
    symbol: str
    locale: str


@dataclass(frozen=True)
class MapConfig:
    """Map configuration for a market."""
    center: tuple[float, float]  # (lng, lat)
    zoom: int


@dataclass(frozen=True)
class LegalConfig:
    """Legal configuration for a market."""
    jurisdiction: str
    disclaimer_es: str
    disclaimer_en: str
    contract_law: str


@dataclass(frozen=True)
class AIConfig:
    """AI configuration for a market."""
    market_context: str
    price_unit: str
    key_locations: list[str]  # Major cities/regions for backstory


@dataclass(frozen=True)
class MarketConfig:
    """Complete market configuration."""
    code: MarketCode
    name: str
    currency: CurrencyConfig
    map: MapConfig
    legal: LegalConfig
    ai: AIConfig


# Market configurations matching TypeScript definitions
MARKET_CONFIGS: dict[MarketCode, MarketConfig] = {
    "DO": MarketConfig(
        code="DO",
        name="Dominican Republic",
        currency=CurrencyConfig(code="DOP", symbol="RD$", locale="es-DO"),
        map=MapConfig(center=(-69.9312, 18.4861), zoom=12),
        legal=LegalConfig(
            jurisdiction="Dominican Republic",
            disclaimer_es="Consulte con un abogado licenciado en la República Dominicana",
            disclaimer_en="Consult with a licensed attorney in the Dominican Republic",
            contract_law="Dominican Republic Civil Code and Property Law",
        ),
        ai=AIConfig(
            market_context="Dominican Republic real estate market",
            price_unit="DOP (Dominican Pesos)",
            key_locations=["Santo Domingo", "Punta Cana", "Santiago", "Puerto Plata"],
        ),
    ),
    "US": MarketConfig(
        code="US",
        name="United States",
        currency=CurrencyConfig(code="USD", symbol="$", locale="en-US"),
        map=MapConfig(center=(-98.5795, 39.8283), zoom=4),
        legal=LegalConfig(
            jurisdiction="United States",
            disclaimer_es="Consulte con un abogado licenciado en su estado",
            disclaimer_en="Consult with a licensed attorney in your state",
            contract_law="State real estate laws apply",
        ),
        ai=AIConfig(
            market_context="United States real estate market",
            price_unit="USD (US Dollars)",
            key_locations=["New York", "Los Angeles", "Miami", "Chicago"],
        ),
    ),
    "MX": MarketConfig(
        code="MX",
        name="Mexico",
        currency=CurrencyConfig(code="MXN", symbol="MX$", locale="es-MX"),
        map=MapConfig(center=(-99.1332, 19.4326), zoom=10),
        legal=LegalConfig(
            jurisdiction="Mexico",
            disclaimer_es="Consulte con un abogado licenciado en México",
            disclaimer_en="Consult with a licensed attorney in Mexico",
            contract_law="Mexican Civil Code and Property Law",
        ),
        ai=AIConfig(
            market_context="Mexican real estate market",
            price_unit="MXN (Mexican Pesos)",
            key_locations=["Mexico City", "Guadalajara", "Monterrey", "Cancún"],
        ),
    ),
    "ES": MarketConfig(
        code="ES",
        name="Spain",
        currency=CurrencyConfig(code="EUR", symbol="€", locale="es-ES"),
        map=MapConfig(center=(-3.7038, 40.4168), zoom=10),
        legal=LegalConfig(
            jurisdiction="Spain",
            disclaimer_es="Consulte con un abogado licenciado en España",
            disclaimer_en="Consult with a licensed attorney in Spain",
            contract_law="Spanish Civil Code and Property Law",
        ),
        ai=AIConfig(
            market_context="Spanish real estate market",
            price_unit="EUR (Euros)",
            key_locations=["Madrid", "Barcelona", "Valencia", "Sevilla"],
        ),
    ),
    "CO": MarketConfig(
        code="CO",
        name="Colombia",
        currency=CurrencyConfig(code="COP", symbol="COP$", locale="es-CO"),
        map=MapConfig(center=(-74.0721, 4.7110), zoom=10),
        legal=LegalConfig(
            jurisdiction="Colombia",
            disclaimer_es="Consulte con un abogado licenciado en Colombia",
            disclaimer_en="Consult with a licensed attorney in Colombia",
            contract_law="Colombian Civil Code and Property Law",
        ),
        ai=AIConfig(
            market_context="Colombian real estate market",
            price_unit="COP (Colombian Pesos)",
            key_locations=["Bogotá", "Medellín", "Cartagena", "Cali"],
        ),
    ),
    "global": MarketConfig(
        code="global",
        name="Global",
        currency=CurrencyConfig(code="USD", symbol="$", locale="en-US"),
        map=MapConfig(center=(0, 20), zoom=2),
        legal=LegalConfig(
            jurisdiction="varies by location",
            disclaimer_es="Consulte con un abogado licenciado en su jurisdicción local",
            disclaimer_en="Consult with a licensed attorney in your local jurisdiction",
            contract_law="Local property laws apply",
        ),
        ai=AIConfig(
            market_context="international real estate market",
            price_unit="USD (US Dollars)",
            key_locations=["major metropolitan areas"],
        ),
    ),
}


@lru_cache
def get_market_config() -> MarketConfig:
    """
    Get the current market configuration.

    Reads from NEXT_PUBLIC_MARKET_CODE env var, defaults to 'global'.

    Returns:
        MarketConfig for the current market
    """
    market_code = os.environ.get("NEXT_PUBLIC_MARKET_CODE", "global")
    if market_code not in MARKET_CONFIGS:
        market_code = "global"
    return MARKET_CONFIGS[market_code]  # type: ignore


def get_market_config_by_code(code: MarketCode) -> MarketConfig:
    """
    Get a specific market configuration by code.

    Args:
        code: Market code (DO, US, MX, ES, CO, global)

    Returns:
        MarketConfig for the specified market
    """
    return MARKET_CONFIGS.get(code, MARKET_CONFIGS["global"])


def format_price(amount: float, market: MarketConfig | None = None) -> str:
    """
    Format price according to market locale.

    Args:
        amount: Price amount
        market: Optional market config (uses current market if not provided)

    Returns:
        Formatted price string
    """
    config = market or get_market_config()
    # Simple formatting - for more complex locale support, use babel
    formatted = f"{amount:,.0f}"
    return f"{config.currency.symbol}{formatted}"


def get_ai_market_context() -> str:
    """
    Get AI prompt context for the current market.

    Returns:
        Context string for AI prompts
    """
    config = get_market_config()
    return (
        f"You are a real estate analyst for the {config.ai.market_context}. "
        f"Prices are typically quoted in {config.ai.price_unit}."
    )


def get_agent_backstory_locations() -> str:
    """
    Get key locations string for agent backstories.

    Returns:
        Comma-separated list of key market locations
    """
    config = get_market_config()
    return ", ".join(config.ai.key_locations)
