"""Configuration settings for PriceWaze CrewAI system."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).parent.parent.parent / ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Supabase Configuration
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    next_public_supabase_url: str = ""
    next_public_supabase_anon_key: str = ""

    # DeepSeek AI Configuration
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_debug: bool = False

    # CrewAI Configuration
    crew_verbose: bool = True
    crew_memory: bool = True
    crew_max_rpm: int = 10

    @property
    def effective_supabase_url(self) -> str:
        """Get Supabase URL from either direct or Next.js env var."""
        return self.supabase_url or self.next_public_supabase_url

    @property
    def effective_supabase_key(self) -> str:
        """Get Supabase key - prefer service role for backend operations."""
        return self.supabase_service_role_key or self.supabase_anon_key or self.next_public_supabase_anon_key


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
