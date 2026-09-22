"""Public snapshots deliberately have no booking confirmation/cost fields."""

from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from schemas.common import InputModel, CalendarDate
from enums.journey import StopKind


class PublishInput(InputModel):
    country: str = Field(min_length=1, max_length=100)
    caption: str = Field(default="", max_length=2000)

    @field_validator("country", mode="before")
    @classmethod
    def trim_country(cls, value):
        return value.strip() if isinstance(value, str) else value


class ReuseInput(InputModel):
    startDate: CalendarDate


class PublishedStop(BaseModel):
    id: str
    trip_id: str
    kind: StopKind
    name: str
    day_number: int
    end_day_number: int | None
    review: str
    rating: int
    photo_path: str | None
    sort_order: int


class PublishedTrip(BaseModel):
    id: str
    user_id: str
    author_name: str
    title: str
    destination: str
    country: str
    caption: str
    duration_days: int
    cover_path: str | None
    source_post_id: str | None
    source_author: str | None
    source_title: str | None
    published_at: datetime
    updated_at: datetime


class PublishedPost(PublishedTrip):
    published_stops: list[PublishedStop]


class SavedTrip(BaseModel):
    trip_id: str
    published_trips: PublishedTrip


class PublishResponse(BaseModel):
    id: str
