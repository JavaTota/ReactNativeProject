"""Reusable request rules and response envelopes."""

from datetime import date
from typing import Annotated, Generic, TypeVar
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

Identifier = Annotated[
    str, Field(min_length=1, max_length=128, pattern=r"^[a-zA-Z0-9_-]+$")
]
Offset = Annotated[int, Field(ge=0)]


def calendar_string(value):
    # Do not let Pydantic reinterpret numbers as Unix timestamps.
    if not isinstance(value, str):
        raise ValueError("Use a YYYY-MM-DD date string")
    import re

    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Use a YYYY-MM-DD date string")
    date.fromisoformat(value)
    return value


CalendarDate = Annotated[
    str,
    BeforeValidator(calendar_string),
    Field(pattern=r"^\d{4}-\d{2}-\d{2}$", examples=["2026-08-01"]),
]


class InputModel(BaseModel):
    # Reject user_id and other unexpected fields instead of silently accepting them.
    model_config = ConfigDict(extra="forbid")


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    offset: int
    limit: int


class ErrorResponse(BaseModel):
    error: str
    issues: list[dict] | None = None
