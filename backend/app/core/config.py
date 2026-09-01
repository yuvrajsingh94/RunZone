import os
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "RunZone"
    API_V1_STR: str = "/api/v1"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    ENABLE_PUBLIC_DOCS: bool = True  # Public /docs for portfolio exploration; set False in strict enterprise prod
    
    # Database
    POSTGRES_USER: str = "runzone_admin"
    POSTGRES_PASSWORD: str = "runzone_secret_123"
    POSTGRES_DB: str = "runzone_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://runzone_admin:runzone_secret_123@localhost:5432/runzone_db"
    SYNC_DATABASE_URL: str = "postgresql://runzone_admin:runzone_secret_123@localhost:5432/runzone_db"

    # Security & JWT
    JWT_SECRET_KEY: str = "runzone_super_secure_jwt_secret_token_key_change_in_production_2026"
    JWT_REFRESH_SECRET_KEY: str = "runzone_super_secure_refresh_secret_key_change_in_prod_2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15  # Short-lived access token (15 mins)
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7     # Long-lived refresh token (7 days)
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30 # 30 mins reset window

    # Groq AI Engine (Production Models with Fallback Chain)
    GROQ_API_KEY: str = ""
    GROQ_DEFAULT_MODEL: str = "openai/gpt-oss-120b" # GPT OSS 120B (Primary Flagship)
    GROQ_FALLBACK_MODELS: List[str] = [
        "qwen/qwen3.8-27b",       # Fallback 1: Qwen 3.8 27B
        "openai/gpt-oss-20b",     # Fallback 2: GPT OSS 20B (Ultra-fast)
        "groq/compound",          # Fallback 3: Groq Compound
    ]
    GROQ_WHISPER_MODEL: str = "whisper-large-v3-turbo" # Primary Audio Transcription
    GROQ_WHISPER_FALLBACK: str = "whisper-large-v3"    # Fallback Audio Transcription

    # Legacy / Secondary AI
    GEMINI_API_KEY: str = ""

    # Strava Integration
    STRAVA_CLIENT_ID: str = ""
    STRAVA_CLIENT_SECRET: str = ""
    STRAVA_REDIRECT_URI: str = "http://localhost:8000/api/v1/strava/callback"
    STRAVA_VERIFY_TOKEN: str = "runzone_strava_webhook_token_2026"

    # Transactional Email (SMTP / SendGrid)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: str = "noreply@runzone.ai"
    EMAILS_FROM_NAME: str = "RunZone Athletics"
    EMAIL_ENABLED: bool = False
    FRONTEND_URL: str = "http://localhost:5173"

    # CORS
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, list):
            return v
        return ["http://localhost:5173", "http://localhost:5174"]

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()
