#!/usr/bin/env python3
"""Entry point script for running the PriceWaze CrewAI API server."""

import uvicorn
from config import get_settings


def main():
    """Run the FastAPI server."""
    settings = get_settings()

    print("=" * 60)
    print("🏠 PriceWaze CrewAI - Multi-Agent Real Estate Analysis")
    print("=" * 60)
    print(f"📍 Host: {settings.api_host}")
    print(f"🔌 Port: {settings.api_port}")
    print(f"🤖 Model: {settings.deepseek_model}")
    print(f"📊 Docs: http://{settings.api_host}:{settings.api_port}/docs")
    print("=" * 60)

    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_debug,
        log_level="info",
    )


if __name__ == "__main__":
    main()
