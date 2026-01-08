"""Negotiation Module - Waze-style real-time market intelligence for negotiations."""

from .scenarios import (
    NegotiationScenario,
    ScenarioEngine,
    ScenarioType,
)
from .signals import (
    MarketSignal,
    MarketSignalDetector,
    SignalType,
)

__all__ = [
    "NegotiationScenario",
    "ScenarioEngine",
    "ScenarioType",
    "MarketSignal",
    "SignalType",
    "MarketSignalDetector",
]
