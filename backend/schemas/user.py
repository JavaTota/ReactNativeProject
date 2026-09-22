"""Application profile schemas. Login credentials remain with Clerk."""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from schemas.common import InputModel


class ProfileInput(InputModel):
    display_name: str = Field(min_length=1, max_length=100)
    bio: str = Field(default="", max_length=2000)

    @field_validator("display_name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value


class ProfileResponse(BaseModel):
    user_id: str
    display_name: str
    bio: str
    avatar_path: str | None = None
    created_at: datetime
    updated_at: datetime


class MeResponse(BaseModel):
    userId: str
    profile: ProfileResponse | None
