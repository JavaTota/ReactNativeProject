"""Private journey input and output; keep camelCase for the existing Expo app."""

from datetime import date
from urllib.parse import urlparse
from pydantic import BaseModel, Field, field_validator, model_validator
from schemas.common import InputModel, Identifier, CalendarDate
from enums.journey import JourneyStatus, StopKind, BookingStatus


class StopInput(InputModel):
    id: Identifier
    kind: StopKind
    name: str = Field(min_length=1, max_length=200)
    day: int = Field(ge=0, le=365, strict=True)
    endDay: int | None = Field(default=None, ge=1, le=365, strict=True)
    booking: BookingStatus = BookingStatus.NOT_BOOKED
    visited: bool = Field(default=False, strict=True)
    confirmation: str = Field(default="", max_length=1000)
    bookingLink: str = ""
    cost: str = Field(default="", pattern=r"^(?:\d{1,10}(?:\.\d{1,2})?)?$")
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    cancellationDate: str = ""
    review: str = Field(default="", max_length=2000)
    rating: int = Field(default=0, ge=0, le=5, strict=True)
    photoUri: str | None = Field(default=None, max_length=400)

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @field_validator("bookingLink")
    @classmethod
    def booking_url(cls, value):
        if value and (
            urlparse(value).scheme not in ("http", "https")
            or not urlparse(value).netloc
        ):
            raise ValueError("Use an HTTP(S) URL or an empty string")
        return value

    @field_validator("cancellationDate")
    @classmethod
    def cancellation_date(cls, value):
        if value:
            from schemas.common import calendar_string

            calendar_string(value)
        return value

    @model_validator(mode="after")
    def optional_fields(self):
        # Optional means omitted. Explicit nulls were not accepted by the JS API.
        for name in ("endDay", "photoUri"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"Omit {name} instead of sending null")
        return self


class JourneyInput(InputModel):
    title: str = Field(min_length=1, max_length=120)
    destination: str = Field(min_length=1, max_length=160)
    startDate: CalendarDate
    endDate: CalendarDate
    status: JourneyStatus = JourneyStatus.PLANNING
    stops: list[StopInput] = Field(default_factory=list, max_length=1000)

    @field_validator("title", "destination", mode="before")
    @classmethod
    def trim_text(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def check_dates_and_stops(self):
        last_day = (
            date.fromisoformat(self.endDate) - date.fromisoformat(self.startDate)
        ).days
        if not 0 <= last_day <= 365:
            raise ValueError("Journey must last 1–366 inclusive days")
        if len({stop.id for stop in self.stops}) != len(self.stops):
            raise ValueError("Stop IDs must be unique")
        for stop in self.stops:
            if stop.day > last_day:
                raise ValueError("Stop outside journey dates")
            if stop.kind == StopKind.HOTEL:
                if stop.endDay is None or not stop.day < stop.endDay <= last_day:
                    raise ValueError(
                        "Hotel checkout must be after check-in and within the journey"
                    )
            elif stop.endDay is not None:
                raise ValueError("Only hotels have checkout days")
        return self


class SourceResponse(BaseModel):
    id: str
    author: str | None = None
    title: str | None = None


class JourneyResponse(BaseModel):
    id: str
    title: str
    destination: str
    startDate: str
    endDate: str
    status: JourneyStatus
    stops: list[StopInput]
    source: SourceResponse | None = None
    publishedId: str | None = None
