"""Central settings, loaded from this backend's .env (never from the frontend)."""

from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse
from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
    host: str = "0.0.0.0"
    port: int = Field(default=3001, ge=1, le=65535)
    supabase_url: str
    supabase_publishable_key: SecretStr
    clerk_secret_key: SecretStr
    clerk_authorized_parties: str
    cors_origins: str

    @field_validator("supabase_url")
    @classmethod
    def project_url(cls, value):
        parsed = urlparse(value)
        if parsed.scheme not in ("http", "https") or not parsed.hostname:
            raise ValueError("Use your Supabase project URL")
        if parsed.path not in ("", "/") or parsed.query or parsed.fragment:
            raise ValueError("Use the project URL without /rest/v1 or another path")
        if "YOUR_PROJECT" in value:
            raise ValueError("Replace the example Supabase URL")
        return value.rstrip("/")

    @field_validator("supabase_publishable_key", "clerk_secret_key")
    @classmethod
    def configured_key(cls, value):
        if not value.get_secret_value() or "REPLACE_ME" in value.get_secret_value():
            raise ValueError("Replace the example key")
        return value

    @field_validator("clerk_authorized_parties", "cors_origins")
    @classmethod
    def origins_present(cls, value):
        if not any(item.strip() for item in value.split(",")):
            raise ValueError("Configure at least one origin")
        return value

    @property
    def authorized_parties(self):
        return [
            item.strip()
            for item in self.clerk_authorized_parties.split(",")
            if item.strip()
        ]

    @property
    def allowed_origins(self):
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]


@lru_cache
def get_settings():
    return Settings()
