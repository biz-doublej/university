from __future__ import annotations

import os
from functools import lru_cache
from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = Field(default="Timora AI")
    debug: bool = Field(default=False)
    database_url: str = Field(default=os.getenv("DATABASE_URL", "sqlite:///./dev.db"))
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])  # Configure in prod
    default_tenant_name: str = Field(default=os.getenv("DEFAULT_TENANT", "demo"))
    timezone: str = Field(default=os.getenv("TZ", "Asia/Seoul"))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
