"""FastAPI application entry point for PriceWaze CrewAI."""

import sys
from pathlib import Path
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.routes import pricing, negotiation, contracts, analysis
from config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    settings = get_settings()
    print(f"🚀 PriceWaze CrewAI starting on {settings.api_host}:{settings.api_port}")
    print(f"📊 Using model: {settings.deepseek_model}")
    print(f"🔗 Supabase: {settings.effective_supabase_url[:50]}...")
    yield
    print("👋 PriceWaze CrewAI shutting down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="PriceWaze CrewAI",
        description=(
            "Multi-agent AI system for Dominican Republic real estate analysis. "
            "Provides pricing analysis, negotiation strategies, and contract drafts "
            "using specialized AI agents."
        ),
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "https://pricewaze.com",
            "https://www.pricewaze.com",
            "https://pricewaze.vercel.app",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(pricing.router, prefix="/api/v1/pricing", tags=["Pricing Analysis"])
    app.include_router(negotiation.router, prefix="/api/v1/negotiation", tags=["Negotiation"])
    app.include_router(contracts.router, prefix="/api/v1/contracts", tags=["Contracts"])
    app.include_router(analysis.router, prefix="/api/v1/analysis", tags=["Full Analysis"])

    @app.get("/", tags=["Health"])
    async def root():
        """Root endpoint - health check."""
        return {
            "service": "PriceWaze CrewAI",
            "status": "healthy",
            "version": "0.1.0",
            "docs": "/docs",
        }

    @app.get("/health", tags=["Health"])
    async def health_check():
        """Detailed health check."""
        return {
            "status": "healthy",
            "model": settings.deepseek_model,
            "supabase_connected": bool(settings.effective_supabase_url),
            "crews_available": [
                "pricing_analysis",
                "negotiation_advisory",
                "contract_generation",
                "full_analysis",
            ],
        }

    return app


# Create the app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.api_debug,
    )
