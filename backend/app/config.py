"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "sqlite:///./code_rush.db"

    # JWT
    SECRET_KEY: str = "dev-secret-key-not-for-production-use-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Admin
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"

    # Code Runner
    CODE_EXECUTION_TIMEOUT: int = 10
    CODE_MEMORY_LIMIT_MB: int = 256

    # Competition
    ROUND1_DURATION_MINUTES: int = 15
    ROUND2_DURATION_MINUTES: int = 30
    ROUND2_POINTS_PER_PROBLEM: int = 10

    # CORS
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {
        "env_file": "../.env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
